import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, HelpCircle, Moon, RotateCcw, Sparkles, SunMedium, X } from 'lucide-react'
import { GameBoard } from './components/GameBoard'
import puzzleData from './data/puzzles.json'
import generatedPuzzleData from './data/generated-puzzles.json'
import { validatePuzzles } from './engine/puzzle'
import { useGame } from './hooks/useGame'
import type { GameStats, Puzzle } from './types'

const puzzles = validatePuzzles([...puzzleData, ...generatedPuzzleData] as Puzzle[])
const emptyStats: GameStats = { gamesPlayed: 0, gamesSolved: 0, bestTime: null, totalTime: 0 }

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function getStats(): GameStats {
  try {
    const stored = localStorage.getItem('zvenegram-stats')
    return stored ? { ...emptyStats, ...JSON.parse(stored) } : emptyStats
  } catch { return emptyStats }
}

function getSeenTutorial() {
  try {
    return localStorage.getItem('zvenegram-seen-tutorial') === 'true'
  } catch {
    return true
  }
}

type ThemeMode = 'system' | 'light' | 'dark'

function getThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem('zvenegram-theme')
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function App() {
  const [showStats, setShowStats] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [showTutorial, setShowTutorial] = useState(() => !getSeenTutorial())
  const [themeMode, setThemeMode] = useState<ThemeMode>(getThemeMode)
  const [stats, setStats] = useState<GameStats>(getStats)
  const recordFinish = useCallback((seconds: number) => setStats((current) => {
    const next = {
      gamesPlayed: current.gamesPlayed + 1,
      gamesSolved: current.gamesSolved + 1,
      bestTime: current.bestTime === null ? seconds : Math.min(current.bestTime, seconds),
      totalTime: current.totalTime + seconds,
    }
    localStorage.setItem('zvenegram-stats', JSON.stringify(next))
    return next
  }), [])
  const game = useGame(puzzles, recordFinish)
  const themeLabel = useMemo(() => {
    if (themeMode === 'dark') return 'Mörkt läge'
    if (themeMode === 'light') return 'Ljust läge'
    return 'Systemläge'
  }, [themeMode])

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false)
    try {
      localStorage.setItem('zvenegram-seen-tutorial', 'true')
    } catch {}
  }, [])

  const cycleTheme = useCallback(() => {
    setThemeMode((current) => {
      const next = current === 'system' ? 'dark' : current === 'dark' ? 'light' : 'system'
      try {
        localStorage.setItem('zvenegram-theme', next)
      } catch {}
      return next
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (themeMode === 'system') {
      root.removeAttribute('data-theme')
      root.classList.remove('theme-dark')
      return
    }
    root.dataset.theme = themeMode
    root.classList.toggle('theme-dark', themeMode === 'dark')
  }, [themeMode])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'd' || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      setShowDebug((current) => !current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span>Z</span>VENEGRAM</div>
      <div className="topbar-actions">
        <button className="icon-button" onClick={() => setShowTutorial(true)} aria-label="Visa guide"><HelpCircle size={22} /></button>
        <button className="icon-button" onClick={cycleTheme} aria-label={themeLabel}>{themeMode === 'dark' ? <Moon size={22} /> : themeMode === 'light' ? <SunMedium size={22} /> : <SunMedium size={22} />}</button>
        <button className="icon-button" onClick={() => setShowStats(true)} aria-label="Visa statistik"><BarChart3 size={22} /></button>
      </div>
    </header>

    <section className="game-card">
      <div className="game-meta">
        <div className="puzzle-nav">
          <button className="puzzle-step" onClick={() => game.reset((game.puzzleIndex - 1 + puzzles.length) % puzzles.length)} aria-label="Föregående pussel">
            <ChevronLeft size={16} />
          </button>
          <p className="eyebrow">Pussel {game.puzzleIndex + 1} av {puzzles.length}</p>
          <button className="puzzle-step" onClick={() => game.reset((game.puzzleIndex + 1) % puzzles.length)} aria-label="Nästa pussel">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="timer" aria-label={`Tid ${formatTime(game.seconds)}`}><span>TID</span>{formatTime(game.seconds)}</div>
      </div>
      <div className="progress-row">
        <span>{game.solved.length} / {game.puzzle.words.length} ord</span><span>{game.puzzle.difficulty}</span>
        <div className="progress"><i style={{ width: `${game.solved.length / game.puzzle.words.length * 100}%` }} /></div>
      </div>

      <GameBoard nodes={game.gridNodes} edges={game.visibleEdges} activeNodeIds={game.activeNodeIds}
        selection={game.selection} recentSolvedPath={game.recentSolvedPath} nodesById={game.nodesById} addNode={game.addNode}
        submitSelection={game.submitSelection} setSelection={game.setSelection} />

      {game.featuredWord && <div className="longest-reveal" role="status" aria-live="assertive">
        <Sparkles aria-hidden="true" /><div><span>Omgångens längsta ord</span><strong>{game.featuredWord}</strong></div><Sparkles aria-hidden="true" />
      </div>}
      <div className="selection-area" aria-live="polite">
        <div className="current-word">{game.selectionWord || '· · ·'}</div>
        {game.message && <p className={game.message.includes('hittat') || game.finished ? 'success' : ''}>{game.message}</p>}
      </div>
      <div className="found-words">{game.puzzle.words.map(({ word }) => <span key={word} className={game.solved.includes(word) ? 'found' : ''}>
        {game.solved.includes(word) ? word : `${word.length} bokstäver`}
      </span>)}</div>
      <button className="reset" onClick={() => game.reset()}><RotateCcw size={16} /> Börja om</button>
    </section>

    {showDebug && <aside className="debug-words"><span>Debug · ord i pusslet</span><div>
      {game.puzzle.words.map(({ word }) => <code key={word} className={game.solved.includes(word) ? 'solved' : ''}>{word}</code>)}
    </div></aside>}

    {game.showFinishScreen && <div className="modal-backdrop"><section className="modal finish-modal">
      <div className="celebration"><Sparkles /></div><p className="eyebrow">Pusslet löst</p><h2>Snyggt jobbat!</h2>
      {game.featuredWord && <div className="finish-longest"><Sparkles size={18} /><span>Längsta ordet</span><strong>{game.featuredWord}</strong></div>}
      <div className="final-time"><span>Din tid</span>{formatTime(game.seconds)}</div>
      <button className="primary" onClick={() => game.reset((game.puzzleIndex + 1) % puzzles.length)}>Nästa pussel</button>
    </section></div>}

    {showStats && <div className="modal-backdrop" onClick={() => setShowStats(false)}><section className="modal" onClick={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={() => setShowStats(false)} aria-label="Stäng"><X /></button>
      <p className="eyebrow">På den här enheten</p><h2>Din statistik</h2>
      <div className="stat-grid"><div><strong>{stats.gamesSolved}</strong><span>Lösta</span></div>
        <div><strong>{stats.bestTime === null ? '–' : formatTime(stats.bestTime)}</strong><span>Bästa tid</span></div>
        <div><strong>{stats.gamesSolved ? formatTime(Math.round(stats.totalTime / stats.gamesSolved)) : '–'}</strong><span>Snittid</span></div></div>
    </section></div>}
    <footer className="app-footer">Zvenegram · version 1.0.0</footer>

    {showTutorial && <div className="modal-backdrop" onClick={dismissTutorial}>
      <section className="modal tutorial-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={dismissTutorial} aria-label="Stäng guide"><X /></button>
        <p className="eyebrow">Så spelar du</p>
        <h2>Hitta orden i brädet</h2>
        <div className="tutorial-copy">
          <p>Dra eller klicka dig genom bokstäverna för att bygga ett ord. Alla ord har minst 4 bokstäver.</p>
        </div>
        <button className="primary" onClick={dismissTutorial}>Börja spela</button>
      </section>
    </div>}
  </main>
}

export default App
