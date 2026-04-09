/** Data model for roads placed on the city grid. Pure functions, no Three.js. */

import { type CityHousesState, getHouseAtCell } from './cityHouses'

export interface CityRoadsState {
  /** Set of "cellX,cellZ" keys where roads are placed */
  roads: Set<string>
}

function cellKey(cellX: number, cellZ: number): string {
  return `${cellX},${cellZ}`
}

function parseKey(key: string): { cellX: number; cellZ: number } {
  const [x, z] = key.split(',').map(Number)
  return { cellX: x, cellZ: z }
}

export function createCityRoadsState(): CityRoadsState {
  return { roads: new Set() }
}

/** Place a road at the given grid cell. Returns same state if already exists. */
export function placeRoad(state: CityRoadsState, cellX: number, cellZ: number): CityRoadsState {
  const key = cellKey(cellX, cellZ)
  if (state.roads.has(key)) return state
  const newRoads = new Set(state.roads)
  newRoads.add(key)
  return { roads: newRoads }
}

/** Remove the road at the given grid cell. Returns same state if empty. */
export function removeRoad(state: CityRoadsState, cellX: number, cellZ: number): CityRoadsState {
  const key = cellKey(cellX, cellZ)
  if (!state.roads.has(key)) return state
  const newRoads = new Set(state.roads)
  newRoads.delete(key)
  return { roads: newRoads }
}

/** Check if a road exists at the given cell. */
export function hasRoadAtCell(state: CityRoadsState, cellX: number, cellZ: number): boolean {
  return state.roads.has(cellKey(cellX, cellZ))
}

/** Get all road cells as an array of {cellX, cellZ}. */
export function getRoadCells(state: CityRoadsState): { cellX: number; cellZ: number }[] {
  return Array.from(state.roads).map(parseKey)
}

/** Check if a cell is occupied by either a road or a house. */
export function isCellOccupied(
  cellX: number,
  cellZ: number,
  roads: CityRoadsState,
  houses: CityHousesState,
): boolean {
  return hasRoadAtCell(roads, cellX, cellZ) || getHouseAtCell(houses, cellX, cellZ) !== undefined
}
