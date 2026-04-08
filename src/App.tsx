import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ColorPickerPanel } from './ColorPickerPanel'
import { FurniturePanel } from './FurniturePanel'
import { useRoomColors } from './useRoomColors'
import { useFurniture } from './useFurniture'
import { saveScene, loadScene } from './persistence'
import { useGodMode } from './useGodMode'
import type { FurnitureItem } from './furniture'
import { FURNITURE_DIMS, catalogIdOf } from './furniture'

function buildFurnitureMesh(item: FurnitureItem): THREE.Mesh {
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

export default function App() {
  const isGodMode = useGodMode()
  const mountRef = useRef<HTMLDivElement>(null)

  // Room color material refs
  const wallMatsRef = useRef<THREE.MeshLambertMaterial[]>([])
  const ceilingMatRef = useRef<THREE.MeshLambertMaterial | null>(null)
  const floorMatRef = useRef<THREE.MeshLambertMaterial | null>(null)

  const { selectedSurface, setSelectedSurface, colors, setColors, setColor } = useRoomColors()

  // Furniture state
  const { placedItems, selectedItemId, setSelectedItemId, addItem, moveItem } = useFurniture()

  // Scene + mesh refs shared between effects and event handlers
  const sceneRef = useRef<THREE.Scene | null>(null)
  const furnitureMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())

  // Stable function refs — updated every render so event-handler closures stay fresh
  const moveItemRef = useRef(moveItem)
  const setSelectedItemIdRef = useRef(setSelectedItemId)
  const placedItemsRef = useRef(placedItems)

  useEffect(() => { moveItemRef.current = moveItem }, [moveItem])
  useEffect(() => { setSelectedItemIdRef.current = setSelectedItemId }, [setSelectedItemId])
  useEffect(() => { placedItemsRef.current = placedItems }, [placedItems])

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
    for (const [id, mesh] of meshes) {
      if (!liveIds.has(id)) {
        scene.remove(mesh)
        ;(mesh.material as THREE.MeshLambertMaterial).dispose()
        mesh.geometry.dispose()
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
        const mesh = buildFurnitureMesh(item)
        scene.add(mesh)
        meshes.set(item.id, mesh)
      }
    }
  }, [placedItems])

  // Sync selection → emissive highlight
  useEffect(() => {
    for (const [id, mesh] of furnitureMeshesRef.current) {
      const mat = mesh.material as THREE.MeshLambertMaterial
      mat.emissive.set(id === selectedItemId ? 0x555500 : 0x000000)
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
    const bottomMat = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const wallMat4 = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const wallMat5 = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })

    wallMatsRef.current = [wallMat0, wallMat1, wallMat4, wallMat5]
    ceilingMatRef.current = ceilingMat

    const roomGeo = new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth)
    const room = new THREE.Mesh(roomGeo, [wallMat0, wallMat1, ceilingMat, bottomMat, wallMat4, wallMat5])
    room.position.set(0, roomHeight / 2, 0)
    scene.add(room)

    // Floor
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth)
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xc8a96e })
    floorMatRef.current = floorMat
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

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
      toNDC(e)
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(Array.from(furnitureMeshesRef.current.values()))
      if (hits.length > 0) {
        const hitId = [...furnitureMeshesRef.current.entries()]
          .find(([, m]) => m === hits[0].object)?.[0] ?? null
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
        moveItemRef.current(dragItemId, { x: dragTarget.x, y: dragItemY, z: dragTarget.z })
      }
    }

    function onMouseUp() {
      isDragging = false
      dragItemId = null
      controls.enabled = true
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup', onMouseUp)

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
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      controls.dispose()
      roomGeo.dispose()
      ;[wallMat0, wallMat1, ceilingMat, bottomMat, wallMat4, wallMat5].forEach(m => m.dispose())
      floorGeo.dispose()
      floorMat.dispose()
      for (const mesh of furnitureMeshesRef.current.values()) {
        scene.remove(mesh)
        ;(mesh.material as THREE.MeshLambertMaterial).dispose()
        mesh.geometry.dispose()
      }
      furnitureMeshesRef.current.clear()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      sceneRef.current = null
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
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
      <FurniturePanel onPlaceItem={addItem} />
      <ColorPickerPanel
        selectedSurface={selectedSurface}
        onSurfaceChange={setSelectedSurface}
        colors={colors}
        onColorChange={setColor}
        onSave={handleSave}
        onLoad={handleLoad}
      />
    </div>
  )
}
