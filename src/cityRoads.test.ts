import { describe, it, expect } from 'vitest'
import {
  createCityRoadsState,
  placeRoad,
  removeRoad,
  hasRoadAtCell,
  getRoadCells,
  isCellOccupied,
} from './cityRoads'
import {
  createCityHousesState,
  placeHouse,
} from './cityHouses'

describe('createCityRoadsState', () => {
  it('returns an empty roads set', () => {
    const state = createCityRoadsState()
    expect(getRoadCells(state)).toHaveLength(0)
  })
})

describe('placeRoad', () => {
  it('adds a road at the given grid cell', () => {
    const state = createCityRoadsState()
    const next = placeRoad(state, 2, 3)
    expect(hasRoadAtCell(next, 2, 3)).toBe(true)
  })

  it('does not mutate the original state', () => {
    const state = createCityRoadsState()
    const next = placeRoad(state, 0, 0)
    expect(hasRoadAtCell(state, 0, 0)).toBe(false)
    expect(hasRoadAtCell(next, 0, 0)).toBe(true)
  })

  it('returns same state if road already exists at cell', () => {
    const s1 = placeRoad(createCityRoadsState(), 1, 1)
    const s2 = placeRoad(s1, 1, 1)
    expect(s2).toBe(s1)
  })

  it('can place multiple roads', () => {
    let state = createCityRoadsState()
    state = placeRoad(state, 0, 0)
    state = placeRoad(state, 1, 0)
    state = placeRoad(state, 2, 0)
    expect(getRoadCells(state)).toHaveLength(3)
  })
})

describe('removeRoad', () => {
  it('removes the road at the given cell', () => {
    const state = placeRoad(createCityRoadsState(), 2, 3)
    const next = removeRoad(state, 2, 3)
    expect(hasRoadAtCell(next, 2, 3)).toBe(false)
  })

  it('does not mutate the original state', () => {
    const state = placeRoad(createCityRoadsState(), 2, 3)
    const next = removeRoad(state, 2, 3)
    expect(hasRoadAtCell(state, 2, 3)).toBe(true)
    expect(hasRoadAtCell(next, 2, 3)).toBe(false)
  })

  it('returns same state if no road at cell', () => {
    const state = createCityRoadsState()
    const next = removeRoad(state, 5, 5)
    expect(next).toBe(state)
  })
})

describe('hasRoadAtCell', () => {
  it('returns false for empty cell', () => {
    expect(hasRoadAtCell(createCityRoadsState(), 0, 0)).toBe(false)
  })

  it('returns true after placing road', () => {
    const state = placeRoad(createCityRoadsState(), 3, 4)
    expect(hasRoadAtCell(state, 3, 4)).toBe(true)
  })
})

describe('getRoadCells', () => {
  it('returns array of {cellX, cellZ} for all roads', () => {
    let state = createCityRoadsState()
    state = placeRoad(state, 1, 2)
    state = placeRoad(state, 3, 4)
    const cells = getRoadCells(state)
    expect(cells).toHaveLength(2)
    expect(cells).toContainEqual({ cellX: 1, cellZ: 2 })
    expect(cells).toContainEqual({ cellX: 3, cellZ: 4 })
  })
})

describe('isCellOccupied', () => {
  it('returns false for completely empty cell', () => {
    const roads = createCityRoadsState()
    const houses = createCityHousesState()
    expect(isCellOccupied(1, 1, roads, houses)).toBe(false)
  })

  it('returns true if cell has a road', () => {
    const roads = placeRoad(createCityRoadsState(), 1, 1)
    const houses = createCityHousesState()
    expect(isCellOccupied(1, 1, roads, houses)).toBe(true)
  })

  it('returns true if cell has a house', () => {
    const roads = createCityRoadsState()
    const houses = placeHouse(createCityHousesState(), 2, 2)
    expect(isCellOccupied(2, 2, roads, houses)).toBe(true)
  })

  it('returns false for unoccupied cell when others are occupied', () => {
    const roads = placeRoad(createCityRoadsState(), 0, 0)
    const houses = placeHouse(createCityHousesState(), 1, 1)
    expect(isCellOccupied(2, 2, roads, houses)).toBe(false)
  })
})
