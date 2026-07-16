import type { CharacterId } from './characters'
import { VOICE, type SoundToken, type VoiceType } from './dogSpeak'

/**
 * 외부 음원 없이 Web Audio API 로 "리얼한" 개소리를 합성한다.
 *
 * 전자음을 피하기 위해 순수 오실레이터 대신:
 *  - 노이즈(숨소리) + 톤(성대) 혼합 음원
 *  - 병렬 밴드패스 3개로 성도(포먼트) 공명 재현
 *  - 짖는 동안 포먼트를 아래로 스윕해 "우프" 발음감
 *  - 웨이브셰이퍼로 거친 질감(rasp)
 *  - 빠른 트랜지언트 엔벨로프 + 미세 랜덤
 * dogSpeak 토큰(짖음/낑낑/으르렁/울음)을 순서대로 재생해 화면 의성어와 일치한다.
 */

interface VoiceSpec {
  f0: number // 기본 주파수(성대) Hz
  formants: [number, number, number] // 성도 공명 주파수
  noise: number // 숨소리(노이즈) 비율
  rough: number // 거친 질감(왜곡) 정도
  barkDur: number // 한 번 짖는 길이(s)
}

const SPECS: Record<VoiceType, VoiceSpec> = {
  small: { f0: 820, formants: [1300, 3200, 5200], noise: 0.5, rough: 3.2, barkDur: 0.13 },
  medium: { f0: 470, formants: [850, 2000, 3400], noise: 0.42, rough: 2.8, barkDur: 0.18 },
  large: { f0: 290, formants: [520, 1300, 2600], noise: 0.34, rough: 2.4, barkDur: 0.22 },
  howler: { f0: 360, formants: [600, 1500, 2900], noise: 0.34, rough: 2.4, barkDur: 0.2 },
}

let ctx: AudioContext | null = null
function getCtx(): AudioContext | null {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

// 재사용 노이즈 버퍼(숨소리·잡음 성분)
let noiseBuf: AudioBuffer | null = null
function getNoise(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

// 거친 질감용 soft-clip 곡선(tanh)
const curveCache = new Map<number, Float32Array<ArrayBuffer>>()
function distCurve(amount: number): Float32Array<ArrayBuffer> {
  const key = Math.round(amount * 10)
  let c = curveCache.get(key)
  if (!c) {
    const n = 1024
    c = new Float32Array(new ArrayBuffer(n * 4))
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1
      c[i] = Math.tanh(amount * x)
    }
    curveCache.set(key, c)
  }
  return c
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

/** 노이즈+톤 음원을 포먼트 뱅크·왜곡·엔벨로프에 통과시키는 공용 헬퍼 */
function voiceSource(
  ac: AudioContext,
  out: AudioNode,
  start: number,
  opts: {
    dur: number
    f0Start: number
    f0End: number
    formants: [number, number, number]
    formantSweep: number // 포먼트 종료 배수(1=고정)
    noise: number
    rough: number
    q: number
    vibHz?: number
    vibCents?: number
    peak: number
    attack: number
    env: (g: AudioParam, t0: number, dur: number, peak: number) => void
  },
) {
  const { dur } = opts
  // --- 음원: 톱니(성대) + 노이즈(숨) ---
  const osc = ac.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(opts.f0Start, start)
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.f0End), start + dur)

  const src = ac.createGain()
  const oscGain = ac.createGain()
  oscGain.gain.value = 1 - opts.noise * 0.6
  osc.connect(oscGain)
  oscGain.connect(src)

  const noise = ac.createBufferSource()
  noise.buffer = getNoise(ac)
  const nGain = ac.createGain()
  nGain.gain.value = opts.noise
  noise.connect(nGain)
  nGain.connect(src)

  // 살짝 떨림(비브라토)
  let vib: OscillatorNode | null = null
  if (opts.vibHz && opts.vibCents) {
    vib = ac.createOscillator()
    vib.frequency.value = opts.vibHz
    const vg = ac.createGain()
    vg.gain.value = (opts.f0Start * opts.vibCents) / 1200
    vib.connect(vg)
    vg.connect(osc.frequency)
  }

  // --- 포먼트 뱅크(병렬 밴드패스 3개, 아래로 스윕) ---
  const sum = ac.createGain()
  const gains = [1, 0.55, 0.3]
  opts.formants.forEach((f, i) => {
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = opts.q + i
    bp.frequency.setValueAtTime(f * 1.35, start)
    bp.frequency.exponentialRampToValueAtTime(f * opts.formantSweep, start + dur * 0.6)
    const g = ac.createGain()
    g.gain.value = gains[i]
    src.connect(bp)
    bp.connect(g)
    g.connect(sum)
  })

  // --- 거친 질감(왜곡) ---
  const shaper = ac.createWaveShaper()
  shaper.curve = distCurve(opts.rough)
  sum.connect(shaper)

  // --- 엔벨로프 ---
  const env = ac.createGain()
  shaper.connect(env)
  env.connect(out)
  opts.env(env.gain, start, dur, opts.peak)

  osc.start(start)
  noise.start(start)
  if (vib) vib.start(start)
  const stop = start + dur + 0.05
  osc.stop(stop)
  noise.stop(stop)
  if (vib) vib.stop(stop)
  return dur
}

