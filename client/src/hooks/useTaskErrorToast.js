import { ERROR_KINDS } from '../constants/app'
import { TOASTS } from '../constants/messages'
import { useToast } from '../components/ui/toastContext'
import { useInvalidateTasks } from './useTaskMutations'

// Shared handling for row-level failures: a vanished task (404) refetches the list.
export function useTaskErrorToast() {
  const toast = useToast()
  const invalidate = useInvalidateTasks()
  return (error) => {
    if (error.kind === ERROR_KINDS.NOT_FOUND) {
      toast.error(TOASTS.TASK_GONE)
      invalidate()
      return
    }
    toast.error(error.message)
  }
}
