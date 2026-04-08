import { describe, it, expect } from 'vitest'
import { applyColor, DEFAULT_COLORS, SURFACES } from './useRoomColors'

describe('DEFAULT_COLORS', () => {
  it('has a warm-white wall color', () => {
    expect(DEFAULT_COLORS.walls).toBe('#ffe9c8')
  })

  it('has a wood floor color', () => {
    expect(DEFAULT_COLORS.floor).toBe('#c8a96e')
  })

  it('has a ceiling color matching walls by default', () => {
    expect(DEFAULT_COLORS.ceiling).toBe('#ffe9c8')
  })
})

describe('SURFACES', () => {
  it('contains exactly walls, floor, ceiling', () => {
    expect(SURFACES).toEqual(['walls', 'floor', 'ceiling'])
  })
})

describe('applyColor', () => {
  it('updates the targeted surface color', () => {
    const result = applyColor(DEFAULT_COLORS, 'walls', '#ff0000')
    expect(result.walls).toBe('#ff0000')
  })

  it('leaves other surfaces unchanged', () => {
    const result = applyColor(DEFAULT_COLORS, 'walls', '#ff0000')
    expect(result.floor).toBe(DEFAULT_COLORS.floor)
    expect(result.ceiling).toBe(DEFAULT_COLORS.ceiling)
  })

  it('updates the floor surface', () => {
    const result = applyColor(DEFAULT_COLORS, 'floor', '#aabbcc')
    expect(result.floor).toBe('#aabbcc')
    expect(result.walls).toBe(DEFAULT_COLORS.walls)
  })

  it('updates the ceiling surface', () => {
    const result = applyColor(DEFAULT_COLORS, 'ceiling', '#334455')
    expect(result.ceiling).toBe('#334455')
    expect(result.walls).toBe(DEFAULT_COLORS.walls)
  })

  it('does not mutate the original colors object', () => {
    const original = { ...DEFAULT_COLORS }
    applyColor(original, 'floor', '#aabbcc')
    expect(original.floor).toBe(DEFAULT_COLORS.floor)
  })
})
