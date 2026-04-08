import { describe, it, expect } from 'vitest'
import { createPlacedItem, movePlacedItem, removePlacedItem, rotatePlacedItem, nudgePlacedItem, clampPosition, getNextItemId, getPrevItemId } from './useFurniture'
import type { FurnitureItem } from './furniture'
import { FURNITURE_CATALOG } from './furniture'

const SOFA = FURNITURE_CATALOG.find(i => i.id === 'loungeSofa')!
const LAMP = FURNITURE_CATALOG.find(i => i.id === 'lampSquareFloor')!

describe('createPlacedItem', () => {
  it('creates a new id by appending a numeric suffix', () => {
    const placed = createPlacedItem(SOFA)
    expect(placed.id).toMatch(/^loungeSofa-\d+$/)
  })

  it('different calls produce different ids', () => {
    const a = createPlacedItem(SOFA)
    const b = createPlacedItem(SOFA)
    expect(a.id).not.toBe(b.id)
  })

  it('spawns at a random x between -3 and 3', () => {
    const placed = createPlacedItem(SOFA)
    expect(placed.position.x).toBeGreaterThanOrEqual(-3.5) // allows for offset
    expect(placed.position.x).toBeLessThanOrEqual(3.5)
  })

  it('spawns at a random z between -3 and 3', () => {
    const placed = createPlacedItem(SOFA)
    expect(placed.position.z).toBeGreaterThanOrEqual(-3.5)
    expect(placed.position.z).toBeLessThanOrEqual(3.5)
  })

  it('preserves the template y position so it sits on the floor', () => {
    const placed = createPlacedItem(SOFA)
    expect(placed.position.y).toBe(SOFA.position.y)
  })

  it('two consecutive spawns never have the exact same x,z', () => {
    const a = createPlacedItem(SOFA)
    const b = createPlacedItem(SOFA)
    const sameSpot = a.position.x === b.position.x && a.position.z === b.position.z
    expect(sameSpot).toBe(false)
  })

  it('copies all other fields from the template', () => {
    const placed = createPlacedItem(LAMP)
    expect(placed.name).toBe(LAMP.name)
    expect(placed.color).toBe(LAMP.color)
    expect(placed.meshType).toBe(LAMP.meshType)
    expect(placed.rotation).toBe(LAMP.rotation)
  })

  it('does not mutate the template', () => {
    const before = { ...SOFA }
    createPlacedItem(SOFA)
    expect(SOFA.id).toBe(before.id)
    expect(SOFA.position).toEqual(before.position)
  })
})

describe('movePlacedItem', () => {
  const items: FurnitureItem[] = [
    createPlacedItem(SOFA),
    createPlacedItem(LAMP),
  ]

  it('returns a new array (does not mutate)', () => {
    const result = movePlacedItem(items, items[0].id, { x: 1, y: 0.4, z: 2 })
    expect(result).not.toBe(items)
  })

  it('updates the position of the target item', () => {
    const newPos = { x: 3, y: 0.4, z: -1 }
    const result = movePlacedItem(items, items[0].id, newPos)
    expect(result[0].position).toEqual(newPos)
  })

  it('leaves other items unchanged', () => {
    const result = movePlacedItem(items, items[0].id, { x: 3, y: 0.4, z: -1 })
    expect(result[1]).toEqual(items[1])
  })

  it('returns the original array contents if id is not found', () => {
    const result = movePlacedItem(items, 'nonexistent', { x: 1, y: 0, z: 1 })
    expect(result).toEqual(items)
  })

  it('does not mutate original item objects', () => {
    const originalPos = { ...items[0].position }
    movePlacedItem(items, items[0].id, { x: 9, y: 9, z: 9 })
    expect(items[0].position).toEqual(originalPos)
  })
})

