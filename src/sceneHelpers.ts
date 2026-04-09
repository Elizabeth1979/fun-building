import * as THREE from 'three'
import type { FurnitureItem } from './furniture'
import { FURNITURE_CATALOG, FURNITURE_DIMS, catalogIdOf } from './furniture'
import { loadModel } from './modelLoader'

export function buildFallbackMesh(item: FurnitureItem): THREE.Mesh {
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

export async function buildFurnitureModel(item: FurnitureItem): Promise<THREE.Object3D> {
  const catalogId = catalogIdOf(item)
  const catalogEntry = FURNITURE_CATALOG.find(c => c.id === catalogId)
  const modelPath = item.modelPath ?? catalogEntry?.modelPath

  if (!modelPath) return buildFallbackMesh(item)

  try {
    const group = await loadModel(modelPath)
    group.position.set(item.position.x, item.position.y, item.position.z)
    group.rotation.y = item.rotation
    group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.envMapIntensity = 1.0
        }
      }
    })
    return group
  } catch {
    return buildFallbackMesh(item)
  }
}

export function setEmissiveOnObject(obj: THREE.Object3D, color: number): void {
  obj.traverse(child => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshLambertMaterial) {
        mat.emissive.set(color)
      }
    }
  })
}

export function disposeObject(obj: THREE.Object3D): void {
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

export function findFurnitureParent(
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
