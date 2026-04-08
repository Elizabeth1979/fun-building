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
  // Pre-compute bounding boxes for all child meshes so Box3.setFromObject works correctly
  gltf.scene.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      (child as THREE.Mesh).geometry.computeBoundingBox()
    }
  })

  // Sanity-check the overall bounding box — some GLTF models produce zero-volume
  // or absurdly large boxes that break collision detection
  const box = new THREE.Box3().setFromObject(gltf.scene)
  const size = box.getSize(new THREE.Vector3())
  const volume = size.x * size.y * size.z
  if (volume === 0 || size.x > 5 || size.y > 5 || size.z > 5) {
    // eslint-disable-next-line no-console
    console.warn(
      `[modelLoader] Bad bounding box for "${path}":`,
      size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2),
      '— replacing mesh geometries with 0.5x0.5x0.5 fallback bounds',
    )
    // Replace each mesh's geometry bounding box with a sensible default
    const fallbackBox = new THREE.Box3(
      new THREE.Vector3(-0.25, -0.25, -0.25),
      new THREE.Vector3(0.25, 0.25, 0.25),
    )
    gltf.scene.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).geometry.boundingBox = fallbackBox.clone()
      }
    })
  }

  cache.set(path, gltf.scene)
  return gltf.scene.clone()
}
