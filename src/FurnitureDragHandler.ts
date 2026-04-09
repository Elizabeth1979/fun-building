/**
 * Encapsulates furniture drag/drop, raycasting selection, keyboard interaction,
 * and collision detection logic that was previously inline in App.tsx's main useEffect.
 *
 * This class owns the mutable drag state and event listeners. It reads from
 * React state through stable refs passed at construction time.
 */
import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { FurnitureItem } from './furniture'
import { FURNITURE_DIMS, catalogIdOf } from './furniture'
import { clampPosition, nudgePlacedItem, getNextItemId, getPrevItemId } from './useFurniture'
import { findFurnitureParent } from './sceneHelpers'
import { computeItemHalfDims, shouldBlockCollision } from './interactionHelpers'

export interface DragHandlerRefs {
  /** The mount element (for focus + keydown) */
  mount: HTMLElement
  /** Three.js camera */
  camera: THREE.PerspectiveCamera
  /** Three.js renderer */
  renderer: THREE.WebGLRenderer
  /** OrbitControls instance */
  controls: OrbitControls
  /** Map of item id → Three.js Object3D */
  furnitureMeshes: Map<string, THREE.Object3D>
  /** Ref to current placed items array */
  getPlacedItems: () => FurnitureItem[]
  /** Ref to current selected item id */
  getSelectedItemId: () => string | null
  /** Whether play mode is active (disables dragging) */
  getIsPlayMode: () => boolean
  /** Callbacks */
  setSelectedItemId: (id: string | null) => void
  moveItem: (id: string, pos: { x: number; y: number; z: number }, restingOnId?: string | null) => void
  moveItemWithChildren: (id: string, pos: { x: number; y: number; z: number }) => void
  rotateItem: (id: string) => void
  removeItem: (id: string) => void
}

export class FurnitureDragHandler {
  private readonly raycaster = new THREE.Raycaster()
  private readonly mouse = new THREE.Vector2()
  private readonly floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private readonly dragTarget = new THREE.Vector3()

  private isDragging = false
  private dragItemId: string | null = null
  private dragItemY = 0
  private currentRestingOnId: string | null = null

  private readonly refs: DragHandlerRefs

  // Bound handlers for clean removal
  private readonly boundMouseDown: (e: MouseEvent) => void
  private readonly boundMouseMove: (e: MouseEvent) => void
  private readonly boundMouseUp: () => void
  private readonly boundKeyDown: (e: KeyboardEvent) => void

  constructor(refs: DragHandlerRefs) {
    this.refs = refs

    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundKeyDown = this.onKeyDown.bind(this)

    refs.renderer.domElement.addEventListener('mousedown', this.boundMouseDown)
    refs.renderer.domElement.addEventListener('mousemove', this.boundMouseMove)
    refs.renderer.domElement.addEventListener('mouseup', this.boundMouseUp)
    refs.mount.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keydown', this.boundKeyDown)
  }

  dispose(): void {
    this.refs.renderer.domElement.removeEventListener('mousedown', this.boundMouseDown)
    this.refs.renderer.domElement.removeEventListener('mousemove', this.boundMouseMove)
    this.refs.renderer.domElement.removeEventListener('mouseup', this.boundMouseUp)
    this.refs.mount.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keydown', this.boundKeyDown)
  }

