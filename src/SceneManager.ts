import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { loadModel } from './modelLoader'
import { disposeObject } from './sceneHelpers'
import { applyPointerCaptureGuard } from './pointerCaptureGuard'
import { buildCityGridPositions, CITY_TILE_SIZE, CITY_GRID_SIZE } from './cityGrid'
import { type PlacedHouse, cellToWorldPosition } from './cityHouses'
import { type CityRoadsState, getRoadCells } from './cityRoads'
import { type NpcState, getNpcs } from './cityNpcs'
import { cellToWorldPosition as npcCellToWorld } from './cityHouses'

export interface SceneManagerOptions {
  /** Callback invoked each animation frame, before render */
  onAnimationFrame?: () => void
}

/**
 * Owns the Three.js renderer, camera, controls, scene, lighting,
 * resize handling, animation loop, and modular room building.
 *
 * Lives outside React state per CLAUDE.md rules.
 */
export class SceneManager {
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly renderer: THREE.WebGLRenderer
  readonly controls: OrbitControls

  /** Wall objects for color updates */
  readonly roomWallObjects: THREE.Object3D[] = []
  /** Floor objects for color updates */
  readonly roomFloorObjects: THREE.Object3D[] = []
  /** City scene objects (for cleanup when switching views) */
  readonly cityObjects: THREE.Object3D[] = []
  /** House meshes in city view, keyed by house id */
  readonly houseMeshes: Map<string, THREE.Object3D> = new Map()
  /** Road meshes in city view, keyed by "cellX,cellZ" */
  readonly roadMeshes: Map<string, THREE.Object3D> = new Map()
  /** NPC meshes in city view, keyed by NPC id */
  readonly npcMeshes: Map<string, THREE.Object3D> = new Map()

  private animId = 0
  private readonly container: HTMLElement
  private onAnimationFrame: (() => void) | undefined
  private disposed = false

