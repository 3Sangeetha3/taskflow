import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../constants/app'
import { taskApi } from '../services/api'

const TASKS_KEY = { queryKey: [QUERY_KEYS.TASKS] }

export const useInvalidateTasks = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries(TASKS_KEY)
}

// One hook per mutation so each row/dialog gets its own pending state.
export const useCreateTask = () => {
  const invalidate = useInvalidateTasks()
  return useMutation({ mutationFn: (values) => taskApi.create(values), onSuccess: invalidate })
}

export const useUpdateTask = () => {
  const invalidate = useInvalidateTasks()
  return useMutation({ mutationFn: ({ id, values }) => taskApi.update(id, values), onSuccess: invalidate })
}

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => taskApi.updateStatus(id, status),
    onSuccess: (task) => {
      // Write the saved task into cached pages so the row doesn't flash its old value before refetch.
      queryClient.setQueriesData(TASKS_KEY, (old) =>
        old ? { ...old, items: old.items.map((item) => (item.id === task.id ? task : item)) } : old,
      )
      return queryClient.invalidateQueries(TASKS_KEY)
    },
  })
}

export const useDeleteTask = () => {
  const invalidate = useInvalidateTasks()
  return useMutation({ mutationFn: (id) => taskApi.remove(id), onSuccess: invalidate })
}
