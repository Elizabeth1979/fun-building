import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { ColorPickerPanel } from './ColorPickerPanel'
import { FurniturePanel } from './FurniturePanel'
import { useRoomColors } from './useRoomColors'
import { useFurniture } from './useFurniture'
import { loadScene, saveCityScene, loadCityScene } from './persistence'
import { useGodMode } from './useGodMode'
import { useGameMode } from './useGameMode'
import { usePhysics } from './usePhysics'
import { SceneManager } from './SceneManager'
import { buildFurnitureModel, setEmissiveOnObject, disposeObject } from './sceneHelpers'
import { FurnitureDragHandler } from './FurnitureDragHandler'
import { useViewMode } from './viewMode'
import {
  createCityHousesState,
  placeHouse,
  removeHouse,
  worldToCell,
  type CityHousesState,
} from './cityHouses'
import { CITY_GRID_SIZE, CITY_TILE_SIZE } from './cityGrid'
import {
  createHouseInteriorsStore,
  getHouseInterior,
  setHouseInterior,
  type HouseInteriorsStore,
} from './houseInteriors'
import {
  createCityRoadsState,
  placeRoad,
  removeRoad,
  isCellOccupied,
  type CityRoadsState,
} from './cityRoads'
import {
  createNpcState,
  spawnNpcsOnRoads,
  updateNpcs,
  type NpcState,
} from './cityNpcs'

