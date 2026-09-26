'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CrowdCanvas } from '@/components/ui/skiper39'
import AIChatBot from '@/components/AIChatBot'
import {
  Boxes,
  ArrowRightLeft,
  History,
  PackagePlus,
  ShieldCheck,
  Zap,
  TrendingUp,
  Warehouse,
  ArrowRight,
  Sparkles,
  Activity,
} from 'lucide-react'

function RedactionTypewriter({
  text = 'Smart and Efficient management, Zero Noise',
  typingSpeed = 65,
  deletingSpeed = 35,
  pauseTime = 2200,
  emptyPauseTime = 450,
}: {
  text?: string
  typingSpeed?: number
  deletingSpeed?: number
  pauseTime?: number
  emptyPauseTime?: number
}) {
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (!isDeleting) {
      if (displayText.length < text.length) {
        timer = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length + 1))
        }, typingSpeed)
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true)
        }, pauseTime)
      }
    } else {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length - 1))
        }, deletingSpeed)
      } else {
        timer = setTimeout(() => {
          setIsDeleting(false)
        }, emptyPauseTime)
      }
    }

    return () => clearTimeout(timer)
  }, [displayText, isDeleting, text, typingSpeed, deletingSpeed, pauseTime, emptyPauseTime])

  return (
    <span className="inline-flex items-center flex-wrap justify-center text-center">
      <span className="font-display font-bold tracking-tight text-[#1b1e1c] drop-shadow-xs">
        {displayText}
      </span>
      <span className="inline-block w-[3px] h-[1.1em] ml-1.5 bg-[#eab308] animate-pulse align-middle shadow-[0_0_8px_#eab308]" />
    </span>
  )
}

const QUICK_ACTIONS = [
  {
    href: '/inventory',
    title: 'Live Inventory Grid',
    description: 'Multi-warehouse SKU tracking with low-stock replenishment filters.',
    icon: <Boxes className="w-5 h-5 text-[#ca8a04]" />,
    badge: 'Real-time',
    iconBg: 'bg-[#fef08a]',
    borderHover: 'hover:border-[#ca8a04]',
    textAccent: 'text-[#ca8a04]',
  },
  {
    href: '/stock',
    title: 'Stock In & Out',
    description: 'Guaranteed zero-negative inventory mutation with automatic transaction logging.',
    icon: <PackagePlus className="w-5 h-5 text-[#4b6357]" />,
    badge: 'Atomic Ops',
    iconBg: 'bg-[#4b6357]/15',
    borderHover: 'hover:border-[#4b6357]',
    textAccent: 'text-[#4b6357]',
  },
  {
    href: '/transfer',
    title: 'Cross-Site Transfers',
    description: 'Safe dual-warehouse movements with linked paired transaction records.',
    icon: <ArrowRightLeft className="w-5 h-5 text-[#a67c3d]" />,
    badge: 'Dual-Linked',
    iconBg: 'bg-[#a67c3d]/15',
    borderHover: 'hover:border-[#a67c3d]',
    textAccent: 'text-[#a67c3d]',
  },
  {
    href: '/history',
    title: 'Audit & Transaction Log',
    description: 'Full chronological audit trail filterable by operation type and site.',
    icon: <History className="w-5 h-5 text-[#6b6f68]" />,
    badge: 'Complete Trail',
    iconBg: 'bg-[#6b6f68]/15',
    borderHover: 'hover:border-[#1b1e1c]',
    textAccent: 'text-[#1b1e1c]',
  },
]

