import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { extendSelection, findMatchingWord, getBoardEdges, getGridNodes } from '../engine/puzzle'
import type { Puzzle } from '../types'

export function useGame(puzzles: Puzzle[], onFinish: (seconds: number) => void) {
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [solved, setSolved] = useState<string[]>([])
  const [selection, setSelection] = useState<string[]>([])
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [featuredWord, setFeaturedWord] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const puzzle = puzzles[puzzleIndex]
  const longestLength = Math.max(...puzzle.words.map(({ word }) => [...word].length))
  const remainingWords = useMemo(() => puzzle.words.filter(({ word }) => !solved.includes(word)), [puzzle, solved])
  const activeNodeIds = useMemo(() => {
    const ids = new Set(remainingWords.flatMap(({ path }) => path))
    if (remainingWords.length && ids.size === 0) return new Set(puzzle.nodes.map(({ id }) => id))
    return ids
  }, [puzzle.nodes, remainingWords])
  const boardEdges = useMemo(() => getBoardEdges({ ...puzzle, words: remainingWords }), [puzzle, remainingWords])
  const visibleEdges = useMemo(() => boardEdges.filter(([a, b]) => activeNodeIds.has(a) && activeNodeIds.has(b)), [activeNodeIds, boardEdges])
  const gridNodes = useMemo(() => getGridNodes(puzzle), [puzzle])
  const nodesById = useMemo(() => new Map(gridNodes.map((node) => [node.id, node])), [gridNodes])
  const selectionWord = selection.map((id) => nodesById.get(id)?.letter ?? '').join('')

  useEffect(() => {
    if (!started || finished) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [started, finished])

  useEffect(() => {
    if (!featuredWord) return
    const timeout = window.setTimeout(() => setFeaturedWord(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [featuredWord])

  useLayoutEffect(() => {
    setSelection([])
  }, [solved.length])

  const submitSelection = useCallback(() => {
    if (!selection.length) return
    const match = findMatchingWord(remainingWords, selection)
    if (!match) {
      setMessage('Inte ett av orden – prova igen')
      setSelection([])
      return
    }
    const nextSolved = [...solved, match.word]
    setSolved(nextSolved)
    if ([...match.word].length === longestLength) {
      setFeaturedWord(match.word)
      setMessage('Omgångens längsta ord!')
    } else setMessage(`${match.word} hittat!`)
    if (nextSolved.length === puzzle.words.length) {
      setFinished(true)
      setMessage('Alla ord hittade!')
      onFinish(seconds)
    }
  }, [longestLength, onFinish, puzzle.words.length, remainingWords, seconds, selection, solved])

  useEffect(() => {
    if (findMatchingWord(remainingWords, selection)) submitSelection()
  }, [remainingWords, selection, submitSelection])

  const addNode = useCallback((id: string) => {
    if (!activeNodeIds.has(id) || finished) return
    setStarted(true)
    setSelection((current) => extendSelection(current, id, visibleEdges))
  }, [activeNodeIds, finished, visibleEdges])

  const reset = useCallback((index = puzzleIndex) => {
    setPuzzleIndex(index)
    setSolved([]); setSelection([]); setSeconds(0); setStarted(false); setFinished(false)
    setFeaturedWord(null); setMessage('')
  }, [puzzleIndex])

  return {
    puzzle, puzzleIndex, solved, selection, seconds, finished, featuredWord, message,
    activeNodeIds, visibleEdges, gridNodes, nodesById, selectionWord,
    addNode, submitSelection, setSelection, reset,
  }
}
