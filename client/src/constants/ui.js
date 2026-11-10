import { LABELS } from './messages'

// Value → semantic token classes. Badges read these maps; components hold no color logic.
export const TONE_CLASSES = {
  neutral: 'bg-surface-muted text-ink-muted',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export const STATUS_TONES = { Pending: 'neutral', 'In Progress': 'info', Completed: 'success' }
export const PRIORITY_TONES = { Low: 'neutral', Medium: 'warning', High: 'danger' }
export const OVERDUE_TONE = 'danger'

export const TABLE_COLUMNS = [
  { key: 'title', label: LABELS.TITLE },
  { key: 'priority', label: LABELS.PRIORITY },
  { key: 'status', label: LABELS.STATUS },
  { key: 'dueDate', label: LABELS.DUE_DATE },
  { key: 'actions', label: LABELS.ACTIONS, srOnly: true },
]

export const SKELETON_ROWS = 5

// Shared class recipes (tokens only). Transitions are limited to 150ms color changes.
export const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'
const CONTROL_BASE =
  'w-full rounded-md border border-line bg-surface px-3 text-ink placeholder:text-ink-subtle transition-colors duration-150 hover:border-line-strong focus:outline-2 focus:-outline-offset-1 focus:outline-focus-ring aria-invalid:border-danger disabled:bg-surface-muted disabled:text-ink-muted'
export const CONTROL_CLASSES = {
  input: `${CONTROL_BASE} h-10 sm:h-9`,
  select: `${CONTROL_BASE} h-10 sm:h-9 pr-8`,
  textarea: `${CONTROL_BASE} min-h-24 py-2`,
}

export const BUTTON_BASE = `inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`
export const BUTTON_VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-muted',
  ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
  danger: 'bg-danger text-on-accent hover:bg-danger/90',
}
export const BUTTON_SIZES = {
  md: 'h-10 px-3.5 sm:h-9',
  icon: 'size-10 sm:size-8',
}

// Inline status select in table rows: tone background comes from STATUS_TONES via TONE_CLASSES.
export const STATUS_SELECT_BASE = `h-10 rounded-sm border border-transparent pl-2 pr-7 text-xs font-medium transition-colors duration-150 hover:border-line-strong focus:outline-2 focus:outline-focus-ring disabled:cursor-wait disabled:opacity-60 sm:h-7`
