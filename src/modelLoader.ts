import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const loader = new GLTFLoader()
const cache = new Map<string, THREE.Group>()

export async function loadModel(path: string): Promise<THREE.Group> {
  const cached = cache.get(path)
  if (cached) return cached.clone()

  // Prepend Vite base URL so paths work on GitHub Pages (/fun-building/) and locally (/)
  const fullPath = path.startsWith('/')
    ? `${import.meta.env.BASE_URL}${path.slice(1)}`
    : path

  const gltf = await loader.loadAsync(fullPath)
  cache.set(path, gltf.scene)
  return gltf.scene.clone()
}