  private toNDC(e: MouseEvent): void {
    const rect = this.refs.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  private onMouseDown(e: MouseEvent): void {
    this.refs.mount.focus()
    if (this.refs.getIsPlayMode()) return
    this.toNDC(e)
    this.raycaster.setFromCamera(this.mouse, this.refs.camera)

    const allMeshes: THREE.Object3D[] = []
    for (const obj of this.refs.furnitureMeshes.values()) {
      obj.traverse(child => { if (child instanceof THREE.Mesh) allMeshes.push(child) })
    }
    const hits = this.raycaster.intersectObjects(allMeshes)
    if (hits.length > 0) {
      const hitId = findFurnitureParent(hits[0].object, this.refs.furnitureMeshes)
      if (hitId) {
        this.refs.setSelectedItemId(hitId)
        this.isDragging = true
        this.dragItemId = hitId
        this.dragItemY = this.refs.getPlacedItems().find(i => i.id === hitId)?.position.y ?? 0
        this.refs.controls.enabled = false
      }
    } else {
      this.refs.setSelectedItemId(null)
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging || this.dragItemId === null) return
    this.toNDC(e)
    this.raycaster.setFromCamera(this.mouse, this.refs.camera)

    const item = this.refs.getPlacedItems().find(i => i.id === this.dragItemId)
    const { halfW, halfD, halfH } = item
      ? computeItemHalfDims(item)
      : { halfW: 0.25, halfD: 0.25, halfH: 0.25 }

    // Raycast against other furniture first to allow placing items on top
    const otherMeshes: THREE.Object3D[] = []
    for (const [id, obj] of this.refs.furnitureMeshes) {
      if (id === this.dragItemId) continue
      obj.traverse(child => { if (child instanceof THREE.Mesh) otherMeshes.push(child) })
    }
    const furnitureHits = this.raycaster.intersectObjects(otherMeshes)

    let targetX: number
    let targetY: number
    let targetZ: number
    let restingOnId: string | null = null

    if (furnitureHits.length > 0) {
      let bestHit = furnitureHits[0]
      for (const h of furnitureHits) {
        if (h.point.y > bestHit.point.y) bestHit = h
      }
      const hitId = findFurnitureParent(bestHit.object, this.refs.furnitureMeshes)
      targetX = bestHit.point.x
      targetY = bestHit.point.y + halfH
      targetZ = bestHit.point.z
      restingOnId = hitId
    } else if (this.raycaster.ray.intersectPlane(this.floorPlane, this.dragTarget)) {
      targetX = this.dragTarget.x
      targetY = this.dragItemY
      targetZ = this.dragTarget.z
    } else {
      return
    }

    const clamped = clampPosition({ x: targetX, z: targetZ }, halfW, halfD, 5)

    // Box3 collision check
    const draggedObj = this.refs.furnitureMeshes.get(this.dragItemId)
    if (draggedObj) {
      const prevPos = draggedObj.position.clone()
      draggedObj.position.set(clamped.x, targetY, clamped.z)
      draggedObj.updateWorldMatrix(true, true)
      const draggedBox = new THREE.Box3().setFromObject(draggedObj)
      draggedBox.expandByScalar(0.05)
      const otherCount = this.refs.furnitureMeshes.size - 1
      let intersectCount = 0
      for (const [id, obj] of this.refs.furnitureMeshes) {
        if (id === this.dragItemId) continue
        if (id === restingOnId) continue
        obj.updateWorldMatrix(true, true)
        const otherBox = new THREE.Box3().setFromObject(obj)
        otherBox.expandByScalar(0.05)
        if (draggedBox.intersectsBox(otherBox)) {
          intersectCount++
        }
      }
      if (shouldBlockCollision(intersectCount, otherCount)) {
        draggedObj.position.copy(prevPos)
        return
      }
    }

    this.currentRestingOnId = restingOnId
    this.refs.moveItem(this.dragItemId, { x: clamped.x, y: targetY, z: clamped.z }, restingOnId)
  }

  private onMouseUp(): void {
    this.isDragging = false
    this.dragItemId = null
    this.refs.controls.enabled = true
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Tab / Shift+Tab: cycle through placed furniture items
    if (e.key === 'Tab' && !this.refs.getIsPlayMode()) {
      e.preventDefault()
      if (e.repeat) return
      const items = this.refs.getPlacedItems()
      const current = this.refs.getSelectedItemId()
      const nextId = e.shiftKey
        ? getPrevItemId(items, current)
        : getNextItemId(items, current)
      this.refs.setSelectedItemId(nextId)
      return
    }

    // Escape: deselect current item
    if (e.key === 'Escape') {
      this.refs.setSelectedItemId(null)
      return
    }

    const selId = this.refs.getSelectedItemId()
    if (selId && !this.refs.getIsPlayMode()) {
      if (e.key === 'r' || e.key === 'R') {
        this.refs.rotateItem(selId)
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        this.refs.removeItem(selId)
      }

      // Arrow-key nudge
      let dx = 0
      let dz = 0
      if (e.key === 'ArrowLeft') dx = -0.1
      else if (e.key === 'ArrowRight') dx = 0.1
      else if (e.key === 'ArrowUp') dz = -0.1
      else if (e.key === 'ArrowDown') dz = 0.1

      if (dx !== 0 || dz !== 0) {
        e.preventDefault()
        const item = this.refs.getPlacedItems().find(i => i.id === selId)
        if (!item) return
        const catalogId = catalogIdOf(item)
        const dims = FURNITURE_DIMS[catalogId] ?? [0.5, 0.5, 0.5]
        const halfW = item.meshType === 'cylinder' ? (dims[0] as number) : (dims[0] as number) / 2
        const halfD = item.meshType === 'box' ? (dims[2] as number) / 2 : halfW

        const nudged = nudgePlacedItem(this.refs.getPlacedItems(), selId, dx, dz, halfW, halfD, 5)
        const nudgedItem = nudged.find(i => i.id === selId)
        if (!nudgedItem) return

        // Box3 collision check (same pattern as drag)
        const obj = this.refs.furnitureMeshes.get(selId)
        if (obj) {
          const prevPos = obj.position.clone()
          obj.position.set(nudgedItem.position.x, nudgedItem.position.y, nudgedItem.position.z)
          obj.updateWorldMatrix(true, true)
          const nudgedBox = new THREE.Box3().setFromObject(obj)
          nudgedBox.expandByScalar(0.05)

          const otherCount = this.refs.furnitureMeshes.size - 1
          let intersectCount = 0
          for (const [id, other] of this.refs.furnitureMeshes) {
            if (id === selId) continue
            if (id === this.currentRestingOnId) continue
            other.updateWorldMatrix(true, true)
            const otherBox = new THREE.Box3().setFromObject(other)
            otherBox.expandByScalar(0.05)
            if (nudgedBox.intersectsBox(otherBox)) {
              intersectCount++
            }
          }

          if (shouldBlockCollision(intersectCount, otherCount)) {
            // eslint-disable-next-line no-console
            const boxSize = nudgedBox.getSize(new THREE.Vector3())
            console.warn(
              `[nudge] Item "${selId}" blocked — box size:`,
              boxSize.x.toFixed(2), boxSize.y.toFixed(2), boxSize.z.toFixed(2),
              `intersects ${intersectCount}/${otherCount} items`,
            )
            obj.position.copy(prevPos)
            return
          } else if (intersectCount > otherCount / 2) {
            // eslint-disable-next-line no-console
            const boxSize = nudgedBox.getSize(new THREE.Vector3())
            console.warn(
              `[nudge] Item "${selId}" has oversized bounding box — skipping collision.`,
              'Box size:', boxSize.x.toFixed(2), boxSize.y.toFixed(2), boxSize.z.toFixed(2),
              `intersects ${intersectCount}/${otherCount} items`,
            )
          }

          // If we moved off the supporting item, clear restingOnId
          if (this.currentRestingOnId) {
            const supportObj = this.refs.furnitureMeshes.get(this.currentRestingOnId)
            if (supportObj) {
              supportObj.updateWorldMatrix(true, true)
              const supportBox = new THREE.Box3().setFromObject(supportObj)
              supportBox.expandByScalar(0.05)
              if (!nudgedBox.intersectsBox(supportBox)) {
                this.currentRestingOnId = null
              }
            }
          }
        }

        // If item has a parent, nudge only this item (relative on top of parent)
        // If no parent, use moveItemWithChildren so children follow
        if (item.parentId) {
          this.refs.moveItem(selId, nudgedItem.position, item.parentId)
        } else {
          this.refs.moveItemWithChildren(selId, nudgedItem.position)
        }
      }
    }
  }
}
