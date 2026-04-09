import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveScene, loadScene, saveCityScene, loadCityScene, serializeHouses, deserializeHouses, serializeRoads, deserializeRoads, serializeInteriors, deserializeInteriors } from './persistence'
import type { RoomColors } from './useRoomColors'
import type { FurnitureItem } from './furniture'
import type { CityHousesState } from './cityHouses'
import type { CityRoadsState } from './cityRoads'
import type { HouseInteriorsStore, HouseInterior } from './houseInteriors'
import type { ViewMode } from './viewMode'

const COLORS: RoomColors = {
  walls: '#ff0000',
  floor: '#00ff00',
  ceiling: '#0000ff',
}

const FURNITURE: FurnitureItem[] = [
  {
    id: 'chair-1',
    name: 'Chair',
    position: { x: 1, y: 0, z: 2 },
    rotation: 0,
    color: '#884422',
    meshType: 'box',
  },
  {
    id: 'lamp-2',
    name: 'Lamp',
    position: { x: -1, y: 0.5, z: 0 },
    rotation: Math.PI / 4,
    color: '#ffff00',
    meshType: 'cylinder',
    parentId: 'chair-1',
  },
]

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
  it('restores exactly the saved colors when no furniture provided', () => {
    saveScene(COLORS, [])
    const result = loadScene()
    expect(result).not.toBeNull()
    expect(result!.colors).toEqual(COLORS)
    expect(result!.furniture).toEqual([])
  })

  it('restores colors and furniture together', () => {
    saveScene(COLORS, FURNITURE)
    const result = loadScene()
    expect(result).not.toBeNull()
    expect(result!.colors).toEqual(COLORS)
    expect(result!.furniture).toEqual(FURNITURE)
  })

  it('overwrites a previous save', () => {
    saveScene(COLORS, FURNITURE)
    const updated: RoomColors = { walls: '#111111', floor: '#222222', ceiling: '#333333' }
    saveScene(updated, [])
    const result = loadScene()
    expect(result!.colors).toEqual(updated)
    expect(result!.furniture).toEqual([])
  })
})

describe('backward compatibility — migration from v1 (color-only save)', () => {
  it('loads old color-only blob as colors with empty furniture', () => {
    // Simulate v1 format: just a plain RoomColors object
    storageMock.setItem('fun-building-save', JSON.stringify(COLORS))
    const result = loadScene()
    expect(result).not.toBeNull()
    expect(result!.colors).toEqual(COLORS)
    expect(result!.furniture).toEqual([])
  })
})

// ---------- City persistence serialization helpers ----------

describe('serializeHouses / deserializeHouses', () => {
  it('round-trips a CityHousesState through plain array', () => {
    const houses: CityHousesState = {
      houses: new Map([
        ['0,1', { id: 'house-1', cellX: 0, cellZ: 1 }],
        ['3,4', { id: 'house-2', cellX: 3, cellZ: 4 }],
      ]),
    }
    const serialized = serializeHouses(houses)
    expect(Array.isArray(serialized)).toBe(true)
    expect(serialized).toHaveLength(2)
    const restored = deserializeHouses(serialized)
    expect(restored.houses.size).toBe(2)
    expect(restored.houses.get('0,1')).toEqual({ id: 'house-1', cellX: 0, cellZ: 1 })
    expect(restored.houses.get('3,4')).toEqual({ id: 'house-2', cellX: 3, cellZ: 4 })
  })

  it('handles empty state', () => {
    const houses: CityHousesState = { houses: new Map() }
    const serialized = serializeHouses(houses)
    expect(serialized).toEqual([])
    const restored = deserializeHouses(serialized)
    expect(restored.houses.size).toBe(0)
  })
})

describe('serializeRoads / deserializeRoads', () => {
  it('round-trips a CityRoadsState through string array', () => {
    const roads: CityRoadsState = { roads: new Set(['1,2', '3,4', '5,6']) }
    const serialized = serializeRoads(roads)
    expect(Array.isArray(serialized)).toBe(true)
    expect(serialized).toHaveLength(3)
    const restored = deserializeRoads(serialized)
    expect(restored.roads.size).toBe(3)
    expect(restored.roads.has('1,2')).toBe(true)
    expect(restored.roads.has('3,4')).toBe(true)
  })

  it('handles empty roads', () => {
    const roads: CityRoadsState = { roads: new Set() }
    const serialized = serializeRoads(roads)
    expect(serialized).toEqual([])
    const restored = deserializeRoads(serialized)
    expect(restored.roads.size).toBe(0)
  })
})

