import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, vi } from 'vitest'

// Any console.error / console.warn during a test is a failure (act warnings, React key warnings,
// state updates after unmount, ...). Tests that expect one call mockClear() on the spy.
beforeEach(() => {
  vi.spyOn(console, 'error')
  vi.spyOn(console, 'warn')
})

afterEach(() => {
  expect(console.error).not.toHaveBeenCalled()
  expect(console.warn).not.toHaveBeenCalled()
  vi.restoreAllMocks()
})
