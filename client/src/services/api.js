import axios from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from '../constants/app'
import { deleteEnvelopeSchema, listEnvelopeSchema, taskEnvelopeSchema } from '../schemas/taskSchema'
import { malformedResponse, toApiError } from './apiError'

// Single axios instance; components never call axios directly (easy to mock in tests).
const api = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT_MS })

// Every failure becomes an ApiError (network, timeout, 4xx, 5xx).
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(toApiError(err)),
)

// Rejects responses that don't match the contract (HTML pages, missing ids, wrong types, ...).
const parse = (schema) => (res) => {
  const result = schema.safeParse(res.data)
  if (!result.success) throw malformedResponse()
  return result.data
}

export const taskApi = {
  list: (params) =>
    api.get('/tasks', { params }).then(parse(listEnvelopeSchema)).then(({ data, meta }) => ({ items: data, meta })),
  get: (id) => api.get(`/tasks/${id}`).then(parse(taskEnvelopeSchema)).then((body) => body.data),
  create: (body) => api.post('/tasks', body).then(parse(taskEnvelopeSchema)).then((res) => res.data),
  update: (id, body) => api.put(`/tasks/${id}`, body).then(parse(taskEnvelopeSchema)).then((res) => res.data),
  updateStatus: (id, status) =>
    api.patch(`/tasks/${id}/status`, { status }).then(parse(taskEnvelopeSchema)).then((res) => res.data),
  remove: (id) => api.delete(`/tasks/${id}`).then(parse(deleteEnvelopeSchema)).then((res) => res.data),
}

export default api