describe('serializeInteriors / deserializeInteriors', () => {
  it('round-trips a HouseInteriorsStore through a plain record', () => {
    const interior1: HouseInterior = { colors: COLORS, furniture: FURNITURE }
    const interior2: HouseInterior = {
      colors: { walls: '#aaa', floor: '#bbb', ceiling: '#ccc' },
      furniture: [],
    }
    const store: HouseInteriorsStore = {
      interiors: new Map([
        ['house-1', interior1],
        ['house-2', interior2],
      ]),
    }
    const serialized = serializeInteriors(store)
    expect(typeof serialized).toBe('object')
    expect(serialized['house-1']).toBeDefined()
    const restored = deserializeInteriors(serialized)
    expect(restored.interiors.size).toBe(2)
    expect(restored.interiors.get('house-1')).toEqual(interior1)
    expect(restored.interiors.get('house-2')).toEqual(interior2)
  })
})

// ---------- Full city save / load ----------

describe('saveCityScene / loadCityScene round-trip', () => {
  it('round-trips full city state', () => {
    const houses: CityHousesState = {
      houses: new Map([['2,3', { id: 'house-1', cellX: 2, cellZ: 3 }]]),
    }
    const roads: CityRoadsState = { roads: new Set(['0,0', '1,0']) }
    const interiors: HouseInteriorsStore = {
      interiors: new Map([
        ['house-1', { colors: COLORS, furniture: FURNITURE }],
      ]),
    }
    const viewMode: ViewMode = 'city'
    const activeHouseId: string | null = null

    saveCityScene(houses, roads, interiors, viewMode, activeHouseId)
    const result = loadCityScene()
    expect(result).not.toBeNull()
    expect(result!.houses.houses.size).toBe(1)
    expect(result!.houses.houses.get('2,3')?.id).toBe('house-1')
    expect(result!.roads.roads.size).toBe(2)
    expect(result!.roads.roads.has('0,0')).toBe(true)
    expect(result!.interiors.interiors.size).toBe(1)
    expect(result!.interiors.interiors.get('house-1')?.furniture).toEqual(FURNITURE)
    expect(result!.viewMode).toBe('city')
    expect(result!.activeHouseId).toBeNull()
  })

  it('returns null when nothing saved', () => {
    expect(loadCityScene()).toBeNull()
  })

  it('returns null for malformed data', () => {
    storageMock.setItem('fun-building-save', 'corrupted{{{')
    expect(loadCityScene()).toBeNull()
  })

  it('round-trips with interior view and active house', () => {
    const houses: CityHousesState = {
      houses: new Map([['1,1', { id: 'house-5', cellX: 1, cellZ: 1 }]]),
    }
    const roads: CityRoadsState = { roads: new Set() }
    const interiors: HouseInteriorsStore = { interiors: new Map() }

    saveCityScene(houses, roads, interiors, 'interior', 'house-5')
    const result = loadCityScene()
    expect(result!.viewMode).toBe('interior')
    expect(result!.activeHouseId).toBe('house-5')
  })
})

describe('backward compatibility — v2 save loaded via loadCityScene', () => {
  it('returns null for v2 data (city loader ignores old format)', () => {
    // v2 format doesn't have city data, so loadCityScene should return null
    saveScene(COLORS, FURNITURE)
    expect(loadCityScene()).toBeNull()
  })
})

describe('backward compatibility — v3 save loaded via old loadScene', () => {
  it('old loadScene returns null for v3 data (graceful)', () => {
    const houses: CityHousesState = {
      houses: new Map([['0,0', { id: 'house-1', cellX: 0, cellZ: 0 }]]),
    }
    const roads: CityRoadsState = { roads: new Set(['1,1']) }
    const interiors: HouseInteriorsStore = { interiors: new Map() }
    saveCityScene(houses, roads, interiors, 'city', null)
    // Old loadScene doesn't understand v3, should return null
    expect(loadScene()).toBeNull()
  })
})
