import { describe, it, expect } from 'vitest'
import {
  createCityHousesState,
  placeHouse,
  removeHouse,
  getHouseAtCell,
  cellToWorldPosition,
  worldToCell,
} from './cityHouses'

describe('createCityHousesState', () => {
  it('returns an empty houses map', () => {
    const state = createCityHousesState()
    expect(state.houses).toEqual(new Map())
  })
})

describe('placeHouse', () => {
  it('adds a house at the given grid cell', () => {
    const state = createCityHousesState()
    const next = placeHouse(state, 2, 3)
    const key = '2,3'
    expect(next.houses.has(key)).toBe(true)
    const house = next.houses.get(key)!
    expect(house.cellX).toBe(2)
    expect(house.cellZ).toBe(3)
    expect(house.id).toBeTruthy()
  })

  it('does not mutate the original state', () => {
    const state = createCityHousesState()
    const next = placeHouse(state, 0, 0)
    expect(state.houses.size).toBe(0)
    expect(next.houses.size).toBe(1)
  })

  it('does not overwrite an existing house', () => {
    const state = createCityHousesState()
    const s1 = placeHouse(state, 1, 1)
    const existingId = s1.houses.get('1,1')!.id
    const s2 = placeHouse(s1, 1, 1)
    // Should be unchanged — same state returned
    expect(s2.houses.get('1,1')!.id).toBe(existingId)
    expect(s2.houses.size).toBe(1)
  })

  it('generates unique ids for different houses', () => {
    const state = createCityHousesState()
    const s1 = placeHouse(state, 0, 0)
    const s2 = placeHouse(s1, 1, 0)
    const id1 = s1.houses.get('0,0')!.id
    const id2 = s2.houses.get('1,0')!.id
    expect(id1).not.toBe(id2)
  })
})

describe('removeHouse', () => {
  it('removes the house at the given cell', () => {
    const state = placeHouse(createCityHousesState(), 2, 3)
    const next = removeHouse(state, 2, 3)
    expect(next.houses.size).toBe(0)
  })

  it('does not mutate the original state', () => {
    const state = placeHouse(createCityHousesState(), 2, 3)
    const next = removeHouse(state, 2, 3)
    expect(state.houses.size).toBe(1)
    expect(next.houses.size).toBe(0)
  })

  it('returns same state if no house at cell', () => {
    const state = createCityHousesState()
    const next = removeHouse(state, 5, 5)
    expect(next).toBe(state)
  })
})

describe('getHouseAtCell', () => {
  it('returns the house at the given cell', () => {
    const state = placeHouse(createCityHousesState(), 4, 5)
    const house = getHouseAtCell(state, 4, 5)
    expect(house).toBeDefined()
    expect(house!.cellX).toBe(4)
    expect(house!.cellZ).toBe(5)
  })

  it('returns undefined if no house at cell', () => {
    const state = createCityHousesState()
    expect(getHouseAtCell(state, 0, 0)).toBeUndefined()
  })
})

describe('cellToWorldPosition', () => {
  it('converts cell (0,0) to the correct world position for 8x4 grid', () => {
    const pos = cellToWorldPosition(0, 0, 8, 4)
    // halfExtent = 16, so x = -16 + 2 + 0 = -14
    expect(pos.x).toBeCloseTo(-14, 5)
    expect(pos.z).toBeCloseTo(-14, 5)
  })

  it('converts cell (7,7) to the far corner', () => {
    const pos = cellToWorldPosition(7, 7, 8, 4)
    expect(pos.x).toBeCloseTo(14, 5)
    expect(pos.z).toBeCloseTo(14, 5)
  })
})

describe('worldToCell', () => {
  it('round-trips with cellToWorldPosition', () => {
    for (let cx = 0; cx < 8; cx++) {
      for (let cz = 0; cz < 8; cz++) {
        const world = cellToWorldPosition(cx, cz, 8, 4)
        const cell = worldToCell(world.x, world.z, 8, 4)
        expect(cell.cellX).toBe(cx)
        expect(cell.cellZ).toBe(cz)
      }
    }
  })

  it('clamps out-of-bounds positions', () => {
    const cell = worldToCell(-100, 100, 8, 4)
    expect(cell.cellX).toBe(0)
    expect(cell.cellZ).toBe(7)
  })
})
