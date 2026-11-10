// Malformed API data must reach the UI as an error banner, never a crash or partial rows.
import { screen, within } from '@testing-library/react'
import App from './App'
import api from './services/api'
import { renderWithProviders, makeTask } from './test/utils'
import { ERRORS, LABELS } from './constants/messages'

const respondWith = (data) => {
  api.defaults.adapter = async (config) => ({ status: 200, statusText: 'OK', headers: {}, config, request: {}, data })
}

describe('malformed API data', () => {
  it.each([
    ['data: null', { success: true, message: 'm', data: null, meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }],
    ['items missing id', { success: true, message: 'm', data: [{ ...makeTask(), id: undefined }], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } }],
    ['HTML string', '<!doctype html><title>oops</title>'],
  ])('%s → error banner, no table', async (_name, body) => {
    respondWith(body)
    renderWithProviders(<App />)
    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent(ERRORS.UNEXPECTED_RESPONSE)
    expect(within(banner).getByRole('button', { name: LABELS.RETRY })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