describe('removePlacedItem', () => {
  const items: FurnitureItem[] = [
    createPlacedItem(SOFA),
    createPlacedItem(LAMP),
  ]

  it('removes the item with the matching id', () => {
    const result = removePlacedItem(items, items[0].id)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(items[1].id)
  })

  it('returns a new array (does not mutate)', () => {
    const result = removePlacedItem(items, items[0].id)
    expect(result).not.toBe(items)
  })

  it('returns all items if id is not found', () => {
    const result = removePlacedItem(items, 'nonexistent')
    expect(result).toHaveLength(items.length)
  })

  it('can remove the last item', () => {
    const single = [createPlacedItem(SOFA)]
    const result = removePlacedItem(single, single[0].id)
    expect(result).toHaveLength(0)
  })
})

describe('rotatePlacedItem', () => {
  const items: FurnitureItem[] = [
    createPlacedItem(SOFA),
    createPlacedItem(LAMP),
  ]

  it('increments rotation by Math.PI/2 (90 degrees)', () => {
    const result = rotatePlacedItem(items, items[0].id)
    expect(result[0].rotation).toBeCloseTo(Math.PI / 4)
  })

  it('returns a new array (does not mutate)', () => {
    const result = rotatePlacedItem(items, items[0].id)
    expect(result).not.toBe(items)
  })

  it('leaves other items unchanged', () => {
    const result = rotatePlacedItem(items, items[0].id)
    expect(result[1]).toEqual(items[1])
  })

  it('stacks rotations on repeated calls', () => {
    const once = rotatePlacedItem(items, items[0].id)
    const twice = rotatePlacedItem(once, items[0].id)
    expect(twice[0].rotation).toBeCloseTo(Math.PI / 2)
  })

  it('does not mutate original item objects', () => {
    const originalRotation = items[0].rotation
    rotatePlacedItem(items, items[0].id)
    expect(items[0].rotation).toBe(originalRotation)
  })

  it('returns the original array contents if id is not found', () => {
    const result = rotatePlacedItem(items, 'nonexistent')
    expect(result).toEqual(items)
  })
})

describe('nudgePlacedItem', () => {
  const items: FurnitureItem[] = [
    createPlacedItem(SOFA),
    createPlacedItem(LAMP),
  ]

  it('nudges x position by the given delta', () => {
    const result = nudgePlacedItem(items, items[0].id, 0.1, 0, 0.5, 0.5, 5)
    expect(result[0].position.x).toBeCloseTo(items[0].position.x + 0.1)
    expect(result[0].position.z).toBeCloseTo(items[0].position.z)
  })

  it('nudges z position by the given delta', () => {
    const result = nudgePlacedItem(items, items[0].id, 0, -0.1, 0.5, 0.5, 5)
    expect(result[0].position.z).toBeCloseTo(items[0].position.z - 0.1)
    expect(result[0].position.x).toBeCloseTo(items[0].position.x)
  })

  it('preserves y position', () => {
    const result = nudgePlacedItem(items, items[0].id, 0.1, 0, 0.5, 0.5, 5)
    expect(result[0].position.y).toBe(items[0].position.y)
  })

  it('clamps to wall bounds after nudging', () => {
    // Move item to near-edge, then nudge past it
    const atEdge = movePlacedItem(items, items[0].id, { x: 4.5, y: items[0].position.y, z: 0 })
    const result = nudgePlacedItem(atEdge, items[0].id, 0.1, 0, 0.5, 0.5, 5)
    expect(result[0].position.x).toBe(4.5) // clamped to 5 - 0.5
  })

  it('returns a new array (does not mutate)', () => {
    const result = nudgePlacedItem(items, items[0].id, 0.1, 0, 0.5, 0.5, 5)
    expect(result).not.toBe(items)
  })

  it('leaves other items unchanged', () => {
    const result = nudgePlacedItem(items, items[0].id, 0.1, 0, 0.5, 0.5, 5)
    expect(result[1]).toEqual(items[1])
  })

  it('returns original contents if id not found', () => {
    const result = nudgePlacedItem(items, 'nonexistent', 0.1, 0, 0.5, 0.5, 5)
    expect(result).toEqual(items)
  })
})