  constructor(container: HTMLElement, options?: SceneManagerOptions) {
    this.container = container
    this.onAnimationFrame = options?.onAnimationFrame

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(this.renderer.domElement)

    // Guard against stale-pointer errors from OrbitControls
    applyPointerCaptureGuard(this.renderer.domElement)

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    )
    this.camera.position.set(0, 2, 6)

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 2, 0)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.update()

    // Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(5, 10, 5)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    dirLight.shadow.camera.near = 0.1
    dirLight.shadow.camera.far = 50
    this.scene.add(dirLight)

    // Resize handler
    window.addEventListener('resize', this.onResize)
  }

  /** Start the animation loop. */
  start(): void {
    const animate = () => {
      if (this.disposed) return
      this.animId = requestAnimationFrame(animate)
      this.onAnimationFrame?.()
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    animate()
  }

  /** Update the per-frame callback (e.g. when physics ref changes). */
  setAnimationCallback(cb: (() => void) | undefined): void {
    this.onAnimationFrame = cb
  }

  /** Build the modular room from Kenney GLTF pieces. */
  async buildModularRoom(initialWallColor: string, initialFloorColor: string): Promise<void> {
    const scene = this.scene
    const roomWallObjects = this.roomWallObjects
    const roomFloorObjects = this.roomFloorObjects

    // Load one of each piece to measure actual tile dimensions
    const sampleFloor = await loadModel('/models/room/floorFull.glb')
    const floorBox = new THREE.Box3().setFromObject(sampleFloor)
    const floorSize = floorBox.getSize(new THREE.Vector3())
    const tileW = floorSize.x
    const tileD = floorSize.z

    const sampleWall = await loadModel('/models/room/wall.glb')
    const wallBox = new THREE.Box3().setFromObject(sampleWall)
    const wallSize = wallBox.getSize(new THREE.Vector3())
    const wallW = wallSize.x

    // Dispose measurement samples
    disposeObject(sampleFloor)
    disposeObject(sampleWall)

    const roomHalf = 5 // room is 10×10, centered at origin

    // Floor tiles — grid centered at origin
    const tilesX = Math.round(roomHalf * 2 / tileW)
    const tilesZ = Math.round(roomHalf * 2 / tileD)
    for (let ix = 0; ix < tilesX; ix++) {
      for (let iz = 0; iz < tilesZ; iz++) {
        const tile = await loadModel('/models/room/floorFull.glb')
        tile.position.set(
          -roomHalf + tileW / 2 + ix * tileW,
          0,
          -roomHalf + tileD / 2 + iz * tileD,
        )
        tile.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.receiveShadow = true
          }
        })
        scene.add(tile)
        roomFloorObjects.push(tile)
      }
    }

    const wallSegments = Math.round(roomHalf * 2 / wallW)

    // Helper: place a row of wall tiles
    async function placeWallRow(
      modelPath: string,
      count: number,
      getPosition: (i: number) => [number, number, number],
      rotationY: number,
      skipIndices?: Set<number>,
      replacements?: Map<number, string>,
    ) {
      for (let i = 0; i < count; i++) {
        if (skipIndices?.has(i)) continue
        const path = replacements?.get(i) ?? modelPath
        const piece = await loadModel(path)
        const [px, py, pz] = getPosition(i)
        piece.position.set(px, py, pz)
        piece.rotation.y = rotationY
        piece.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        scene.add(piece)
        roomWallObjects.push(piece)
      }
    }

    // Back wall (z = -roomHalf): faces +z (rotation 0)
    await placeWallRow(
      '/models/room/wall.glb',
      wallSegments,
      i => [-roomHalf + wallW / 2 + i * wallW, 0, -roomHalf],
      0,
    )

    // Front wall (z = +roomHalf): faces -z (rotation PI)
    const frontCenter = Math.floor(wallSegments / 2)
    await placeWallRow(
      '/models/room/wall.glb',
      wallSegments,
      i => [-roomHalf + wallW / 2 + i * wallW, 0, roomHalf],
      Math.PI,
      undefined,
      new Map([[frontCenter, '/models/room/wallDoorwayWide.glb']]),
    )

    // Left wall (x = -roomHalf): faces +x (rotation PI/2)
    await placeWallRow(
      '/models/room/wall.glb',
      wallSegments,
      i => [-roomHalf, 0, -roomHalf + wallW / 2 + i * wallW],
      Math.PI / 2,
    )

    // Right wall (x = +roomHalf): faces -x (rotation -PI/2)
    await placeWallRow(
      '/models/room/wall.glb',
      wallSegments,
      i => [roomHalf, 0, -roomHalf + wallW / 2 + i * wallW],
      -Math.PI / 2,
    )

    // Corner pieces
    for (const [cx, cz, cr] of [
      [-roomHalf, -roomHalf, 0],
      [roomHalf, -roomHalf, -Math.PI / 2],
      [-roomHalf, roomHalf, Math.PI / 2],
      [roomHalf, roomHalf, Math.PI],
    ] as [number, number, number][]) {
      const corner = await loadModel('/models/room/wallCorner.glb')
      corner.position.set(cx, 0, cz)
      corner.rotation.y = cr
      corner.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      scene.add(corner)
      roomWallObjects.push(corner)
    }

    // Apply initial colors
    for (const obj of roomWallObjects) {
      obj.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.color.set(initialWallColor)
        }
      })
    }
    for (const obj of roomFloorObjects) {
      obj.traverse(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.color.set(initialFloorColor)
        }
      })
    }
  }

  /** Build a simple 8x8 city ground grid using flat colored planes. */
  buildCityScene(): void {
    const positions = buildCityGridPositions()
    const geometry = new THREE.PlaneGeometry(CITY_TILE_SIZE, CITY_TILE_SIZE)

    for (const pos of positions) {
      // Alternate green/dark-green checkerboard
      const ix = Math.round((pos.x + (CITY_TILE_SIZE * 4)) / CITY_TILE_SIZE)
      const iz = Math.round((pos.z + (CITY_TILE_SIZE * 4)) / CITY_TILE_SIZE)
      const isEven = (ix + iz) % 2 === 0
      const material = new THREE.MeshStandardMaterial({
        color: isEven ? 0x4caf50 : 0x388e3c,
      })
      const tile = new THREE.Mesh(geometry, material)
      tile.rotation.x = -Math.PI / 2
      tile.position.set(pos.x, pos.y, pos.z)
      tile.receiveShadow = true
      this.scene.add(tile)
      this.cityObjects.push(tile)
    }

    // Reposition camera for overhead city view
    this.camera.position.set(0, 30, 30)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  /** Remove all city objects from the scene. */
  clearCityScene(): void {
    for (const obj of this.cityObjects) {
      this.scene.remove(obj)
      disposeObject(obj)
    }
    this.cityObjects.length = 0
    this.clearHouseMeshes()
    this.clearRoadMeshes()
    this.clearNpcMeshes()
  }

  /** Sync house meshes to match the given placed-houses list. */
  syncHouseMeshes(houses: PlacedHouse[]): void {
    const liveIds = new Set(houses.map(h => h.id))

    // Remove meshes for deleted houses
    for (const [id, mesh] of this.houseMeshes) {
      if (!liveIds.has(id)) {
        this.scene.remove(mesh)
        disposeObject(mesh)
        this.houseMeshes.delete(id)
      }
    }

    // Add meshes for new houses
    for (const house of houses) {
      if (this.houseMeshes.has(house.id)) continue
      const mesh = this.createHouseMesh(house)
      this.scene.add(mesh)
      this.houseMeshes.set(house.id, mesh)
    }
  }

  /** Create a simple procedural house mesh (box + roof). */
  private createHouseMesh(house: PlacedHouse): THREE.Group {
    const group = new THREE.Group()
    group.userData['houseId'] = house.id

    const pos = cellToWorldPosition(house.cellX, house.cellZ, CITY_GRID_SIZE, CITY_TILE_SIZE)

    // Walls — a box
    const wallGeo = new THREE.BoxGeometry(CITY_TILE_SIZE * 0.7, 2, CITY_TILE_SIZE * 0.7)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3 }) // wheat
    const walls = new THREE.Mesh(wallGeo, wallMat)
    walls.position.y = 1
    walls.castShadow = true
    walls.receiveShadow = true
    group.add(walls)

    // Roof — a cone
    const roofGeo = new THREE.ConeGeometry(CITY_TILE_SIZE * 0.55, 1.5, 4)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c }) // dark red
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.y = 2.75
    roof.rotation.y = Math.PI / 4
    roof.castShadow = true
    group.add(roof)

    group.position.set(pos.x, 0, pos.z)
    return group
  }

  /** Remove all house meshes. */
  private clearHouseMeshes(): void {
    for (const [, mesh] of this.houseMeshes) {
      this.scene.remove(mesh)
      disposeObject(mesh)
    }
    this.houseMeshes.clear()
  }

  /** Sync road meshes to match the given roads state. */
  syncRoadMeshes(roadsState: CityRoadsState): void {
    const cells = getRoadCells(roadsState)
    const liveKeys = new Set(cells.map(c => `${c.cellX},${c.cellZ}`))

    // Remove meshes for deleted roads
    for (const [key, mesh] of this.roadMeshes) {
      if (!liveKeys.has(key)) {
        this.scene.remove(mesh)
        disposeObject(mesh)
        this.roadMeshes.delete(key)
      }
    }

    // Add meshes for new roads
    for (const cell of cells) {
      const key = `${cell.cellX},${cell.cellZ}`
      if (this.roadMeshes.has(key)) continue
      const mesh = this.createRoadMesh(cell.cellX, cell.cellZ)
      this.scene.add(mesh)
      this.roadMeshes.set(key, mesh)
    }
  }

  /** Create a simple procedural road tile mesh. */
  private createRoadMesh(cellX: number, cellZ: number): THREE.Mesh {
    const pos = cellToWorldPosition(cellX, cellZ, CITY_GRID_SIZE, CITY_TILE_SIZE)
    const geometry = new THREE.PlaneGeometry(CITY_TILE_SIZE * 0.95, CITY_TILE_SIZE * 0.95)
    const material = new THREE.MeshStandardMaterial({ color: 0x555555 }) // dark gray road
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(pos.x, 0.01, pos.z) // slightly above ground to avoid z-fighting
    mesh.receiveShadow = true
    mesh.userData['roadCell'] = `${cellX},${cellZ}`
    return mesh
  }

  /** Remove all road meshes. */
  private clearRoadMeshes(): void {
    for (const [, mesh] of this.roadMeshes) {
      this.scene.remove(mesh)
      disposeObject(mesh)
    }
    this.roadMeshes.clear()
  }

  /** Sync NPC meshes to match the given NPC state, interpolating positions. */
  syncNpcMeshes(npcState: NpcState): void {
    const npcs = getNpcs(npcState)
    const liveIds = new Set(npcs.map(n => n.id))

    // Remove meshes for despawned NPCs
    for (const [id, mesh] of this.npcMeshes) {
      if (!liveIds.has(id)) {
        this.scene.remove(mesh)
        disposeObject(mesh)
        this.npcMeshes.delete(id)
      }
    }

    // Create/update meshes
    for (const npc of npcs) {
      let mesh = this.npcMeshes.get(npc.id)
      if (!mesh) {
        mesh = this.createNpcMesh()
        this.scene.add(mesh)
        this.npcMeshes.set(npc.id, mesh)
      }

      // Interpolate world position between current and target cell
      const from = npcCellToWorld(npc.cellX, npc.cellZ, CITY_GRID_SIZE, CITY_TILE_SIZE)
      const to = npcCellToWorld(npc.targetCellX, npc.targetCellZ, CITY_GRID_SIZE, CITY_TILE_SIZE)
      const t = npc.progress
      mesh.position.set(
        from.x + (to.x - from.x) * t,
        0,
        from.z + (to.z - from.z) * t,
      )

      // Face movement direction
      if (npc.cellX !== npc.targetCellX || npc.cellZ !== npc.targetCellZ) {
        const dx = to.x - from.x
        const dz = to.z - from.z
        mesh.rotation.y = Math.atan2(dx, dz)
      }
    }
  }

  /** Create a simple procedural NPC mesh (small capsule-like figure). */
  private createNpcMesh(): THREE.Group {
    const group = new THREE.Group()

    // Body - small cylinder
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2196f3 }) // blue
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.6
    body.castShadow = true
    group.add(body)

    // Head - small sphere
    const headGeo = new THREE.SphereGeometry(0.2, 8, 6)
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc80 }) // skin tone
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = 1.2
    head.castShadow = true
    group.add(head)

    return group
  }

  /** Remove all NPC meshes. */
  clearNpcMeshes(): void {
    for (const [, mesh] of this.npcMeshes) {
      this.scene.remove(mesh)
      disposeObject(mesh)
    }
    this.npcMeshes.clear()
  }

  /** Raycast from mouse to find a house mesh. Returns houseId or null. */
  raycastHouse(event: MouseEvent): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const houseMeshArray = Array.from(this.houseMeshes.values())
    const intersects = raycaster.intersectObjects(houseMeshArray, true)
    if (intersects.length === 0) return null

    // Walk up to find the group with houseId
    let obj: THREE.Object3D | null = intersects[0].object
    while (obj) {
      if (obj.userData['houseId']) return obj.userData['houseId'] as string
      obj = obj.parent
    }
    return null
  }

  /** Raycast from mouse to find a ground tile. Returns world position or null. */
  raycastGround(event: MouseEvent): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)
    const intersects = raycaster.intersectObjects(this.cityObjects, false)
    if (intersects.length === 0) return null
    return intersects[0].point
  }

  /** Reset camera to interior room view defaults. */
  resetInteriorCamera(): void {
    this.camera.position.set(0, 2, 6)
    this.controls.target.set(0, 2, 0)
    this.controls.update()
  }

  private onResize = (): void => {
    const container = this.container
    this.camera.aspect = container.clientWidth / container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(container.clientWidth, container.clientHeight)
  }

  /** Tear down everything. */
  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.animId)
    window.removeEventListener('resize', this.onResize)

    // Clean up room pieces
    for (const obj of this.roomWallObjects) {
      this.scene.remove(obj)
      disposeObject(obj)
    }
    this.roomWallObjects.length = 0

    for (const obj of this.roomFloorObjects) {
      this.scene.remove(obj)
      disposeObject(obj)
    }
    this.roomFloorObjects.length = 0

    this.clearCityScene()

    this.controls.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
