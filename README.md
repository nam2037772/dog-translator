# 🐶 사람말 개소리 변환기 (Dog Translator)

사람의 말을 진짜 개소리로 변환해주는 초경량 웹앱.
**회원가입 없음 · DB 없음 · 서버 저장 없음 · 브라우저에서 바로 동작.**

## 특징

- 문장을 입력하고 강아지를 고르면 **개소리(한국어 의성어)** 로 변환해줍니다. 예) `밥 줘!` → `앙앙! 컹컹컹!`
- 변환은 **규칙 + 시드 기반**([src/dogSpeak.ts](src/dogSpeak.ts)) — 문장 길이·문장부호(`! ? ...`)·견종 특성을 반영하고, 같은 입력이면 항상 같은 결과가 나옵니다.
- 견종별 목소리: 소형(치와와, 높고 빠름) · 중형(시바, 기본) · 대형(골든·불독, 낮고 묵직) · 하울러(진돗개, 울부짖음)
- 화면의 의성어와 **소리**가 일치합니다 — **실제 개 짖음·울음 녹음(퍼블릭 도메인/CC0)** 을 견종별 재생 속도로 변형해 재생합니다([src/assets/CREDITS.md](src/assets/CREDITS.md)). 아래에 강아지 **속뜻**(성격 번역)도 함께 표시됩니다.
- 결과 카드 **복사** / **이미지 저장**, 소리 **음소거** 지원
- 100% 브라우저 안에서 동작 (외부 API·서버 키 불필요)

## 검증

```bash
npx tsx src/dogSpeak.verify.ts   # 길이/부호/견종/시드 결정성 규칙 검증 + 예시 출력
```

## 개발

```bash
npm install
npm run dev      # 로컬 개발 서버
npm run build    # dist/ 정적 빌드
npm run preview  # 빌드 결과 미리보기
```

## 배포 (GitHub Pages · 자동)

`main` 브랜치에 push 하면 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 이
자동으로 빌드·배포합니다. 저장소 **Settings → Pages → Source** 는 **GitHub Actions** 로 설정합니다.

```bash
git push origin main   # push 하면 자동 배포
```

`vite.config.ts` 의 `base` 는 `'./'` 로 설정되어 있어 어떤 하위 경로에서도 동작합니다.
