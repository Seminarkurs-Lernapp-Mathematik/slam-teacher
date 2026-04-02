import { Outlet, NavLink } from 'react-router-dom'
import { ClassSelector } from './ClassSelector'

const NAV_ITEMS = [
  { to: '/', label: 'Klassenraum', icon: '🏫', end: true },
  { to: '/monitor', label: 'Live Monitor', icon: '📡', end: false },
  { to: '/analytik', label: 'Analytik', icon: '📊', end: false },
  { to: '/schueler', label: 'Schüler', icon: '👤', end: false },
  { to: '/lernziele', label: 'Lernziele', icon: '🎯', end: false },
  { to: '/einstellungen', label: 'Einstellungen', icon: '⚙', end: false },
] as const

export function Layout() {
  return (
    <div className="flex min-h-screen bg-[#0d1117]">
      {/* Sidebar */}
      <aside className="w-56 flex-none bg-[#101828] border-r border-slate-800 flex flex-col">
        {/* Class selector */}
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Klasse</p>
          <ClassSelector />
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-white bg-blue-600/20 border-r-2 border-blue-500'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
