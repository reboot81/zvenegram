export type PuzzleNode = {
  id: string
  letter: string
  x: number
  y: number
}

export type PuzzleWord = {
  word: string
  path: string[]
  clue?: string
}

export type Puzzle = {
  id: string
  title: string
  difficulty: 'Lätt' | 'Medel' | 'Svår'
  nodes: PuzzleNode[]
  layout?: string[]
  edges?: [string, string][]
  words: PuzzleWord[]
  bonusWords?: PuzzleWord[]
}

export type GameStats = {
  gamesPlayed: number
  gamesSolved: number
  bestTime: number | null
  totalTime: number
}
