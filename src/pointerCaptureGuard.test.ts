import { describe, it, expect, vi } from 'vitest'
import { applyPointerCaptureGuard } from './pointerCaptureGuard'

describe('applyPointerCaptureGuard', () => {
  it('delegates to the original setPointerCapture when call succeeds', () => {
    const el = document.createElement('div')
    const origSet = vi.fn()
    el.setPointerCapture = origSet
    el.releasePointerCapture = vi.fn()

    applyPointerCaptureGuard(el)
    el.setPointerCapture(42)

    expect(origSet).toHaveBeenCalledWith(42)
  })

  it('swallows NotFoundError from setPointerCapture', () => {
    const el = document.createElement('div')
    el.setPointerCapture = () => {
      throw new DOMException('No active pointer', 'NotFoundError')
    }
    el.releasePointerCapture = vi.fn()

    applyPointerCaptureGuard(el)
    // Should not throw
    expect(() => el.setPointerCapture(99)).not.toThrow()
  })

  it('re-throws non-NotFoundError from setPointerCapture', () => {
    const el = document.createElement('div')
    el.setPointerCapture = () => {
      throw new DOMException('Security issue', 'SecurityError')
    }
    el.releasePointerCapture = vi.fn()

    applyPointerCaptureGuard(el)
    expect(() => el.setPointerCapture(99)).toThrow('Security issue')
  })

  it('swallows NotFoundError from releasePointerCapture', () => {
    const el = document.createElement('div')
    el.setPointerCapture = vi.fn()
    el.releasePointerCapture = () => {
      throw new DOMException('No active pointer', 'NotFoundError')
    }

    applyPointerCaptureGuard(el)
    expect(() => el.releasePointerCapture(99)).not.toThrow()
  })

  it('no-ops when element lacks setPointerCapture (e.g. mock canvas)', () => {
    const el = document.createElement('div')
    // Simulate environment where methods don't exist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (el as unknown as Record<string, unknown>)['setPointerCapture']
    Object.defineProperty(el, 'setPointerCapture', { value: undefined, configurable: true })
    expect(() => applyPointerCaptureGuard(el)).not.toThrow()
  })

  it('re-throws non-NotFoundError from releasePointerCapture', () => {
    const el = document.createElement('div')
    el.setPointerCapture = vi.fn()
    el.releasePointerCapture = () => {
      throw new DOMException('Security issue', 'SecurityError')
    }

    applyPointerCaptureGuard(el)
    expect(() => el.releasePointerCapture(99)).toThrow('Security issue')
  })
})
