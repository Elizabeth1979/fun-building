import { useState, useCallback } from 'react'

export type ViewMode = 'interior' | 'city'

export interface ViewState {
  viewMode: ViewMode
  activeHouseId: string | null
}

export function getInitialViewMode(): ViewMode {
  return 'interior'
}

export function toggleViewMode(current: ViewMode): ViewMode {
  return current === 'interior' ? 'city' : 'interior'
}

export function enterHouseInterior(houseId: string): ViewState {
  return { viewMode: 'interior', activeHouseId: houseId }
}

export function exitToCity(): ViewState {
  return { viewMode: 'city', activeHouseId: null }
}

export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode())
  const [activeHouseId, setActiveHouseId] = useState<string | null>(null)

  const toggleView = useCallback(() => {
    setViewMode(prev => {
      const next = toggleViewMode(prev)
      if (next === 'city') setActiveHouseId(null)
      return next
    })
  }, [])

  const enterHouse = useCallback((houseId: string) => {
    setActiveHouseId(houseId)
    setViewMode('interior')
  }, [])

  const goToCity = useCallback(() => {
    setActiveHouseId(null)
    setViewMode('city')
  }, [])

  return { viewMode, activeHouseId, toggleView, enterHouse, goToCity }
}
