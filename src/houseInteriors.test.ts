import { describe, it, expect } from 'vitest'
import {
  createHouseInteriorsStore,
  getHouseInterior,
  setHouseInterior,
  type HouseInterior,
} from './houseInteriors'
import { DEFAULT_COLORS } from './useRoomColors'
import type { FurnitureItem } from './furniture'

const makeFurniture = (id: string): FurnitureItem => ({
  id,
  name: 'Test',
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  color: '#fff',
  meshType: 'box',
})

describe('createHouseInteriorsStore', () => {
  it('returns an empty store', () => {
    const store = createHouseInteriorsStore()
    expect(store.interiors.size).toBe(0)
  })
})

describe('getHouseInterior', () => {
  it('returns default interior for unknown house', () => {
    const store = createHouseInteriorsStore()
    const interior = getHouseInterior(store, 'house-1')
    expect(interior.colors).toEqual(DEFAULT_COLORS)
    expect(interior.furniture).toEqual([])
  })

  it('returns saved interior for known house', () => {
    let store = createHouseInteriorsStore()
    const customInterior: HouseInterior = {
      colors: { walls: '#ff0000', floor: '#00ff00', ceiling: '#0000ff' },
      furniture: [makeFurniture('chair-1')],
    }
    store = setHouseInterior(store, 'house-1', customInterior)
    const interior = getHouseInterior(store, 'house-1')
    expect(interior.colors.walls).toBe('#ff0000')
    expect(interior.furniture).toHaveLength(1)
    expect(interior.furniture[0].id).toBe('chair-1')
  })
})

describe('setHouseInterior', () => {
  it('stores interior for a house', () => {
    const store = createHouseInteriorsStore()
    const interior: HouseInterior = {
      colors: { walls: '#aaa', floor: '#bbb', ceiling: '#ccc' },
      furniture: [],
    }
    const next = setHouseInterior(store, 'house-5', interior)
    expect(next.interiors.has('house-5')).toBe(true)
    expect(next.interiors.get('house-5')).toEqual(interior)
  })

  it('does not mutate the original store', () => {
    const store = createHouseInteriorsStore()
    const interior: HouseInterior = {
      colors: DEFAULT_COLORS,
      furniture: [],
    }
    const next = setHouseInterior(store, 'house-1', interior)
    expect(store.interiors.size).toBe(0)
    expect(next.interiors.size).toBe(1)
  })

  it('overwrites existing interior for same house', () => {
    let store = createHouseInteriorsStore()
    const first: HouseInterior = {
      colors: { walls: '#111', floor: '#222', ceiling: '#333' },
      furniture: [makeFurniture('a-1')],
    }
    store = setHouseInterior(store, 'house-1', first)
    const second: HouseInterior = {
      colors: { walls: '#999', floor: '#888', ceiling: '#777' },
      furniture: [makeFurniture('b-1'), makeFurniture('b-2')],
    }
    store = setHouseInterior(store, 'house-1', second)
    const result = getHouseInterior(store, 'house-1')
    expect(result.colors.walls).toBe('#999')
    expect(result.furniture).toHaveLength(2)
  })

  it('maintains other houses when updating one', () => {
    let store = createHouseInteriorsStore()
    const int1: HouseInterior = {
      colors: { walls: '#111', floor: '#222', ceiling: '#333' },
      furniture: [makeFurniture('x-1')],
    }
    const int2: HouseInterior = {
      colors: { walls: '#444', floor: '#555', ceiling: '#666' },
      furniture: [],
    }
    store = setHouseInterior(store, 'house-1', int1)
    store = setHouseInterior(store, 'house-2', int2)

    // Update house-1
    const updated: HouseInterior = {
      colors: { walls: '#aaa', floor: '#bbb', ceiling: '#ccc' },
      furniture: [],
    }
    store = setHouseInterior(store, 'house-1', updated)

    // house-2 should be unchanged
    expect(getHouseInterior(store, 'house-2').colors.walls).toBe('#444')
    // house-1 should be updated
    expect(getHouseInterior(store, 'house-1').colors.walls).toBe('#aaa')
  })
})
