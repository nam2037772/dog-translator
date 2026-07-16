import type { CharacterId } from './characters'

/**
 * 외부 음원 파일 없이 Web Audio API 로 캐릭터별 짖는 소리를 합성한다.
 * 음높이뿐 아니라 짖는 횟수 · 길이 · 음색까지 캐릭터마다 다르게 준다.
 */

interface BarkProfile {
  startFreq: number // 짖음 시작 음높이(Hz)
  endFreq: number // 끝 음높이(Hz) — 빠르게 떨어지며 억양을 만든다
  dur: number // 한 번 짖는 길이(s)
  gap: number // 짖음 간격(s)
  minCount: number // 최소 짖는 횟수(짧은 문장)
  maxCount: number // 최대 짖는 횟수(긴 문장)
  rate: number // 글자당 늘어나는 횟수 — 성격별 반응성
  type: OscillatorType // 음색
  q: number // 밴드패스 Q — 클수록 날카로움
  brightness: number // 밴드패스 중심주파수 배수
}

const PROFILES: Record<CharacterId, BarkProfile> = {
  // 다정한 "멍! 멍!" — 길면 신나서 더 짖는다
  golden: { startFreq: 420, endFreq: 170, dur: 0.2, gap: 0.24, minCount: 2, maxCount: 7, rate: 0.14, type: 'sawtooth', q: 1.1, brightness: 2.2 },
  // 시크하고 날카로운 "왈! 왈!" — 반응 무던
  shiba: { startFreq: 500, endFreq: 210, dur: 0.16, gap: 0.19, minCount: 1, maxCount: 5, rate: 0.09, type: 'square', q: 2.2, brightness: 2.6 },
  // 다급한 고음 "깽깽깽!" — 문장 길면 폭발적으로 늘어남
  chihuahua: { startFreq: 820, endFreq: 560, dur: 0.09, gap: 0.11, minCount: 3, maxCount: 12, rate: 0.32, type: 'sawtooth', q: 3.2, brightness: 3.2 },
  // 묵직하고 진중한 "웡— 웡—"
  jindo: { startFreq: 260, endFreq: 110, dur: 0.28, gap: 0.34, minCount: 2, maxCount: 5, rate: 0.1, type: 'sawtooth', q: 0.9, brightness: 1.6 },
  // 낮고 느긋한 "우웡—" — 길어도 귀찮아서 거의 안 늘어남
  bulldog: { startFreq: 190, endFreq: 80, dur: 0.34, gap: 0.4, minCount: 1, maxCount: 3, rate: 0.04, type: 'sawtooth', q: 0.7, brightness: 1.4 },
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

/** 한 번의 짖음을 합성해 master 로 보낸다 */
function woof(ac: AudioContext, master: AudioNode, start: number, p: BarkProfile) {
  const osc = ac.createOscillator()
  const sub = ac.createOscillator() // 한 옥타브 아래 — 소리에 두께를 준다
  const gain = ac.createGain()
  const band = ac.createBiquadFilter()

  osc.type = p.type
  sub.type = 'triangle'
  osc.frequency.setValueAtTime(p.startFreq, start)
  osc.frequency.exponentialRampToValueAtTime(p.endFreq, start + p.dur)
  sub.frequency.setValueAtTime(p.startFreq / 2, start)
  sub.frequency.exponentialRampToValueAtTime(p.endFreq / 2, start + p.dur)

  band.type = 'bandpass'
  band.frequency.value = p.startFreq * p.brightness
  band.Q.value = p.q

  // 크고 또렷한 진폭 엔벨로프
  const peak = 0.95
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012)
  gain.gain.setValueAtTime(peak, start + p.dur * 0.5)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + p.dur)

  osc.connect(band)
  sub.connect(band)
  band.connect(gain)
  gain.connect(master)

  osc.start(start)
  sub.start(start)
  osc.stop(start + p.dur + 0.02)
  sub.stop(start + p.dur + 0.02)
}

/**
 * 선택한 캐릭터로 짖는다.
 * @param text 입력 문장 — 길수록(공백 제외 글자 수) 더 많이/오래 짖는다.
 */
export function bark(character: CharacterId, text = '') {
  const ac = getCtx()
  if (!ac) return
  // 브라우저 자동재생 정책: 사용자 제스처(클릭) 안에서 resume
  if (ac.state === 'suspended') ac.resume()

  // 전체 음량을 올리고 클리핑을 막기 위한 소프트 리미터
  const master = ac.createGain()
  master.gain.value = 1.0
  const comp = ac.createDynamicsCompressor()
  master.connect(comp)
  comp.connect(ac.destination)

  const p = PROFILES[character]
  // 문장 길이(공백 제외 글자 수)로 짖는 횟수 결정
  const len = text.replace(/\s/g, '').length
  const count = Math.max(
    p.minCount,
    Math.min(p.maxCount, p.minCount + Math.round(len * p.rate)),
  )
  const now = ac.currentTime + 0.01
  for (let i = 0; i < count; i++) {
    // 반복될수록 아주 약간 낮아지게 해 자연스러움을 준다
    const prof = { ...p, startFreq: p.startFreq * (1 - i * 0.03), endFreq: p.endFreq * (1 - i * 0.03) }
    woof(ac, master, now + i * p.gap, prof)
  }
}
