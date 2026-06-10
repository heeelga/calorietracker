import { NavLink } from 'react-router-dom'
import { BookOpen, Search, UtensilsCrossed, BarChart2, User, ShieldCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'

const baseNavItems = [
  { to: '/diary', icon: BookOpen, label: 'Tagebuch' },
  { to: '/search', icon: Search, label: 'Suche' },
  { to: '/meals', icon: UtensilsCrossed, label: 'Gerichte' },
  { to: '/analytics', icon: BarChart2, label: 'Analyse' },
  { to: '/profile', icon: User, label: 'Profil' },
]

export default function BottomNav() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)

  const navItems = profile?.is_admin
    ? [...baseNavItems, { to: '/admin', icon: ShieldCheck, label: 'Admin' }]
    : baseNavItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 safe-area-bottom">
      <div className="flex items-stretch max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors ${
                isActive
                  ? 'text-green-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-green-500/10' : ''
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
