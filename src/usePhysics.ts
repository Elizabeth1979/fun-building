import { useRef } from 'react'
import * as THREE from 'three'
import type { FurnitureItem } from './furniture'
import { FURNITURE_DIMS, catalogIdOf } from './furniture'
import type RAPIER_TYPE from '@dimforge/rapier3d-compat'

type RigidBody = ReturnType<InstanceType<typeof RAPIER_TYPE.World>['createRigidBody']>

interface PhysicsState {
  RAPIER: typeof RAPIER_TYPE
  world: InstanceType<typeof RAPIER_TYPE.World>
  bodyMap: Map<string, RigidBody>
}

// Cache the init promise so WASM loads only once across mode toggles
let rapierInitPromise: Promise<typeof RAPIER_TYPE> | null = null

async function loadRapier(): Promise<typeof RAPIER_TYPE> {
  if (!rapierInitPromise) {
    rapierInitPromise = import('@dimforge/rapier3d-compat').then(async R => {
      await R.init()
      return R
    })
  }
  return rapierInitPromise
}

function halfExtentsForItem(item: FurnitureItem): [number, number, number] {
  const catalogId = catalogIdOf(item)
  const dims = FURNITURE_DIMS[catalogId] ?? [0.5, 0.5, 0.5]
  if (dims.length === 1) {
    // sphere: radius
    const r = dims[0]
    return [r, r, r]
  } else if (dims.length === 2) {
    // cylinder: [radius, height] — approximate with box
    const [r, h] = dims as [number, number]
    return [r, h / 2, r]
  } else {
    // box: [w, h, d]
    const [w, h, d] = dims as [number, number, number]
    return [w / 2, h / 2, d / 2]
  }
}

export function usePhysics() {
  const stateRef = useRef<PhysicsState | null>(null)

  async function initPhysics(items: FurnitureItem[]): Promise<void> {
    const RAPIER = await loadRapier()

    const world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0))
    world.timestep = 1 / 60

    // Floor: fixed body with a thin cuboid collider
    const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(5, 0.05, 5).setTranslation(0, -0.05, 0),
      floorBody,
    )

    // Furniture: dynamic bodies at current positions
    const bodyMap = new Map<string, RigidBody>()
    for (const item of items) {
      const [hw, hh, hd] = halfExtentsForItem(item)
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(item.position.x, item.position.y, item.position.z)
          .setLinearDamping(0.5)
          .setAngularDamping(0.5),
      )
      world.createCollider(RAPIER.ColliderDesc.cuboid(hw, hh, hd), body)
      bodyMap.set(item.id, body)
    }

    stateRef.current = { RAPIER, world, bodyMap }
  }

  /**
   * Step the simulation one tick and sync body positions to Three.js meshes.
   * Call this from the animation loop when in play mode.
   */
  function stepPhysics(meshes: Map<string, THREE.Mesh>): void {
    const state = stateRef.current
    if (!state) return

    state.world.step()

    for (const [id, body] of state.bodyMap) {
      const mesh = meshes.get(id)
      if (!mesh) continue
      const pos = body.translation()
      mesh.position.set(pos.x, pos.y, pos.z)
      const rot = body.rotation()
      mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    }
  }

  /**
   * Read final positions of all simulated bodies (for syncing back to React state).
   */
  function getFinalPositions(): Map<string, { x: number; y: number; z: number }> {
    const out = new Map<string, { x: number; y: number; z: number }>()
    const state = stateRef.current
    if (!state) return out
    for (const [id, body] of state.bodyMap) {
      const pos = body.translation()
      out.set(id, { x: pos.x, y: pos.y, z: pos.z })
    }
    return out
  }

  function destroyPhysics(): void {
    stateRef.current?.world.free()
    stateRef.current = null
  }

  return { initPhysics, stepPhysics, getFinalPositions, destroyPhysics }
}
