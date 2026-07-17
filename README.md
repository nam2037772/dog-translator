# 🦮 골든 리트리버 통역기 (Dog Translator)

듬직한 **골든 리트리버**가 당신의 말을 통역해주는 초경량 웹앱.
**회원가입 없음 · DB 없음 · 서버 저장 없음 · 빌드 없음 · 브라우저에서 바로 동작.**

## 특징

- 하고 싶은 말을 입력하고 **번역하기 🐾** 를 누르면, 골든 리트리버의 **개소리(한국어 의성어)** 로 변환해줍니다. 예) `밥 줘!` → `멍! 웡!`
- 변환은 **규칙 + 시드 기반**([script.js](script.js)) — 문장 길이·문장부호(`! ? ...`)를 반영하고, 같은 입력이면 항상 같은 결과가 나옵니다.
- 화면의 의성어와 **소리**가 일치합니다 — 실제 개 짖음 녹음([assets/](assets/))을 **글자 단위**로 재생하며, 매번 `playbackRate`를 0.88~1.02배로 미세하게 흔들어 대형견 특유의 묵직함을 냅니다. `cloneNode()`로 짖음을 자연스럽게 겹칩니다.
- 아래에 강아지 **속뜻**(성격 번역)도 함께 표시됩니다.
- 결과 카드 **복사**, 소리 **다시 듣기 / 음소거** 지원
- 100% 브라우저 안에서 동작 (외부 API·서버·빌드 도구 불필요)

## 구조

순수 정적 사이트입니다. 빌드 단계가 없습니다.

```
index.html      # 마크업
style.css       # 스타일
script.js       # 개소리 변환 + 사운드 재생 로직
assets/         # 짖음 샘플 (dog1.mp3 ~ dog5.mp3) + CREDITS.md
```

## 🔊 소리 직접 교체하기

내 음원으로 바꾸려면 [`assets/`](assets/) 의 `dog1.mp3` ~ `dog5.mp3` 를 **같은 이름으로** 덮어쓰면 됩니다.

- 권장 형식: mp3 · 모노 · 0.2~0.5초 내외의 **단일 짧은 짖음** (글자 단위로 겹쳐 재생되므로 짧을수록 자연스럽습니다).
- 파일 개수를 바꾸려면 [script.js](script.js) 상단 `BARK_SOURCES` 배열만 수정하면 됩니다.
- 재생 속도(피치)는 코드가 자동으로 랜덤 조절합니다.
- 교체 후 `git push` 하면 자동 배포됩니다. (본인이 권리를 가진 음원만 사용하세요. 라이선스는 [assets/CREDITS.md](assets/CREDITS.md) 참고.)

## 로컬 실행

빌드가 없으므로 정적 서버로 열기만 하면 됩니다.

```bash
python -m http.server 8000   # 그 후 http://localhost:8000 접속
```

> `index.html` 을 파일로 바로 열어도 대부분 동작하지만, 일부 브라우저는 `file://` 에서 오디오 로드를 제한하므로 로컬 서버 사용을 권장합니다.

## 배포 (GitHub Pages · 자동)

`main` 브랜치에 push 하면 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 이
`index.html · style.css · script.js · assets/` 만 모아 자동 배포합니다.
저장소 **Settings → Pages → Source** 는 **GitHub Actions** 로 설정합니다.

```bash
git push origin main   # push 하면 자동 배포
```

모든 경로는 앞 슬래시 없는 **상대 경로**(`assets/dog1.mp3`)라 GitHub Pages 하위 경로와
Capacitor 웹뷰 양쪽에서 그대로 동작합니다.