export default function App() {
  const isGodMode = useGodMode()
  const { mode, toggle } = useGameMode()
  const { viewMode, activeHouseId, toggleView, enterHouse, goToCity } = useViewMode()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const { initPhysics, stepPhysics, getFinalPositions, destroyPhysics } = usePhysics()
  const mountRef = useRef<HTMLDivElement>(null)

  const { selectedSurface, setSelectedSurface, colors, setColors, setColor } = useRoomColors()

  // City houses state
  const [cityHouses, setCityHouses] = useState<CityHousesState>(createCityHousesState)
  const [cityTool, setCityTool] = useState<'place' | 'remove' | 'enter' | 'road' | 'road-remove'>('place')
  const cityHousesRef = useRef(cityHouses)
  useEffect(() => { cityHousesRef.current = cityHouses }, [cityHouses])

  // City roads state
  const [cityRoads, setCityRoads] = useState<CityRoadsState>(createCityRoadsState)
  const cityRoadsRef = useRef(cityRoads)
  useEffect(() => { cityRoadsRef.current = cityRoads }, [cityRoads])

  // NPC walker state
  const npcStateRef = useRef<NpcState>(createNpcState())

  // Per-house interior state store
  const [houseInteriors, setHouseInteriors] = useState<HouseInteriorsStore>(createHouseInteriorsStore)

  // Furniture state
  const { placedItems, setPlacedItems, selectedItemId, setSelectedItemId, addItem, moveItem, moveItemWithChildren: moveItemWithChildrenFn, removeItem, rotateItem } = useFurniture()

  // SceneManager + mesh refs shared between effects and event handlers
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const furnitureMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map())

  // Stable function refs — updated every render so event-handler closures stay fresh
  const moveItemRef = useRef(moveItem)
  const moveItemWithChildrenRef = useRef(moveItemWithChildrenFn)
  const setSelectedItemIdRef = useRef(setSelectedItemId)
  const placedItemsRef = useRef(placedItems)
  const rotateItemRef = useRef(rotateItem)
  const removeItemRef = useRef(removeItem)
  const selectedItemIdRef = useRef(selectedItemId)

  useEffect(() => { moveItemRef.current = moveItem }, [moveItem])
  useEffect(() => { moveItemWithChildrenRef.current = moveItemWithChildrenFn }, [moveItemWithChildrenFn])
  useEffect(() => { setSelectedItemIdRef.current = setSelectedItemId }, [setSelectedItemId])
  useEffect(() => { placedItemsRef.current = placedItems }, [placedItems])
  useEffect(() => { rotateItemRef.current = rotateItem }, [rotateItem])
  useEffect(() => { removeItemRef.current = removeItem }, [removeItem])
  useEffect(() => { selectedItemIdRef.current = selectedItemId }, [selectedItemId])

  // Keep fresh refs for colors and houseInteriors for use in callbacks
  const colorsRef = useRef(colors)
  useEffect(() => { colorsRef.current = colors }, [colors])
  const houseInteriorsRef = useRef(houseInteriors)
  useEffect(() => { houseInteriorsRef.current = houseInteriors }, [houseInteriors])

  // Save the current interior back to the active house (if any)
  const saveCurrentHouseInterior = useCallback(() => {
    const houseId = activeHouseId
    if (!houseId) return
    setHouseInteriors(prev =>
      setHouseInterior(prev, houseId, {
        colors: colorsRef.current,
        furniture: placedItemsRef.current,
      }),
    )
  }, [activeHouseId])

  // Wrap enterHouse to save current + load target
  const enterHouseWithState = useCallback((houseId: string) => {
    saveCurrentHouseInterior()
    enterHouse(houseId)
    // Use a microtask to ensure houseInteriors state is flushed before loading
    // Actually, we read from the ref which has the latest value after saveCurrentHouseInterior
    // schedules the update. But since setHouseInteriors is async, we need to compute the
    // interior from the current ref + the save we just did.
    const currentActiveId = activeHouseId
    let store = houseInteriorsRef.current
    if (currentActiveId) {
      store = setHouseInterior(store, currentActiveId, {
        colors: colorsRef.current,
        furniture: placedItemsRef.current,
      })
    }
    const interior = getHouseInterior(store, houseId)
    setColors(interior.colors)
    setPlacedItems(interior.furniture)
    setSelectedItemId(null)
  }, [activeHouseId, enterHouse, saveCurrentHouseInterior, setColors, setPlacedItems, setSelectedItemId])

  // Wrap goToCity to save current house first
  const goToCityWithState = useCallback(() => {
    saveCurrentHouseInterior()
    goToCity()
  }, [saveCurrentHouseInterior, goToCity])

  // Wrap toggleView to save current house first
  const toggleViewWithState = useCallback(() => {
    saveCurrentHouseInterior()
    toggleView()
  }, [saveCurrentHouseInterior, toggleView])

  // Refs for physics state — read inside the animation loop without stale closure issues
  const isPlayModeRef = useRef(false)
  const stepPhysicsRef = useRef(stepPhysics)
  const furnitureMeshesForPhysicsRef = useRef(furnitureMeshesRef)
  useEffect(() => { stepPhysicsRef.current = stepPhysics }, [stepPhysics])

  // Ref for viewMode so animation callback can check it
  const viewModeRef = useRef(viewMode)
  useEffect(() => { viewModeRef.current = viewMode }, [viewMode])

  // Enter / exit play mode
  useEffect(() => {
    if (mode === 'play') {
      isPlayModeRef.current = false // not ready until init completes
      initPhysics(placedItemsRef.current).then(() => {
        isPlayModeRef.current = true
      })
    } else {
      isPlayModeRef.current = false
      // Sync final physics positions back to React state
      const finalPositions = getFinalPositions()
      for (const [id, pos] of finalPositions) {
        moveItemRef.current(id, pos)
      }
      destroyPhysics()
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load saved city (v3) or room-only (v2) on first render
  useEffect(() => {
    const citySaved = loadCityScene()
    if (citySaved) {
      setCityHouses(citySaved.houses)
      setCityRoads(citySaved.roads)
      setHouseInteriors(citySaved.interiors)
      // Restore view state
      if (citySaved.viewMode === 'interior' && citySaved.activeHouseId) {
        enterHouse(citySaved.activeHouseId)
        // Load active house interior into room state
        const interior = citySaved.interiors.interiors.get(citySaved.activeHouseId)
        if (interior) {
          setColors(interior.colors)
          setPlacedItems(interior.furniture)
        }
      } else {
        goToCity()
      }
    } else {
      // Fallback: try loading old v2 room-only save
      const saved = loadScene()
      if (saved) {
        setColors(saved.colors)
        setPlacedItems(saved.furniture)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    // Save current interior state for active house before persisting
    let interiorsToSave = houseInteriorsRef.current
    if (activeHouseId) {
      const currentInterior = { colors: colorsRef.current, furniture: placedItemsRef.current }
      const next = new Map(interiorsToSave.interiors)
      next.set(activeHouseId, currentInterior)
      interiorsToSave = { interiors: next }
      setHouseInteriors(interiorsToSave)
    }
    saveCityScene(
      cityHousesRef.current,
      cityRoadsRef.current,
      interiorsToSave,
      viewMode,
      activeHouseId,
    )
  }
  const handleLoad = () => {
    const citySaved = loadCityScene()
    if (citySaved) {
      setCityHouses(citySaved.houses)
      setCityRoads(citySaved.roads)
      setHouseInteriors(citySaved.interiors)
      if (citySaved.viewMode === 'interior' && citySaved.activeHouseId) {
        enterHouse(citySaved.activeHouseId)
        const interior = citySaved.interiors.interiors.get(citySaved.activeHouseId)
        if (interior) {
          setColors(interior.colors)
          setPlacedItems(interior.furniture)
        }
      } else {
        goToCity()
      }
    } else {
      const saved = loadScene()
      if (saved) {
        setColors(saved.colors)
        setPlacedItems(saved.furniture)
      }
    }
  }

  // Sync color state → modular room pieces
  useEffect(() => {
    const mgr = sceneManagerRef.current
    if (!mgr) return
    for (const obj of mgr.roomWallObjects) {
      obj.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.color.set(colors.walls)
        }
      })
    }
  }, [colors.walls])
  useEffect(() => {
    const mgr = sceneManagerRef.current
    if (!mgr) return
    for (const obj of mgr.roomFloorObjects) {
      obj.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.color.set(colors.floor)
        }
      })
    }
  }, [colors.floor])

  // Sync placedItems → Three.js meshes (add / remove / reposition)
  useEffect(() => {
    const mgr = sceneManagerRef.current
    if (!mgr) return
    const scene = mgr.scene
    const meshes = furnitureMeshesRef.current
    const liveIds = new Set(placedItems.map(i => i.id))

    // Remove meshes for deleted items
    for (const [id, obj] of meshes) {
      if (!liveIds.has(id)) {
        scene.remove(obj)
        disposeObject(obj)
        meshes.delete(id)
      }
    }

    // Add new meshes or update existing positions
    for (const item of placedItems) {
      const existing = meshes.get(item.id)
      if (existing) {
        existing.position.set(item.position.x, item.position.y, item.position.z)
        existing.rotation.y = item.rotation
      } else {
        // Load model asynchronously; add to scene when ready
        const itemId = item.id
        buildFurnitureModel(item).then(obj => {
          // Guard: item may have been removed while loading
          if (!placedItemsRef.current.some(i => i.id === itemId)) {
            disposeObject(obj)
            return
          }
          scene.add(obj)
          meshes.set(itemId, obj)
        })
      }
    }
  }, [placedItems])

  // Sync selection → emissive highlight
  useEffect(() => {
    for (const [id, obj] of furnitureMeshesRef.current) {
      setEmissiveOnObject(obj, id === selectedItemId ? 0x555500 : 0x000000)
    }
  }, [selectedItemId])

  // Ref to hold drag handler so we can dispose/recreate on view switch
  const dragHandlerRef = useRef<FurnitureDragHandler | null>(null)

  // Switch between city and interior views
  useEffect(() => {
    const mgr = sceneManagerRef.current
    if (!mgr) return

    if (viewMode === 'city') {
      // Hide room and furniture, show city
      for (const obj of mgr.roomWallObjects) obj.visible = false
      for (const obj of mgr.roomFloorObjects) obj.visible = false
      for (const obj of furnitureMeshesRef.current.values()) obj.visible = false
      // Disable drag handler in city view
      if (dragHandlerRef.current) {
        dragHandlerRef.current.dispose()
        dragHandlerRef.current = null
      }
      mgr.clearCityScene()
      mgr.buildCityScene()
      // Render existing houses and roads
      const allHouses = Array.from(cityHousesRef.current.houses.values())
      mgr.syncHouseMeshes(allHouses)
      mgr.syncRoadMeshes(cityRoadsRef.current)
    } else {
      // Show room and furniture, hide city
      mgr.clearCityScene()
      for (const obj of mgr.roomWallObjects) obj.visible = true
      for (const obj of mgr.roomFloorObjects) obj.visible = true
      for (const obj of furnitureMeshesRef.current.values()) obj.visible = true
      mgr.resetInteriorCamera()
    }
  }, [viewMode])

  // Sync house meshes when cityHouses changes (while in city view)
  useEffect(() => {
    const mgr = sceneManagerRef.current
    if (!mgr || viewMode !== 'city') return
    const allHouses = Array.from(cityHouses.houses.values())
    mgr.syncHouseMeshes(allHouses)
  }, [cityHouses, viewMode])

  // Sync road meshes when cityRoads changes (while in city view)
  useEffect(() => {
    const mgr = sceneManagerRef.current
    if (!mgr || viewMode !== 'city') return
    mgr.syncRoadMeshes(cityRoads)
  }, [cityRoads, viewMode])

  // Spawn/despawn NPCs when roads change or entering/leaving city view
  useEffect(() => {
    if (viewMode === 'city') {
      const MAX_NPCS = 4
      npcStateRef.current = spawnNpcsOnRoads(cityRoads, MAX_NPCS)
    } else {
      npcStateRef.current = createNpcState()
      const mgr = sceneManagerRef.current
      if (mgr) mgr.clearNpcMeshes()
    }
  }, [cityRoads, viewMode])

  // City click handler
  useEffect(() => {
    const mgr = sceneManagerRef.current
    if (!mgr || viewMode !== 'city') return

    const handleCityClick = (event: MouseEvent) => {
      // First, check if we clicked a house
      const houseId = mgr.raycastHouse(event)

      if (cityTool === 'enter' && houseId) {
        enterHouseWithState(houseId)
        return
      }

      if (cityTool === 'remove' && houseId) {
        // Find the house to get its cell
        for (const [, house] of cityHousesRef.current.houses) {
          if (house.id === houseId) {
            setCityHouses(prev => removeHouse(prev, house.cellX, house.cellZ))
            return
          }
        }
        return
      }

      if (cityTool === 'road' || cityTool === 'road-remove') {
        const point = mgr.raycastGround(event)
        if (point) {
          const cell = worldToCell(point.x, point.z, CITY_GRID_SIZE, CITY_TILE_SIZE)
          if (cityTool === 'road') {
            // Only place road if cell is not occupied
            if (!isCellOccupied(cell.cellX, cell.cellZ, cityRoadsRef.current, cityHousesRef.current)) {
              setCityRoads(prev => placeRoad(prev, cell.cellX, cell.cellZ))
            }
          } else {
            setCityRoads(prev => removeRoad(prev, cell.cellX, cell.cellZ))
          }
        }
        return
      }

      if (cityTool === 'place') {
        // If clicked a house, enter it instead
        if (houseId) {
          enterHouseWithState(houseId)
          return
        }
        // Otherwise place on ground (only if cell not occupied)
        const point = mgr.raycastGround(event)
        if (point) {
          const cell = worldToCell(point.x, point.z, CITY_GRID_SIZE, CITY_TILE_SIZE)
          if (!isCellOccupied(cell.cellX, cell.cellZ, cityRoadsRef.current, cityHousesRef.current)) {
            setCityHouses(prev => placeHouse(prev, cell.cellX, cell.cellZ))
          }
        }
      }
    }

    const canvas = mgr.renderer.domElement
    canvas.addEventListener('click', handleCityClick)
    return () => canvas.removeEventListener('click', handleCityClick)
  }, [viewMode, cityTool, enterHouseWithState])

  // Main Three.js setup — runs once on mount
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Create SceneManager — owns renderer, camera, controls, scene, lights, resize, animation
    let lastTime = performance.now()
    const mgr = new SceneManager(mount, {
      onAnimationFrame: () => {
        if (isPlayModeRef.current) {
          stepPhysicsRef.current(furnitureMeshesForPhysicsRef.current.current)
        }
        // Update NPC walkers in city view
        if (viewModeRef.current === 'city') {
          const now = performance.now()
          const dt = Math.min((now - lastTime) / 1000, 0.1) // cap delta
          lastTime = now
          npcStateRef.current = updateNpcs(npcStateRef.current, cityRoadsRef.current, dt)
          mgr.syncNpcMeshes(npcStateRef.current)
        } else {
          lastTime = performance.now()
        }
      },
    })
    sceneManagerRef.current = mgr

    const { scene, camera, renderer, controls } = mgr

    // Build the modular room (async, runs in background)
    mgr.buildModularRoom(colors.walls, colors.floor)

    // Start animation loop
    mgr.start()

    // Set up drag/drop, raycasting, and keyboard interaction handler
    const dragHandler = new FurnitureDragHandler({
      mount,
      camera,
      renderer,
      controls,
      furnitureMeshes: furnitureMeshesRef.current,
      getPlacedItems: () => placedItemsRef.current,
      getSelectedItemId: () => selectedItemIdRef.current,
      getIsPlayMode: () => isPlayModeRef.current,
      setSelectedItemId: (id) => setSelectedItemIdRef.current(id),
      moveItem: (id, pos, restingOnId) => moveItemRef.current(id, pos, restingOnId),
      moveItemWithChildren: (id, pos) => moveItemWithChildrenRef.current(id, pos),
      rotateItem: (id) => rotateItemRef.current(id),
      removeItem: (id) => removeItemRef.current(id),
    })

    return () => {
      dragHandler.dispose()
      // Clean up furniture meshes (room pieces cleaned up by SceneManager.dispose)
      for (const obj of furnitureMeshesRef.current.values()) {
        scene.remove(obj)
        disposeObject(obj)
      }
      furnitureMeshesRef.current.clear()
      mgr.dispose()
      sceneManagerRef.current = null
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div ref={mountRef} tabIndex={0} style={{ width: '100%', height: '100%', outline: 'none' }} />

      {/* Build / Play toggle — centered at top (interior only) */}
      {viewMode === 'interior' && <div style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 0,
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        userSelect: 'none',
      }}>
        <button
          onClick={mode === 'play' ? toggle : undefined}
          style={{
            padding: '8px 22px',
            fontWeight: 700,
            fontSize: 14,
            border: 'none',
            cursor: mode === 'play' ? 'pointer' : 'default',
            background: mode === 'build' ? '#4caf50' : '#555',
            color: mode === 'build' ? '#fff' : '#bbb',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          🔨 Build
        </button>
        <button
          onClick={mode === 'build' ? toggle : undefined}
          style={{
            padding: '8px 22px',
            fontWeight: 700,
            fontSize: 14,
            border: 'none',
            cursor: mode === 'build' ? 'pointer' : 'default',
            background: mode === 'play' ? '#e53935' : '#555',
            color: mode === 'play' ? '#fff' : '#bbb',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          ▶ Play
        </button>
      </div>}

      {/* View mode toggle — top-left */}
      <button
        onClick={viewMode === 'interior' && activeHouseId ? goToCityWithState : toggleViewWithState}
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: '8px 18px',
          fontWeight: 700,
          fontSize: 14,
          border: 'none',
          borderRadius: 20,
          cursor: 'pointer',
          background: viewMode === 'city' ? '#1565c0' : '#6a1b9a',
          color: '#fff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          userSelect: 'none',
          transition: 'background 0.2s',
          zIndex: 10,
        }}
      >
        {viewMode === 'interior'
          ? (activeHouseId ? '← Back to City' : '🏙️ City View')
          : '🏠 Interior View'}
      </button>

      {/* City tool bar */}
      {viewMode === 'city' && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 0,
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          userSelect: 'none',
        }}>
          {([['place', '🏠 Place'], ['remove', '🗑️ Remove'], ['enter', '🚪 Enter'], ['road', '🛣️ Road'], ['road-remove', '🚫 Road']] as const).map(([tool, label]) => (
            <button
              key={tool}
              onClick={() => setCityTool(tool)}
              style={{
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
                background: cityTool === tool ? '#1565c0' : '#555',
                color: cityTool === tool ? '#fff' : '#bbb',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Active house indicator */}
      {viewMode === 'interior' && activeHouseId && (
        <div style={{
          position: 'absolute',
          top: 56,
          left: 16,
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          fontSize: 12,
          padding: '4px 10px',
          borderRadius: 8,
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          Editing: {activeHouseId}
        </div>
      )}

      {isGodMode && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ffd700',
          color: '#000',
          fontWeight: 'bold',
          fontSize: 13,
          padding: '4px 10px',
          borderRadius: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          letterSpacing: 1,
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          ⚡ GOD MODE
        </div>
      )}
      {viewMode === 'interior' && mode === 'build' && <FurniturePanel onPlaceItem={addItem} />}
      {mode === 'build' && selectedItemId && (
        <button
          onClick={() => rotateItem(selectedItemId)}
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(0,0,0,0.15)',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            cursor: 'pointer',
            fontSize: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e8f0fe' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.92)' }}
          title="Rotate 45° (R)"
        >
          ↻
        </button>
      )}
      {mode === 'build' && selectedItemId && placedItems.find(i => i.id === selectedItemId)?.parentId && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 'calc(50% + 32px)',
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.92)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          userSelect: 'none',
          pointerEvents: 'none',
        }} title="Attached to parent">
          🔗
        </div>
      )}
      {viewMode === 'interior' && <ColorPickerPanel
        selectedSurface={selectedSurface}
        onSurfaceChange={setSelectedSurface}
        colors={colors}
        onColorChange={setColor}
        onSave={handleSave}
        onLoad={handleLoad}
      />}
      {/* Deselect hint */}
      {mode === 'build' && selectedItemId && (
        <button
          onClick={() => setSelectedItemId(null)}
          style={{
            position: 'absolute',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.55)',
            color: '#eee',
            fontSize: 12,
            padding: '4px 12px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          ✕ Deselect (Esc)
        </button>
      )}

      {/* Floating shortcuts toggle */}
      <button
        onClick={() => setShowShortcuts(s => !s)}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          userSelect: 'none',
          zIndex: 10,
        }}
        title="Keyboard shortcuts"
      >
        ?
      </button>
      {showShortcuts && (
        <div style={{
          position: 'absolute',
          bottom: 60,
          right: 16,
          background: '#fff',
          color: '#333',
          fontSize: 13,
          padding: '12px 16px',
          borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          userSelect: 'none',
          zIndex: 10,
          lineHeight: 1.7,
          minWidth: 200,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Shortcuts</div>
          <div>Tab / Shift+Tab &mdash; cycle items</div>
          <div>Click &mdash; select</div>
          <div>R &mdash; rotate</div>
          <div>Del &mdash; delete</div>
          <div>Arrow keys &mdash; nudge</div>
          <div>Drag &mdash; move</div>
          <div>Esc &mdash; deselect</div>
        </div>
      )}
    </div>
  )
}
