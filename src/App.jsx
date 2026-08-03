import { useState, useEffect, useCallback, useRef } from 'react'
import { categories } from './questions'
import { defaultTeams } from './teams'
import { useAudio } from './useAudio'

const STORAGE_KEY = 'scars-jeopardy-v4'

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return null
}
const saveState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_) {}
}

export default function App() {
  const [screen, setScreen] = useState('splash')
  const [teams, setTeams] = useState(defaultTeams)
  const [answered, setAnswered] = useState({})
  const [active, setActive] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const audio = useAudio()

  useEffect(() => {
    // Wipe old storage keys from prior versions so they can't repopulate
    try {
      localStorage.removeItem('scars-jeopardy-state')
      localStorage.removeItem('scars-jeopardy-v2')
      localStorage.removeItem('scars-jeopardy-v3')
    } catch (_) {}
    const saved = loadState()
    if (saved?.teams && saved?.answered && saved.teams.length === defaultTeams.length) {
      setTeams(saved.teams)
      setAnswered(saved.answered)
    }
  }, [])

  useEffect(() => {
    if (screen === 'board' || screen === 'leaderboard') {
      saveState({ teams, answered })
    }
  }, [teams, answered, screen])

  // Music routing per screen — only after user unlocks audio (browser autoplay policy)
  useEffect(() => {
    if (audio.muted || !audio.unlocked) {
      audio.stopAll()
      return
    }
    if (screen === 'splash' || screen === 'setup' || screen === 'board') {
      if (!active) {
        audio.play('lobby', { loop: true, volume: 0.35 })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, audio.muted, audio.unlocked])

  // Music for question phases:
  // - Question open, not yet revealed → think music
  // - Answer revealed (scoring phase) → silence
  // - No question open → lobby
  useEffect(() => {
    if (audio.muted || !audio.unlocked) return
    if (active && !revealed) {
      audio.play('think', { loop: true, volume: 0.4 })
    } else if (active && revealed) {
      audio.stopAll() // silence during scoring
    } else if (!active && (screen === 'board' || screen === 'setup' || screen === 'splash')) {
      audio.play('lobby', { loop: true, volume: 0.35 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, revealed])

  const openQuestion = (catIdx, qIdx) => {
    const key = `${catIdx}-${qIdx}`
    if (answered[key]) return
    setActive({ catIdx, qIdx })
    setRevealed(false)
  }

  const closeQuestion = () => {
    if (active) {
      const key = `${active.catIdx}-${active.qIdx}`
      setAnswered((prev) => ({ ...prev, [key]: true }))
    }
    setActive(null)
    setRevealed(false)
  }

  const adjustScore = (teamIdx, delta) => {
    setTeams((prev) =>
      prev.map((t, i) => (i === teamIdx ? { ...t, score: t.score + delta } : t))
    )
  }

  const awardPoints = (teamIdx, correct) => {
    if (!active) return
    const value = categories[active.catIdx].questions[active.qIdx].value
    adjustScore(teamIdx, correct ? value : -value)
  }

  const resetGame = () => {
    if (!confirm('Reset the whole game? Clears scores and answered questions.')) return
    setAnswered({})
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })))
    setScreen('board')
  }

  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Escape' && active) closeQuestion()
      if (e.key === ' ' && active && !revealed) {
        e.preventDefault()
        setRevealed(true)
      }
    },
    [active, revealed]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  if (screen === 'splash')
    return <Splash onStart={() => setScreen('setup')} audio={audio} />
  if (screen === 'setup')
    return (
      <Setup
        teams={teams}
        setTeams={setTeams}
        onStart={() => setScreen('board')}
        audio={audio}
      />
    )
  if (screen === 'leaderboard')
    return (
      <Leaderboard
        teams={teams}
        onBack={() => setScreen('board')}
        onReset={resetGame}
        audio={audio}
      />
    )

  return (
    <div className="app">
      <TopBar
        onEnd={() => setScreen('leaderboard')}
        onReset={resetGame}
        audio={audio}
      />
      <Board answered={answered} onSelect={openQuestion} />
      <Scoreboard teams={teams} onAdjust={adjustScore} />
      {active && (
        <QuestionModal
          data={categories[active.catIdx].questions[active.qIdx]}
          category={categories[active.catIdx].name}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onClose={closeQuestion}
          teams={teams}
          onAward={awardPoints}
        />
      )}
    </div>
  )
}

/* ---------- SHARED MUTE BUTTON ---------- */
function MuteButton({ audio, className = '' }) {
  return (
    <button
      className={`mute-btn ${className}`}
      onClick={audio.toggleMute}
      title={audio.muted ? 'Unmute' : 'Mute'}
    >
      {audio.muted ? '🔇' : '🔊'}
    </button>
  )
}