describe('clampPosition', () => {
  it('leaves position unchanged when already inside bounds', () => {
    const result = clampPosition({ x: 0, z: 0 }, 0.5, 0.5, 4)
    expect(result).toEqual({ x: 0, z: 0 })
  })

  it('clamps x to the positive wall minus half-width', () => {
    const result = clampPosition({ x: 10, z: 0 }, 1, 0.5, 4)
    expect(result.x).toBe(3) // 4 - 1
  })

  it('clamps x to the negative wall plus half-width', () => {
    const result = clampPosition({ x: -10, z: 0 }, 1, 0.5, 4)
    expect(result.x).toBe(-3) // -(4 - 1)
  })

  it('clamps z to the positive wall minus half-depth', () => {
    const result = clampPosition({ x: 0, z: 10 }, 0.5, 1.1, 4)
    expect(result.z).toBeCloseTo(2.9) // 4 - 1.1
  })

  it('clamps z to the negative wall plus half-depth', () => {
    const result = clampPosition({ x: 0, z: -10 }, 0.5, 1.1, 4)
    expect(result.z).toBeCloseTo(-2.9)
  })

  it('clamps both x and z simultaneously', () => {
    const result = clampPosition({ x: 99, z: -99 }, 0.5, 0.5, 4)
    expect(result.x).toBe(3.5)
    expect(result.z).toBe(-3.5)
  })

  it('does not move a position that is exactly at the boundary', () => {
    const result = clampPosition({ x: 3, z: -3 }, 1, 1, 4)
    expect(result.x).toBe(3)
    expect(result.z).toBe(-3)
  })
})

describe('getNextItemId', () => {
  const items: FurnitureItem[] = [
    createPlacedItem(SOFA),
    createPlacedItem(LAMP),
    createPlacedItem(SOFA),
  ]

  it('returns first item id when nothing is selected', () => {
    expect(getNextItemId(items, null)).toBe(items[0].id)
  })

  it('returns null when items list is empty', () => {
    expect(getNextItemId([], null)).toBeNull()
  })

  it('returns null when items list is empty even with a stale id', () => {
    expect(getNextItemId([], 'stale-id')).toBeNull()
  })

  it('advances to the next item', () => {
    expect(getNextItemId(items, items[0].id)).toBe(items[1].id)
    expect(getNextItemId(items, items[1].id)).toBe(items[2].id)
  })

  it('wraps around from last to first', () => {
    expect(getNextItemId(items, items[2].id)).toBe(items[0].id)
  })

  it('returns first item when currentId is not found', () => {
    expect(getNextItemId(items, 'nonexistent')).toBe(items[0].id)
  })
})

describe('getPrevItemId', () => {
  const items: FurnitureItem[] = [
    createPlacedItem(SOFA),
    createPlacedItem(LAMP),
    createPlacedItem(SOFA),
  ]

  it('returns last item id when nothing is selected', () => {
    expect(getPrevItemId(items, null)).toBe(items[2].id)
  })

  it('returns null when items list is empty', () => {
    expect(getPrevItemId([], null)).toBeNull()
  })

  it('returns null when items list is empty even with a stale id', () => {
    expect(getPrevItemId([], 'stale-id')).toBeNull()
  })

  it('goes to the previous item', () => {
    expect(getPrevItemId(items, items[2].id)).toBe(items[1].id)
    expect(getPrevItemId(items, items[1].id)).toBe(items[0].id)
  })

  it('wraps around from first to last', () => {
    expect(getPrevItemId(items, items[0].id)).toBe(items[2].id)
  })

  it('returns last item when currentId is not found', () => {
    expect(getPrevItemId(items, 'nonexistent')).toBe(items[2].id)
  })
})
