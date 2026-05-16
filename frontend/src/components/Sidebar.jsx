import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', icon: '◆' },
  { to: '/transactions', label: 'Transactions', icon: '≡' },
  { to: '/budgets', label: 'Budgets', icon: '◎' },
  { to: '/insights', label: 'Insights', icon: '✦' },
];

export function Sidebar({ open, onClose }) {
  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      <div className="mb-6 px-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Menu
        </p>
      </div>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          onClick={() => onClose?.()}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
            ].join(' ')
          }
        >
          <span className="opacity-80">{l.icon}</span>
          {l.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex md:flex-col">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
              ₹
            </div>
            <div>
              <p className="text-sm font-semibold">Smart Expense</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tracker</p>
            </div>
          </div>
        </div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={onClose}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
              <p className="font-semibold">Menu</p>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
