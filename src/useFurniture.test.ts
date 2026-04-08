import { describe, it, expect } from 'vitest'
import { createPlacedItem, movePlacedItem, removePlacedItem } from './useFurniture'
import type { FurnitureItem } from './furniture'
import { FURNITURE_CATALOG } from './furniture'

const SOFA = FURNITURE_CATALOG.find(i => i.id === 'sofa')!
const LAMP = FURNITURE_CATALOG.find(i => i.id === 'lamp')!

describe('createPlacedItem', () => {
  it('creates a new id by appending a numeric suffix', () => {
    const placed = createPlacedItem(SOFA)
    expect(placed.id).toMatch(/^sofa-\d+$/)
  })

  it('different calls produce different ids', () => {
    const a = createPlacedItem(SOFA)
    const b = createPlacedItem(SOFA)
    expect(a.id).not.toBe(b.id)
  })

  it('places the item centered at x=0, z=0', () => {
    const placed = createPlacedItem(SOFA)
    expect(placed.position.x).toBe(0)
    expect(placed.position.z).toBe(0)
  })

  it('preserves the template y position so it sits on the floor', () => {
    const placed = createPlacedItem(SOFA)
    expect(placed.position.y).toBe(SOFA.position.y)
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
