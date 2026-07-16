/**
 * 개소리 변환 검증 스크립트.  실행:  npx tsx src/dogSpeak.verify.ts
 * 문장 길이 / 부호(! ? ...) / 견종별 출력과 시드 결정성(같은 입력=같은 결과)을 확인한다.
 */
import { toDogSpeak } from './dogSpeak'
import { CHARACTERS } from './characters'

let failed = 0
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`)
  if (!cond) failed++
}

// 1) 문장 길이: 짧으면 토큰 적고, 길면 많다
const short = toDogSpeak('밥', 'shiba')
const long = toDogSpeak('오늘 회사에서 야근하고 상사한테 혼나서 너무 힘들고 지쳤어', 'shiba')
check('짧은 문장 < 긴 문장 (토큰 수)', short.tokens.length < long.tokens.length)

// 2) 부호 반영
check('! → 느낌표 포함/으르렁 가능', /!/.test(toDogSpeak('저리 가!', 'golden').text))
check('? → 갸웃(물음표) 포함', /\?/.test(toDogSpeak('산책 갈까?', 'shiba').text))
check('... → 낑낑(whine) 포함', toDogSpeak('오늘 야근이야...', 'bulldog').tokens.some((t) => t.kind === 'whine'))

// 3) 견종: 소형(깽/컹) vs 대형(웡) vs 하울러(울음)
check('소형견(치와와) 높은 소리', /깽|컹|앙|왈/.test(toDogSpeak('배고파', 'chihuahua').text))
check('대형견(불독) 묵직한 소리', /웡|헝|컹/.test(toDogSpeak('배고파', 'bulldog').text))
check('하울러(진돗개) 울음 포함', toDogSpeak('배고파', 'jindo').tokens.some((t) => t.kind === 'howl'))

// 4) 시드 결정성: 같은 입력=같은 결과, 다른 입력=대체로 다름
const a = toDogSpeak('오늘 야근해야 해', 'shiba').text
const b = toDogSpeak('오늘 야근해야 해', 'shiba').text
check('같은 입력 → 같은 출력(결정적)', a === b)

// ---- 사용 예시 3개 ----
console.log('\n=== 사용 예시 3개 ===')
const demos: Array<[string, Parameters<typeof toDogSpeak>[1]]> = [
  ['밥 줘!', 'chihuahua'],
  ['산책 갈까?', 'shiba'],
  ['오늘 회사에서 야근하고 너무 지쳤어...', 'jindo'],
]
for (const [t, c] of demos) {
  const name = CHARACTERS.find((x) => x.id === c)!.name
  console.log(`[${name}] "${t}"\n   → ${toDogSpeak(t, c).text}\n`)
}

console.log(failed === 0 ? '모든 검증 통과 ✅' : `${failed}건 실패 ❌`)
process.exit(failed === 0 ? 0 : 1)
