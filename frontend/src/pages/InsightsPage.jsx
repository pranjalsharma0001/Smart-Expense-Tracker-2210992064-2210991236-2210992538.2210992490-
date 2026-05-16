import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Loading } from '../components/Loading.jsx';

export function InsightsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/insights')
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (err) return <p className="text-red-600">{err}</p>;

  const fmt = (n) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n ?? 0);

  return (
    <div className="max-w-3xl space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Rule-based analysis of your spending vs last month.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase text-slate-500">This month</p>
          <p className="mt-1 text-lg font-semibold">
            Expense {fmt(data.totals?.thisMonth?.totalExpense)}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Income {fmt(data.totals?.thisMonth?.totalIncome)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase text-slate-500">Last month</p>
          <p className="mt-1 text-lg font-semibold">
            Expense {fmt(data.totals?.lastMonth?.totalExpense)}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Income {fmt(data.totals?.lastMonth?.totalIncome)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">Messages</h2>
        <ul className="space-y-2">
          {(data.insights || []).map((ins, i) => (
            <li
              key={i}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {ins.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