/* ---------- SPLASH ---------- */
function Splash({ onStart, audio }) {
  const handleEnableSound = () => {
    audio.unlock() // this also starts lobby music
  }
  const handleStart = () => {
    if (!audio.unlocked) audio.unlock()
    onStart()
  }
  return (
    <div className="splash" onClick={!audio.unlocked ? handleEnableSound : undefined}>
      <div className="splash-glow" />
      <MuteButton audio={audio} className="floating-mute" />
      <div className="splash-inner">
        <img src="/images/scars-logo.png" alt="SCARS" className="splash-logo" />
        <div className="splash-title">
          <span className="splash-eyebrow">Plastic & Reconstructive Surgery Club · WUM</span>
          <h1>JEOPARDY!</h1>
          <p className="splash-sub">A surgical mind game in four categories.</p>
        </div>
        <button
          className="btn-primary"
          onClick={(e) => { e.stopPropagation(); handleStart() }}
        >
          Begin Game
        </button>
        <div className="splash-footer">SPACE reveals answers · ESC closes question</div>
      </div>
      {!audio.unlocked && !audio.muted && (
        <div className="enable-sound-banner" onClick={(e) => { e.stopPropagation(); handleEnableSound() }}>
          <span className="enable-sound-icon">🔊</span>
          <span>Click anywhere to enable sound</span>
        </div>
      )}
    </div>
  )
}

