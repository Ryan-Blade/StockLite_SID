'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AIChatBot from '@/components/AIChatBot'
import { useAuth } from '@/context/AuthContext'
import { Eye, LogIn, ShieldAlert } from 'lucide-react'

const TITLES: Record<string, string> = {
  '/inventory': 'Inventory',
  '/stock': 'Stock In / Out',
  '/transfer': 'Transfer',
  '/history': 'History',
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { isReadOnly, user } = useAuth()

  return (
    <div className="app-shell relative">
      <Sidebar />
      <main className="main">
        {/* Read-Only Global Banner if Logged Out or in Viewer role */}
        {isReadOnly && (
          <div className="mb-4 px-4 py-2.5 rounded-sm bg-[#fef3c7] border border-[#f59e0b]/40 text-xs text-[#92400e] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">👁️</span>
              <span>
                <strong>Read-Only Mode:</strong> You can browse inventory and transaction logs. Sign in as Manager or Admin to execute mutations.
              </span>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1b1e1c] text-[#facc15] text-xs font-bold rounded-xs hover:bg-[#2a2e2a] transition-colors shrink-0 shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          </div>
        )}

        <div className="topbar">
          <Link href="/" className="back-link">
            <span aria-hidden="true">←</span> Back to home
          </Link>
          <span className="crumb">{TITLES[pathname] ?? ''}</span>
        </div>
        <div className="page-fade">{children}</div>

        {/* Global Floating AI Assistant */}
        <AIChatBot />
      </main>
    </div>
  )
}
