'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { LogIn, LogOut, Eye } from 'lucide-react'

const links = [
  { href: '/inventory', label: 'Inventory' },
  { href: '/stock', label: 'Stock In / Out' },
  { href: '/transfer', label: 'Transfer' },
  { href: '/history', label: 'History' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <nav className="sidebar">
      <Link href="/" className="sidebar-brand">
        StockLite <span>WMS</span>
      </Link>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
        >
          {link.label}
        </Link>
      ))}
      <div className="sidebar-footer">
        {isAuthenticated && user ? (
          <div>
            <span className="signed-in-label">Signed in as</span>{' '}
            <strong>{user.name}</strong>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#d8d2c2]">
              <Link
                href="/login"
                className="text-xs text-[#6b6f68] hover:text-[#1b1e1c]"
              >
                Switch user
              </Link>
              <button
                type="button"
                onClick={logout}
                className="text-xs text-[#8b4a3f] hover:text-[#b91c1c] font-medium flex items-center gap-1"
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
              <span>Read-Only Mode</span>
            </div>
            <Link
              href="/login"
              className="btn btn-primary text-xs w-full py-1.5 flex items-center justify-center gap-1.5 font-bold"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
