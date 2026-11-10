import { PRIORITIES, STATUSES } from './task'
import { LABELS } from './messages'

const toOptions = (values) => values.map((value) => ({ value, label: value }))

export const STATUS_OPTIONS = toOptions(STATUSES)
export const PRIORITY_OPTIONS = toOptions(PRIORITIES)
export const STATUS_FILTER_OPTIONS = [{ value: '', label: LABELS.ALL_STATUSES }, ...STATUS_OPTIONS]
export const PRIORITY_FILTER_OPTIONS = [{ value: '', label: LABELS.ALL_PRIORITIES }, ...PRIORITY_OPTIONS]
