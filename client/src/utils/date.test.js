import { formatDate, isOverdue, toInputDate } from './date'
import { STATUS_COMPLETED, STATUS_PENDING } from '../constants/task'

const NOW = new Date(2026, 10, 10, 9, 0) // Nov 10 2026, 09:00 local

describe('date utils', () => {
  it('formats a UTC-midnight due date without shifting the day', () => {
    expect(formatDate('2026-11-15T00:00:00.000Z')).toBe('Nov 15, 2026')
  })

  it('converts ISO to the <input type="date"> value', () => {
    expect(toInputDate('2026-11-15T00:00:00.000Z')).toBe('2026-11-15')
    expect(toInputDate(null)).toBe('')
  })

  it.each([
    ['2026-11-09T00:00:00.000Z', STATUS_PENDING, true],
    ['2026-11-10T00:00:00.000Z', STATUS_PENDING, false], // due today is not overdue
    ['2026-11-11T00:00:00.000Z', STATUS_PENDING, false],
    ['2026-11-09T00:00:00.000Z', STATUS_COMPLETED, false],
    [null, STATUS_PENDING, false],
  ])('isOverdue(%s, %s) = %s', (dueDate, status, expected) => {
    expect(isOverdue({ dueDate, status }, NOW)).toBe(expected)
  })
})
