export interface FurnitureItem {
  id: string
  name: string
  category?: string
  emoji?: string
  position: { x: number; y: number; z: number }
  rotation: number // y-axis rotation in radians
  color: string
  meshType: 'box' | 'cylinder' | 'sphere'
  modelPath?: string
}

// Geometry dimensions per catalog id:
//   box      → [width, height, depth]
//   cylinder → [radius, height]
//   sphere   → [radius]
export type FurnitureDims = [number, number, number] | [number, number] | [number]

export const FURNITURE_DIMS: Record<string, FurnitureDims> = {
  // Living Room
  loungeSofa:         [2.2, 0.8, 0.9],
  loungeSofaLong:     [3.0, 0.8, 0.9],
  loungeChair:        [0.9, 0.9, 0.9],
  loungeDesignSofa:   [2.0, 0.8, 0.9],
  tableCoffee:        [1.2, 0.4, 0.6],
  tableRound:         [0.8, 0.75, 0.8],
  table:              [1.4, 0.8, 1.0],
  sideTable:          [0.5, 0.6, 0.5],
  lampSquareFloor:    [0.3, 1.5],
  lampRoundFloor:     [0.3, 1.5],
  rugRectangle:       [3.0, 0.02, 2.0],
  rugRound:           [1.2, 0.02],
  televisionModern:   [1.2, 0.7, 0.1],
  cabinetTelevision:  [1.6, 0.6, 0.4],
  // Bedroom
  bedDouble:          [1.6, 0.6, 2.2],
  bedSingle:          [1.0, 0.6, 2.2],
  bedBunk:            [1.0, 1.8, 2.2],
  bookcaseOpen:       [0.6, 2.0, 0.3],
  cabinetBedDrawer:   [0.6, 0.5, 0.4],
  pillow:             [0.4, 0.15, 0.3],
  // Kitchen
  kitchenFridge:      [0.7, 1.8, 0.7],
  kitchenStove:       [0.7, 0.9, 0.6],
  kitchenSink:        [0.8, 0.9, 0.6],
  kitchenCabinet:     [0.8, 0.9, 0.4],
  kitchenCoffeeMachine: [0.3, 0.4, 0.3],
  kitchenMicrowave:   [0.5, 0.3, 0.4],
  // Bathroom
  bathtub:            [1.8, 0.6, 0.8],
  toilet:             [0.5, 0.8, 0.7],
  bathroomSink:       [0.6, 0.8, 0.5],
  shower:             [1.0, 2.2, 1.0],
  // Office
  desk:               [1.4, 0.8, 0.7],
  chairDesk:          [0.6, 1.0, 0.6],
  chairCushion:       [0.7, 0.9, 0.7],
  computerScreen:     [0.6, 0.5, 0.2],
  laptop:             [0.4, 0.03, 0.3],
  // Decor
  plantSmall1:        [0.3, 0.4, 0.3],
  pottedPlant:        [0.4, 0.8, 0.4],
  speaker:            [0.25, 0.5, 0.25],
  trashcan:           [0.3, 0.5],
  stairs:             [1.0, 2.5, 2.5],
}

const p0 = { x: 0, y: 0, z: 0 }