// 짖음 엔벨로프: 날카로운 어택 → 짧은 바디 → 빠른 감쇠
const barkEnv = (g: AudioParam, t0: number, dur: number, peak: number) => {
  g.setValueAtTime(0.0001, t0)
  g.exponentialRampToValueAtTime(peak, t0 + 0.006)
  g.exponentialRampToValueAtTime(peak * 0.32, t0 + dur * 0.45)
  g.exponentialRampToValueAtTime(0.0001, t0 + dur)
}

function playBark(ac: AudioContext, out: AudioNode, start: number, v: VoiceSpec) {
  const f0 = v.f0 * rnd(0.94, 1.06)
  return voiceSource(ac, out, start, {
    dur: v.barkDur * rnd(0.92, 1.08),
    f0Start: f0 * 1.35,
    f0End: f0 * 0.62,
    formants: v.formants,
    formantSweep: 0.72,
    noise: v.noise,
    rough: v.rough,
    q: 5,
    peak: 0.95,
    attack: 0.006,
    env: barkEnv,
  })
}

function playWhine(ac: AudioContext, out: AudioNode, start: number, v: VoiceSpec) {
  const dur = 0.5
  const f0 = v.f0 * 1.4
  return voiceSource(ac, out, start, {
    dur,
    f0Start: f0 * 1.15,
    f0End: f0 * 0.9,
    formants: [v.formants[0] * 1.6, v.formants[1] * 1.2, v.formants[2]],
    formantSweep: 1.1,
    noise: v.noise * 0.5,
    rough: 1.6,
    q: 7,
    vibHz: 13,
    vibCents: 70,
    peak: 0.5,
    attack: 0.05,
    env: (g, t0) => {
      g.setValueAtTime(0.0001, t0)
      g.exponentialRampToValueAtTime(0.5, t0 + 0.07)
      g.exponentialRampToValueAtTime(0.0001, t0 + dur)
    },
  })
}

