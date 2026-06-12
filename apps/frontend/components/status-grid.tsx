const items = [
  ["Provider", "OpenAI-compatible"],
  ["Streaming", "SSE preferred"],
  ["Memory", "3 layers"],
  ["Storage", "Postgres + Qdrant"]
];

export function StatusGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border border-border bg-white p-4">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-sm font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}
