/** Number of tiles along each axis of the city grid */
export const CITY_GRID_SIZE = 8

/** Size of each city ground tile in world units */
export const CITY_TILE_SIZE = 4

export interface GridPosition {
  x: number
  y: number
  z: number
}

/**
 * Compute world positions for an 8x8 city ground grid, centered at the origin.
 * Pure data — no Three.js dependency.
 */
export function buildCityGridPositions(): GridPosition[] {
  const positions: GridPosition[] = []
  const halfExtent = (CITY_GRID_SIZE * CITY_TILE_SIZE) / 2

  for (let ix = 0; ix < CITY_GRID_SIZE; ix++) {
    for (let iz = 0; iz < CITY_GRID_SIZE; iz++) {
      positions.push({
        x: -halfExtent + CITY_TILE_SIZE / 2 + ix * CITY_TILE_SIZE,
        y: 0,
        z: -halfExtent + CITY_TILE_SIZE / 2 + iz * CITY_TILE_SIZE,
      })
    }
  }

  return positions
}
