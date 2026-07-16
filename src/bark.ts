import type { CharacterId } from './characters'
import { VOICE, type SoundToken, type VoiceType } from './dogSpeak'

/**
 * 외부 음원 없이 Web Audio API 로 개소리를 합성한다.
 * dogSpeak 이 만든 토큰(짖음/낑낑/으르렁/울음)을 순서대로 재생해
 * 화면의 의성어 텍스트와 소리가 일치한다.
 */

// 견종 목소리별 기본 음높이 배수 (소형 높고 대형 낮음)
const PITCH: Record<VoiceType, number> = {
  small: 1.7,
  medium: 1.05,
  large: 0.72,
  howler: 0.9,
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

/** "멍!" 한 번 */
function playBark(ac: AudioContext, out: AudioNode, start: number, pitch: number) {
  const osc = ac.createOscillator()
  const sub = ac.createOscillator()
  const gain = ac.createGain()
  const band = ac.createBiquadFilter()
  osc.type = 'sawtooth'
  sub.type = 'triangle'
  osc.frequency.setValueAtTime(430 * pitch, start)
  osc.frequency.exponentialRampToValueAtTime(180 * pitch, start + 0.16)
  sub.frequency.setValueAtTime(215 * pitch, start)
  sub.frequency.exponentialRampToValueAtTime(90 * pitch, start + 0.16)
  band.type = 'bandpass'
  band.frequency.value = 950 * pitch
  band.Q.value = 1.4
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.95, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
  osc.connect(band)
  sub.connect(band)
  band.connect(gain)
  gain.connect(out)
  osc.start(start)
  sub.start(start)
  osc.stop(start + 0.2)
  sub.stop(start + 0.2)
  return 0.16
}

/** "낑…" 낑낑거림 — 높고 부드럽게 내려가며 떨림 */
function playWhine(ac: AudioContext, out: AudioNode, start: number, pitch: number) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const vib = ac.createOscillator()
  const vibGain = ac.createGain()
  const dur = 0.42
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(720 * pitch, start)
  osc.frequency.exponentialRampToValueAtTime(520 * pitch, start + dur)
  vib.frequency.value = 14 // 떨림
  vibGain.gain.value = 30 * pitch
  vib.connect(vibGain)
  vibGain.connect(osc.frequency)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.5, start + 0.06)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(gain)
  gain.connect(out)
  osc.start(start)
  vib.start(start)
  osc.stop(start + dur + 0.02)
  vib.stop(start + dur + 0.02)
  return dur
}

/** "으르릉…" 낮게 깔리는 진동 */
function playGrowl(ac: AudioContext, out: AudioNode, start: number, pitch: number) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const lp = ac.createBiquadFilter()
  const lfo = ac.createOscillator() // 진폭 떨림으로 그르렁 질감
  const lfoGain = ac.createGain()
  const dur = 0.4
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(95 * pitch, start)
  lp.type = 'lowpass'
  lp.frequency.value = 500 * pitch
  lfo.frequency.value = 26
  lfoGain.gain.value = 0.25
  lfo.connect(lfoGain)
  lfoGain.connect(gain.gain)
  gain.gain.setValueAtTime(0.5, start)
  gain.gain.setValueAtTime(0.5, start + dur - 0.05)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(lp)
  lp.connect(gain)
  gain.connect(out)
  osc.start(start)
  lfo.start(start)
  osc.stop(start + dur + 0.02)
  lfo.stop(start + dur + 0.02)
  return dur
}

/** "아우우~" 울부짖음 — 길게 올라갔다 내려오며 떨림 */
function playHowl(ac: AudioContext, out: AudioNode, start: number, pitch: number) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const band = ac.createBiquadFilter()
  const vib = ac.createOscillator()
  const vibGain = ac.createGain()
  const dur = 0.95
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(230 * pitch, start)
  osc.frequency.linearRampToValueAtTime(340 * pitch, start + dur * 0.35)
  osc.frequency.linearRampToValueAtTime(250 * pitch, start + dur * 0.7)
  osc.frequency.exponentialRampToValueAtTime(180 * pitch, start + dur)
  band.type = 'bandpass'
  band.frequency.value = 900 * pitch
  band.Q.value = 3
  vib.frequency.value = 6
  vibGain.gain.value = 12 * pitch
  vib.connect(vibGain)
  vibGain.connect(osc.frequency)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.85, start + 0.1)
  gain.gain.setValueAtTime(0.85, start + dur - 0.2)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(band)
  band.connect(gain)
  gain.connect(out)
  osc.start(start)
  vib.start(start)
  osc.stop(start + dur + 0.02)
  vib.stop(start + dur + 0.02)
  return dur
}

/** dogSpeak 토큰들을 순서대로 소리로 재생 */
export function playTokens(character: CharacterId, tokens: SoundToken[]) {
  const ac = getCtx()
  if (!ac) return
  if (ac.state === 'suspended') ac.resume()

  const master = ac.createGain()
  master.gain.value = 1.0
  const comp = ac.createDynamicsCompressor()
  master.connect(comp)
  comp.connect(ac.destination)

  const pitch = PITCH[VOICE[character]]
  let t = ac.currentTime + 0.02

  for (const tok of tokens) {
    if (tok.kind === 'bark') {
      // 음절 반복 수만큼 연속으로 짖는다
      for (let i = 0; i < Math.max(1, tok.reps); i++) {
        playBark(ac, master, t, pitch * (1 - i * 0.02))
        t += 0.16
      }
      t += 0.06 // 그룹 간 간격
    } else if (tok.kind === 'whine') {
      t += playWhine(ac, master, t, pitch) + 0.05
    } else if (tok.kind === 'growl') {
      t += playGrowl(ac, master, t, pitch) + 0.06
    } else {
      t += playHowl(ac, master, t, pitch) + 0.08
    }
  }
}
