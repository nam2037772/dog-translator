export type CharacterId =
  | 'golden'
  | 'shiba'
  | 'chihuahua'
  | 'jindo'
  | 'bulldog'

export interface Character {
  id: CharacterId
  name: string
  emoji: string
  personality: string
  color: string
}

export const CHARACTERS: Character[] = [
  {
    id: 'golden',
    name: '골든리트리버',
    emoji: '🦮',
    personality: '다정하고 무한 긍정 애교쟁이',
    color: '#f4a944',
  },
  {
    id: 'shiba',
    name: '시바견',
    emoji: '🐕',
    personality: '시크하고 도도한 마이웨이',
    color: '#e8843c',
  },
  {
    id: 'chihuahua',
    name: '치와와',
    emoji: '🐶',
    personality: '소심하지만 다혈질인 예민보스',
    color: '#c98a5e',
  },
  {
    id: 'jindo',
    name: '진돗개',
    emoji: '🐕‍🦺',
    personality: '충직하고 진지한 상남자',
    color: '#7c8a5a',
  },
  {
    id: 'bulldog',
    name: '불독',
    emoji: '🐾',
    personality: '게으르고 능글맞은 느긋파',
    color: '#9c7b64',
  },
]

export const CHARACTER_MAP: Record<CharacterId, Character> = CHARACTERS.reduce(
  (acc, c) => {
    acc[c.id] = c
    return acc
  },
  {} as Record<CharacterId, Character>,
)
