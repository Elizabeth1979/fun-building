import { describe, it, expect } from 'vitest'
import { isGodModeEnabled } from './useGodMode'

describe('isGodModeEnabled', () => {
  it('returns true when ?god=true is in the search string', () => {
    expect(isGodModeEnabled('?god=true')).toBe(true)
  })

  it('returns false when god param is absent', () => {
    expect(isGodModeEnabled('')).toBe(false)
  })

  it('returns false when god param is any value other than "true"', () => {
    expect(isGodModeEnabled('?god=false')).toBe(false)
    expect(isGodModeEnabled('?god=1')).toBe(false)
    expect(isGodModeEnabled('?god=')).toBe(false)
  })

  it('works when god=true is among other params', () => {
    expect(isGodModeEnabled('?foo=bar&god=true&baz=1')).toBe(true)
  })
})
