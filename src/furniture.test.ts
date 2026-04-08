import { describe, it, expect } from 'vitest'
import {
  FURNITURE_CATALOG,
  FURNITURE_DIMS,
  FURNITURE_CATEGORIES,
  catalogIdOf,
  type FurnitureItem,
} from './furniture'

describe('FURNITURE_CATALOG', () => {
  it('contains exactly 40 items', () => {
    expect(FURNITURE_CATALOG).toHaveLength(40)
  })

  it('every item has a unique id', () => {
    const ids = FURNITURE_CATALOG.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('each item has a valid meshType', () => {
    const validTypes: FurnitureItem['meshType'][] = ['box', 'cylinder', 'sphere']
    for (const item of FURNITURE_CATALOG) {
      expect(validTypes).toContain(item.meshType)
    }
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

  it('each item has a category from FURNITURE_CATEGORIES', () => {
    const validCategories = new Set<string>(FURNITURE_CATEGORIES)
    for (const item of FURNITURE_CATALOG) {
      expect(item.category).toBeDefined()
      expect(validCategories.has(item.category!)).toBe(true)
    }
  })

  it('each item has a modelPath', () => {
    for (const item of FURNITURE_CATALOG) {
      expect(item.modelPath).toMatch(/^\/models\/.+\.glb$/)
    }
  })
})

describe('FURNITURE_CATEGORIES', () => {
  it('has 6 categories', () => {
    expect(FURNITURE_CATEGORIES).toHaveLength(6)
  })

  it('every category has at least one item', () => {
    for (const cat of FURNITURE_CATEGORIES) {
      const items = FURNITURE_CATALOG.filter(i => i.category === cat)
      expect(items.length).toBeGreaterThan(0)
    }
  })
})

describe('FURNITURE_DIMS', () => {
  it('box dims have 3 values', () => {
    const boxItems = FURNITURE_CATALOG.filter(i => i.meshType === 'box')
    for (const item of boxItems) {
      expect(FURNITURE_DIMS[item.id]).toHaveLength(3)
    }
  })

  it('cylinder dims have 2 values', () => {
    const cylItems = FURNITURE_CATALOG.filter(i => i.meshType === 'cylinder')
    for (const item of cylItems) {
      expect(FURNITURE_DIMS[item.id]).toHaveLength(2)
    }
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
  it('returns the id unchanged when there is no dash-number suffix', () => {
    const item: FurnitureItem = {
      id: 'loungeSofa', name: 'Sofa', position: { x: 0, y: 0, z: 0 },
      rotation: 0, color: '#6b8cba', meshType: 'box',
    }
    expect(catalogIdOf(item)).toBe('loungeSofa')
  })

  it('strips the numeric suffix from placed item ids', () => {
    const item: FurnitureItem = {
      id: 'loungeSofa-1712345678', name: 'Sofa', position: { x: 1, y: 0, z: 2 },
      rotation: 0, color: '#6b8cba', meshType: 'box',
    }
    expect(catalogIdOf(item)).toBe('loungeSofa')
  })

  it('handles camelCase ids correctly', () => {
    const item: FurnitureItem = {
      id: 'kitchenCoffeeMachine-9999', name: 'Coffee Machine', position: { x: 0, y: 0, z: 0 },
      rotation: 0, color: '#a0522d', meshType: 'box',
    }
    expect(catalogIdOf(item)).toBe('kitchenCoffeeMachine')
  })
})
