import AppHeader from './components/AppHeader'
import TaskList from './components/tasks/TaskList'
import TaskFormModal from './components/tasks/TaskFormModal'
import { useTaskEditor } from './hooks/useTaskEditor'

// Composition only: header, list, and the create/edit dialog share one editor state.
export default function App() {
  const editor = useTaskEditor()
  return (
    <div className="min-h-dvh">
      <AppHeader onNewTask={editor.openCreate} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <TaskList onCreate={editor.openCreate} onEdit={editor.openEdit} />
      </main>
      <TaskFormModal editor={editor} />
    </div>
  )
}