const INVARIANTS = [
  {
    title: 'Zero Negative Inventory',
    description: 'Stock Out operations strictly validate against on-hand quantity before committing state.',
    icon: <ShieldCheck className="w-5 h-5 text-[#4b6357]" />,
  },
  {
    title: 'Atomic Cross-Hub Transfers',
    description: 'Deductions and additions execute all-or-nothing with paired transaction linkages.',
    icon: <Zap className="w-5 h-5 text-[#ca8a04]" />,
  },
  {
    title: 'Strict Low-Stock Alerts',
    description: 'Deterministic replenishment triggers when on-hand stock ≤ threshold point.',
    icon: <TrendingUp className="w-5 h-5 text-[#8b4a3f]" />,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#eee9dc] text-[#1b1e1c] selection:bg-[#eab308] selection:text-[#1b1e1c] relative overflow-hidden">
      {/* ========================================================================= */}
      {/* AMBIENT CROWD CANVAS BACKGROUND LAYER */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center opacity-20">
        <CrowdCanvas
          src="https://cdn.21st.dev/assets/localized/abdb8990a7bef8c2f5af3e45f0a3c969c4b0603fba8be92e81347de4ea4e1ed7.png"
          rows={15}
          cols={7}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Radial vignette for industrial paper depth */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#eee9dc]/50 to-[#eee9dc]/90" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-[#d8d2c2] bg-[#fbfaf6]/90 backdrop-blur-md px-6 md:px-12 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-[#1b1e1c] text-[#facc15] font-display font-bold text-sm flex items-center justify-center shadow-xs">
            SL
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg text-[#1b1e1c] leading-none">StockLite</span>
            <span className="text-[11px] text-[#6b6f68] font-medium tracking-wide">Warehouse Control Plane</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#6b6f68]">
          <Link href="/inventory" className="hover:text-[#ca8a04] transition-colors">
            Inventory
          </Link>
          <Link href="/stock" className="hover:text-[#4b6357] transition-colors">
            Stock In/Out
          </Link>
          <Link href="/transfer" className="hover:text-[#a67c3d] transition-colors">
            Transfers
          </Link>
          <Link href="/history" className="hover:text-[#1b1e1c] transition-colors">
            Audit History
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#4b6357] font-semibold px-3 py-1 rounded-full bg-[#fbfaf6] border border-[#d8d2c2] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#4b6357] animate-pulse shadow-[0_0_6px_#4b6357]" />
            <span>North & South Hubs Online</span>
          </div>

          <Link
            href="/inventory"
            className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-xs font-bold"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Dashboard Hero & Content (Above Crowd Layer) */}
      <main className="relative z-10 flex-1 px-6 md:px-12 py-10 md:py-16 max-w-7xl mx-auto w-full space-y-12">
        {/* ========================================================================= */}
        {/* HERO WITH DISAPPEARING / REDACTING TEXT */}
        {/* ========================================================================= */}
        <section className="text-center max-w-4xl mx-auto space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fbfaf6]/90 backdrop-blur-md border border-[#d8d2c2] text-xs font-semibold text-[#ca8a04] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#eab308]" />
            <span>StockLite Inventory Control Plane</span>
          </div>

          {/* Looping Disappearing / Redaction Text Headline */}
          <div className="min-h-[110px] sm:min-h-[130px] flex items-center justify-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.12]">
              <RedactionTypewriter
                text="Smart and Efficient management, Zero Noise"
                typingSpeed={60}
                deletingSpeed={30}
                pauseTime={2200}
                emptyPauseTime={400}
              />
            </h1>
          </div>

          <p className="text-base sm:text-lg text-[#6b6f68] max-w-2xl mx-auto leading-relaxed font-normal">
            Deterministic stock balances across North Distribution Center and South Fulfillment Hub. 
            Zero negative inventory, atomic paired transfers, and full audit traceability.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/inventory" className="btn btn-primary text-sm px-6 py-3 shadow-md flex items-center gap-2 font-bold">
              <Boxes className="w-4 h-4" />
              <span>Open Inventory Dashboard</span>
            </Link>
            <Link href="/transfer" className="btn btn-secondary text-sm px-6 py-3 flex items-center gap-2 font-semibold">
              <ArrowRightLeft className="w-4 h-4" />
              <span>Initiate Transfer</span>
            </Link>
            <Link href="/login" className="text-xs text-[#6b6f68] hover:text-[#1b1e1c] font-semibold px-3 py-3 transition-colors">
              Staff Portal →
            </Link>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* OPERATIONAL MODULE CARDS */}
        {/* ========================================================================= */}
        <section className="pt-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-bold text-[#1b1e1c]">Core Operations</h2>
              <p className="text-xs sm:text-sm text-[#6b6f68]">Real-time floor actions with instant audit logging</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6b6f68] font-medium bg-[#fbfaf6] px-2.5 py-1 rounded border border-[#d8d2c2] shadow-xs">
              <Activity className="w-3.5 h-3.5 text-[#4b6357]" />
              <span>2 Warehouses Synced</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`group relative bg-[#fbfaf6] border border-[#d8d2c2] ${action.borderHover} rounded-md p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`w-10 h-10 rounded-md ${action.iconBg} flex items-center justify-center transition-colors shadow-xs`}>
                      {action.icon}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#eee9dc] text-[#6b6f68] border border-[#d8d2c2]">
                      {action.badge}
                    </span>
                  </div>
                  <h3 className={`font-display font-bold text-base text-[#1b1e1c] mb-1 group-hover:${action.textAccent} transition-colors`}>
                    {action.title}
                  </h3>
                  <p className="text-xs text-[#6b6f68] leading-relaxed">
                    {action.description}
                  </p>
                </div>
                <div className={`mt-5 pt-3 border-t border-[#e2ddce] flex items-center justify-between text-xs font-semibold ${action.textAccent} group-hover:translate-x-0.5 transition-transform`}>
                  <span>Launch module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ARCHITECTURAL GUARANTEES & INVARIANTS */}
        {/* ========================================================================= */}
        <section className="bg-[#fbfaf6] border border-[#d8d2c2] rounded-md p-6 md:p-8 shadow-xs">
          <h3 className="font-display font-bold text-base text-[#1b1e1c] mb-4">
            Architectural Guarantees
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {INVARIANTS.map((inv, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="p-2.5 rounded-md bg-[#eee9dc] border border-[#d8d2c2] shrink-0">
                  {inv.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-sm text-[#1b1e1c]">{inv.title}</h4>
                  <p className="text-xs text-[#6b6f68] leading-relaxed">{inv.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#d8d2c2] bg-[#fbfaf6]/90 backdrop-blur-md px-6 md:px-12 py-6 text-xs text-[#6b6f68] flex flex-col sm:flex-row items-center justify-between gap-4 mt-12">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#1b1e1c]">StockLite</span>
          <span>•</span>
          <span>North Distribution Center & South Fulfillment Hub</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/inventory" className="hover:text-[#ca8a04] transition-colors">Inventory</Link>
          <Link href="/stock" className="hover:text-[#4b6357] transition-colors">Stock Ops</Link>
          <Link href="/transfer" className="hover:text-[#a67c3d] transition-colors">Transfers</Link>
          <Link href="/history" className="hover:text-[#1b1e1c] transition-colors">History</Link>
        </div>
      </footer>

      {/* Floating AI Assistant */}
      <AIChatBot />
    </div>
  )
}
