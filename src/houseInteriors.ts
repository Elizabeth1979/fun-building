/** Per-house interior state. Pure functions, no Three.js or React. */

import type { RoomColors } from './useRoomColors'
import { DEFAULT_COLORS } from './useRoomColors'
import type { FurnitureItem } from './furniture'

export interface HouseInterior {
  colors: RoomColors
  furniture: FurnitureItem[]
}

export interface HouseInteriorsStore {
  /** Map from house id to its interior state */
  interiors: Map<string, HouseInterior>
}

export function createHouseInteriorsStore(): HouseInteriorsStore {
  return { interiors: new Map() }
}

/** Get interior for a house. Returns default (empty) interior if not yet customised. */
export function getHouseInterior(store: HouseInteriorsStore, houseId: string): HouseInterior {
  const existing = store.interiors.get(houseId)
  if (existing) return existing
  return { colors: { ...DEFAULT_COLORS }, furniture: [] }
}

/** Save interior for a house. Returns a new store (immutable). */
export function setHouseInterior(
  store: HouseInteriorsStore,
  houseId: string,
  interior: HouseInterior,
): HouseInteriorsStore {
  const next = new Map(store.interiors)
  next.set(houseId, interior)
  return { interiors: next }
}
