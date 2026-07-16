import type { CharacterId } from './characters'

/**
 * 외부 음원 파일 없이 Web Audio API 로 "멍!" 소리를 합성한다.
 * 캐릭터마다 음높이(pitch)를 다르게 주어 큰 개는 낮게, 작은 개는 높게 짖는다.
 */

// 큰 개일수록 낮고, 작은 개일수록 높게
const PITCH: Record<CharacterId, number> = {
  golden: 0.95,
  shiba: 1.1,
  chihuahua: 1.7,
  jindo: 0.85,
  bulldog: 0.65,
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

/** 한 번의 "우프" 를 합성해 재생 */
function woof(ac: AudioContext, start: number, pitch: number) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  const band = ac.createBiquadFilter()

  osc.type = 'sawtooth'
  // 빠르게 떨어지는 음높이 → 개 짖는 소리 특유의 억양
  osc.frequency.setValueAtTime(380 * pitch, start)
  osc.frequency.exponentialRampToValueAtTime(150 * pitch, start + 0.12)

  band.type = 'bandpass'
  band.frequency.value = 900 * pitch
  band.Q.value = 1.2

  // 짧은 어택 후 감쇠하는 진폭 엔벨로프
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)

  osc.connect(band)
  band.connect(gain)
  gain.connect(ac.destination)

  osc.start(start)
  osc.stop(start + 0.2)
}

/** 선택한 캐릭터 음높이로 "멍멍!" (두 번) 짖는다 */
export function bark(character: CharacterId) {
  const ac = getCtx()
  if (!ac) return
  // 브라우저 자동재생 정책: 사용자 제스처(번역 클릭) 안에서 resume
  if (ac.state === 'suspended') ac.resume()

  const pitch = PITCH[character]
  const now = ac.currentTime
  woof(ac, now, pitch)
  woof(ac, now + 0.22, pitch * 0.98)
}
