'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, DEMO_USERS } from '@/context/AuthContext'
import { StaffRole } from '@/lib/types'
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Building2,
  Shield,
  Layers,
  SlidersHorizontal,
} from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || '/inventory'
  const { login } = useAuth()

  const [staffId, setStaffId] = useState('admin-01')
  const [pin, setPin] = useState('1234')
  const [role, setRole] = useState<StaffRole>('admin')
  const [assignedWarehouseId, setAssignedWarehouseId] = useState<string>('wh-north')
  const [staffName, setStaffName] = useState('Marcus Sterling')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleLogin = async (
    idToUse = staffId,
    pinToUse = pin,
    roleToUse = role,
    whToUse = assignedWarehouseId,
    nameToUse = staffName
  ) => {
    setError('')
    if (!idToUse.trim()) {
      setError('Please enter a Staff ID.')
      return
    }
    if (!pinToUse.trim()) {
      setError('Please enter your 4-digit PIN.')
      return
    }

    setLoading(true)
    try {
      const ok = await login(
        idToUse,
        pinToUse,
        roleToUse,
        roleToUse === 'manager' ? whToUse : undefined,
        nameToUse
      )
      if (ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push(returnUrl)
        }, 600)
      } else {
        setError('Invalid Staff ID or PIN. (Hint: Use PIN 1234 for demo accounts)')
      }
    } catch {
      setError('An unexpected error occurred during sign-in.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemo = (demoKey: string) => {
    const demo = DEMO_USERS[demoKey]
    if (demo) {
      setStaffId(demo.id)
      setPin(demo.pin)
      setRole(demo.role as StaffRole)
      setAssignedWarehouseId(demo.assignedWarehouseId || 'wh-north')
      setStaffName(demo.name)
      setIsCustomMode(false)
      handleLogin(demo.id, demo.pin, demo.role as StaffRole, demo.assignedWarehouseId, demo.name)
    }
  }

  return (
    <div className="relative z-10 w-full max-w-md">
      {/* Top Back Home Link */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6b6f68] hover:text-[#1b1e1c] transition-colors bg-[#fbfaf6] px-2.5 py-1.5 rounded-sm border border-[#d8d2c2] shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <span className="text-[11px] font-mono text-[#6b6f68]">Role Gate v3.0</span>
      </div>

      {/* Main Sign-In Card */}
      <div className="bg-[#fbfaf6] border border-[#d8d2c2] rounded-md shadow-xl p-6 sm:p-8">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#e2ddce]">
          <div className="w-10 h-10 rounded-sm bg-[#1b1e1c] text-[#facc15] font-display font-bold text-base flex items-center justify-center shadow-xs">
            SL
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-[#1b1e1c] leading-tight flex items-center gap-2">
              <span>StockLite Terminal Access</span>
            </h1>
            <p className="text-xs text-[#6b6f68]">
              Role-authenticated portal for logistics directors, managers, and viewers
            </p>
          </div>
        </div>

        {/* 1-Click Quick Demo Profiles Switchers */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#6b6f68] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#ca8a04]" />
              <span>1-Click Role Profiles</span>
            </span>
            <span className="text-[10px] text-[#6b6f68] font-mono">PIN: 1234</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.values(DEMO_USERS).map((demo) => {
              const isSelected = staffId === demo.id
              const roleBadge =
                demo.role === 'admin'
                  ? 'Admin'
                  : demo.role === 'manager'
                  ? 'Manager'
                  : 'Viewer'

              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleQuickDemo(demo.id)}
                  className={`text-left p-2.5 rounded-sm border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#eee9dc] border-[#ca8a04] shadow-xs ring-1 ring-[#ca8a04]'
                      : 'bg-[#ffffff] border-[#d8d2c2] hover:border-[#1b1e1c] hover:bg-[#faf8f2]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-mono text-[11px] font-bold text-[#1b1e1c]">
                      {demo.id}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                      style={{
                        backgroundColor: `${demo.badgeColor || '#4b6357'}20`,
                        color: demo.badgeColor || '#4b6357',
                      }}
                    >
                      {roleBadge}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#1b1e1c] truncate">
                    {demo.name}
                  </span>
                  <span className="text-[9.5px] text-[#6b6f68] truncate">
                    {demo.title}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Toggle Custom / Manual Credentials */}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-xs text-[#ca8a04] hover:underline font-semibold flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{isCustomMode ? 'Use Preset Demo' : 'Custom Credentials & Role'}</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleLogin()
          }}
          className="space-y-4"
        >
          {isCustomMode && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Adams"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
                    Select Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full px-2.5 py-2 text-xs bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] font-semibold"
                  >
                    <option value="admin">Admin (Full Access)</option>
                    <option value="manager">Warehouse Manager</option>
                    <option value="viewer">Viewer (Read-Only)</option>
                  </select>
                </div>

                {role === 'manager' && (
                  <div>
                    <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
                      Assigned Hub
                    </label>
                    <select
                      value={assignedWarehouseId}
                      onChange={(e) => setAssignedWarehouseId(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] font-semibold"
                    >
                      <option value="wh-north">North Hub</option>
                      <option value="wh-south">South Hub</option>
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
              Staff ID / Login ID
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
              <input
                type="text"
                required
                placeholder="e.g. admin-01, manager-north"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                style={{ paddingLeft: '38px' }}
                className="w-full pr-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] font-mono input-with-icon-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
              Access PIN (4 Digits)
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
              <input
                type={showPin ? 'text' : 'password'}
                required
                maxLength={8}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                style={{ paddingLeft: '38px', paddingRight: '42px' }}
                className="w-full py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] font-mono tracking-widest input-with-icon-left input-with-icon-right"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2.5 text-[#6b6f68] hover:text-[#1b1e1c] p-1.5"
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-sm bg-[#fee2e2] border border-[#8b4a3f]/30 text-xs text-[#8b4a3f] flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-sm bg-[#4b6357] text-white text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#facc15] shrink-0" />
              <span>Authenticated! Directing to dashboard...</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full btn btn-primary text-sm py-2.5 font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {loading ? (
              <span>Verifying credentials...</span>
            ) : success ? (
              <span>Access Granted</span>
            ) : (
              <>
                <span>Sign In as {role.toUpperCase()}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="mt-6 pt-4 border-t border-[#e2ddce] flex items-center justify-between text-[11px] text-[#6b6f68]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4b6357]" />
            <span>3-tier role permissions enforced</span>
          </div>

          <Link
            href="/inventory"
            className="font-medium text-[#1b1e1c] hover:underline"
          >
            Browse Read-Only →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#eee9dc] text-[#1b1e1c] flex flex-col justify-center items-center p-4 sm:p-6 relative select-none">
      {/* Background industrial grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-35"
        style={{
          backgroundImage:
            'radial-gradient(circle, #6b6f68 1px, transparent 1px), linear-gradient(to right, rgba(107,111,104,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(107,111,104,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px, 28px 28px, 28px 28px',
        }}
      />

      <Suspense fallback={<div className="text-xs text-[#6b6f68] font-mono">Loading authentication portal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
