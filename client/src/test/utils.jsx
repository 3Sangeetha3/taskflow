import { render } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import AppProviders from '../components/AppProviders'
import { PAGINATION, TASK_DEFAULTS } from '../constants/task'

export const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

// Same providers as the app (Query + Toast + ErrorBoundary), with retries off.
export const renderWithProviders = (ui, { queryClient = createTestQueryClient() } = {}) => ({
  queryClient,
  ...render(<AppProviders queryClient={queryClient}>{ui}</AppProviders>),
})

let seq = 0
export const makeTask = (overrides = {}) => {
  seq += 1
  return {
    id: `task-${seq}`,
    title: `Task ${seq}`,
    description: TASK_DEFAULTS.DESCRIPTION,
    priority: TASK_DEFAULTS.PRIORITY,
    status: TASK_DEFAULTS.STATUS,
    dueDate: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  }
}

export const listResult = (items, meta = {}) => ({
  items,
  meta: { page: PAGINATION.FIRST_PAGE, limit: PAGINATION.PAGE_SIZE, total: items.length, totalPages: items.length ? 1 : 0, ...meta },
})

export const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
