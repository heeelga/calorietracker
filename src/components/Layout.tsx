import type { ReactNode } from 'react'
import BottomNav from './BottomNav'

interface LayoutProps {
  children: ReactNode
  title?: string
  showNav?: boolean
}

export default function Layout({ children, title, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-dvh bg-slate-900 text-slate-100 flex flex-col max-w-lg mx-auto">
      {title && (
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 pt-safe-top">
          <h1 className="text-lg font-bold text-slate-100">{title}</h1>
        </header>
      )}
      <main className={`flex-1 overflow-y-auto ${showNav ? 'pb-nav' : ''} ${!title ? 'pt-safe-top' : ''}`}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  )
}
