/** Data model for cosmetic NPC walkers on city roads. Pure functions, no Three.js. */

import { type CityRoadsState, hasRoadAtCell, getRoadCells } from './cityRoads'

export interface NpcWalker {
  readonly id: string
  /** Current grid cell X */
  readonly cellX: number
  /** Current grid cell Z */
  readonly cellZ: number
  /** Target grid cell X (where NPC is walking toward) */
  readonly targetCellX: number
  /** Target grid cell Z */
  readonly targetCellZ: number
  /** Interpolation progress 0..1 from current cell to target */
  readonly progress: number
  /** Walking speed (cells per second) */
  readonly speed: number
}

export interface NpcState {
  readonly npcs: readonly NpcWalker[]
}

export function createNpcState(): NpcState {
  return { npcs: [] }
}

export function getNpcs(state: NpcState): readonly NpcWalker[] {
  return state.npcs
}

/** Get orthogonal (4-connected) road neighbors for a cell. */
export function getConnectedRoadNeighbors(
  cellX: number,
  cellZ: number,
  roads: CityRoadsState,
): { cellX: number; cellZ: number }[] {
  const deltas = [
    { dx: -1, dz: 0 },
    { dx: 1, dz: 0 },
    { dx: 0, dz: -1 },
    { dx: 0, dz: 1 },
  ]
  const result: { cellX: number; cellZ: number }[] = []
  for (const { dx, dz } of deltas) {
    const nx = cellX + dx
    const nz = cellZ + dz
    if (hasRoadAtCell(roads, nx, nz)) {
      result.push({ cellX: nx, cellZ: nz })
    }
  }
  return result
}

let npcIdCounter = 0

/** Spawn up to `maxCount` NPCs on random road cells. */
export function spawnNpcsOnRoads(roads: CityRoadsState, maxCount: number): NpcState {
  const cells = getRoadCells(roads)
  if (cells.length === 0) return createNpcState()

  const count = Math.min(maxCount, cells.length)
  // Shuffle cells deterministically enough for spawning
  const shuffled = [...cells].sort((a, b) => {
    const ha = a.cellX * 7919 + a.cellZ * 104729
    const hb = b.cellX * 7919 + b.cellZ * 104729
    return ha - hb
  })

  const npcs: NpcWalker[] = []
  for (let i = 0; i < count; i++) {
    const cell = shuffled[i]
    npcs.push({
      id: `npc-${++npcIdCounter}`,
      cellX: cell.cellX,
      cellZ: cell.cellZ,
      targetCellX: cell.cellX,
      targetCellZ: cell.cellZ,
      progress: 0,
      speed: 0.8 + (i % 3) * 0.2, // vary speed slightly
    })
  }
  return { npcs }
}

/** Simple seeded pseudo-random for picking neighbors. */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

/** Advance NPC positions by deltaTime seconds. Pure function. */
export function updateNpcs(state: NpcState, roads: CityRoadsState, deltaTime: number): NpcState {
  if (state.npcs.length === 0) return state

  const updated: NpcWalker[] = state.npcs.map((npc, idx) => {
    // If at target (progress >= 1 or same cell), pick a new target
    if (npc.cellX === npc.targetCellX && npc.cellZ === npc.targetCellZ) {
      const neighbors = getConnectedRoadNeighbors(npc.cellX, npc.cellZ, roads)
      if (neighbors.length === 0) return npc // stuck, no neighbors

      const seed = npc.cellX * 1000 + npc.cellZ * 100 + idx + Date.now() * 0.001
      const pick = Math.floor(pseudoRandom(seed) * neighbors.length) % neighbors.length
      const target = neighbors[pick]
      return {
        ...npc,
        targetCellX: target.cellX,
        targetCellZ: target.cellZ,
        progress: 0,
      }
    }

    // Advance progress
    const newProgress = npc.progress + deltaTime * npc.speed
    if (newProgress >= 1) {
      // Arrived at target
      return {
        ...npc,
        cellX: npc.targetCellX,
        cellZ: npc.targetCellZ,
        targetCellX: npc.targetCellX,
        targetCellZ: npc.targetCellZ,
        progress: 0,
      }
    }

    return { ...npc, progress: newProgress }
  })

  return { npcs: updated }
}
