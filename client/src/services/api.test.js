// Real taskApi + axios instance with a stub adapter: no network.
import api, { taskApi } from './api'
import { ApiError } from './apiError'
import { ERROR_KINDS } from '../constants/app'
import { ERRORS } from '../constants/messages'
import { makeTask } from '../test/utils'

const ok = (data) => ({ status: 200, data })
const fail = (status, data) => ({ status, data })

const respondWith = (response) => {
  api.defaults.adapter = async (config) => {
    if (response instanceof Error) throw Object.assign(response, { config })
    const res = { ...response, statusText: '', headers: {}, config, request: {} }
    if (res.status >= 400) {
      throw Object.assign(new Error(`Request failed with status code ${res.status}`), { config, response: res, isAxiosError: true })
    }
    return res
  }
}

const expectApiError = async (promise, kind, message) => {
  const err = await promise.catch((e) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect(err).toMatchObject({ kind, message })
  return err
}

describe('taskApi responses', () => {
  it('list returns { items, meta }', async () => {
    const task = makeTask()
    const meta = { page: 1, limit: 10, total: 1, totalPages: 1 }
    respondWith(ok({ success: true, message: 'Tasks fetched successfully', data: [task], meta }))
    await expect(taskApi.list({})).resolves.toEqual({ items: [task], meta })
  })

  it.each([
    ['data: null', { success: true, message: 'm', data: null, meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }],
    ['item missing id', { success: true, message: 'm', data: [{ ...makeTask(), id: undefined }], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } }],
    ['missing meta', { success: true, message: 'm', data: [] }],
    ['HTML string body', '<!doctype html><html><body>Proxy error</body></html>'],
  ])('malformed list (%s) → "Unexpected response from the server"', async (_name, body) => {
    respondWith(ok(body))
    await expectApiError(taskApi.list({}), ERROR_KINDS.MALFORMED, ERRORS.UNEXPECTED_RESPONSE)
  })

  it('malformed single task → malformed error', async () => {
    respondWith(ok({ success: true, message: 'm', data: { title: 'no id' } }))
    await expectApiError(taskApi.create({}), ERROR_KINDS.MALFORMED, ERRORS.UNEXPECTED_RESPONSE)
  })
})

describe('error normalization', () => {
  it('400 keeps the API message and field errors', async () => {
    const errors = [{ field: 'title', message: 'Title is required' }]
    respondWith(fail(400, { success: false, message: 'Validation failed', errors }))
    const err = await expectApiError(taskApi.create({}), ERROR_KINDS.VALIDATION, 'Validation failed')
    expect(err.fieldErrors).toEqual(errors)
  })

  it('404 → not_found', async () => {
    respondWith(fail(404, { success: false, message: 'Task not found' }))
    await expectApiError(taskApi.remove('x'), ERROR_KINDS.NOT_FOUND, 'Task not found')
  })

  it('413 → generic too-large copy', async () => {
    respondWith(fail(413, { success: false, message: 'Request body is too large' }))
    await expectApiError(taskApi.create({}), ERROR_KINDS.TOO_LARGE, ERRORS.TOO_LARGE)
  })

  it('500 → generic message without technical detail', async () => {
    respondWith(fail(500, { success: false, message: 'TypeError: x is undefined at foo.js:1' }))
    await expectApiError(taskApi.list({}), ERROR_KINDS.SERVER, ERRORS.GENERIC)
  })

  it.each([502, 503, 504])('%i → "Can’t reach the server"', async (status) => {
    respondWith(fail(status, '<html>Bad gateway</html>'))
    await expectApiError(taskApi.list({}), ERROR_KINDS.NETWORK, ERRORS.NETWORK)
  })

  it('network failure (no response) → "Can’t reach the server"', async () => {
    respondWith(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', isAxiosError: true }))
    await expectApiError(taskApi.list({}), ERROR_KINDS.NETWORK, ERRORS.NETWORK)
  })

  it('timeout → same as network', async () => {
    respondWith(Object.assign(new Error('timeout of 10000ms exceeded'), { code: 'ECONNABORTED', isAxiosError: true }))
    await expectApiError(taskApi.list({}), ERROR_KINDS.NETWORK, ERRORS.NETWORK)
  })
})
