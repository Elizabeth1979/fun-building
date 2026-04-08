import { useState } from 'react'

export type GameMode = 'build' | 'play'

export function getInitialMode(): GameMode {
  return 'build'
}

export function toggleMode(current: GameMode): GameMode {
  return current === 'build' ? 'play' : 'build'
}

export function useGameMode() {
  const [mode, setMode] = useState<GameMode>(getInitialMode())
  const toggle = () => setMode(prev => toggleMode(prev))
  return { mode, toggle }
}
