import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null)

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

    // Room — a box with BackSide so we see the inside walls
    const roomWidth = 10
    const roomHeight = 5
    const roomDepth = 10

    const roomGeo = new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth)
    const roomMat = new THREE.MeshLambertMaterial({
      color: 0xffe9c8,
      side: THREE.BackSide,
    })
    const room = new THREE.Mesh(roomGeo, roomMat)
    room.position.set(0, roomHeight / 2, 0)
    scene.add(room)

    // Floor — a visible plane so the base reads clearly
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth)
    const floorMat = new THREE.MeshLambertMaterial({ color: 0xc8a96e })
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
      roomMat.dispose()
      floorGeo.dispose()
      floorMat.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
    />
  )
}
