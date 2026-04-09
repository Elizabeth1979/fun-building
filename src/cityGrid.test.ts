import { describe, it, expect } from 'vitest'
import { buildCityGridPositions, CITY_GRID_SIZE, CITY_TILE_SIZE } from './cityGrid'

describe('buildCityGridPositions', () => {
  it('returns 64 tile positions for an 8x8 grid', () => {
    const positions = buildCityGridPositions()
    expect(positions).toHaveLength(CITY_GRID_SIZE * CITY_GRID_SIZE)
  })

  it('each position has x, y=0, z coordinates', () => {
    const positions = buildCityGridPositions()
    for (const pos of positions) {
      expect(pos).toHaveProperty('x')
      expect(pos).toHaveProperty('y', 0)
      expect(pos).toHaveProperty('z')
    }
  })

  it('grid is centered around the origin', () => {
    const positions = buildCityGridPositions()
    const xs = positions.map(p => p.x)
    const zs = positions.map(p => p.z)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minZ = Math.min(...zs)
    const maxZ = Math.max(...zs)
    // Grid should be symmetric around origin
    expect(minX + maxX).toBeCloseTo(0, 5)
    expect(minZ + maxZ).toBeCloseTo(0, 5)
  })

  it('tiles are spaced by CITY_TILE_SIZE', () => {
    const positions = buildCityGridPositions()
    // Sort by x then z to get ordered grid
    const sorted = [...positions].sort((a, b) => a.x - b.x || a.z - b.z)
    // Check spacing between first two tiles in same row
    const firstRow = sorted.filter(p => p.x === sorted[0].x)
    if (firstRow.length > 1) {
      const spacing = Math.abs(firstRow[1].z - firstRow[0].z)
      expect(spacing).toBeCloseTo(CITY_TILE_SIZE, 5)
    }
  })

  it('exports CITY_GRID_SIZE as 8', () => {
    expect(CITY_GRID_SIZE).toBe(8)
  })

  it('exports CITY_TILE_SIZE as a positive number', () => {
    expect(CITY_TILE_SIZE).toBeGreaterThan(0)
  })
})
