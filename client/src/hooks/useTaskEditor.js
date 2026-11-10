import { useState } from 'react'

// Which task (if any) the create/edit dialog is showing. task === null means "create".
export function useTaskEditor() {
  const [state, setState] = useState({ open: false, task: null })
  return {
    ...state,
    openCreate: () => setState({ open: true, task: null }),
    openEdit: (task) => setState({ open: true, task }),
    close: () => setState((prev) => ({ ...prev, open: false })),
  }
}
