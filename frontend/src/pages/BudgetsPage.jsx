import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Loading } from '../components/Loading.jsx';

function periodNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function BudgetsPage() {
  const [period, setPeriod] = useState(periodNow());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(`/api/budgets?period=${encodeURIComponent(period)}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const saveLimit = async (category, limit) => {
    setSaving(category);
    setErr('');
    try {
      await api('/api/budgets', {
        method: 'PUT',
        body: JSON.stringify({ category, limit: Number(limit), period }),
      });
      const d = await api(`/api/budgets?period=${encodeURIComponent(period)}`);
      setData(d);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading && !data) return <Loading />;

  const fmt = (n) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n ?? 0);

  return (
    <div className="max-w-4xl space-y-8 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Set monthly limits per category and track spending vs budget.
          </p>
        </div>
        <label className="text-sm">
          Budget period (YYYY-MM)
          <input
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            pattern="\d{4}-\d{2}"
          />
        </label>
      </div>

      {err && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </div>
      )}

      {data?.alerts?.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-900 dark:text-amber-100">Budget alerts</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-900/90 dark:text-amber-100/90">
            {data.alerts.map((a, i) => (
              <li key={i}>{a.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {data?.rows?.map((row) => (
          <BudgetRow
            key={row.category}
            row={row}
            saving={saving === row.category}
            onSave={saveLimit}
            fmt={fmt}
          />
        ))}
      </div>
    </div>
  );
}

function BudgetRow({ row, onSave, fmt, saving }) {
  const [limit, setLimit] = useState(row.limit || '');

  useEffect(() => {
    setLimit(row.limit || '');
  }, [row.limit, row.category]);

  const pct =
    row.limit > 0 ? Math.min(100, Math.round((row.spent / row.limit) * 100)) : 0;
  const barColor =
    row.status === 'over'
      ? 'bg-red-500'
      : row.status === 'near'
        ? 'bg-amber-500'
        : 'bg-brand-500';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{row.category}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Spent {fmt(row.spent)}
            {row.limit > 0 && (
              <>
                {' '}
                of {fmt(row.limit)}
                {row.remaining != null && (
                  <span className="text-slate-500 dark:text-slate-500">
                    {' '}
                    ({row.remaining >= 0 ? 'left' : 'over'} {fmt(Math.abs(row.remaining))})
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(row.category, limit);
          }}
        >
          <label className="text-sm">
            Monthly limit
            <input
              type="number"
              min="0"
              step="0.01"
              className="ml-2 w-32 rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-950"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
      {row.limit > 0 && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
