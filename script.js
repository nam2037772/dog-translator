/*
 * 골든 리트리버 통역기 — 순수 바닐라 JS (빌드 불필요)
 *
 * 사운드: Web Audio API 오실레이터(전자음) 없이, 실제 짖음 MP3 샘플만 사용.
 *   - assets/dogN.mp3 를 상대 경로(앞 슬래시 없음)로 로드 → 웹(GitHub Pages) + 앱(Capacitor 웹뷰) 모두 동작
 *   - cloneNode()로 매번 독립 오디오 노드를 만들어 자연스럽게 겹쳐 짖음
 *   - playbackRate 0.88~1.02 랜덤 → 대형견 특유의 묵직함 + 매번 미세한 피치 변화
 *   - 글자당 0.3~0.4초 간격, 띄어쓰기(숨 고르기)엔 0.45~0.5초 쉼
 */

'use strict';

/* ------------------------------------------------------------------ *
 * 1. 사운드 엔진
 * ------------------------------------------------------------------ */

// 상대 경로(앞 슬래시 X) — Capacitor 웹뷰 + GitHub Pages 하위 경로 모두 안전
const BARK_SOURCES = [
  'assets/dog1.mp3',
  'assets/dog2.mp3',
  'assets/dog3.mp3',
  'assets/dog4.mp3',
  'assets/dog5.mp3',
];

// 재생 템포(ms)
const CHAR_MIN = 300; // 글자당 최소 간격
const CHAR_MAX = 400; // 글자당 최대 간격
const BREATH_MIN = 450; // 띄어쓰기(숨 고르기) 최소
const BREATH_MAX = 500; // 띄어쓰기(숨 고르기) 최대

// 피치(재생 속도) — 대형견의 묵직함. 0.88~1.02배속.
const RATE_MIN = 0.88;
const RATE_MAX = 1.02;

const rand = (min, max) => min + Math.random() * (max - min);

let muted = false;
let pendingTimers = []; // 예약된 짖음 setTimeout 핸들

// 샘플 프리로드(원본 유지, 재생 시엔 항상 복제본을 사용)
const barkPool = BARK_SOURCES.map((src) => {
  const a = new Audio(src);
  a.preload = 'auto';
  return a;
});

/** 짖음 한 번 — 랜덤 샘플을 복제해 랜덤 피치로 재생(겹침 허용) */
function playBark() {
  if (muted) return;
  const base = barkPool[Math.floor(Math.random() * barkPool.length)];
  const node = base.cloneNode(); // 독립 노드 → 이전 짖음을 끊지 않고 겹침
  node.playbackRate = rand(RATE_MIN, RATE_MAX);
  node.volume = 0.9;
  const p = node.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}

/** 예약된 모든 짖음 취소(새로 번역하거나 다시 들을 때) */
function stopSpeaking() {
  pendingTimers.forEach(clearTimeout);
  pendingTimers = [];
}

/**
 * 개소리 문자열을 글자 단위로 순차 재생.
 * 글자마다 짖음 1번(0.3~0.4초 간격), 공백은 숨 고르기(0.45~0.5초).
 */
function speak(text) {
  stopSpeaking();
  if (muted) return;
  let delay = 0;
  for (const ch of text) {
    if (ch === ' ' || ch === '\n' || ch === '\t') {
      delay += rand(BREATH_MIN, BREATH_MAX); // 리트리버가 숨 고르는 쉼
    } else {
      pendingTimers.push(setTimeout(playBark, delay));
      delay += rand(CHAR_MIN, CHAR_MAX); // 묵직한 대형견 템포
    }
  }
}

/* ------------------------------------------------------------------ *
 * 2. 개소리(의성어) 생성 — 골든 리트리버(대형견) 목소리
 * ------------------------------------------------------------------ */

// 같은 입력이면 항상 같은 패턴이 나오도록 시드 기반 통제 랜덤 (FNV-1a + mulberry32)
function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
const randInt = (min, max, r) => min + Math.floor(r() * (max - min + 1));

// 대형견(리트리버) 의성어
const BARKS = ['웡', '워헝', '컹', '우웡', '멍'];
const WHINES = ['낑', '끄응', '깨갱'];
const GROWLS = ['으르릉', '그르릉'];
const HOWLS = ['어우우~', '오오온~', '우우웡~'];

