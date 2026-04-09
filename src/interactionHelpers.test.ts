import { describe, it, expect } from 'vitest'
import { computeItemHalfDims } from './interactionHelpers'
import type { FurnitureItem } from './furniture'

describe('computeItemHalfDims', () => {
  const base: FurnitureItem = {
    id: 'tableCoffee-1',
    name: 'Coffee Table',
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    color: '#d2b48c',
    meshType: 'box',
    modelPath: '/models/tableCoffee.glb',
  }

  it('computes half dims for box items', () => {
    // tableCoffee dims: [1.2, 0.4, 0.6]
    const result = computeItemHalfDims(base)
    expect(result.halfW).toBeCloseTo(0.6)  // 1.2 / 2
    expect(result.halfD).toBeCloseTo(0.3)  // 0.6 / 2
    expect(result.halfH).toBeCloseTo(0.2)  // 0.4 / 2
  })

  it('computes half dims for cylinder items', () => {
    const lamp: FurnitureItem = {
      ...base,
      id: 'lampSquareFloor-1',
      name: 'Square Lamp',
      meshType: 'cylinder',
      modelPath: '/models/lampSquareFloor.glb',
    }
    // lampSquareFloor dims: [0.3, 1.5]
    const result = computeItemHalfDims(lamp)
    expect(result.halfW).toBeCloseTo(0.3)   // radius
    expect(result.halfD).toBeCloseTo(0.3)   // radius (same as halfW for cylinder)
    expect(result.halfH).toBeCloseTo(0.75)  // 1.5 / 2
  })

  it('computes half dims for sphere items', () => {
    const sphere: FurnitureItem = {
      ...base,
      id: 'unknown-1',
      name: 'Sphere',
      meshType: 'sphere',
    }
    // unknown dims default: [0.5, 0.5, 0.5]
    const result = computeItemHalfDims(sphere)
    expect(result.halfW).toBeCloseTo(0.25) // 0.5 / 2 for halfW (box fallback for unknown)
    expect(result.halfH).toBeCloseTo(0.5)  // radius for sphere = dims[0]
  })

  it('uses default dims for unknown catalog ids', () => {
    const unknown: FurnitureItem = {
      ...base,
      id: 'nonexistent-1',
      name: 'Unknown',
      meshType: 'box',
    }
    const result = computeItemHalfDims(unknown)
    expect(result.halfW).toBeCloseTo(0.25) // 0.5 / 2
    expect(result.halfD).toBeCloseTo(0.25) // 0.5 / 2
    expect(result.halfH).toBeCloseTo(0.25) // 0.5 / 2
  })
})

describe('shouldBlockCollision', () => {
  // Imported lazily to allow the test file to compile even before implementation
  it('blocks when intersect count > 0 and <= half of total', async () => {
    const { shouldBlockCollision } = await import('./interactionHelpers')
    expect(shouldBlockCollision(1, 4)).toBe(true)
    expect(shouldBlockCollision(2, 4)).toBe(true)
  })

  it('does not block when intersect count is 0', async () => {
    const { shouldBlockCollision } = await import('./interactionHelpers')
    expect(shouldBlockCollision(0, 4)).toBe(false)
  })

  it('does not block when intersect count > half (oversized bbox)', async () => {
    const { shouldBlockCollision } = await import('./interactionHelpers')
    expect(shouldBlockCollision(3, 4)).toBe(false)
    expect(shouldBlockCollision(4, 4)).toBe(false)
  })

  it('does not block when other count is 0', async () => {
    const { shouldBlockCollision } = await import('./interactionHelpers')
    expect(shouldBlockCollision(0, 0)).toBe(false)
    expect(shouldBlockCollision(1, 0)).toBe(false)
  })
})
