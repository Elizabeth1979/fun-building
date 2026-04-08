import { describe, it, expect } from 'vitest'
import { getInitialMode, toggleMode } from './useGameMode'

describe('getInitialMode', () => {
  it('returns build as the default mode', () => {
    expect(getInitialMode()).toBe('build')
  })
})

describe('toggleMode', () => {
  it('switches from build to play', () => {
    expect(toggleMode('build')).toBe('play')
  })

  it('switches from play to build', () => {
    expect(toggleMode('play')).toBe('build')
  })

  it('is its own inverse', () => {
    expect(toggleMode(toggleMode('build'))).toBe('build')
    expect(toggleMode(toggleMode('play'))).toBe('play')
  })
})
