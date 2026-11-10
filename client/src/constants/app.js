export const APP_NAME = 'TaskFlow'
export const API_BASE_URL = '/api'
export const API_TIMEOUT_MS = 10000
export const SEARCH_DEBOUNCE_MS = 300
export const TOAST_DURATION_MS = 4000
export const QUERY_RETRY = 1

export const QUERY_KEYS = { TASKS: 'tasks' }

// Dates are formatted in UTC so "2026-11-15" (stored as UTC midnight) never shifts a day.
export const DATE_LOCALE = 'en-US'
export const DATE_FORMAT = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }
export const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length
// A locale whose short date format is YYYY-MM-DD, used to get "today" in the viewer's timezone.
export const ISO_DAY_LOCALE = 'en-CA'

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
}

// Normalized error kinds produced by services/apiError.js
export const ERROR_KINDS = {
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found',
  NETWORK: 'network',
  TOO_LARGE: 'too_large',
  MALFORMED: 'malformed',
  SERVER: 'server',
}
