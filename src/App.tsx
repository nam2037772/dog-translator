import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { CHARACTERS, CHARACTER_MAP, type CharacterId } from './characters'
import { translate } from './translate'
import { toDogSpeak, type SoundToken } from './dogSpeak'
import { playTokens } from './bark'

interface Result {
  input: string
  dogSpeak: string // 개소리 의성어 (메인 출력)
  tokens: SoundToken[] // 오디오 합성용
  meaning: string // 강아지 속뜻(성격 번역)
  character: CharacterId
}

export default function App() {
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState<CharacterId>('shiba')
  const [result, setResult] = useState<Result | null>(null)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [muted, setMuted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleTranslate = () => {
    if (!input.trim()) return
    const speak = toDogSpeak(input, selected)
    setResult({
      input: input.trim(),
      dogSpeak: speak.text,
      tokens: speak.tokens,
      meaning: translate(input, selected),
      character: selected,
    })
    setCopied(false)
    if (!muted) playTokens(selected, speak.tokens)
  }

  const handleCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(
        `${result.dogSpeak}\n(속뜻: ${result.meaning})`,
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const handleSaveImage = async () => {
    if (!cardRef.current) return
    setSaving(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#fff8ee',
      })
      const link = document.createElement('a')
      link.download = '개소리변환.png'
      link.href = dataUrl
      link.click()
    } catch {
      // 이미지 저장 실패 시 조용히 무시
    } finally {
      setSaving(false)
    }
  }

  const resultChar = result ? CHARACTER_MAP[result.character] : null

  return (
    <div className="app">
      <header className="header">
        <button
          type="button"
          className="mute-btn"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
          title={muted ? '소리 켜기' : '소리 끄기'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <h1>🐶 사람말 개소리 변환기</h1>
        <p className="subtitle">사람 말을 진짜 개소리로 변환해드려요</p>
        <p className="tagline">직장상사의 말을 개소리로 변환해드립니다 😏</p>
      </header>

      <main className="panel">
        <label className="field-label" htmlFor="msg">
          하고 싶은 말
        </label>
        <textarea
          id="msg"
          className="input"
          placeholder="예) 오늘 야근해야 해."
          value={input}
          maxLength={200}
          rows={3}
          onChange={(e) => setInput(e.target.value)}
        />

        <span className="field-label">강아지 선택</span>
        <div className="characters">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`char-btn${selected === c.id ? ' selected' : ''}`}
              style={
                selected === c.id
                  ? { borderColor: c.color, background: `${c.color}22` }
                  : undefined
              }
              onClick={() => setSelected(c.id)}
            >
              <span className="char-emoji">{c.emoji}</span>
              <span className="char-name">{c.name}</span>
              <span className="char-persona">{c.personality}</span>
            </button>
          ))}
        </div>

        <button type="button" className="translate-btn" onClick={handleTranslate}>
          번역하기 🐾
        </button>
      </main>

      {result && resultChar && (
        <section className="result-section">
          <div
            className="result-card"
            ref={cardRef}
            style={{ borderColor: resultChar.color }}
          >
            <div className="result-quote">“{result.input}”</div>
            <div className="result-arrow">↓</div>
            <div className="result-char" style={{ color: resultChar.color }}>
              <span className="result-char-emoji">{resultChar.emoji}</span>
              {resultChar.name}
            </div>
            <p className="result-dogspeak">{result.dogSpeak}</p>
            <p className="result-meaning">속뜻 · {result.meaning}</p>
            <div className="result-watermark">🐶 사람말 개소리 변환기</div>
          </div>

          <div className="result-actions">
            <button
              type="button"
              className="action-btn"
              onClick={() => playTokens(result.character, result.tokens)}
            >
              다시 듣기 🔊
            </button>
            <button type="button" className="action-btn" onClick={handleCopy}>
              {copied ? '복사됨! ✅' : '복사 📋'}
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={handleSaveImage}
              disabled={saving}
            >
              {saving ? '저장 중…' : '이미지 저장 🖼️'}
            </button>
          </div>
        </section>
      )}

      <footer className="footer">회원가입 없음 · 저장 없음 · 브라우저에서 바로</footer>
    </div>
  )
}
