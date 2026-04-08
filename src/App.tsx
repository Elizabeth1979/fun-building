import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { ColorPickerPanel } from './ColorPickerPanel'
import { useRoomColors } from './useRoomColors'
import { saveScene, loadScene } from './persistence'
import { useGodMode } from './useGodMode'

export default function App() {
  const isGodMode = useGodMode()
  const mountRef = useRef<HTMLDivElement>(null)

  // Refs to Three.js materials — updated whenever React color state changes
  const wallMatsRef = useRef<THREE.MeshLambertMaterial[]>([])
  const ceilingMatRef = useRef<THREE.MeshLambertMaterial | null>(null)
  const floorMatRef = useRef<THREE.MeshLambertMaterial | null>(null)

  const { selectedSurface, setSelectedSurface, colors, setColors, setColor } = useRoomColors()

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

  // Sync wall color → Three.js materials
  useEffect(() => {
    wallMatsRef.current.forEach(m => m.color.set(colors.walls))
  }, [colors.walls])

  // Sync ceiling color → Three.js material
  useEffect(() => {
    ceilingMatRef.current?.color.set(colors.ceiling)
  }, [colors.ceiling])

  // Sync floor color → Three.js material
  useEffect(() => {
    floorMatRef.current?.color.set(colors.floor)
  }, [colors.floor])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    // Camera — positioned inside the room looking toward center
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    )
    camera.position.set(0, 2, 6)

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 2, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.update()

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb) // sky blue

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(5, 10, 5)
    scene.add(dirLight)

    // Room dimensions
    const roomWidth = 10
    const roomHeight = 5
    const roomDepth = 10

    // BoxGeometry face order (BackSide): +X, -X, +Y(ceiling), -Y, +Z, -Z
    // Faces 0,1,4,5 = walls; face 2 = ceiling; face 3 = inner-bottom (hidden by floor)
    const wallMat0 = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const wallMat1 = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const ceilingMat = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const bottomMat = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const wallMat4 = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })
    const wallMat5 = new THREE.MeshLambertMaterial({ color: 0xffe9c8, side: THREE.BackSide })

    // Store refs so color sync effects can update them
    wallMatsRef.current = [wallMat0, wallMat1, wallMat4, wallMat5]
    ceilingMatRef.current = ceilingMat

    const roomGeo = new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth)
    const room = new THREE.Mesh(roomGeo, [
      wallMat0,   // +X right wall
      wallMat1,   // -X left wall
      ceilingMat, // +Y ceiling
      bottomMat,  // -Y inner bottom (covered by floor plane)
      wallMat4,   // +Z front wall
      wallMat5,   // -Z back wall
    ])
    room.position.set(0, roomHeight / 2, 0)
    scene.add(room)

    // Floor — separate plane so it has its own paintable material
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth)
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xc8a96e })
    floorMatRef.current = floorMat
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    scene.add(floor)

    // Resize handler
    function onResize() {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
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

    // Cleanup
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      roomGeo.dispose()
      ;[wallMat0, wallMat1, ceilingMat, bottomMat, wallMat4, wallMat5].forEach(m => m.dispose())
      floorGeo.dispose()
      floorMat.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {isGodMode && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
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
