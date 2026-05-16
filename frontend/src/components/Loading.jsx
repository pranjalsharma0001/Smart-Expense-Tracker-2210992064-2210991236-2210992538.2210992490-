export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500 dark:text-slate-400">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
        aria-hidden
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
