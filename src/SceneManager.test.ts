import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SceneManager } from './SceneManager'

// Mock Three.js WebGLRenderer since jsdom has no WebGL context
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three')
  class MockWebGLRenderer {
    shadowMap = { enabled: false, type: 0 }
    domElement = document.createElement('canvas')
    setPixelRatio = vi.fn()
    setSize = vi.fn()
    render = vi.fn()
    dispose = vi.fn()
  }
  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  }
})

// Mock OrbitControls
vi.mock('three/addons/controls/OrbitControls.js', () => {
  class MockOrbitControls {
    target = { set: vi.fn() }
    enableDamping = false
    dampingFactor = 0
    update = vi.fn()
    dispose = vi.fn()
    enabled = true
  }
  return { OrbitControls: MockOrbitControls }
})

describe('SceneManager', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    // jsdom doesn't compute layout, so stub clientWidth/clientHeight
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true })
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true })
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it('creates a scene with a sky-blue background', () => {
    const mgr = new SceneManager(container)
    expect(mgr.scene.background).toBeTruthy()
    mgr.dispose()
  })

  it('exposes the scene, camera, renderer, and controls', () => {
    const mgr = new SceneManager(container)
    expect(mgr.scene).toBeDefined()
    expect(mgr.camera).toBeDefined()
    expect(mgr.renderer).toBeDefined()
    expect(mgr.controls).toBeDefined()
    mgr.dispose()
  })

  it('appends the renderer canvas to the container', () => {
    const mgr = new SceneManager(container)
    expect(container.contains(mgr.renderer.domElement)).toBe(true)
    mgr.dispose()
  })

  it('sets camera position to (0, 2, 6)', () => {
    const mgr = new SceneManager(container)
    expect(mgr.camera.position.x).toBe(0)
    expect(mgr.camera.position.y).toBe(2)
    expect(mgr.camera.position.z).toBe(6)
    mgr.dispose()
  })

  it('adds ambient and directional lights to the scene', () => {
    const mgr = new SceneManager(container)
    const lightCount = mgr.scene.children.filter(
      c => c.type === 'AmbientLight' || c.type === 'DirectionalLight'
    ).length
    expect(lightCount).toBe(2)
    mgr.dispose()
  })

  it('uses PCFShadowMap (not deprecated PCFSoftShadowMap)', async () => {
    const THREE = await import('three')
    const mgr = new SceneManager(container)
    expect(mgr.renderer.shadowMap.type).toBe(THREE.PCFShadowMap)
    mgr.dispose()
  })

  it('dispose removes canvas from container', () => {
    const mgr = new SceneManager(container)
    const canvas = mgr.renderer.domElement
    mgr.dispose()
    expect(container.contains(canvas)).toBe(false)
  })
})
