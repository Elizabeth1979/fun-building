import { describe, it, expect } from 'vitest'
import { getInitialViewMode, toggleViewMode, enterHouseInterior, exitToCity } from './viewMode'

describe('getInitialViewMode', () => {
  it('returns interior as the default view mode', () => {
    expect(getInitialViewMode()).toBe('interior')
  })
})

describe('toggleViewMode', () => {
  it('switches from interior to city', () => {
    expect(toggleViewMode('interior')).toBe('city')
  })

  it('switches from city to interior', () => {
    expect(toggleViewMode('city')).toBe('interior')
  })

  it('is its own inverse', () => {
    expect(toggleViewMode(toggleViewMode('interior'))).toBe('interior')
    expect(toggleViewMode(toggleViewMode('city'))).toBe('city')
  })
})

describe('enterHouseInterior', () => {
  it('returns interior view mode with the given house id', () => {
    const result = enterHouseInterior('house-1')
    expect(result.viewMode).toBe('interior')
    expect(result.activeHouseId).toBe('house-1')
  })
})

describe('exitToCity', () => {
  it('returns city view mode with null activeHouseId', () => {
    const result = exitToCity()
    expect(result.viewMode).toBe('city')
    expect(result.activeHouseId).toBeNull()
  })
})
