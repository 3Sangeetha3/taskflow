import { STATUS_OPTIONS } from '../../constants/options'
import { TEXT } from '../../constants/messages'
import { STATUS_SELECT_BASE, STATUS_TONES, TONE_CLASSES } from '../../constants/ui'
import { useUpdateTaskStatus } from '../../hooks/useTaskMutations'
import { useTaskErrorToast } from '../../hooks/useTaskErrorToast'
import { cx } from '../../utils/cx'

// Inline PATCH. Shows the requested value while saving (select disabled); on failure it falls back
// to the server value (revert) and toasts.
export default function StatusSelect({ task }) {
  const mutation = useUpdateTaskStatus()
  const onError = useTaskErrorToast()
  const value = mutation.isPending ? mutation.variables.status : task.status

  return (
    <select
      aria-label={TEXT.statusFor(task.title)}
      value={value}
      disabled={mutation.isPending}
      onChange={(event) => mutation.mutate({ id: task.id, status: event.target.value }, { onError })}
      className={cx(STATUS_SELECT_BASE, TONE_CLASSES[STATUS_TONES[value]])}
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
