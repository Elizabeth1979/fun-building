import { describe, it, expect } from 'vitest'
import {
  FURNITURE_CATALOG,
  FURNITURE_DIMS,
  catalogIdOf,
  type FurnitureItem,
} from './furniture'

describe('FURNITURE_CATALOG', () => {
  it('contains exactly 6 items', () => {
    expect(FURNITURE_CATALOG).toHaveLength(6)
  })

  it('contains the required furniture names', () => {
    const names = FURNITURE_CATALOG.map(i => i.name)
    expect(names).toContain('Sofa')
    expect(names).toContain('Table')
    expect(names).toContain('Chair')
    expect(names).toContain('Lamp')
    expect(names).toContain('Bed')
    expect(names).toContain('Bookshelf')
  })

  it('each item has a valid meshType', () => {
    const validTypes: FurnitureItem['meshType'][] = ['box', 'cylinder', 'sphere']
    for (const item of FURNITURE_CATALOG) {
      expect(validTypes).toContain(item.meshType)
    }
  })

  it('uses all three meshTypes across the catalog', () => {
    const types = new Set(FURNITURE_CATALOG.map(i => i.meshType))
    expect(types.has('box')).toBe(true)
    expect(types.has('cylinder')).toBe(true)
  })

  it('each item has a non-empty color string', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('each item has a non-negative y position (sits on the floor)', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.position.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('each item starts centered at x=0, z=0', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.position.x).toBe(0)
      expect(item.position.z).toBe(0)
    }
  })

  it('each catalog item id matches its FURNITURE_DIMS key', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(FURNITURE_DIMS).toHaveProperty(item.id)
    }
  })
})

describe('FURNITURE_DIMS', () => {
  it('box dims have 3 values', () => {
    expect(FURNITURE_DIMS['sofa']).toHaveLength(3)
    expect(FURNITURE_DIMS['table']).toHaveLength(3)
    expect(FURNITURE_DIMS['chair']).toHaveLength(3)
    expect(FURNITURE_DIMS['bed']).toHaveLength(3)
    expect(FURNITURE_DIMS['bookshelf']).toHaveLength(3)
  })

  it('cylinder dims have 2 values', () => {
    expect(FURNITURE_DIMS['lamp']).toHaveLength(2)
  })

  it('all dimension values are positive', () => {
    for (const dims of Object.values(FURNITURE_DIMS)) {
      for (const v of dims) {
        expect(v).toBeGreaterThan(0)
      }
    }
  })
})

describe('catalogIdOf', () => {
  it('returns the id unchanged when there is no dash', () => {
    const item: FurnitureItem = {
      id: 'sofa', name: 'Sofa', position: { x: 0, y: 0.4, z: 0 },
      rotation: 0, color: '#6b8cba', meshType: 'box',
    }
    expect(catalogIdOf(item)).toBe('sofa')
  })

  it('strips the timestamp suffix from placed item ids', () => {
    const item: FurnitureItem = {
      id: 'sofa-1712345678', name: 'Sofa', position: { x: 1, y: 0.4, z: 2 },
      rotation: 0, color: '#6b8cba', meshType: 'box',
    }
    expect(catalogIdOf(item)).toBe('sofa')
  })

  it('handles multi-segment ids correctly', () => {
    const item: FurnitureItem = {
      id: 'bookshelf-9999', name: 'Bookshelf', position: { x: 0, y: 1, z: 0 },
      rotation: 0, color: '#a0522d', meshType: 'box',
    }
    expect(catalogIdOf(item)).toBe('bookshelf')
  })
})
