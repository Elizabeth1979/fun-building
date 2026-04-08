import type { RoomColors } from './useRoomColors'

const SAVE_KEY = 'fun-building-save'

export function saveScene(colors: RoomColors): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(colors))
}

export function loadScene(): RoomColors | null {
  const raw = localStorage.getItem(SAVE_KEY)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as RoomColors
  } catch {
    return null
  }
}
