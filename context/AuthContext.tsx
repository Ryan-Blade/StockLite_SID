'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { StaffUser, StaffRole } from '@/lib/types'

export interface DemoUser extends StaffUser {
  pin: string
  title?: string
  badgeColor?: string
}

export const DEMO_USERS: Record<string, DemoUser> = {
  'viewer-01': {
    id: 'viewer-01',
    name: 'Jordan Ruiz',
    role: 'viewer',
    pin: '1234',
    title: 'Operations Analyst (Read-Only)',
    badgeColor: '#4b6357',
  },
  'manager-north': {
    id: 'manager-north',
    name: 'Alex Rivera',
    role: 'manager',
    assignedWarehouseId: 'wh-north',
    pin: '1234',
    title: 'North Hub Warehouse Manager',
    badgeColor: '#ca8a04',
  },
  'manager-south': {
    id: 'manager-south',
    name: 'Elena Vance',
    role: 'manager',
    assignedWarehouseId: 'wh-south',
    pin: '1234',
    title: 'South Hub Warehouse Manager',
    badgeColor: '#2563eb',
  },
  'admin-01': {
    id: 'admin-01',
    name: 'Marcus Sterling',
    role: 'admin',
    pin: '1234',
    title: 'Logistics Director (Global Admin)',
    badgeColor: '#8b4a3f',
  },
}

interface AuthContextType {
  user: StaffUser | null
  isAuthenticated: boolean
  isReadOnly: boolean
  isViewer: boolean
  isManager: boolean
  isAdmin: boolean
  canEditWarehouse: (warehouseId?: string) => boolean
  canAddWarehouse: boolean
  canTransfer: (sourceWarehouseId?: string) => boolean
  login: (
    id: string,
    pin: string,
    roleOverride?: StaffRole,
    assignedWarehouseId?: string,
    nameOverride?: string
  ) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'stocklite_auth_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as StaffUser
        if (parsed && parsed.id && parsed.name) {
          setUser(parsed)
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const login = useCallback(
    async (
      id: string,
      pin: string,
      roleOverride?: StaffRole,
      assignedWarehouseId?: string,
      nameOverride?: string
    ): Promise<boolean> => {
      const trimmedId = id.trim().toLowerCase()
      const trimmedPin = pin.trim()

      // Validate against demo users
      const matchedDemo = DEMO_USERS[trimmedId]
      if (matchedDemo) {
        if (matchedDemo.pin === trimmedPin || trimmedPin === '1234' || trimmedPin === '0000') {
          const staff: StaffUser = {
            id: matchedDemo.id,
            name: matchedDemo.name,
            role: roleOverride || matchedDemo.role,
            assignedWarehouseId: assignedWarehouseId || matchedDemo.assignedWarehouseId,
          }
          setUser(staff)
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(staff))
          } catch {}
          return true
        }
        return false
      }

      // Custom staff credentials fallback
      if (trimmedId.length > 0 && trimmedPin.length >= 4) {
        const formattedName =
          nameOverride?.trim() ||
          trimmedId
            .split(/[-_]/)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ')

        const resolvedRole: StaffRole = roleOverride || (trimmedId.includes('admin') ? 'admin' : trimmedId.includes('manager') ? 'manager' : 'viewer')

        const staff: StaffUser = {
          id: trimmedId,
          name: formattedName,
          role: resolvedRole,
          assignedWarehouseId: assignedWarehouseId,
        }
        setUser(staff)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(staff))
        } catch {}
        return true
      }

      return false
    },
    []
  )

  const logout = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  const isAuthenticated = Boolean(user)
  const isAdmin = Boolean(user && user.role === 'admin')
  const isManager = Boolean(user && user.role === 'manager')
  const isViewer = Boolean(!user || user.role === 'viewer')
  const isReadOnly = !isAuthenticated || isViewer

  const canEditWarehouse = useCallback(
    (warehouseId?: string): boolean => {
      if (!user) return false
      if (user.role === 'admin') return true
      if (user.role === 'manager') {
        if (!warehouseId) return true
        return user.assignedWarehouseId === warehouseId
      }
      return false
    },
    [user]
  )

  const canAddWarehouse = Boolean(user && user.role === 'admin')

  const canTransfer = useCallback(
    (sourceWarehouseId?: string): boolean => {
      if (!user) return false
      if (user.role === 'admin') return true
      if (user.role === 'manager') {
        if (!sourceWarehouseId) return true
        return user.assignedWarehouseId === sourceWarehouseId
      }
      return false
    },
    [user]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isReadOnly,
        isViewer,
        isManager,
        isAdmin,
        canEditWarehouse,
        canAddWarehouse,
        canTransfer,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
