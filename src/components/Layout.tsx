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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-none bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Class selector */}
        <div className="p-4 border-b border-sidebar-border">
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
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-md mx-2 mb-1 ${
                  isActive
                    ? 'text-sidebar-accent-foreground bg-sidebar-accent font-medium'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
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
