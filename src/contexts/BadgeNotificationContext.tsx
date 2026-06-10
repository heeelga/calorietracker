import { createContext, useContext, useState, useCallback } from 'react'
import type { BadgeDefinition } from '../hooks/useRewards'
import BadgeNotification from '../components/BadgeNotification'

interface BadgeContextType {
  showBadge: (badge: BadgeDefinition) => void
}
const BadgeContext = createContext<BadgeContextType>({ showBadge: () => {} })
export const useBadgeNotification = () => useContext(BadgeContext)

export function BadgeNotificationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<BadgeDefinition[]>([])
  const current = queue[0] ?? null

  const showBadge = useCallback((badge: BadgeDefinition) => {
    setQueue((q) => [...q, badge])
  }, [])

  const handleClose = () => {
    setQueue((q) => q.slice(1))
  }

  return (
    <BadgeContext.Provider value={{ showBadge }}>
      {children}
      <BadgeNotification badge={current} onClose={handleClose} />
    </BadgeContext.Provider>
  )
}