/** 사람 문장 → 골든 리트리버 개소리 의성어 */
function toDogSpeak(rawText) {
  const text = rawText.trim();
  if (!text) return '…?';

  const r = mulberry32(hashSeed(text));
  const len = text.replace(/\s/g, '').length;
  const strong = /!/.test(text);
  const question = /\?/.test(text);
  const hesitate = /(\.\.\.|…|\.\.)/.test(text);

  const parts = [];

  // 강한 문장(!) → 낮게 깔리는 으르렁으로 시작
  if (strong && r() < 0.7) {
    parts.push(pick(GROWLS, r) + '!');
  }

  // 메인 짖음 그룹 수 = 문장 길이 기반
  let groups = len <= 5 ? 1 : len <= 12 ? 2 : len <= 22 ? 3 : 4;
  if (strong) groups += 1;
  groups = Math.min(groups, 6);

  const end = strong ? '!' : question ? '?' : '';
  for (let i = 0; i < groups; i++) {
    const syl = pick(BARKS, r);
    const reps = randInt(1, 2, r); // 대형견은 묵직하게 적게
    const body = syl.repeat(reps);
    const isLast = i === groups - 1;
    parts.push(body + (isLast ? end : strong ? '!' : ''));
  }

  // 물음표 → 고개 갸웃한 되물음
  if (question) parts.push(pick(BARKS, r) + '…?');

  // 말줄임 → 망설임/낑낑
  if (hesitate) parts.push(pick(WHINES, r) + '…');

  // 긴 문장 → 울음(하울링) 섞기
  if (len > 15 && r() < 0.6) parts.push(pick(HOWLS, r));

  return parts.join(' ');
}

/* ------------------------------------------------------------------ *
 * 3. 속뜻(성격) 번역 — 골든 리트리버: 다정하고 무한 긍정 애교쟁이
 * ------------------------------------------------------------------ */

const MOOD_KEYWORDS = {
  work: ['야근', '일해', '일이', '업무', '출근', '회사', '프로젝트', '마감', '보고서', '회의'],
  tired: ['피곤', '지쳐', '힘들', '지친', '녹초', '기운', '번아웃'],
  food: ['밥', '배고', '먹', '치킨', '간식', '점심', '저녁', '맛있', '고기'],
  sleep: ['자', '잘래', '졸려', '잠', '눕', '이불'],
  happy: ['좋아', '행복', '신나', '기뻐', '최고', '설레', '기분 좋'],
  sad: ['슬프', '우울', '눈물', '울', '외로', '속상', '서운'],
  angry: ['화나', '짜증', '열받', '빡', '싫어', '어이없'],
  love: ['사랑', '좋아해', '보고싶', '그리워', '설렘'],
  walk: ['산책', '나가', '외출', '놀러', '여행', '바람'],
  study: ['공부', '시험', '숙제', '과제', '자격증', '학교'],
  money: ['돈', '월급', '통장', '카드값', '거지', '가난', '월세'],
  sick: ['아파', '아프', '감기', '병원', '두통', '몸살'],
  rest: ['쉬', '주말', '휴가', '연차', '쉬고', '누워'],
  boss: ['상사', '사장', '부장', '팀장', '꼰대', '갑질'],
};

