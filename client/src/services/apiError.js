import { ERRORS } from '../constants/messages'
import { ERROR_KINDS, HTTP_STATUS } from '../constants/app'

// One error type for the whole UI: { message, kind, status, fieldErrors }.
export class ApiError extends Error {
  constructor(message, { kind, status, fieldErrors = [] } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const UNREACHABLE = [HTTP_STATUS.SERVICE_UNAVAILABLE, HTTP_STATUS.BAD_GATEWAY, HTTP_STATUS.GATEWAY_TIMEOUT]
const apiMessage = (data) => (typeof data?.message === 'string' ? data.message : ERRORS.GENERIC)

// Axios error → ApiError. Only 400/404 keep the API's message; everything else uses our copy.
export const toApiError = (err) => {
  if (err instanceof ApiError) return err
  const { response } = err
  if (!response || UNREACHABLE.includes(response.status)) {
    return new ApiError(ERRORS.NETWORK, { kind: ERROR_KINDS.NETWORK, status: response?.status })
  }
  const { status, data } = response
  if (status === HTTP_STATUS.BAD_REQUEST) {
    const fieldErrors = Array.isArray(data?.errors) ? data.errors : []
    return new ApiError(apiMessage(data), { kind: ERROR_KINDS.VALIDATION, status, fieldErrors })
  }
  if (status === HTTP_STATUS.NOT_FOUND) return new ApiError(apiMessage(data), { kind: ERROR_KINDS.NOT_FOUND, status })
  if (status === HTTP_STATUS.PAYLOAD_TOO_LARGE) return new ApiError(ERRORS.TOO_LARGE, { kind: ERROR_KINDS.TOO_LARGE, status })
  return new ApiError(ERRORS.GENERIC, { kind: ERROR_KINDS.SERVER, status })
}

export const malformedResponse = () => new ApiError(ERRORS.UNEXPECTED_RESPONSE, { kind: ERROR_KINDS.MALFORMED })
