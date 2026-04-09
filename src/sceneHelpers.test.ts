import { describe, it, expect, vi } from 'vitest'
import * as THREE from 'three'
import { disposeObject, setEmissiveOnObject, findFurnitureParent } from './sceneHelpers'

describe('disposeObject', () => {
  it('disposes geometry and single material on a mesh', () => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshLambertMaterial()
    const mesh = new THREE.Mesh(geo, mat)
    const geoSpy = vi.spyOn(geo, 'dispose')
    const matSpy = vi.spyOn(mat, 'dispose')

    disposeObject(mesh)

    expect(geoSpy).toHaveBeenCalled()
    expect(matSpy).toHaveBeenCalled()
  })

  it('disposes array materials', () => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat1 = new THREE.MeshLambertMaterial()
    const mat2 = new THREE.MeshStandardMaterial()
    const mesh = new THREE.Mesh(geo, [mat1, mat2])
    const m1Spy = vi.spyOn(mat1, 'dispose')
    const m2Spy = vi.spyOn(mat2, 'dispose')

    disposeObject(mesh)

    expect(m1Spy).toHaveBeenCalled()
    expect(m2Spy).toHaveBeenCalled()
  })

  it('traverses children in a group', () => {
    const group = new THREE.Group()
    const geo = new THREE.SphereGeometry(0.5)
    const mat = new THREE.MeshStandardMaterial()
    const child = new THREE.Mesh(geo, mat)
    group.add(child)
    const geoSpy = vi.spyOn(geo, 'dispose')

    disposeObject(group)

    expect(geoSpy).toHaveBeenCalled()
  })
})

describe('setEmissiveOnObject', () => {
  it('sets emissive on MeshStandardMaterial', () => {
    const mat = new THREE.MeshStandardMaterial()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat)

    setEmissiveOnObject(mesh, 0x555500)

    expect(mat.emissive.getHex()).toBe(0x555500)
  })

  it('sets emissive on MeshLambertMaterial', () => {
    const mat = new THREE.MeshLambertMaterial()
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat)

    setEmissiveOnObject(mesh, 0x112233)

    expect(mat.emissive.getHex()).toBe(0x112233)
  })
})

describe('findFurnitureParent', () => {
  it('returns the id when hit is a root mesh', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    const meshes = new Map<string, THREE.Object3D>([['chair-1', mesh]])

    expect(findFurnitureParent(mesh, meshes)).toBe('chair-1')
  })

  it('returns the id when hit is a child of a root group', () => {
    const group = new THREE.Group()
    const child = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    group.add(child)
    const meshes = new Map<string, THREE.Object3D>([['table-1', group]])

    expect(findFurnitureParent(child, meshes)).toBe('table-1')
  })

  it('returns null when hit is not in any tracked furniture', () => {
    const stray = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
    const meshes = new Map<string, THREE.Object3D>()

    expect(findFurnitureParent(stray, meshes)).toBeNull()
  })
})
