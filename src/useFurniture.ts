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

  function moveItem(id: string, position: { x: number; y: number; z: number }): void {
    setPlacedItems(prev => movePlacedItem(prev, id, position))
  }

  function removeItem(id: string): void {
    setPlacedItems(prev => removePlacedItem(prev, id))
    setSelectedItemId(prev => (prev === id ? null : prev))
  }

  return { placedItems, selectedItemId, setSelectedItemId, addItem, moveItem, removeItem }
}
