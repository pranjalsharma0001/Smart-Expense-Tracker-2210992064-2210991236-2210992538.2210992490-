/**
 * Surfaces data-trust / “erosion of trust” warnings from the API.
 */
export function TrustBanner({ status, loading }) {
  if (loading) return null;
  if (!status) return null;

  if (status.healthy) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
        <span className="font-semibold">Data trust:</span> No consistency issues detected. Totals
        should align with your entries.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/50">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
        Data trust warning — review the following
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-900/90 dark:text-amber-100/90">
        {status.warnings?.map((w) => (
          <li key={w.code}>{w.message}</li>
        ))}
      </ul>
    </div>
  );
}
