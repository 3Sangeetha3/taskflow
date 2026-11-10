export default function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <section className="rounded-md border border-line bg-surface px-5 py-10 sm:px-8">
      {Icon && <Icon className="mb-3 size-5 text-ink-subtle" aria-hidden />}
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-prose text-ink-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </section>
  )
}
