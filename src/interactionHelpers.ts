/**
 * Pure helper functions for furniture drag/drop interaction logic.
 * Extracted from App.tsx for testability and clarity.
 */
import type { FurnitureItem } from './furniture'
import { FURNITURE_DIMS, catalogIdOf } from './furniture'

export interface ItemHalfDims {
  halfW: number
  halfD: number
  halfH: number
}

/**
 * Compute the half-width, half-depth, and half-height for a furniture item
 * based on its meshType and catalog dimensions.
 */
export function computeItemHalfDims(item: FurnitureItem): ItemHalfDims {
  const catalogId = catalogIdOf(item)
  const dims = FURNITURE_DIMS[catalogId] ?? [0.5, 0.5, 0.5]

  const halfW = item.meshType === 'cylinder' ? (dims[0] as number) : (dims[0] as number) / 2
  const halfD = item.meshType === 'box' ? (dims[2] as number) / 2 : halfW
  const halfH = item.meshType === 'cylinder' ? (dims[1] as number) / 2
    : item.meshType === 'sphere' ? (dims[0] as number)
    : (dims[1] as number) / 2

  return { halfW, halfD, halfH }
}

/**
 * Determine whether a collision should block movement.
 * Returns true when intersectCount > 0 AND intersectCount <= otherCount / 2.
 * When intersecting more than half of items, the bounding box is likely broken — skip collision.
 */
export function shouldBlockCollision(intersectCount: number, otherCount: number): boolean {
  if (otherCount === 0) return false
  return intersectCount > 0 && intersectCount <= otherCount / 2
}
