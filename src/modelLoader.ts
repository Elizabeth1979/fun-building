import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const loader = new GLTFLoader()
const cache = new Map<string, THREE.Group>()

export async function loadModel(path: string): Promise<THREE.Group> {
  const cached = cache.get(path)
  if (cached) return cached.clone()

  const gltf = await loader.loadAsync(path)
  cache.set(path, gltf.scene)
  return gltf.scene.clone()
}