/* ---------- SETUP ---------- */
function Setup({ teams, setTeams, onStart, audio }) {
  const rename = (i, name) =>
    setTeams(teams.map((t, idx) => (idx === i ? { ...t, name } : t)))
  const remove = (i) => {
    if (teams.length <= 1) return
    setTeams(teams.filter((_, idx) => idx !== i))
  }
  const add = () => {
    if (teams.length >= 8) return
    const palette = ['#c98a8a', '#8aabc9', '#c9bd8a', '#a98ac9', '#8ac9a4']
    setTeams([
      ...teams,
      {
        name: `Team ${teams.length + 1}`,
        score: 0,
        color: palette[teams.length % palette.length],
        members: [],
      },
    ])
  }

  return (
    <div className="setup">
      <MuteButton audio={audio} className="floating-mute" />
      <div className="setup-header">
        <img src="/images/scars-logo.png" alt="SCARS" className="setup-logo" />
        <div>
          <h2>Teams Ready?</h2>
          <p className="setup-sub">Confirm the roster — edit names or remove if anyone's out.</p>
        </div>
      </div>

      <div className="setup-teams">
        {teams.map((team, i) => (
          <div className="setup-team-card" key={i} style={{ borderColor: team.color }}>
            <div className="setup-team-head">
              <span className="team-swatch" style={{ background: team.color }} />
              <input
                value={team.name}
                onChange={(e) => rename(i, e.target.value)}
                className="setup-team-input"
              />
              {teams.length > 1 && (
                <button className="setup-remove" onClick={() => remove(i)} title="Remove">×</button>
              )}
            </div>
            {team.members.length > 0 && (
              <ul className="setup-members">
                {team.members.map((m, mi) => <li key={mi}>{m}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="setup-actions">
        {teams.length < 8 && (
          <button className="btn-ghost" onClick={add}>+ Add Team</button>
        )}
        <button className="btn-primary" onClick={onStart}>Start the Game →</button>
      </div>
    </div>
  )
}

/* ---------- TOP BAR ---------- */
function TopBar({ onEnd, onReset, audio }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <img src="/images/scars-logo.png" alt="SCARS" className="topbar-logo" />
        <div className="topbar-title">
          <span className="topbar-eyebrow">SCARS · WUM</span>
          <strong>Jeopardy</strong>
        </div>
      </div>
      <div className="topbar-actions">
        <MuteButton audio={audio} />
        <button className="btn-ghost-sm" onClick={onReset}>Reset</button>
        <button className="btn-primary-sm" onClick={onEnd}>End Game · Leaderboard</button>
      </div>
    </div>
  )
}

/* ---------- BOARD ---------- */
function Board({ answered, onSelect }) {
  return (
    <div className="board-wrap">
      <div className="board">
        {categories.map((cat, ci) => (
          <div className="board-col" key={ci}>
            <div className="board-cat"><span>{cat.name}</span></div>
            {cat.questions.map((q, qi) => {
              const key = `${ci}-${qi}`
              const done = answered[key]
              return (
                <button
                  key={qi}
                  className={`board-tile ${done ? 'done' : ''}`}
                  onClick={() => onSelect(ci, qi)}
                  disabled={done}
                  style={{ animationDelay: `${(ci * 5 + qi) * 30}ms` }}
                >
                  {done ? '' : q.value}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- QUESTION MODAL ---------- */
function QuestionModal({ data, category, revealed, onReveal, onClose, teams, onAward }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-eyebrow">
          <span>{category}</span>
          <span className="modal-value">{data.value}</span>
        </div>

        <div className="modal-body">
          {data.image && (
            <div className="modal-image-wrap">
              <img
                src={data.image}
                alt=""
                className="modal-image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const sib = e.currentTarget.nextElementSibling
                  if (sib) sib.style.display = 'flex'
                }}
              />
              <div className="modal-image-missing">
                <span>Image slot: {data.image}</span>
                <small>Drop the file in /public/images/ to display</small>
              </div>
            </div>
          )}
          <p className="modal-question">{data.question}</p>
        </div>

        {!revealed ? (
          <button className="btn-primary modal-reveal" onClick={onReveal}>
            Reveal Answer (Space)
          </button>
        ) : (
          <>
            <div className="modal-answer">
              <span className="modal-answer-label">Answer</span>
              <p>{data.answer}</p>
            </div>
            <div className="modal-award">
              <div className="modal-award-label">Award points to:</div>
              <div className="modal-award-teams">
                {teams.map((t, i) => (
                  <div className="award-row" key={i}>
                    <span className="award-team" style={{ borderLeftColor: t.color }}>
                      {t.name}
                    </span>
                    <div className="award-buttons">
                      <button
                        className="award-btn correct"
                        onClick={() => { onAward(i, true); onClose() }}
                      >
                        +{data.value}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-ghost modal-skip" onClick={onClose}>
                No one — close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- SCOREBOARD ---------- */
function Scoreboard({ teams, onAdjust }) {
  return (
    <div className="scoreboard">
      {teams.map((t, i) => (
        <div className="score-card" key={i} style={{ borderTopColor: t.color }}>
          <div className="score-name">{t.name}</div>
          <div className="score-value-hidden">— hidden —</div>
          <div className="score-controls">
            <button onClick={() => onAdjust(i, -100)} title="−100">−100</button>
            <button onClick={() => onAdjust(i, 100)} title="+100">+100</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- LEADERBOARD with dramatic reveal ---------- */
function Leaderboard({ teams, onBack, onReset, audio }) {
  // Phases: 'idle' → 'building' (22s chaotic columns) → 'reveal'
  const [phase, setPhase] = useState('idle')
  const [countdown, setCountdown] = useState(22)
  const [tick, setTick] = useState(0) // forces re-render for chaos animation
  const buildupStartRef = useRef(null)
  const timersRef = useRef([])

  const ranked = [...teams].sort((a, b) => b.score - a.score)

  // Shuffled order for the chaos phase — locked in once on mount
  const shuffledTeams = useRef(null)
  if (shuffledTeams.current === null) {
    const arr = [...teams]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    shuffledTeams.current = arr
  }

  // Random seed per team for noise — so each column moves differently
  const teamNoiseSeeds = useRef(null)
  if (teamNoiseSeeds.current === null) {
    teamNoiseSeeds.current = teams.map(() => ({
      offset: Math.random() * Math.PI * 2,
      freq1: 1.2 + Math.random() * 0.8,  // much faster oscillation
      freq2: 2.1 + Math.random() * 1.0,
      freq3: 3.4 + Math.random() * 1.2,
      // Random target heights that change throughout — like a stock ticker
      jitter: Math.random() * 30 - 15,
    }))
  }

  const startReveal = () => {
    if (phase !== 'idle') return
    setPhase('building')
    setCountdown(22)
    if (!audio.muted) {
      audio.play('buildup', { loop: false, volume: 0.6 })
    }
    buildupStartRef.current = Date.now()

    // Smooth ticking for animation + countdown
    const tickInterval = setInterval(() => {
      const elapsed = (Date.now() - buildupStartRef.current) / 1000
      const remaining = Math.max(0, 22 - elapsed)
      setCountdown(remaining)
      setTick((t) => t + 1)
      if (remaining <= 0) clearInterval(tickInterval)
    }, 60)
    timersRef.current.push(tickInterval)

    // At 22s mark: trigger reveal
    const revealTimer = setTimeout(() => {
      setPhase('reveal')
      if (!audio.muted) {
        audio.play('fanfare', { loop: false, volume: 0.7 })
      }
    }, 22000)
    timersRef.current.push(revealTimer)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => {
        clearTimeout(t)
        clearInterval(t)
      })
      audio.stopAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-start on mount
  useEffect(() => {
    const t = setTimeout(() => startReveal(), 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'reveal') {
    return <RevealLeaderboard ranked={ranked} onBack={onBack} onReset={onReset} audio={audio} />
  }

  // BUILDING — chaotic vertical columns
  const elapsed = 22 - countdown
  const intensity = Math.min(1, elapsed / 18) // builds up over time

  return (
    <div className="lb-building">
      <MuteButton audio={audio} className="floating-mute" />
      <div className="lb-building-header">
        <img src="/images/scars-logo.png" alt="SCARS" className="lb-logo-small" />
        <div>
          <div className="lb-eyebrow">Final Tally</div>
          <h2>Calculating Standings…</h2>
        </div>
      </div>

      <div className="lb-countdown">
        <div className="countdown-ring">
          <svg viewBox="0 0 120 120" className="countdown-svg">
            <circle cx="60" cy="60" r="54" className="countdown-bg" />
            <circle
              cx="60"
              cy="60"
              r="54"
              className="countdown-progress"
              style={{
                strokeDasharray: 339.292,
                strokeDashoffset: 339.292 * (1 - countdown / 22),
              }}
            />
          </svg>
          <div className="countdown-num">{Math.ceil(countdown)}</div>
        </div>
      </div>

      <div className="chaos-podium">
        {shuffledTeams.current.map((team) => {
          const originalIdx = teams.findIndex((t) => t.name === team.name)
          const seed = teamNoiseSeeds.current[originalIdx]
          // Use tick (re-renders ~16x per sec) for movement
          // elapsed is in seconds, so tick * 0.06 ≈ elapsed
          const t = tick * 0.06 + seed.offset
          const wave =
            Math.sin(t * seed.freq1) * 0.45 +
            Math.sin(t * seed.freq2) * 0.30 +
            Math.sin(t * seed.freq3) * 0.20 +
            Math.sin(t * 0.5 + seed.offset * 3) * 0.10
          // Map -1.05..1.05 → 0..1, then map to 20%-95% range
          const normalized = Math.max(0, Math.min(1, (wave + 1.05) / 2.1))
          const height = 20 + normalized * 75
          return (
            <div className="chaos-col" key={team.name}>
              <div className="chaos-col-name">{team.name}</div>
              <div className="chaos-col-track">
                <div
                  className="chaos-col-fill"
                  style={{
                    height: `${height}%`,
                    background: `linear-gradient(180deg, ${team.color}, ${team.color}66)`,
                    boxShadow: `0 0 24px ${team.color}88, inset 0 -20px 30px rgba(0,0,0,0.3)`,
                    borderColor: team.color,
                  }}
                />
              </div>
              <div className="chaos-col-rank">?</div>
            </div>
          )
        })}
      </div>

      <div className="lb-building-foot">Tension building… results in <strong>{Math.ceil(countdown)}</strong></div>
    </div>
  )
}

/* ---------- REVEAL LEADERBOARD (podium) ---------- */
function RevealLeaderboard({ ranked, onBack, onReset, audio }) {
  const top3 = ranked.slice(0, 3)
  const rest = ranked.slice(3)
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)

  return (
    <div className="leaderboard">
      <MuteButton audio={audio} className="floating-mute" />
      <Confetti />
      <div className="lb-header">
        <img src="/images/scars-logo.png" alt="SCARS" className="lb-logo" />
        <h1>Final Standings</h1>
        <p className="lb-sub">SCARS · WUM Jeopardy</p>
      </div>

      <div className="podium">
        {podiumOrder.map((team, idx) => {
          if (!team) return null
          const place = ranked.indexOf(team) + 1
          const heights = { 1: 240, 2: 180, 3: 140 }
          const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
          return (
            <div className="podium-col" key={team.name} style={{ animationDelay: `${idx * 250}ms` }}>
              <div className="podium-medal">{medals[place]}</div>
              <div className="podium-team-name">{team.name}</div>
              <div className="podium-score">{team.score}</div>
              <div
                className="podium-block"
                style={{
                  height: heights[place],
                  background: `linear-gradient(180deg, ${team.color}dd, ${team.color}66)`,
                  borderColor: team.color,
                }}
              >
                <span className="podium-place">{place}</span>
              </div>
            </div>
          )
        })}
      </div>

      {rest.length > 0 && (
        <div className="lb-rest">
          {rest.map((t, i) => (
            <div className="lb-row" key={t.name}>
              <span className="lb-rank">{i + 4}</span>
              <span className="lb-swatch" style={{ background: t.color }} />
              <span className="lb-name">{t.name}</span>
              <span className="lb-score">{t.score}</span>
            </div>
          ))}
        </div>
      )}

      <div className="lb-actions">
        <button className="btn-ghost" onClick={onBack}>← Back to Board</button>
        <button className="btn-primary" onClick={onReset}>New Game</button>
      </div>
    </div>
  )
}

/* ---------- CONFETTI ---------- */
function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => i)
  return (
    <div className="confetti">
      {pieces.map((i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${3 + Math.random() * 2}s`,
            background: ['#e8b22d', '#f5ecd0', '#4ec5d9', '#7ab87a', '#e8a5a5'][i % 5],
          }}
        />
      ))}
    </div>
  )
}
