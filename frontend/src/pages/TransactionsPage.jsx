import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { Loading } from '../components/Loading.jsx';

const CATEGORIES = ['Food', 'Travel', 'Bills', 'Entertainment', 'Shopping'];

export function TransactionsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    category: '',
    type: '',
    q: '',
  });

  const [form, setForm] = useState({
    amount: '',
    type: 'expense',
    category: 'Food',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Card',
    description: '',
  });

  const [mockLines, setMockLines] = useState(
    '[{"amount":24.5,"text":"Starbucks coffee","date":"' +
      new Date().toISOString().slice(0, 10) +
      '"}]'
  );
  const [mockBusy, setMockBusy] = useState(false);

  /** Cancels stale list fetches so an older response cannot overwrite a newer one (fixes “disappearing” rows). */
  const loadAbortRef = useRef(null);
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    loadAbortRef.current?.abort();
    const ac = new AbortController();
    loadAbortRef.current = ac;
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.category) params.set('category', filters.category);
      if (filters.type) params.set('type', filters.type);
      if (filters.q) params.set('q', filters.q);
      const q = params.toString();
      const data = await api('/api/transactions' + (q ? `?${q}` : ''), { signal: ac.signal });
      if (seq !== loadSeqRef.current) return;
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e.name === 'AbortError') return;
      if (seq !== loadSeqRef.current) return;
      setError(e.message);
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
    return () => loadAbortRef.current?.abort();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(form.amount),
          type: form.type,
          category: form.type === 'expense' ? form.category : form.category.trim() || 'Income',
          date: new Date(form.date).toISOString(),
          paymentMethod: form.paymentMethod,
          description: form.description,
        }),
      });
      setForm((f) => ({ ...f, amount: '', description: '' }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    await api(`/api/transactions/${id}`, { method: 'DELETE' });
    await load();
  };

  const exportCsv = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/transactions/export.csv', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError('Export failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runMock = async () => {
    setMockBusy(true);
    setError('');
    try {
      const lines = JSON.parse(mockLines);
      await api('/api/mock/ingest', {
        method: 'POST',
        body: JSON.stringify({ lines, source: 'bank' }),
      });
      await load();
    } catch (e) {
      setError(e.message || 'Invalid JSON or request failed');
    } finally {
      setMockBusy(false);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n ?? 0);

  const hasActiveFilters = Boolean(
    filters.from || filters.to || filters.category || filters.type || filters.q
  );

  const clearFilters = () =>
    setFilters({ from: '', to: '', category: '', type: '', q: '' });

  return (
    <div className="space-y-10 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Add entries, filter, and export CSV.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          Export CSV
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="font-semibold">New entry</h2>
          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Type
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value;
                  setForm((f) => ({
                    ...f,
                    type,
                    category: type === 'expense' ? 'Food' : 'Income',
                  }));
                }}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label className="text-sm">
              Amount
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>
            {form.type === 'expense' ? (
              <label className="text-sm">
                Category
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="text-sm">
                Income label
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Salary, freelance…"
                />
              </label>
            )}
            <label className="text-sm">
              Date
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Payment method
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Description
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Uber lunch — auto-categorizes if category empty"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Save transaction
          </button>
        </form>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="font-semibold">Simulated bank / SMS import</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            POST JSON array of <code className="text-xs">amount</code>,{' '}
            <code className="text-xs">text</code>, optional <code className="text-xs">date</code>.
            Keywords auto-categorize expenses.
          </p>
          <textarea
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs dark:border-slate-600 dark:bg-slate-950"
            rows={8}
            value={mockLines}
            onChange={(e) => setMockLines(e.target.value)}
          />
          <button
            type="button"
            disabled={mockBusy}
            onClick={runMock}
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-brand-700 dark:hover:bg-brand-600"
          >
            {mockBusy ? 'Importing…' : 'Run mock import'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">Filters</h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Clear filters
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Only rows matching the filters below are shown. Clear filters to see all transactions.
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">All types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            placeholder="Search…"
            className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </div>
      </div>

      {loading ? (
        <Loading label="Loading transactions…" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((t) => (
                <tr key={t._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                    {new Date(t.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 capitalize">{t.type}</td>
                  <td className="px-4 py-3">{t.category || '—'}</td>
                  <td
                    className={`px-4 py-3 text-right font-medium tabular-nums ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '−'}
                    {fmt(t.amount)}
                  </td>
                  <td className="px-4 py-3 capitalize">{t.paymentMethod}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600 dark:text-slate-400">
                    {t.description}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => remove(t._id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
