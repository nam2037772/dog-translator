import type { CharacterId } from './characters'

/**
 * 개소리(의성어) 변환 엔진 — 규칙 기반 + 시드 기반 통제 랜덤.
 *
 * 사람 문장을 "개가 듣고 내는 소리"처럼 한국어 의성어로 변환한다.
 * 반영 요소:
 *   1) 문장 길이  — 짧으면 단호한 한 번, 길면 연속 짖음 + 낑낑 + 울음
 *   2) 문장 부호  — ! 강한 짖음 / ? 갸웃 / ... 망설임·낑낑
 *   3) 견종 특성  — 소형(높고 빠름) / 중형(기본) / 대형(낮고 묵직) / 하울러(울부짖음)
 *   4) 시드       — 같은 입력이면 항상 같은 패턴, 입력이 다르면 달라짐(통제 가능)
 */

export type VoiceType = 'small' | 'medium' | 'large' | 'howler'

/** 견종 → 목소리 타입. 진돗개는 하울링(울부짖음)이 특징이라 howler(허스키 계열)로 둔다. */
export const VOICE: Record<CharacterId, VoiceType> = {
  chihuahua: 'small',
  shiba: 'medium',
  golden: 'large',
  bulldog: 'large',
  jindo: 'howler',
}

export type SoundKind = 'bark' | 'whine' | 'growl' | 'howl'

/** 소리 한 덩어리 — 화면 표시(text)와 오디오 합성(kind/reps) 양쪽에서 쓴다. */
export interface SoundToken {
  kind: SoundKind
  text: string
  reps: number // 음절 반복 수(오디오 짖음 횟수)
}

export interface DogSpeak {
  text: string
  tokens: SoundToken[]
}

// 견종 목소리별 기본 짖음 의성어
const BARKS: Record<VoiceType, string[]> = {
  small: ['깽', '컹', '왈', '앙'],
  medium: ['멍', '왈', '컹'],
  large: ['웡', '워헝', '컹', '우웡'],
  howler: ['웡', '컹', '우'],
}
const WHINES = ['낑', '끼잉', '깨갱', '끄응'] // 낑낑거림
const GROWLS = ['으르릉', '그르릉', '크르릉'] // 으르렁
const HOWLS: Record<VoiceType, string[]> = {
  small: ['아우~', '애옹~'],
  medium: ['아우우~', '어우~'],
  large: ['어우우~', '오오온~'],
  howler: ['아우우우~', '어우우우~', '오오오온~'],
}

// ---- 시드 기반 통제 랜덤 (FNV-1a 해시 + mulberry32) ----
function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T,>(arr: T[], r: () => number): T => arr[Math.floor(r() * arr.length)]
const randInt = (min: number, max: number, r: () => number): number =>
  min + Math.floor(r() * (max - min + 1))

/** 사람 문장 → 개소리 의성어 */
export function toDogSpeak(rawText: string, character: CharacterId): DogSpeak {
  const voice = VOICE[character]
  const text = rawText.trim()
  if (!text) return { text: '…?', tokens: [{ kind: 'whine', text: '…?', reps: 1 }] }

  // 같은 입력 + 같은 견종이면 항상 같은 결과(통제 가능한 랜덤)
  const r = mulberry32(hashSeed(text + '|' + voice))

  const len = text.replace(/\s/g, '').length
  const strong = /!/.test(text)
  const question = /\?/.test(text)
  const hesitate = /(\.\.\.|…|\.\.)/.test(text)

  const tokens: SoundToken[] = []

  // 1) 강한 문장(!) → 대형·중형견은 으르렁으로 시작
  if (strong && (voice === 'large' || voice === 'medium') && r() < 0.7) {
    tokens.push({ kind: 'growl', text: pick(GROWLS, r) + '!', reps: 1 })
  }

  // 2) 메인 짖음 그룹 수 = 문장 길이 기반 (+ 강조 시 가산)
  let groups = len <= 5 ? 1 : len <= 12 ? 2 : len <= 22 ? 3 : 4
  if (strong) groups += 1
  groups = Math.min(groups, 6)

  const end = strong ? '!' : question ? '?' : ''
  for (let i = 0; i < groups; i++) {
    const syl = pick(BARKS[voice], r)
    // 소형견은 빠르게 여러 번, 대형견은 묵직하게 적게
    const reps =
      voice === 'small' ? randInt(2, 3, r) : voice === 'large' ? randInt(1, 2, r) : randInt(1, 2, r)
    const body = syl.repeat(reps)
    const isLast = i === groups - 1
    tokens.push({ kind: 'bark', text: body + (isLast ? end : strong ? '!' : ''), reps })
  }

  // 3) 물음표(?) → 고개 갸웃한 느낌의 짧은 되물음
  if (question) {
    tokens.push({ kind: 'bark', text: pick(BARKS[voice], r) + '…?', reps: 1 })
  }

  // 4) 말줄임(...) → 망설임 / 낑낑거림
  if (hesitate) {
    tokens.push({ kind: 'whine', text: pick(WHINES, r) + '…', reps: 1 })
    if (r() < 0.5) tokens.push({ kind: 'whine', text: pick(WHINES, r) + '…', reps: 1 })
  }

  // 5) 긴 문장 → 울음(하울링) / 낑낑 섞기
  if (len > 15) {
    if (voice === 'howler' || r() < 0.5) {
      tokens.push({ kind: 'howl', text: pick(HOWLS[voice], r), reps: 1 })
    }
    if (r() < 0.6) tokens.push({ kind: 'whine', text: pick(WHINES, r) + '…', reps: 1 })
  }

  // 하울러(진돗개)는 항상 울음으로 마무리
  if (voice === 'howler' && !tokens.some((t) => t.kind === 'howl')) {
    tokens.push({ kind: 'howl', text: pick(HOWLS[voice], r), reps: 1 })
  }

  return { text: tokens.map((t) => t.text).join(' '), tokens }
}
