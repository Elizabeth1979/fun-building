import { useState } from 'react'

export type Surface = 'walls' | 'floor' | 'ceiling'

export interface RoomColors {
  walls: string
  floor: string
  ceiling: string
}

export const SURFACES: Surface[] = ['walls', 'floor', 'ceiling']

export const DEFAULT_COLORS: RoomColors = {
  walls: '#ffe9c8',
  floor: '#c8a96e',
  ceiling: '#ffe9c8',
}

export function applyColor(colors: RoomColors, surface: Surface, color: string): RoomColors {
  return { ...colors, [surface]: color }
}

export function useRoomColors() {
  const [selectedSurface, setSelectedSurface] = useState<Surface>('walls')
  const [colors, setColors] = useState<RoomColors>(DEFAULT_COLORS)

  const setColor = (surface: Surface, color: string) => {
    setColors(prev => applyColor(prev, surface, color))
  }

  return { selectedSurface, setSelectedSurface, colors, setColor }
}
