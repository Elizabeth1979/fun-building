import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ColorPickerPanel } from './ColorPickerPanel'
import { FurniturePanel } from './FurniturePanel'
import { useRoomColors } from './useRoomColors'
import { useFurniture, clampPosition } from './useFurniture'
import { saveScene, loadScene } from './persistence'
import { useGodMode } from './useGodMode'
import { useGameMode } from './useGameMode'
import { usePhysics } from './usePhysics'
import type { FurnitureItem } from './furniture'
import { FURNITURE_CATALOG, FURNITURE_DIMS, catalogIdOf } from './furniture'
import { loadModel } from './modelLoader'

function buildFallbackMesh(item: FurnitureItem): THREE.Mesh {
  const catalogId = catalogIdOf(item)
  const dims = FURNITURE_DIMS[catalogId] ?? [0.5, 0.5, 0.5]

  let geo: THREE.BufferGeometry
  if (item.meshType === 'cylinder') {
    const [r, h] = dims as [number, number]
    geo = new THREE.CylinderGeometry(r, r, h, 24)
  } else if (item.meshType === 'sphere') {
    const [r] = dims as [number]
    geo = new THREE.SphereGeometry(r, 16, 16)
  } else {
    const [w, h, d] = dims as [number, number, number]
    geo = new THREE.BoxGeometry(w, h, d)
  }

  const mat = new THREE.MeshLambertMaterial({ color: item.color })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(item.position.x, item.position.y, item.position.z)
  mesh.rotation.y = item.rotation
  return mesh
}

async function buildFurnitureModel(item: FurnitureItem): Promise<THREE.Object3D> {
  const catalogId = catalogIdOf(item)
  const catalogEntry = FURNITURE_CATALOG.find(c => c.id === catalogId)
  const modelPath = item.modelPath ?? catalogEntry?.modelPath

  if (!modelPath) return buildFallbackMesh(item)

  try {
    const group = await loadModel(modelPath)
    group.position.set(item.position.x, item.position.y, item.position.z)
    group.rotation.y = item.rotation
    return group
  } catch {
    return buildFallbackMesh(item)
  }
}

function setEmissiveOnObject(obj: THREE.Object3D, color: number): void {
  obj.traverse(child => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshLambertMaterial) {
        mat.emissive.set(color)
      }
    }
  })
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  })
}

function findFurnitureParent(
  hit: THREE.Object3D,
  meshes: Map<string, THREE.Object3D>,
): string | null {
  const roots = new Set(meshes.values())
  let current: THREE.Object3D | null = hit
  while (current) {
    if (roots.has(current)) {
      for (const [id, obj] of meshes) {
        if (obj === current) return id
      }
    }
    current = current.parent
  }
  return null
}

