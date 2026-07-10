import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, RotateCcw, Sparkles, X } from 'lucide-react'
import puzzleData from './data/puzzles.json'
import type { GameStats, Puzzle } from './types'

const puzzles = puzzleData as Puzzle[]
const emptyStats: GameStats = { gamesPlayed: 0, gamesSolved: 0, bestTime: null, totalTime: 0 }

puzzles.forEach((puzzle) => {
  if (puzzle.nodes.length !== 16) throw new Error(`Puzzle ${puzzle.id} must contain exactly 16 nodes`)
  if (puzzle.words.some(({ word }) => [...word].length < 4)) {
    throw new Error(`Puzzle ${puzzle.id} contains a word shorter than four letters`)
  }
  const order = puzzle.layout ?? puzzle.nodes.map(({ id }) => id)
  if (order.length !== 16 || new Set(order).size !== 16) {
    throw new Error(`Puzzle ${puzzle.id} must have 16 unique layout positions`)
  }
  const positions = new Map(order.map((id, index) => [id, { x: index % 4, y: Math.floor(index / 4) }]))
  const validateStep = (fromId: string, toId: string, context: string) => {
    const from = positions.get(fromId)
    const to = positions.get(toId)
    if (!from || !to) throw new Error(`${context} refers to an unknown node`)
    if (Math.abs(to.x - from.x) > 1 || Math.abs(to.y - from.y) > 1) {
      throw new Error(`${context} skips over a circle`)
    }
  }
  puzzle.edges?.forEach(([fromId, toId]) => validateStep(fromId, toId, `Edge ${fromId}-${toId}`))
  puzzle.words.forEach(({ word, path }) => {
    const usedEdges = new Set<string>()
    path.slice(1).forEach((id, index) => {
      const fromId = path[index]
      validateStep(fromId, id, `Word ${word}`)
      const edge = [fromId, id].sort().join('|')
      if (usedEdges.has(edge)) throw new Error(`Word ${word} uses the same line more than once`)
      usedEdges.add(edge)
    })
  })
  const connectedWords = new Set([0])
  let foundConnection = true
  while (foundConnection) {
    foundConnection = false
    puzzle.words.forEach((word, index) => {
      if (connectedWords.has(index)) return
      const connects = [...connectedWords].some((connectedIndex) =>
        word.path.some((id) => puzzle.words[connectedIndex].path.includes(id)),
      )
      if (connects) {
        connectedWords.add(index)
        foundConnection = true
      }
    })
  }
  if (connectedWords.size !== puzzle.words.length) {
    const standalone = puzzle.words
      .filter((_, index) => !connectedWords.has(index))
      .map(({ word }) => word)
      .join(', ')
    throw new Error(`Puzzle ${puzzle.id} contains standalone words: ${standalone}`)
  }
})

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function getEdgePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
}

function getStats(): GameStats {
  try {
    const stored = localStorage.getItem('zvenegram-stats')
    return stored ? { ...emptyStats, ...JSON.parse(stored) } : emptyStats
  } catch {
    return emptyStats
  }
}

