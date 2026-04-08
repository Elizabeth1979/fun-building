import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveScene, loadScene } from './persistence'
import type { RoomColors } from './useRoomColors'

const COLORS: RoomColors = {
  walls: '#ff0000',
  floor: '#00ff00',
  ceiling: '#0000ff',
}

// jsdom localStorage is not functional in this environment; use an in-memory stub
function makeLocalStorageMock() {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { for (const k in store) delete store[k] },
  }
}

let storageMock: ReturnType<typeof makeLocalStorageMock>

beforeEach(() => {
  storageMock = makeLocalStorageMock()
  vi.stubGlobal('localStorage', storageMock)
})

describe('loadScene', () => {
  it('returns null when nothing has been saved', () => {
    expect(loadScene()).toBeNull()
  })

  it('returns null when stored value is malformed JSON', () => {
    storageMock.setItem('fun-building-save', 'not-json{{{')
    expect(loadScene()).toBeNull()
  })
})

describe('saveScene + loadScene round-trip', () => {
  it('restores exactly the saved colors', () => {
    saveScene(COLORS)
    expect(loadScene()).toEqual(COLORS)
  })

  it('overwrites a previous save with the new colors', () => {
    saveScene(COLORS)
    const updated: RoomColors = { walls: '#111111', floor: '#222222', ceiling: '#333333' }
    saveScene(updated)
    expect(loadScene()).toEqual(updated)
  })
})
