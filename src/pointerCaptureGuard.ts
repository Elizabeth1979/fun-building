/**
 * Wraps an element's setPointerCapture and releasePointerCapture so that
 * calls with a stale/invalid pointer ID log a warning instead of throwing.
 *
 * This guards against "No active pointer with the given id" errors that
 * Three.js OrbitControls can trigger when automated tools (e.g. Playwright)
 * synthesise pointer events or when the pointer leaves the window between
 * pointerdown dispatch and the capture call.
 */
export function applyPointerCaptureGuard(element: HTMLElement): void {
  // In test environments the element may not have these methods
  if (typeof element.setPointerCapture !== 'function') return

  const originalSet = element.setPointerCapture.bind(element)
  const originalRelease = element.releasePointerCapture.bind(element)

  element.setPointerCapture = (pointerId: number): void => {
    try {
      originalSet(pointerId)
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'NotFoundError') {
        // Stale pointer — safe to ignore
        console.warn('setPointerCapture: ignoring stale pointer', pointerId)
      } else {
        throw e
      }
    }
  }

  element.releasePointerCapture = (pointerId: number): void => {
    try {
      originalRelease(pointerId)
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'NotFoundError') {
        // Pointer already gone — safe to ignore
        console.warn('releasePointerCapture: ignoring stale pointer', pointerId)
      } else {
        throw e
      }
    }
  }
}
