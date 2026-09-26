'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { LogIn, LogOut, User, Eye, Shield } from 'lucide-react'

export function IconInventory() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9h18M9 4v16" />
    </svg>
  )
}

export function IconStock() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18M6 8l6-5 6 5M6 16l6 5 6-5" />
    </svg>
  )
}

export function IconTransfer() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8h13M13 4l4 4-4 4M20 16H7M11 12l-4 4 4 4" />
    </svg>
  )
}

export function IconHistory() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/inventory', label: 'Inventory', icon: <IconInventory /> },
  { href: '/stock', label: 'Stock In / Out', icon: <IconStock /> },
  { href: '/transfer', label: 'Transfer', icon: <IconTransfer /> },
  { href: '/history', label: 'History', icon: <IconHistory /> },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">SL</div>
        <div className="sidebar-brand-text">
          StockLite
          <span>Warehouse Inventory</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        {isAuthenticated && user ? (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-[#1b1e1c] text-[#facc15] text-[11px] font-bold flex items-center justify-center shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#1b1e1c] truncate">{user.name}</div>
                <div className="flex items-center gap-1">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#ca8a04]">
                    {user.role}
                  </span>
                  {user.assignedWarehouseId && (
                    <span className="text-[9px] text-[#6b6f68] font-mono">
                      ({user.assignedWarehouseId})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#d8d2c2]">
              <Link
                href="/login"
                className="text-[11px] text-[#6b6f68] hover:text-[#1b1e1c] transition-colors"
              >
                Switch Role
              </Link>
              <button
                type="button"
                onClick={logout}
                className="text-[11px] font-medium text-[#8b4a3f] hover:text-[#b91c1c] transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#78521a] font-semibold mb-2">
              <Eye className="w-3.5 h-3.5 text-[#ca8a04]" />
              <span>Read-Only Guest</span>
            </div>
            <Link
              href="/login"
              className="btn btn-primary text-xs w-full py-1.5 flex items-center justify-center gap-1.5 shadow-xs font-bold"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
