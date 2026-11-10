import { ListTodo, Plus } from 'lucide-react'
import Button from './ui/Button'
import { APP_NAME } from '../constants/app'
import { LABELS } from '../constants/messages'

export default function AppHeader({ onNewTask }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <h1 className="flex items-center gap-2 text-base font-semibold text-ink">
          <ListTodo className="size-5 text-accent" aria-hidden />
          {APP_NAME}
        </h1>
        <Button variant="primary" icon={Plus} onClick={onNewTask}>
          {LABELS.NEW_TASK}
        </Button>
      </div>
    </header>
  )
}
