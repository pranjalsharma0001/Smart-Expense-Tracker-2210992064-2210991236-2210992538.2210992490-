import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client.js';
import { Loading } from '../components/Loading.jsx';
import { TrustBanner } from '../components/TrustBanner.jsx';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#eab308', '#64748b'];

function StatCard({ title, value, hint, accent }) {
  return (
    <div
      className={`animate-in rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 ${accent || ''}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [insights, setInsights] = useState([]);
  const [trust, setTrust] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [s, m, ins, t] = await Promise.all([
          api('/api/analytics/summary'),
          api('/api/analytics/monthly?months=8'),
          api('/api/insights'),
          api('/api/trust/status'),
        ]);
        if (!cancelled) {
          setSummary(s);
          setMonthly(m);
          setInsights(ins.insights || []);
          setTrust(t);
        }
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Loading label="Loading dashboard…" />;
  if (err) return <p className="text-red-600">{err}</p>;

  const pieData = Object.entries(summary?.byCategory || {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const fmt = (n) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n ?? 0);

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Overview of your expenses, income, and trends.
        </p>
      </div>

      <TrustBanner status={trust} loading={false} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total expense" value={fmt(summary?.totalExpense)} />
        <StatCard title="Total income" value={fmt(summary?.totalIncome)} />
        <StatCard
          title="Balance"
          value={fmt(summary?.balance)}
          hint="Income − expenses (all time)"
          accent="ring-1 ring-brand-500/20"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <h2 className="mb-4 text-lg font-semibold">Spending by category</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-slate-500">No expense data yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <h2 className="mb-4 text-lg font-semibold">Monthly expense trend</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-slate-500">No monthly data yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Smart insights</h2>
        <ul className="mt-4 space-y-3">
          {insights.slice(0, 5).length === 0 && (
            <li className="text-sm text-slate-500">Add more transactions to unlock insights.</li>
          )}
          {insights.slice(0, 5).map((ins, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-800/50"
            >
              <span
                className={
                  ins.severity === 'warning'
                    ? 'text-amber-600'
                    : ins.severity === 'critical'
                      ? 'text-red-600'
                      : 'text-brand-600'
                }
              >
                {ins.severity === 'warning' ? '⚠' : '•'}
              </span>
              <span>{ins.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
