export function Panel({
  title,
  children,
  action
}: Readonly<{ title: string; children: React.ReactNode; action?: React.ReactNode }>) {
  return (
    <section className="rounded-md border border-border bg-white">
      <header className="flex min-h-12 items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