function App() {
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [solved, setSolved] = useState<string[]>([])
  const [selection, setSelection] = useState<string[]>([])
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [featuredWord, setFeaturedWord] = useState<string | null>(null)
  const [stats, setStats] = useState<GameStats>(getStats)
  const [message, setMessage] = useState('')
  const dragging = useRef(false)
  const dragMoved = useRef(false)
  const dragStartNode = useRef<string | null>(null)
  const puzzle = puzzles[puzzleIndex]
  const longestWordLength = Math.max(...puzzle.words.map(({ word }) => [...word].length))

  const remainingWords = useMemo(
    () => puzzle.words.filter((word) => !solved.includes(word.word)),
    [puzzle, solved],
  )
  const activeNodeIds = useMemo(
    () => new Set(remainingWords.flatMap((word) => word.path)),
    [remainingWords],
  )
  const boardEdges = useMemo(() => {
    if (puzzle.edges) return puzzle.edges
    const unique = new Map<string, [string, string]>()
    puzzle.words.forEach(({ path }) => {
      path.slice(1).forEach((id, index) => {
        const pair = [path[index], id].sort()
        unique.set(pair.join(':'), [path[index], id])
      })
    })
    return [...unique.values()]
  }, [puzzle])
  const visibleEdges = useMemo(
    () => boardEdges.filter(([from, to]) => activeNodeIds.has(from) && activeNodeIds.has(to)),
    [activeNodeIds, boardEdges],
  )
  const gridNodes = useMemo(() => {
    const nodes = new Map(puzzle.nodes.map((node) => [node.id, node]))
    const order = puzzle.layout ?? puzzle.nodes.map(({ id }) => id)
    return order.map((id, index) => ({
      ...nodes.get(id)!,
      x: 12.5 + (index % 4) * 25,
      y: 12.5 + Math.floor(index / 4) * 25,
    }))
  }, [puzzle])
  const nodesById = useMemo(() => new Map(gridNodes.map((node) => [node.id, node])), [gridNodes])
  const selectionWord = selection.map((id) => nodesById.get(id)?.letter ?? '').join('')

  useEffect(() => {
    if (!started || finished) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [started, finished])

  const finishGame = useCallback((finalTime: number) => {
    setFinished(true)
    setMessage('Alla ord hittade!')
    setStats((current) => {
      const next = {
        gamesPlayed: current.gamesPlayed + 1,
        gamesSolved: current.gamesSolved + 1,
        bestTime: current.bestTime === null ? finalTime : Math.min(current.bestTime, finalTime),
        totalTime: current.totalTime + finalTime,
      }
      localStorage.setItem('zvenegram-stats', JSON.stringify(next))
      return next
    })
  }, [])

  const submitSelection = useCallback(() => {
    if (!selection.length) return
    const match = remainingWords.find(
      ({ path }) => path.join('|') === selection.join('|') || [...path].reverse().join('|') === selection.join('|'),
    )
    if (match) {
      const nextSolved = [...solved, match.word]
      setSolved(nextSolved)
      if ([...match.word].length === longestWordLength) {
        setFeaturedWord(match.word)
        setMessage('Omgångens längsta ord!')
      } else {
        setMessage(`${match.word} hittat!`)
      }
      if (nextSolved.length === puzzle.words.length) finishGame(seconds)
    } else {
      setMessage('Inte ett av orden – prova igen')
    }
    setSelection([])
  }, [finishGame, longestWordLength, puzzle.words.length, remainingWords, selection, seconds, solved])

  useEffect(() => {
    if (!featuredWord) return
    const timeout = window.setTimeout(() => setFeaturedWord(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [featuredWord])

  useEffect(() => {
    if (!selection.length) return
    const exactMatch = remainingWords.some(
      ({ path }) => path.join('|') === selection.join('|') || [...path].reverse().join('|') === selection.join('|'),
    )
    if (exactMatch) submitSelection()
  }, [remainingWords, selection, submitSelection])

  const addNode = useCallback((id: string) => {
    if (!activeNodeIds.has(id) || finished) return
    setStarted(true)
    setSelection((current) => {
      const existingIndex = current.indexOf(id)
      if (existingIndex >= 0) return current.slice(0, existingIndex + 1)
      if (!current.length) return [id]
      const connected = visibleEdges.some(([a, b]) =>
        (a === current.at(-1) && b === id) || (b === current.at(-1) && a === id),
      )
      return connected ? [...current, id] : current
    })
  }, [activeNodeIds, finished, visibleEdges])

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragging.current) return
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-node-id]')
    if (element?.dataset.nodeId) {
      if (element.dataset.nodeId !== dragStartNode.current) dragMoved.current = true
      addNode(element.dataset.nodeId)
    }
  }

  const resetGame = (index = puzzleIndex) => {
    setPuzzleIndex(index)
    setSolved([])
    setSelection([])
    setSeconds(0)
    setStarted(false)
    setFinished(false)
    setFeaturedWord(null)
    setMessage('')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span>Z</span>VENEGRAM</div>
        <button className="icon-button" onClick={() => setShowStats(true)} aria-label="Visa statistik">
          <BarChart3 size={22} />
        </button>
      </header>

      <section className="game-card">
        <div className="game-meta">
          <div>
            <p className="eyebrow">Pussel {puzzleIndex + 1} av {puzzles.length}</p>
            <h1>{puzzle.title}</h1>
          </div>
          <div className="timer" aria-label={`Tid ${formatTime(seconds)}`}>
            <span>TID</span>{formatTime(seconds)}
          </div>
        </div>

        <div className="progress-row">
          <span>{solved.length} / {puzzle.words.length} ord</span>
          <span>{puzzle.difficulty}</span>
          <div className="progress"><i style={{ width: `${(solved.length / puzzle.words.length) * 100}%` }} /></div>
        </div>

        <div
          className="board"
          onPointerMove={handlePointerMove}
          onPointerUp={() => {
            dragging.current = false
            if (dragMoved.current) submitSelection()
          }}
          onPointerCancel={() => { dragging.current = false; setSelection([]) }}
          onPointerLeave={(event) => {
            if (dragging.current && event.buttons === 0) { dragging.current = false; submitSelection() }
          }}
        >
          <svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {visibleEdges.map(([from, to]) => {
              const a = nodesById.get(from)!
              const b = nodesById.get(to)!
              const selected = selection.some((id, i) =>
                (id === from && selection[i + 1] === to) || (id === to && selection[i + 1] === from),
              )
              return <path key={`${from}-${to}`} d={getEdgePath(a, b)} className={selected ? 'selected-line' : ''} />
            })}
          </svg>
          {gridNodes.map((node) => {
            const active = activeNodeIds.has(node.id)
            const selectedIndex = selection.indexOf(node.id)
            return (
              <button
                key={node.id}
                data-node-id={node.id}
                className={`letter-node ${active ? '' : 'gone'} ${selectedIndex >= 0 ? 'selected' : ''}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onPointerDown={(event) => {
                  event.preventDefault()
                  if (selection.at(-1) === node.id) {
                    setSelection((value) => value.slice(0, -1))
                    dragging.current = false
                    return
                  }
                  dragging.current = true
                  dragMoved.current = false
                  dragStartNode.current = node.id
                  event.currentTarget.setPointerCapture(event.pointerId)
                  addNode(node.id)
                }}
                aria-label={`Bokstaven ${node.letter}`}
                disabled={!active}
              >
                {node.letter}
                {selectedIndex >= 0 && <small>{selectedIndex + 1}</small>}
              </button>
            )
          })}
        </div>

        {featuredWord && (
          <div className="longest-reveal" role="status" aria-live="assertive">
            <Sparkles aria-hidden="true" />
            <div>
              <span>Omgångens längsta ord</span>
              <strong>{featuredWord}</strong>
            </div>
            <Sparkles aria-hidden="true" />
          </div>
        )}

        <div className="selection-area" aria-live="polite">
          <div className="current-word">{selectionWord || '· · ·'}</div>
          {message && <p className={message.includes('hittat') || finished ? 'success' : ''}>{message}</p>}
        </div>

        <div className="found-words">
          {puzzle.words.map(({ word }) => (
            <span key={word} className={solved.includes(word) ? 'found' : ''}>
              {solved.includes(word) ? word : `${word.length} bokstäver`}
            </span>
          ))}
        </div>

        <button className="reset" onClick={() => resetGame()}><RotateCcw size={16} /> Börja om</button>
      </section>

      {import.meta.env.DEV && (
        <aside className="debug-words">
          <span>Debug · ord i pusslet</span>
          <div>
            {puzzle.words.map(({ word }) => (
              <code key={word} className={solved.includes(word) ? 'solved' : ''}>{word}</code>
            ))}
          </div>
        </aside>
      )}

      {finished && (
        <div className="modal-backdrop">
          <section className="modal finish-modal">
            <div className="celebration"><Sparkles /></div>
            <p className="eyebrow">Pusslet löst</p>
            <h2>Snyggt jobbat!</h2>
            {featuredWord && (
              <div className="finish-longest">
                <Sparkles size={18} />
                <span>Längsta ordet</span>
                <strong>{featuredWord}</strong>
              </div>
            )}
            <div className="final-time"><span>Din tid</span>{formatTime(seconds)}</div>
            <button className="primary" onClick={() => resetGame((puzzleIndex + 1) % puzzles.length)}>Nästa pussel</button>
          </section>
        </div>
      )}

      {showStats && (
        <div className="modal-backdrop" onClick={() => setShowStats(false)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowStats(false)} aria-label="Stäng"><X /></button>
            <p className="eyebrow">På den här enheten</p>
            <h2>Din statistik</h2>
            <div className="stat-grid">
              <div><strong>{stats.gamesSolved}</strong><span>Lösta</span></div>
              <div><strong>{stats.bestTime === null ? '–' : formatTime(stats.bestTime)}</strong><span>Bästa tid</span></div>
              <div><strong>{stats.gamesSolved ? formatTime(Math.round(stats.totalTime / stats.gamesSolved)) : '–'}</strong><span>Snittid</span></div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