function playGrowl(ac: AudioContext, out: AudioNode, start: number, v: VoiceSpec) {
  const dur = 0.45
  // 저역 노이즈 + AM 으로 그르렁 질감
  const noise = ac.createBufferSource()
  noise.buffer = getNoise(ac)
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = v.formants[0] * 0.9
  lp.Q.value = 4
  const osc = ac.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = v.f0 * 0.4
  const mix = ac.createGain()
  const oGain = ac.createGain()
  oGain.gain.value = 0.5
  osc.connect(oGain)
  oGain.connect(mix)
  noise.connect(lp)
  lp.connect(mix)
  const shaper = ac.createWaveShaper()
  shaper.curve = distCurve(3)
  mix.connect(shaper)
  const env = ac.createGain()
  shaper.connect(env)
  env.connect(out)
  // 진폭 떨림(그르렁)
  const lfo = ac.createOscillator()
  lfo.type = 'square'
  lfo.frequency.value = 28
  const lfoGain = ac.createGain()
  lfoGain.gain.value = 0.28
  lfo.connect(lfoGain)
  lfoGain.connect(env.gain)
  env.gain.setValueAtTime(0.55, start)
  env.gain.setValueAtTime(0.55, start + dur - 0.06)
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.start(start)
  noise.start(start)
  lfo.start(start)
  const stop = start + dur + 0.05
  osc.stop(stop)
  noise.stop(stop)
  lfo.stop(stop)
  return dur
}

function playHowl(ac: AudioContext, out: AudioNode, start: number, v: VoiceSpec) {
  const dur = 1.0
  const f0 = v.f0
  // 울부짖음: 톤이 올라갔다 내려오며 모음(포먼트) 고정 + 비브라토 + 숨
  const osc = ac.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(f0 * 0.85, start)
  osc.frequency.linearRampToValueAtTime(f0 * 1.3, start + dur * 0.35)
  osc.frequency.linearRampToValueAtTime(f0 * 1.05, start + dur * 0.72)
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.8, start + dur)
  const src = ac.createGain()
  osc.connect(src)
  const noise = ac.createBufferSource()
  noise.buffer = getNoise(ac)
  const nGain = ac.createGain()
  nGain.gain.value = 0.18
  noise.connect(nGain)
  nGain.connect(src)
  const vib = ac.createOscillator()
  vib.frequency.value = 6
  const vg = ac.createGain()
  vg.gain.value = (f0 * 25) / 1200
  vib.connect(vg)
  vg.connect(osc.frequency)
  // 모음 "우/오" 포먼트
  const sum = ac.createGain()
  ;[
    [v.formants[0] * 0.9, 1],
    [v.formants[1], 0.5],
    [v.formants[2], 0.25],
  ].forEach(([f, g]) => {
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f
    bp.Q.value = 6
    const gn = ac.createGain()
    gn.gain.value = g
    src.connect(bp)
    bp.connect(gn)
    gn.connect(sum)
  })
  const shaper = ac.createWaveShaper()
  shaper.curve = distCurve(2)
  sum.connect(shaper)
  const env = ac.createGain()
  shaper.connect(env)
  env.connect(out)
  env.gain.setValueAtTime(0.0001, start)
  env.gain.exponentialRampToValueAtTime(0.85, start + 0.12)
  env.gain.setValueAtTime(0.85, start + dur - 0.22)
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.start(start)
  noise.start(start)
  vib.start(start)
  const stop = start + dur + 0.05
  osc.stop(stop)
  noise.stop(stop)
  vib.stop(stop)
  return dur
}

/** dogSpeak 토큰들을 순서대로 소리로 재생 */
export function playTokens(character: CharacterId, tokens: SoundToken[]) {
  const ac = getCtx()
  if (!ac) return
  if (ac.state === 'suspended') ac.resume()

  const master = ac.createGain()
  master.gain.value = 0.9
  const comp = ac.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 4
  master.connect(comp)
  comp.connect(ac.destination)

  const v = SPECS[VOICE[character]]
  let t = ac.currentTime + 0.03

  for (const tok of tokens) {
    if (tok.kind === 'bark') {
      for (let i = 0; i < Math.max(1, tok.reps); i++) {
        playBark(ac, master, t, v)
        t += v.barkDur * rnd(0.95, 1.15) + 0.03
      }
      t += 0.05
    } else if (tok.kind === 'whine') {
      t += playWhine(ac, master, t, v) + 0.05
    } else if (tok.kind === 'growl') {
      t += playGrowl(ac, master, t, v) + 0.06
    } else {
      t += playHowl(ac, master, t, v) + 0.08
    }
  }
}