// Catalog items — templates for placing furniture in the room.
export const FURNITURE_CATALOG: FurnitureItem[] = [
  // Living Room
  { id: 'loungeSofa',        name: 'Sofa',              category: 'Living Room', emoji: '🛋️', position: p0, rotation: 0, color: '#8b4513', meshType: 'box',      modelPath: '/models/loungeSofa.glb' },
  { id: 'loungeSofaLong',    name: 'Long Sofa',         category: 'Living Room', emoji: '🛋️', position: p0, rotation: 0, color: '#6b3410', meshType: 'box',      modelPath: '/models/loungeSofaLong.glb' },
  { id: 'loungeChair',       name: 'Lounge Chair',      category: 'Living Room', emoji: '💺', position: p0, rotation: 0, color: '#a0522d', meshType: 'box',      modelPath: '/models/loungeChair.glb' },
  { id: 'loungeDesignSofa',  name: 'Design Sofa',       category: 'Living Room', emoji: '🛋️', position: p0, rotation: 0, color: '#c19a6b', meshType: 'box',      modelPath: '/models/loungeDesignSofa.glb' },
  { id: 'tableCoffee',       name: 'Coffee Table',      category: 'Living Room', emoji: '☕', position: p0, rotation: 0, color: '#d2b48c', meshType: 'box',      modelPath: '/models/tableCoffee.glb' },
  { id: 'tableRound',        name: 'Round Table',       category: 'Living Room', emoji: '🪵', position: p0, rotation: 0, color: '#c8a96e', meshType: 'box',      modelPath: '/models/tableRound.glb' },
  { id: 'table',             name: 'Table',             category: 'Living Room', emoji: '🪵', position: p0, rotation: 0, color: '#d2b48c', meshType: 'box',      modelPath: '/models/table.glb' },
  { id: 'sideTable',         name: 'Side Table',        category: 'Living Room', emoji: '🪵', position: p0, rotation: 0, color: '#b8860b', meshType: 'box',      modelPath: '/models/sideTable.glb' },
  { id: 'lampSquareFloor',   name: 'Square Lamp',       category: 'Living Room', emoji: '💡', position: p0, rotation: 0, color: '#ffd700', meshType: 'cylinder', modelPath: '/models/lampSquareFloor.glb' },
  { id: 'lampRoundFloor',    name: 'Round Lamp',        category: 'Living Room', emoji: '💡', position: p0, rotation: 0, color: '#ffd700', meshType: 'cylinder', modelPath: '/models/lampRoundFloor.glb' },
  { id: 'rugRectangle',      name: 'Rectangle Rug',     category: 'Living Room', emoji: '🟫', position: p0, rotation: 0, color: '#b22222', meshType: 'box',      modelPath: '/models/rugRectangle.glb' },
  { id: 'rugRound',          name: 'Round Rug',         category: 'Living Room', emoji: '⭕', position: p0, rotation: 0, color: '#cd853f', meshType: 'cylinder', modelPath: '/models/rugRound.glb' },
  { id: 'televisionModern',  name: 'Television',        category: 'Living Room', emoji: '📺', position: p0, rotation: 0, color: '#1a1a1a', meshType: 'box',      modelPath: '/models/televisionModern.glb' },
  { id: 'cabinetTelevision', name: 'TV Cabinet',        category: 'Living Room', emoji: '📦', position: p0, rotation: 0, color: '#5c4033', meshType: 'box',      modelPath: '/models/cabinetTelevision.glb' },
  // Bedroom
  { id: 'bedDouble',         name: 'Double Bed',        category: 'Bedroom',     emoji: '🛏️', position: p0, rotation: 0, color: '#000080', meshType: 'box',      modelPath: '/models/bedDouble.glb' },
  { id: 'bedSingle',         name: 'Single Bed',        category: 'Bedroom',     emoji: '🛏️', position: p0, rotation: 0, color: '#4169e1', meshType: 'box',      modelPath: '/models/bedSingle.glb' },
  { id: 'bedBunk',           name: 'Bunk Bed',          category: 'Bedroom',     emoji: '🛏️', position: p0, rotation: 0, color: '#8b7355', meshType: 'box',      modelPath: '/models/bedBunk.glb' },
  { id: 'bookcaseOpen',      name: 'Bookcase',          category: 'Bedroom',     emoji: '📚', position: p0, rotation: 0, color: '#3b1a08', meshType: 'box',      modelPath: '/models/bookcaseOpen.glb' },
  { id: 'cabinetBedDrawer',  name: 'Nightstand',        category: 'Bedroom',     emoji: '🗄️', position: p0, rotation: 0, color: '#5c4033', meshType: 'box',      modelPath: '/models/cabinetBedDrawer.glb' },
  { id: 'pillow',            name: 'Pillow',            category: 'Bedroom',     emoji: '😴', position: p0, rotation: 0, color: '#f5f5dc', meshType: 'box',      modelPath: '/models/pillow.glb' },
  // Kitchen
  { id: 'kitchenFridge',     name: 'Fridge',            category: 'Kitchen',     emoji: '❄️', position: p0, rotation: 0, color: '#c0c0c0', meshType: 'box',      modelPath: '/models/kitchenFridge.glb' },
  { id: 'kitchenStove',      name: 'Stove',             category: 'Kitchen',     emoji: '🔥', position: p0, rotation: 0, color: '#808080', meshType: 'box',      modelPath: '/models/kitchenStove.glb' },
  { id: 'kitchenSink',       name: 'Kitchen Sink',      category: 'Kitchen',     emoji: '🚰', position: p0, rotation: 0, color: '#a9a9a9', meshType: 'box',      modelPath: '/models/kitchenSink.glb' },
  { id: 'kitchenCabinet',    name: 'Cabinet',           category: 'Kitchen',     emoji: '📦', position: p0, rotation: 0, color: '#deb887', meshType: 'box',      modelPath: '/models/kitchenCabinet.glb' },
  { id: 'kitchenCoffeeMachine', name: 'Coffee Machine', category: 'Kitchen',     emoji: '☕', position: p0, rotation: 0, color: '#2f2f2f', meshType: 'box',      modelPath: '/models/kitchenCoffeeMachine.glb' },
  { id: 'kitchenMicrowave',  name: 'Microwave',         category: 'Kitchen',     emoji: '📡', position: p0, rotation: 0, color: '#696969', meshType: 'box',      modelPath: '/models/kitchenMicrowave.glb' },
  // Bathroom
  { id: 'bathtub',           name: 'Bathtub',           category: 'Bathroom',    emoji: '🛁', position: p0, rotation: 0, color: '#f0f0f0', meshType: 'box',      modelPath: '/models/bathtub.glb' },
  { id: 'toilet',            name: 'Toilet',            category: 'Bathroom',    emoji: '🚽', position: p0, rotation: 0, color: '#fafafa', meshType: 'box',      modelPath: '/models/toilet.glb' },
  { id: 'bathroomSink',      name: 'Bathroom Sink',     category: 'Bathroom',    emoji: '🚰', position: p0, rotation: 0, color: '#e8e8e8', meshType: 'box',      modelPath: '/models/bathroomSink.glb' },
  { id: 'shower',            name: 'Shower',            category: 'Bathroom',    emoji: '🚿', position: p0, rotation: 0, color: '#b0c4de', meshType: 'box',      modelPath: '/models/shower.glb' },
  // Office
  { id: 'desk',              name: 'Desk',              category: 'Office',      emoji: '🖥️', position: p0, rotation: 0, color: '#8b7355', meshType: 'box',      modelPath: '/models/desk.glb' },
  { id: 'chairDesk',         name: 'Desk Chair',        category: 'Office',      emoji: '🪑', position: p0, rotation: 0, color: '#333333', meshType: 'box',      modelPath: '/models/chairDesk.glb' },
  { id: 'chairCushion',      name: 'Cushion Chair',     category: 'Office',      emoji: '🪑', position: p0, rotation: 0, color: '#808080', meshType: 'box',      modelPath: '/models/chairCushion.glb' },
  { id: 'computerScreen',    name: 'Monitor',           category: 'Office',      emoji: '🖥️', position: p0, rotation: 0, color: '#1a1a1a', meshType: 'box',      modelPath: '/models/computerScreen.glb' },
  { id: 'laptop',            name: 'Laptop',            category: 'Office',      emoji: '💻', position: p0, rotation: 0, color: '#2f2f2f', meshType: 'box',      modelPath: '/models/laptop.glb' },
  // Decor
  { id: 'plantSmall1',       name: 'Small Plant',       category: 'Decor',       emoji: '🌱', position: p0, rotation: 0, color: '#228b22', meshType: 'box',      modelPath: '/models/plantSmall1.glb' },
  { id: 'pottedPlant',       name: 'Potted Plant',      category: 'Decor',       emoji: '🪴', position: p0, rotation: 0, color: '#2e8b57', meshType: 'box',      modelPath: '/models/pottedPlant.glb' },
  { id: 'speaker',           name: 'Speaker',           category: 'Decor',       emoji: '🔊', position: p0, rotation: 0, color: '#1a1a1a', meshType: 'box',      modelPath: '/models/speaker.glb' },
  { id: 'trashcan',          name: 'Trash Can',         category: 'Decor',       emoji: '🗑️', position: p0, rotation: 0, color: '#696969', meshType: 'cylinder', modelPath: '/models/trashcan.glb' },
  { id: 'stairs',            name: 'Stairs',            category: 'Decor',       emoji: '🪜', position: p0, rotation: 0, color: '#a0522d', meshType: 'box',      modelPath: '/models/stairs.glb' },
]

// Ordered list of categories for UI display
export const FURNITURE_CATEGORIES = [
  'Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Office', 'Decor',
] as const

// Returns the catalog-base id for a placed item (strips the numeric suffix).
export function catalogIdOf(item: FurnitureItem): string {
  // Placed items have ids like "tableCoffee-3". Split on last dash followed by digits.
  const match = item.id.match(/^(.+)-\d+$/)
  return match ? match[1] : item.id
}
