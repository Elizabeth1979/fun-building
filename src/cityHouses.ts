/** Data model for houses placed on the city grid. Pure functions, no Three.js. */

export interface PlacedHouse {
  /** Unique identifier for this house */
  id: string
  /** Grid cell X index (0-based) */
  cellX: number
  /** Grid cell Z index (0-based) */
  cellZ: number
}

export interface CityHousesState {
  /** Map from "cellX,cellZ" key to PlacedHouse */
  houses: Map<string, PlacedHouse>
}

function cellKey(cellX: number, cellZ: number): string {
  return `${cellX},${cellZ}`
}

let nextId = 1

export function createCityHousesState(): CityHousesState {
  return { houses: new Map() }
}

/** Place a house at the given grid cell. Returns same state if cell is occupied. */
export function placeHouse(state: CityHousesState, cellX: number, cellZ: number): CityHousesState {
  const key = cellKey(cellX, cellZ)
  if (state.houses.has(key)) return state
  const newHouses = new Map(state.houses)
  newHouses.set(key, { id: `house-${nextId++}`, cellX, cellZ })
  return { houses: newHouses }
}

/** Remove the house at the given grid cell. Returns same state if empty. */
export function removeHouse(state: CityHousesState, cellX: number, cellZ: number): CityHousesState {
  const key = cellKey(cellX, cellZ)
  if (!state.houses.has(key)) return state
  const newHouses = new Map(state.houses)
  newHouses.delete(key)
  return { houses: newHouses }
}

/** Get the house at a given cell, or undefined. */
export function getHouseAtCell(state: CityHousesState, cellX: number, cellZ: number): PlacedHouse | undefined {
  return state.houses.get(cellKey(cellX, cellZ))
}

/** Convert grid cell indices to world position (center of tile). */
export function cellToWorldPosition(cellX: number, cellZ: number, gridSize: number, tileSize: number): { x: number; z: number } {
  const halfExtent = (gridSize * tileSize) / 2
  return {
    x: -halfExtent + tileSize / 2 + cellX * tileSize,
    z: -halfExtent + tileSize / 2 + cellZ * tileSize,
  }
}

/** Convert world position to nearest grid cell indices. */
export function worldToCell(worldX: number, worldZ: number, gridSize: number, tileSize: number): { cellX: number; cellZ: number } {
  const halfExtent = (gridSize * tileSize) / 2
  const cellX = Math.round((worldX + halfExtent - tileSize / 2) / tileSize)
  const cellZ = Math.round((worldZ + halfExtent - tileSize / 2) / tileSize)
  return {
    cellX: Math.max(0, Math.min(gridSize - 1, cellX)),
    cellZ: Math.max(0, Math.min(gridSize - 1, cellZ)),
  }
}
