# 🐶 개소리 번역기 (Dog Translator)

사람의 말을 강아지 입장에서 번역해주는 초경량 웹앱.
**회원가입 없음 · DB 없음 · 서버 저장 없음 · 브라우저에서 바로 동작.**

## 특징

- 문장을 입력하고 강아지 캐릭터를 고르면, 그 성격대로 "번역"해줍니다.
- 캐릭터: 골든리트리버 · 시바견 · 치와와 · 진돗개 · 불독
- 결과 카드 **복사** / **이미지 저장** 지원
- 번역은 100% 브라우저 안에서 동작하는 규칙 기반 엔진입니다. (외부 API·서버 키 불필요)

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

수동 배포(폴백)가 필요하면 `npm run deploy` 로 `gh-pages` 브랜치에 직접 올릴 수도 있습니다.

`vite.config.ts` 의 `base` 는 `'./'` 로 설정되어 있어 어떤 하위 경로에서도 동작합니다.
