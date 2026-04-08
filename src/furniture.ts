export interface FurnitureItem {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  rotation: number // y-axis rotation in radians
  color: string
  meshType: 'box' | 'cylinder' | 'sphere'
}

// Geometry dimensions per catalog id:
//   box      → [width, height, depth]
//   cylinder → [radius, height]
//   sphere   → [radius]
export type FurnitureDims = [number, number, number] | [number, number] | [number]

export const FURNITURE_DIMS: Record<string, FurnitureDims> = {
  sofa:      [2.2, 0.8, 0.9],
  table:     [1.4, 0.8, 1.0],
  chair:     [0.7, 0.9, 0.7],
  lamp:      [0.15, 1.5],
  bed:       [1.6, 0.6, 2.2],
  bookshelf: [0.6, 2.0, 0.3],
}

// Catalog items — templates for placing furniture in the room.
// position.y = height/2 so the mesh sits flush on the floor (y=0).
export const FURNITURE_CATALOG: FurnitureItem[] = [
  { id: 'sofa',      name: 'Sofa',      position: { x: 0, y: 0.4,  z: 0 }, rotation: 0, color: '#6b8cba', meshType: 'box'      },
  { id: 'table',     name: 'Table',     position: { x: 0, y: 0.4,  z: 0 }, rotation: 0, color: '#8b5e3c', meshType: 'box'      },
  { id: 'chair',     name: 'Chair',     position: { x: 0, y: 0.45, z: 0 }, rotation: 0, color: '#e8a87c', meshType: 'box'      },
  { id: 'lamp',      name: 'Lamp',      position: { x: 0, y: 0.75, z: 0 }, rotation: 0, color: '#ffd700', meshType: 'cylinder' },
  { id: 'bed',       name: 'Bed',       position: { x: 0, y: 0.3,  z: 0 }, rotation: 0, color: '#b4e7b4', meshType: 'box'      },
  { id: 'bookshelf', name: 'Bookshelf', position: { x: 0, y: 1.0,  z: 0 }, rotation: 0, color: '#a0522d', meshType: 'box'      },
]

// Returns the catalog-base id for a placed item (strips the timestamp suffix).
export function catalogIdOf(item: FurnitureItem): string {
  return item.id.includes('-') ? item.id.split('-')[0] : item.id
}
