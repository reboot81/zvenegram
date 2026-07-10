import type { Puzzle, PuzzleNode, PuzzleWord } from '../types'

export type GridNode = PuzzleNode & { x: number; y: number }
export type Edge = [string, string]

export function getGridNodes(puzzle: Puzzle): GridNode[] {
  const nodes = new Map(puzzle.nodes.map((node) => [node.id, node]))
  const order = puzzle.layout ?? puzzle.nodes.map(({ id }) => id)
  return order.map((id, index) => ({
    ...nodes.get(id)!,
    x: 12.5 + (index % 4) * 25,
    y: 12.5 + Math.floor(index / 4) * 25,
  }))
}

export function getBoardEdges(puzzle: Puzzle): Edge[] {
  if (puzzle.edges) return puzzle.edges
  const unique = new Map<string, Edge>()
  puzzle.words.forEach(({ path }) => path.slice(1).forEach((id, index) => {
    const pair = [path[index], id].sort()
    unique.set(pair.join('|'), [path[index], id])
  }))
  return [...unique.values()]
}

export function pathsMatch(path: string[], selection: string[]) {
  return path.join('|') === selection.join('|')
}

export function findMatchingWord(words: PuzzleWord[], selection: string[]) {
  return words.find(({ path }) => pathsMatch(path, selection))
}

export function extendSelection(selection: string[], id: string, edges: Edge[]) {
  const existingIndex = selection.indexOf(id)
  if (existingIndex >= 0) return selection.slice(0, existingIndex + 1)
  if (!selection.length) return [id]
  const previous = selection.at(-1)
  const connected = edges.some(([a, b]) => (a === previous && b === id) || (b === previous && a === id))
  return connected ? [...selection, id] : selection
}

export function validatePuzzle(puzzle: Puzzle) {
  if (puzzle.nodes.length !== 16) throw new Error(`Puzzle ${puzzle.id} must contain exactly 16 nodes`)
  if (puzzle.words.some(({ word }) => [...word].length < 4)) throw new Error(`Puzzle ${puzzle.id} has a short word`)

  puzzle.words.forEach(({ word }, index) => puzzle.words.slice(index + 1).forEach(({ word: other }) => {
    const [shorter, longer] = word.length <= other.length ? [word, other] : [other, word]
    if (longer.includes(shorter)) throw new Error(`Puzzle ${puzzle.id} contains nested words: ${shorter}, ${longer}`)
  }))

  const order = puzzle.layout ?? puzzle.nodes.map(({ id }) => id)
  if (order.length !== 16 || new Set(order).size !== 16) throw new Error(`Puzzle ${puzzle.id} has an invalid layout`)
  const positions = new Map(order.map((id, index) => [id, { x: index % 4, y: Math.floor(index / 4) }]))
  const validateStep = (fromId: string, toId: string, context: string) => {
    const from = positions.get(fromId)
    const to = positions.get(toId)
    if (!from || !to) throw new Error(`${context} refers to an unknown node`)
    if (Math.abs(to.x - from.x) > 1 || Math.abs(to.y - from.y) > 1) throw new Error(`${context} skips a circle`)
  }
  puzzle.edges?.forEach(([from, to]) => validateStep(from, to, `Edge ${from}-${to}`))
  puzzle.words.forEach(({ word, path }) => {
    const used = new Set<string>()
    path.slice(1).forEach((id, index) => {
      const from = path[index]
      validateStep(from, id, `Word ${word}`)
      const edge = [from, id].sort().join('|')
      if (used.has(edge)) throw new Error(`Word ${word} reuses an edge`)
      used.add(edge)
    })
  })

  const connected = new Set([0])
  let changed = true
  while (changed) {
    changed = false
    puzzle.words.forEach((word, index) => {
      if (connected.has(index)) return
      if ([...connected].some((other) => word.path.some((id) => puzzle.words[other].path.includes(id)))) {
        connected.add(index)
        changed = true
      }
    })
  }
  if (connected.size !== puzzle.words.length) throw new Error(`Puzzle ${puzzle.id} contains standalone words`)
}

export function validatePuzzles(puzzles: Puzzle[]) {
  puzzles.forEach(validatePuzzle)
  return puzzles
}
