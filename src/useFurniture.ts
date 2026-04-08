import { useState } from 'react'
import type { FurnitureItem } from './furniture'

let _idSeq = 0
let _lastSpawnX = NaN
let _lastSpawnZ = NaN

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// Pure helpers — exported so they can be unit-tested without React
export function createPlacedItem(template: FurnitureItem): FurnitureItem {
  let x = randomInRange(-3, 3)
  let z = randomInRange(-3, 3)

  // Ensure two consecutive spawns never land in the exact same spot
  if (x === _lastSpawnX && z === _lastSpawnZ) {
    x += 0.5
    z += 0.5
  }
  _lastSpawnX = x
  _lastSpawnZ = z

  return {
    ...template,
    id: `${template.id}-${++_idSeq}`,
    position: { x, y: template.position.y, z },
  }
}

export function movePlacedItem(
  items: FurnitureItem[],
  id: string,
  position: { x: number; y: number; z: number },
): FurnitureItem[] {
  return items.map(item => (item.id === id ? { ...item, position } : item))
}

export function removePlacedItem(items: FurnitureItem[], id: string): FurnitureItem[] {
  return items.filter(item => item.id !== id)
}

export function rotatePlacedItem(items: FurnitureItem[], id: string): FurnitureItem[] {
  return items.map(item =>
    item.id === id ? { ...item, rotation: item.rotation + Math.PI / 4 } : item,
  )
}

export function nudgePlacedItem(
  items: FurnitureItem[],
  id: string,
  dx: number,
  dz: number,
  halfW: number,
  halfD: number,
  roomHalf: number,
): FurnitureItem[] {
  return items.map(item => {
    if (item.id !== id) return item
    const clamped = clampPosition(
      { x: item.position.x + dx, z: item.position.z + dz },
      halfW,
      halfD,
      roomHalf,
    )
    return { ...item, position: { x: clamped.x, y: item.position.y, z: clamped.z } }
  })
}

export function getNextItemId(items: FurnitureItem[], currentId: string | null): string | null {
  if (items.length === 0) return null
  if (currentId === null) return items[0].id
  const idx = items.findIndex(i => i.id === currentId)
  if (idx === -1) return items[0].id
  return items[(idx + 1) % items.length].id
}

export function getPrevItemId(items: FurnitureItem[], currentId: string | null): string | null {
  if (items.length === 0) return null
  if (currentId === null) return items[items.length - 1].id
  const idx = items.findIndex(i => i.id === currentId)
  if (idx === -1) return items[items.length - 1].id
  return items[(idx - 1 + items.length) % items.length].id
}

export function getChildren(items: FurnitureItem[], parentId: string): FurnitureItem[] {
  return items.filter(item => item.parentId === parentId)
}

export function moveItemWithChildren(
  items: FurnitureItem[],
  id: string,
  newPos: { x: number; y: number; z: number },
): FurnitureItem[] {
  const parent = items.find(item => item.id === id)
  if (!parent) return items
  const dx = newPos.x - parent.position.x
  const dy = newPos.y - parent.position.y
  const dz = newPos.z - parent.position.z
  return items.map(item => {
    if (item.id === id) return { ...item, position: newPos }
    if (item.parentId === id) {
      return {
        ...item,
        position: {
          x: item.position.x + dx,
          y: item.position.y + dy,
          z: item.position.z + dz,
        },
      }
    }
    return item
  })
}

export function clampPosition(
  pos: { x: number; z: number },
  halfW: number,
  halfD: number,
  roomHalf: number,
): { x: number; z: number } {
  const maxX = roomHalf - halfW
  const maxZ = roomHalf - halfD
  return {
    x: Math.max(-maxX, Math.min(maxX, pos.x)),
    z: Math.max(-maxZ, Math.min(maxZ, pos.z)),
  }
}

export function useFurniture() {
  const [placedItems, setPlacedItems] = useState<FurnitureItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  function addItem(template: FurnitureItem): void {
    const instance = createPlacedItem(template)
    setPlacedItems(prev => [...prev, instance])
    setSelectedItemId(instance.id)
  }

  function moveItem(id: string, position: { x: number; y: number; z: number }, landedOnId?: string | null): void {
    setPlacedItems(prev => {
      let next = movePlacedItem(prev, id, position)
      // Set or clear parentId based on whether item landed on furniture
      if (landedOnId && position.y > 0.01) {
        next = next.map(item => item.id === id ? { ...item, parentId: landedOnId } : item)
      } else if (position.y <= 0.01) {
        next = next.map(item => item.id === id ? { ...item, parentId: undefined } : item)
      }
      return next
    })
  }

  function moveItemWithChildrenFn(id: string, newPos: { x: number; y: number; z: number }): void {
    setPlacedItems(prev => moveItemWithChildren(prev, id, newPos))
  }

  function removeItem(id: string): void {
    setPlacedItems(prev => {
      // Clear parentId on children before removing
      const cleared = prev.map(item => item.parentId === id ? { ...item, parentId: undefined } : item)
      return removePlacedItem(cleared, id)
    })
    setSelectedItemId(prev => (prev === id ? null : prev))
  }

  function rotateItem(id: string): void {
    setPlacedItems(prev => rotatePlacedItem(prev, id))
  }

  return { placedItems, selectedItemId, setSelectedItemId, addItem, moveItem, moveItemWithChildren: moveItemWithChildrenFn, removeItem, rotateItem }
}