export default function App() {
  const isGodMode = useGodMode()
  const { mode, toggle } = useGameMode()
  const { initPhysics, stepPhysics, getFinalPositions, destroyPhysics } = usePhysics()
  const mountRef = useRef<HTMLDivElement>(null)

  // Room color material refs
  const wallMatsRef = useRef<THREE.MeshLambertMaterial[]>([])
  const ceilingMatRef = useRef<THREE.MeshLambertMaterial | null>(null)
  const floorMatRef = useRef<THREE.MeshLambertMaterial | null>(null)

  const { selectedSurface, setSelectedSurface, colors, setColors, setColor } = useRoomColors()

  // Furniture state
  const { placedItems, selectedItemId, setSelectedItemId, addItem, moveItem, removeItem, rotateItem } = useFurniture()

  // Scene + mesh refs shared between effects and event handlers
  const sceneRef = useRef<THREE.Scene | null>(null)
  const furnitureMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map())

  // Stable function refs — updated every render so event-handler closures stay fresh
  const moveItemRef = useRef(moveItem)
  const setSelectedItemIdRef = useRef(setSelectedItemId)
  const placedItemsRef = useRef(placedItems)
  const rotateItemRef = useRef(rotateItem)
  const removeItemRef = useRef(removeItem)
  const selectedItemIdRef = useRef(selectedItemId)

  useEffect(() => { moveItemRef.current = moveItem }, [moveItem])
  useEffect(() => { setSelectedItemIdRef.current = setSelectedItemId }, [setSelectedItemId])
  useEffect(() => { placedItemsRef.current = placedItems }, [placedItems])
  useEffect(() => { rotateItemRef.current = rotateItem }, [rotateItem])
  useEffect(() => { removeItemRef.current = removeItem }, [removeItem])
  useEffect(() => { selectedItemIdRef.current = selectedItemId }, [selectedItemId])

  // Refs for physics state — read inside the animation loop without stale closure issues
  const isPlayModeRef = useRef(false)
  const stepPhysicsRef = useRef(stepPhysics)
  const furnitureMeshesForPhysicsRef = useRef(furnitureMeshesRef)
  useEffect(() => { stepPhysicsRef.current = stepPhysics }, [stepPhysics])

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

  // Auto-load saved colors on first render
  useEffect(() => {
    const saved = loadScene()
    if (saved) setColors(saved)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => saveScene(colors)
  const handleLoad = () => {
    const saved = loadScene()
    if (saved) setColors(saved)
  }

  // Sync color state → Three.js materials
  useEffect(() => {
    wallMatsRef.current.forEach(m => m.color.set(colors.walls))
  }, [colors.walls])
  useEffect(() => {
    ceilingMatRef.current?.color.set(colors.ceiling)
  }, [colors.ceiling])
  useEffect(() => {
    floorMatRef.current?.color.set(colors.floor)
  }, [colors.floor])

  // Sync placedItems → Three.js meshes (add / remove / reposition)
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
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

  // Main Three.js setup — runs once on mount
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    // Camera
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 2, 6)

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 2, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.update()

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb)
    sceneRef.current = scene

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(5, 10, 5)
    scene.add(dirLight)

    // Room
    const roomWidth = 10, roomHeight = 5, roomDepth = 10
    const wallMat0 = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const wallMat1 = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const ceilingMat = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const bottomMat = new THREE.MeshLambertMaterial({ color: 0xc8a96e, side: THREE.BackSide })
    const wallMat4 = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const wallMat5 = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })

    wallMatsRef.current = [wallMat0, wallMat1, wallMat4, wallMat5]
    ceilingMatRef.current = ceilingMat

    floorMatRef.current = bottomMat

    const roomGeo = new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth)
    const room = new THREE.Mesh(roomGeo, [wallMat0, wallMat1, ceilingMat, bottomMat, wallMat4, wallMat5])
    room.position.set(0, roomHeight / 2, 0)
    scene.add(room)

    // Drag-and-drop raycasting state
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const dragTarget = new THREE.Vector3()
    let isDragging = false
    let dragItemId: string | null = null
    let dragItemY = 0

    function toNDC(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    function onMouseDown(e: MouseEvent) {
      mount?.focus()
      if (isPlayModeRef.current) return // no dragging during physics
      toNDC(e)
      raycaster.setFromCamera(mouse, camera)
      // Collect all child meshes for raycasting (GLTF models are groups)
      const allMeshes: THREE.Object3D[] = []
      for (const obj of furnitureMeshesRef.current.values()) {
        obj.traverse(child => { if (child instanceof THREE.Mesh) allMeshes.push(child) })
      }
      const hits = raycaster.intersectObjects(allMeshes)
      if (hits.length > 0) {
        const hitId = findFurnitureParent(hits[0].object, furnitureMeshesRef.current)
        if (hitId) {
          setSelectedItemIdRef.current(hitId)
          isDragging = true
          dragItemId = hitId
          dragItemY = placedItemsRef.current.find(i => i.id === hitId)?.position.y ?? 0
          controls.enabled = false
        }
      } else {
        setSelectedItemIdRef.current(null)
      }
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDragging || dragItemId === null) return
      toNDC(e)
      raycaster.setFromCamera(mouse, camera)
      if (raycaster.ray.intersectPlane(floorPlane, dragTarget)) {
        const item = placedItemsRef.current.find(i => i.id === dragItemId)
        const catalogId = item ? catalogIdOf(item) : null
        const dims = catalogId ? (FURNITURE_DIMS[catalogId] ?? [0.5, 0.5, 0.5]) : [0.5, 0.5, 0.5]
        const halfW = item?.meshType === 'cylinder' ? (dims[0] as number) : (dims[0] as number) / 2
        const halfD = item?.meshType === 'box' ? (dims[2] as number) / 2 : halfW
        const clamped = clampPosition({ x: dragTarget.x, z: dragTarget.z }, halfW, halfD, 5)

        // Box3 collision check: reject move if it would overlap another item
        const draggedObj = furnitureMeshesRef.current.get(dragItemId)
        if (draggedObj) {
          const prevPos = draggedObj.position.clone()
          draggedObj.position.set(clamped.x, dragItemY, clamped.z)
          const draggedBox = new THREE.Box3().setFromObject(draggedObj)
          let blocked = false
          for (const [id, obj] of furnitureMeshesRef.current) {
            if (id === dragItemId) continue
            const otherBox = new THREE.Box3().setFromObject(obj)
            if (draggedBox.intersectsBox(otherBox)) {
              blocked = true
              break
            }
          }
          if (blocked) {
            draggedObj.position.copy(prevPos)
            return
          }
        }

        moveItemRef.current(dragItemId, { x: clamped.x, y: dragItemY, z: clamped.z })
      }
    }

    function onMouseUp() {
      isDragging = false
      dragItemId = null
      controls.enabled = true
    }

    function onKeyDown(e: KeyboardEvent) {
      const selId = selectedItemIdRef.current
      if (selId && !isPlayModeRef.current) {
        if (e.key === 'r' || e.key === 'R') {
          rotateItemRef.current(selId)
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          removeItemRef.current(selId)
        }
      }
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    mount.addEventListener('keydown', onKeyDown)
    window.addEventListener('keydown', onKeyDown)

    // Resize handler
    function onResize() {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // Animation loop
    let animId: number
    function animate() {
      animId = requestAnimationFrame(animate)
      if (isPlayModeRef.current) {
        stepPhysicsRef.current(furnitureMeshesForPhysicsRef.current.current)
      }
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      mount.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keydown', onKeyDown)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      controls.dispose()
      roomGeo.dispose()
      ;[wallMat0, wallMat1, ceilingMat, bottomMat, wallMat4, wallMat5].forEach(m => m.dispose())
      for (const obj of furnitureMeshesRef.current.values()) {
        scene.remove(obj)
        disposeObject(obj)
      }
      furnitureMeshesRef.current.clear()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      sceneRef.current = null
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div ref={mountRef} tabIndex={0} style={{ width: '100%', height: '100%', outline: 'none' }} />

      {/* Build / Play toggle — centered at top */}
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
      </div>

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
      {mode === 'build' && <FurniturePanel onPlaceItem={addItem} />}
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
      <ColorPickerPanel
        selectedSurface={selectedSurface}
        onSurfaceChange={setSelectedSurface}
        colors={colors}
        onColorChange={setColor}
        onSave={handleSave}
        onLoad={handleLoad}
      />
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.55)',
        color: '#eee',
        fontSize: 12,
        padding: '5px 14px',
        borderRadius: 16,
        userSelect: 'none',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        letterSpacing: 0.3,
      }}>
        Click to select &nbsp;&bull;&nbsp; R rotate &nbsp;&bull;&nbsp; Del delete &nbsp;&bull;&nbsp; Drag to move
      </div>
    </div>
  )
}
