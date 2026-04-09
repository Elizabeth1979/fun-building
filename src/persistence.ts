import type { RoomColors } from './useRoomColors'
import type { FurnitureItem } from './furniture'
import type { CityHousesState, PlacedHouse } from './cityHouses'
import type { CityRoadsState } from './cityRoads'
import type { HouseInteriorsStore, HouseInterior } from './houseInteriors'
import type { ViewMode } from './viewMode'

const SAVE_KEY = 'fun-building-save'

// ---------- v2 (room-only) types ----------

export interface SaveData {
  colors: RoomColors
  furniture: FurnitureItem[]
}

interface SaveEnvelope {
  version: 2
  colors: RoomColors
  furniture: FurnitureItem[]
}

// ---------- v3 (city) types ----------

export interface CitySaveData {
  houses: CityHousesState
  roads: CityRoadsState
  interiors: HouseInteriorsStore
  viewMode: ViewMode
  activeHouseId: string | null
}

interface CitySaveEnvelope {
  version: 3
  houses: PlacedHouse[]
  roads: string[]
  interiors: Record<string, HouseInterior>
  viewMode: ViewMode
  activeHouseId: string | null
}

// ---------- type guards ----------

function isRoomColors(obj: unknown): obj is RoomColors {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'walls' in obj &&
    'floor' in obj &&
    'ceiling' in obj &&
    !('version' in obj)
  )
}

function isSaveEnvelope(obj: unknown): obj is SaveEnvelope {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'version' in obj &&
    (obj as Record<string, unknown>).version === 2
  )
}

function isCitySaveEnvelope(obj: unknown): obj is CitySaveEnvelope {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'version' in obj &&
    (obj as Record<string, unknown>).version === 3 &&
    'houses' in obj &&
    'roads' in obj &&
    'interiors' in obj
  )
}

// ---------- Serialization helpers ----------

export function serializeHouses(state: CityHousesState): PlacedHouse[] {
  return Array.from(state.houses.values())
}

export function deserializeHouses(arr: PlacedHouse[]): CityHousesState {
  const houses = new Map<string, PlacedHouse>()
  for (const h of arr) {
    houses.set(`${h.cellX},${h.cellZ}`, h)
  }
  return { houses }
}

export function serializeRoads(state: CityRoadsState): string[] {
  return Array.from(state.roads)
}

export function deserializeRoads(arr: string[]): CityRoadsState {
  return { roads: new Set(arr) }
}

export function serializeInteriors(store: HouseInteriorsStore): Record<string, HouseInterior> {
  const result: Record<string, HouseInterior> = {}
  for (const [id, interior] of store.interiors) {
    result[id] = interior
  }
  return result
}

export function deserializeInteriors(obj: Record<string, HouseInterior>): HouseInteriorsStore {
  const interiors = new Map<string, HouseInterior>()
  for (const id of Object.keys(obj)) {
    interiors.set(id, obj[id])
  }
  return { interiors }
}

// ---------- v2 save / load (room-only, kept for backward compat) ----------

export function saveScene(colors: RoomColors, furniture: FurnitureItem[]): void {
  const envelope: SaveEnvelope = { version: 2, colors, furniture }
  localStorage.setItem(SAVE_KEY, JSON.stringify(envelope))
}

export function loadScene(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isSaveEnvelope(parsed)) {
      return { colors: parsed.colors, furniture: parsed.furniture }
    }
    // v1 migration: plain RoomColors object
    if (isRoomColors(parsed)) {
      return { colors: parsed, furniture: [] }
    }
    return null
  } catch {
    return null
  }
}

// ---------- v3 save / load (full city) ----------

export function saveCityScene(
  houses: CityHousesState,
  roads: CityRoadsState,
  interiors: HouseInteriorsStore,
  viewMode: ViewMode,
  activeHouseId: string | null,
): void {
  const envelope: CitySaveEnvelope = {
    version: 3,
    houses: serializeHouses(houses),
    roads: serializeRoads(roads),
    interiors: serializeInteriors(interiors),
    viewMode,
    activeHouseId,
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(envelope))
}

export function loadCityScene(): CitySaveData | null {
  const raw = localStorage.getItem(SAVE_KEY)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isCitySaveEnvelope(parsed)) {
      return {
        houses: deserializeHouses(parsed.houses),
        roads: deserializeRoads(parsed.roads),
        interiors: deserializeInteriors(parsed.interiors),
        viewMode: parsed.viewMode,
        activeHouseId: parsed.activeHouseId,
      }
    }
    return null
  } catch {
    return null
  }
}
