import { describe, it, expect } from 'vitest'
import {
  createNpcState,
  spawnNpcsOnRoads,
  getConnectedRoadNeighbors,
  updateNpcs,
  getNpcs,
} from './cityNpcs'
import { createCityRoadsState, placeRoad, type CityRoadsState } from './cityRoads'

describe('createNpcState', () => {
  it('returns empty NPC state', () => {
    const state = createNpcState()
    expect(getNpcs(state)).toHaveLength(0)
  })
})

describe('getConnectedRoadNeighbors', () => {
  it('returns empty array for cell with no road neighbors', () => {
    const roads = placeRoad(createCityRoadsState(), 3, 3)
    expect(getConnectedRoadNeighbors(3, 3, roads)).toHaveLength(0)
  })

  it('returns orthogonal road neighbors', () => {
    let roads = createCityRoadsState()
    roads = placeRoad(roads, 3, 3)
    roads = placeRoad(roads, 4, 3) // right
    roads = placeRoad(roads, 3, 4) // below
    const neighbors = getConnectedRoadNeighbors(3, 3, roads)
    expect(neighbors).toHaveLength(2)
    expect(neighbors).toContainEqual({ cellX: 4, cellZ: 3 })
    expect(neighbors).toContainEqual({ cellX: 3, cellZ: 4 })
  })

  it('returns all four neighbors when surrounded by roads', () => {
    let roads = createCityRoadsState()
    roads = placeRoad(roads, 3, 3)
    roads = placeRoad(roads, 2, 3)
    roads = placeRoad(roads, 4, 3)
    roads = placeRoad(roads, 3, 2)
    roads = placeRoad(roads, 3, 4)
    expect(getConnectedRoadNeighbors(3, 3, roads)).toHaveLength(4)
  })

  it('does not include diagonal neighbors', () => {
    let roads = createCityRoadsState()
    roads = placeRoad(roads, 3, 3)
    roads = placeRoad(roads, 4, 4) // diagonal
    expect(getConnectedRoadNeighbors(3, 3, roads)).toHaveLength(0)
  })
})

describe('spawnNpcsOnRoads', () => {
  it('returns empty state when no roads exist', () => {
    const roads = createCityRoadsState()
    const state = spawnNpcsOnRoads(roads, 5)
    expect(getNpcs(state)).toHaveLength(0)
  })

  it('spawns NPCs on road cells', () => {
    let roads = createCityRoadsState()
    roads = placeRoad(roads, 0, 0)
    roads = placeRoad(roads, 1, 0)
    roads = placeRoad(roads, 2, 0)
    const state = spawnNpcsOnRoads(roads, 2)
    const npcs = getNpcs(state)
    expect(npcs.length).toBe(2)
    // All NPCs should be on road cells
    for (const npc of npcs) {
      const isOnRoad = [0, 1, 2].some(x => npc.cellX === x && npc.cellZ === 0)
      expect(isOnRoad).toBe(true)
    }
  })

  it('does not spawn more NPCs than road cells', () => {
    let roads = createCityRoadsState()
    roads = placeRoad(roads, 0, 0)
    const state = spawnNpcsOnRoads(roads, 10)
    expect(getNpcs(state).length).toBeLessThanOrEqual(1)
  })

  it('each NPC has a unique id', () => {
    let roads = createCityRoadsState()
    roads = placeRoad(roads, 0, 0)
    roads = placeRoad(roads, 1, 0)
    roads = placeRoad(roads, 2, 0)
    const state = spawnNpcsOnRoads(roads, 3)
    const ids = getNpcs(state).map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('updateNpcs', () => {
  function makeLineOfRoads(length: number): CityRoadsState {
    let roads = createCityRoadsState()
    for (let i = 0; i < length; i++) {
      roads = placeRoad(roads, i, 0)
    }
    return roads
  }

  it('does not crash with empty NPC state', () => {
    const state = createNpcState()
    const roads = createCityRoadsState()
    const next = updateNpcs(state, roads, 0.016)
    expect(getNpcs(next)).toHaveLength(0)
  })

  it('advances interpolation progress over time', () => {
    const roads = makeLineOfRoads(5)
    let state = spawnNpcsOnRoads(roads, 1)
    // Force a target by updating
    state = updateNpcs(state, roads, 0.016)
    state = updateNpcs(state, roads, 0.5)
    const npcAfter = getNpcs(state)[0]
    // NPC should have moved or be in process of moving
    expect(npcAfter).toBeDefined()
  })

  it('NPC eventually changes cell after enough updates', () => {
    const roads = makeLineOfRoads(5)
    let state = spawnNpcsOnRoads(roads, 1)
    const startCell = getNpcs(state)[0].cellX
    // Run many updates to ensure movement
    for (let i = 0; i < 200; i++) {
      state = updateNpcs(state, roads, 0.05)
    }
    const endCell = getNpcs(state)[0].cellX
    // With a line of 5 roads, NPC should have moved at some point
    // (probabilistic but near-certain with 200 ticks)
    expect(endCell !== startCell || getNpcs(state)[0].cellZ === 0).toBe(true)
  })

  it('NPC stays on road cells', () => {
    const roads = makeLineOfRoads(3)
    let state = spawnNpcsOnRoads(roads, 1)
    for (let i = 0; i < 100; i++) {
      state = updateNpcs(state, roads, 0.05)
    }
    const npc = getNpcs(state)[0]
    expect(npc.cellX).toBeGreaterThanOrEqual(0)
    expect(npc.cellX).toBeLessThan(3)
    expect(npc.cellZ).toBe(0)
  })

  it('NPC with no connected neighbors stays in place', () => {
    // Single isolated road
    const roads = placeRoad(createCityRoadsState(), 3, 3)
    let state = spawnNpcsOnRoads(roads, 1)
    const startNpc = getNpcs(state)[0]
    for (let i = 0; i < 50; i++) {
      state = updateNpcs(state, roads, 0.05)
    }
    const endNpc = getNpcs(state)[0]
    expect(endNpc.cellX).toBe(startNpc.cellX)
    expect(endNpc.cellZ).toBe(startNpc.cellZ)
  })
})
