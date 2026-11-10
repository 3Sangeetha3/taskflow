import { ERROR_KINDS } from '../constants/app'

// First Zod issue per field → { field: message }.
export const zodFieldErrors = (error) =>
  error.issues.reduce((acc, issue) => {
    const field = issue.path[0]
    return field in acc ? acc : { ...acc, [field]: issue.message }
  }, {})

// ApiError → { fieldErrors, formError }. 400 field errors for known fields go under the field;
// anything else becomes a form-level message.
export const splitServerErrors = (error, knownFields) => {
  if (error.kind !== ERROR_KINDS.VALIDATION || !error.fieldErrors.length) {
    return { fieldErrors: {}, formError: error.message }
  }
  const known = error.fieldErrors.filter((e) => knownFields.includes(e.field))
  const unknown = error.fieldErrors.filter((e) => !knownFields.includes(e.field))
  return {
    fieldErrors: Object.fromEntries(known.map((e) => [e.field, e.message])),
    formError: unknown.length ? unknown.map((e) => e.message).join('. ') : null,
  }
}
