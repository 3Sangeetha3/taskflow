import { DATE_FORMAT, DATE_LOCALE, ISO_DATE_LENGTH, ISO_DAY_LOCALE } from '../constants/app'
import { STATUS_COMPLETED } from '../constants/task'

const displayFormat = new Intl.DateTimeFormat(DATE_LOCALE, DATE_FORMAT) // timeZone: 'UTC'
const isoDayFormat = new Intl.DateTimeFormat(ISO_DAY_LOCALE) // viewer's timezone

export const formatDate = (iso) => displayFormat.format(new Date(iso))

// "2026-11-15T00:00:00.000Z" → "2026-11-15" (for <input type="date">). Due dates are UTC days.
export const toInputDate = (iso) => (iso ? iso.slice(0, ISO_DATE_LENGTH) : '')

// Overdue = due day is before the viewer's today, and the task isn't done.
export const isOverdue = ({ dueDate, status }, now = new Date()) =>
  Boolean(dueDate) && status !== STATUS_COMPLETED && toInputDate(dueDate) < isoDayFormat.format(now)