const RESPONSES = {
  work: [
    '헥헥! 인간 오늘도 열심히네?! 나 여기서 꼬리 흔들면서 응원할게! 파이팅!!',
    '일 끝나면 나랑 놀아줄 거지?! 나 문 앞에서 기다릴게! 사랑해!',
  ],
  tired: [
    '힘들었구나… 이리 와, 내 배 위에 얼굴 묻어도 돼! 다 괜찮아질 거야!',
    '괜찮아 괜찮아! 내가 옆에 있잖아! 꼬리 흔들어줄게!',
  ],
  food: [
    '밥?! 밥이라고 했어?! 나도!! 나도 줘!! 나 착한 강아지야!!',
    '맛있는 거다!! 조금만… 아주 조금만 나눠주면 안 될까? 사랑할게!',
  ],
  sleep: ['같이 자자! 내가 발 따뜻하게 데워줄게! 코~ 하자!'],
  happy: ['꺄!! 나도 좋아!! 신난다!! 빙글빙글 돌아야지!! 왈왈!'],
  sad: ['슬퍼하지 마… 내가 핥아줄게. 너는 세상에서 제일 좋은 사람이야.'],
  angry: ['음… 화났구나. 그래도 나 보면 조금은 웃기지? 배 보여줄까?'],
  love: ['나도!! 나도 사랑해!! 세상에서 제일제일 사랑해!! 꼬리 빠지겠어!'],
  walk: ['산책?! 산책이라 그랬어?! 목줄 어딨어!! 빨리!! 얼른!! 왈!!'],
  study: ['공부 열심히 하는 너 정말 멋져! 나 옆에서 얌전히 있을게!'],
  money: ['돈 없어도 괜찮아! 나는 너만 있으면 세상 다 가진 기분인걸!'],
  sick: ['아프지 마… 나 걱정돼. 내가 옆에 딱 붙어서 지켜줄게.'],
  rest: ['오늘은 같이 뒹굴자! 햇볕 좋은 데서 낮잠! 완전 최고야!'],
  boss: ['그 사람이 너 힘들게 했어? 내가 다음에 만나면 꼬리로 혼내줄게!'],
  default: ['무슨 말인지 잘 모르겠지만 네가 하는 말이면 다 좋아! 왈왈!'],
};

function detectMoods(text) {
  const found = [];
  for (const mood of Object.keys(MOOD_KEYWORDS)) {
    if (MOOD_KEYWORDS[mood].some((kw) => text.includes(kw))) found.push(mood);
  }
  return found;
}
const pickPlain = (arr) => arr[Math.floor(Math.random() * arr.length)];

function translate(input) {
  const text = input.trim();
  if (!text) return pickPlain(RESPONSES.default);
  const moods = detectMoods(text);
  if (moods.length === 0) return pickPlain(RESPONSES.default);
  return pickPlain(RESPONSES[pickPlain(moods)]);
}

/* ------------------------------------------------------------------ *
 * 4. UI 연결
 * ------------------------------------------------------------------ */

const els = {
  input: document.getElementById('msg'),
  translateBtn: document.getElementById('translateBtn'),
  muteBtn: document.getElementById('muteBtn'),
  resultSection: document.getElementById('resultSection'),
  quote: document.getElementById('resultQuote'),
  dogspeak: document.getElementById('resultDogspeak'),
  meaning: document.getElementById('resultMeaning'),
  replayBtn: document.getElementById('replayBtn'),
  copyBtn: document.getElementById('copyBtn'),
};

let lastDogspeak = '';
let lastMeaning = '';

function handleTranslate() {
  const raw = els.input.value.trim();
  if (!raw) {
    els.input.focus();
    return;
  }
  lastDogspeak = toDogSpeak(raw);
  lastMeaning = translate(raw);

  els.quote.textContent = '“' + raw + '”';
  els.dogspeak.textContent = lastDogspeak;
  els.meaning.textContent = '속뜻 · ' + lastMeaning;
  els.resultSection.hidden = false;

  speak(lastDogspeak);
}

els.translateBtn.addEventListener('click', handleTranslate);

// 입력창에서 Enter(Shift 없이) → 번역
els.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleTranslate();
  }
});

els.replayBtn.addEventListener('click', () => {
  if (lastDogspeak) speak(lastDogspeak);
});

els.copyBtn.addEventListener('click', async () => {
  if (!lastDogspeak) return;
  try {
    await navigator.clipboard.writeText(lastDogspeak + '\n(속뜻: ' + lastMeaning + ')');
    els.copyBtn.textContent = '복사됨! ✅';
    setTimeout(() => {
      els.copyBtn.textContent = '복사 📋';
    }, 1500);
  } catch {
    /* 클립보드 권한 없으면 조용히 무시 */
  }
});

els.muteBtn.addEventListener('click', () => {
  muted = !muted;
  if (muted) stopSpeaking();
  els.muteBtn.textContent = muted ? '🔇' : '🔊';
  els.muteBtn.setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기');
  els.muteBtn.setAttribute('title', muted ? '소리 켜기' : '소리 끄기');
});
