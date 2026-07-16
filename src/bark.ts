import bark1Url from './assets/bark1.mp3'
import bark2Url from './assets/bark2.mp3'
import howlUrl from './assets/howl.mp3'
import type { CharacterId } from './characters'
import type { SoundToken } from './dogSpeak'

/**
 * 샘플+규칙 하이브리드 개소리 엔진.
 *
 * 실제 개 짖음/울음 녹음(퍼블릭 도메인·CC0, src/assets/CREDITS.md)을 기본 소스로 쓰고,
 * dogSpeak 규칙이 만든 토큰으로 재생을 제어한다:
 *   - 견종 → 재생 속도(playbackRate)로 몸집(피치) 표현
 *   - 문장 길이 → 짖는 횟수(토큰 reps)
 *   - 낑낑/으르렁 → 짖음 샘플을 빠르게/느리게 재생해 파생 (별도 음원 없음)
 *   - 울음 → 실제 하울링 샘플
 * 정적 호스팅에서 그대로 동작하며 외부 서버가 필요 없다.
 */

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

interface Buffers {
  bark1: AudioBuffer
  bark2: AudioBuffer
  howl: AudioBuffer
}
let buffers: Buffers | null = null
let loadPromise: Promise<void> | null = null

async function ensureBuffers(ac: AudioContext): Promise<void> {
  if (buffers) return
  if (!loadPromise) {
    loadPromise = (async () => {
      const decode = async (url: string) => {
        const res = await fetch(url)
        const arr = await res.arrayBuffer()
        return await ac.decodeAudioData(arr)
      }
      const [b1, b2, h] = await Promise.all([
        decode(bark1Url),
        decode(bark2Url),
        decode(howlUrl),
      ])
      buffers = { bark1: b1, bark2: b2, howl: h }
    })().catch(() => {
      loadPromise = null // 실패 시 다음 클릭에 재시도
    })
  }
  await loadPromise
}

// 견종 → 짖음 재생 속도(몸집·피치). 소형 높고 대형 낮다. (과하지 않게 조절)
const BARK_RATE: Record<CharacterId, number> = {
  chihuahua: 1.38,
  shiba: 1.12,
  golden: 0.92,
  bulldog: 0.8,
  jindo: 1.0,
}
// 견종 → 울음 재생 속도
const HOWL_RATE: Record<CharacterId, number> = {
  chihuahua: 1.15,
  shiba: 1.0,
  golden: 0.9,
  bulldog: 0.8,
  jindo: 0.95,
}
// 견종별 기본 짖음 샘플 (소형은 짧고 날카로운 쪽)
const BARK_SAMPLE: Record<CharacterId, 'bark1' | 'bark2'> = {
  chihuahua: 'bark2',
  shiba: 'bark1',
  golden: 'bark1',
  bulldog: 'bark1',
  jindo: 'bark1',
}

const jitter = () => 0.94 + Math.random() * 0.12

function playBuf(
  ac: AudioContext,
  out: AudioNode,
  buf: AudioBuffer,
  start: number,
  rate: number,
  gain: number,
): number {
  const src = ac.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = rate
  const g = ac.createGain()
  g.gain.value = gain
  src.connect(g)
  g.connect(out)
  src.start(start)
  return buf.duration / rate // 실제 재생 길이(s)
}

/** dogSpeak 토큰들을 실제 샘플로 순서대로 재생 */
export async function playTokens(character: CharacterId, tokens: SoundToken[]) {
  const ac = getCtx()
  if (!ac) return
  // 자동재생 정책: 사용자 제스처 안에서 즉시 resume (await 이전에 호출)
  if (ac.state === 'suspended') ac.resume()
  await ensureBuffers(ac)
  if (!buffers) return

  const master = ac.createGain()
  master.gain.value = 0.9
  const comp = ac.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 3
  master.connect(comp)
  comp.connect(ac.destination)

  const rate = BARK_RATE[character]
  const barkBuf = buffers[BARK_SAMPLE[character]]
  let t = ac.currentTime + 0.04

  for (const tok of tokens) {
    if (tok.kind === 'bark') {
      for (let i = 0; i < Math.max(1, tok.reps); i++) {
        const d = playBuf(ac, master, barkBuf, t, rate * jitter(), 1.0)
        t += d * 0.9 + 0.02 // 살짝 겹치게 연속 짖음
      }
      t += 0.05
    } else if (tok.kind === 'growl') {
      // 짖음을 느리게 → 낮게 깔리는 으르렁
      const d = playBuf(ac, master, buffers.bark1, t, rate * 0.5 * jitter(), 0.95)
      t += d + 0.05
    } else if (tok.kind === 'whine') {
      // 짖음을 빠르고 작게 → 짧은 낑낑/깨갱
      const d = playBuf(ac, master, buffers.bark2, t, rate * 1.7 * jitter(), 0.6)
      t += d + 0.07
    } else {
      // 울음(하울링) — 실제 샘플
      const d = playBuf(ac, master, buffers.howl, t, HOWL_RATE[character] * jitter(), 0.9)
      t += d + 0.08
    }
  }
}
