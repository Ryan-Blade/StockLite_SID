'use client'

import React, { useState } from 'react'
import { Warehouse, Product } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import {
  Warehouse as WarehouseIcon,
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Building2,
  Hash,
  Lock,
  PackagePlus,
  Boxes,
  ArrowRight,
  Layers,
} from 'lucide-react'
import Link from 'next/link'

interface AddWarehouseModalProps {
  isOpen: boolean
  onClose: () => void
  onWarehouseAdded: (warehouse: Warehouse) => void
  onProductAdded?: (product: Product) => void
}

export default function AddWarehouseModal({
  isOpen,
  onClose,
  onWarehouseAdded,
  onProductAdded,
}: AddWarehouseModalProps) {
  const { isReadOnly, canAddWarehouse } = useAuth()
  const [step, setStep] = useState<'create' | 'stock'>('create')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [customId, setCustomId] = useState('')
  const [createdWarehouse, setCreatedWarehouse] = useState<Warehouse | null>(null)

  // Quick stocking fields for newly created warehouse
  const [itemName, setItemName] = useState('')
  const [itemCategory, setItemCategory] = useState('Packaging')
  const [initialStock, setInitialStock] = useState('100')
  const [reorderThreshold, setReorderThreshold] = useState('30')
  const [stockSuccess, setStockSuccess] = useState<string | null>(null)

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isReadOnly || !canAddWarehouse) {
      setError('Permission Denied: Only Admin users are authorized to register new warehouses.')
      return
    }

    const trimmedName = name.trim()
    const trimmedLoc = location.trim()
    const trimmedId = customId.trim()

    if (!trimmedName) {
      setError('Please enter a warehouse name.')
      return
    }

    if (!trimmedLoc) {
      setError('Please enter a warehouse location (city, state/country).')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          location: trimmedLoc,
          id: trimmedId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create warehouse.')
      }

      const newWh: Warehouse = data.warehouse
      setCreatedWarehouse(newWh)
      onWarehouseAdded(newWh)
      setToastMessage(`Warehouse "${newWh.name}" created successfully!`)

      // Transition immediately to "Stock Newly Created Warehouse" step
      setStep('stock')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create warehouse')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStockWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdWarehouse) return
    setError('')

    const trimmedItem = itemName.trim()
    if (!trimmedItem) {
      setError('Please provide an item name to stock.')
      return
    }

    const stockNum = parseInt(initialStock, 10)
    const thresholdNum = parseInt(reorderThreshold, 10)

    if (isNaN(stockNum) || stockNum < 0) {
      setError('Stock quantity must be a non-negative number.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_product',
          name: trimmedItem,
          category: itemCategory,
          warehouseId: createdWarehouse.id,
          initialStock: stockNum,
          reorderThreshold: thresholdNum,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to stock product.')
      }

      if (onProductAdded && data.product) {
        onProductAdded(data.product)
      }

      setStockSuccess(`Added "${trimmedItem}" (${stockNum} units) to ${createdWarehouse.name}!`)
      setItemName('')
      setInitialStock('50')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stock item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinish = () => {
    setName('')
    setLocation('')
    setCustomId('')
    setCreatedWarehouse(null)
    setStep('create')
    setError('')
    setToastMessage(null)
    setStockSuccess(null)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-warehouse-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1b1e1c]/60 backdrop-blur-xs animate-fadeIn"
      onClick={handleFinish}
    >
      <div
        className="relative w-full max-w-md bg-[#fbfaf6] border border-[#d8d2c2] rounded-md shadow-2xl p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 p-3 bg-[#4b6357] text-white text-xs font-semibold rounded-sm shadow-md animate-slideDown">
            <CheckCircle2 className="w-4 h-4 text-[#facc15] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e2ddce]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-[#eab308]/20 text-[#ca8a04]">
              {step === 'create' ? (
                <WarehouseIcon className="w-5 h-5" />
              ) : (
                <PackagePlus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2
                id="add-warehouse-modal-title"
                className="font-display font-bold text-lg text-[#1b1e1c] leading-tight"
              >
                {step === 'create' ? 'Add New Warehouse' : 'Stock Newly Created Warehouse'}
              </h2>
              <p className="text-xs text-[#6b6f68]">
                {step === 'create'
                  ? 'Register a new hub in the network topology'
                  : `Populate ${createdWarehouse?.name} with initial inventory`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            aria-label="Close modal"
            className="p-1 rounded text-[#6b6f68] hover:text-[#1b1e1c] hover:bg-[#eee9dc] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: CREATE WAREHOUSE */}
        {step === 'create' && (
          <>
            {isReadOnly && (
              <div className="mb-4 p-3 rounded-sm bg-[#fef3c7] border border-[#f59e0b]/40 text-xs text-[#92400e] flex items-start gap-2">
                <Lock className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Sign In Required:</span> You are currently in Read-Only mode.{' '}
                  <Link href="/login" className="underline font-bold text-[#b45309] hover:text-[#78350f]">
                    Log in as admin
                  </Link>{' '}
                  to register warehouses.
                </div>
              </div>
            )}

            {!isReadOnly && !canAddWarehouse && (
              <div className="mb-4 p-3 rounded-sm bg-[#fee2e2] border border-[#8b4a3f]/30 text-xs text-[#8b4a3f] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Role Restriction:</span> Warehouse creation requires <strong>Admin / Logistics Director</strong> permissions.
                </div>
              </div>
            )}

            <form onSubmit={handleCreateWarehouse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
                  Warehouse Name <span className="text-[#8b4a3f]">*</span>
                </label>
                <div className="relative flex items-center">
                  <Building2 className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. East Coast Logistics Hub"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isReadOnly || !canAddWarehouse || submitting}
                    style={{ paddingLeft: '38px' }}
                    className="w-full pr-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] disabled:bg-[#eee9dc] disabled:cursor-not-allowed input-with-icon-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
                  Facility Location <span className="text-[#8b4a3f]">*</span>
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Newark, NJ"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isReadOnly || !canAddWarehouse || submitting}
                    style={{ paddingLeft: '38px' }}
                    className="w-full pr-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] disabled:bg-[#eee9dc] disabled:cursor-not-allowed input-with-icon-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
                  Custom Warehouse ID <span className="text-[#6b6f68] font-normal normal-case">(optional)</span>
                </label>
                <div className="relative flex items-center">
                  <Hash className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. wh-east (auto-generated if blank)"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    disabled={isReadOnly || !canAddWarehouse || submitting}
                    style={{ paddingLeft: '38px' }}
                    className="w-full pr-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] font-mono text-xs disabled:bg-[#eee9dc] disabled:cursor-not-allowed input-with-icon-left"
                  />
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-sm bg-[#fee2e2] border border-[#8b4a3f]/30 text-xs text-[#8b4a3f] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#e2ddce]">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="btn btn-secondary text-xs px-3.5 py-2 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReadOnly || !canAddWarehouse || submitting}
                  className="btn btn-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span>Registering...</span>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Register & Stock Warehouse</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* STEP 2: STOCK NEWLY CREATED WAREHOUSE */}
        {step === 'stock' && createdWarehouse && (
          <div className="space-y-4">
            <div className="p-3 bg-[#4b6357]/10 border border-[#4b6357]/30 rounded text-xs text-[#4b6357] font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4b6357]" />
              <span>
                <strong>{createdWarehouse.name}</strong> registered! Add initial SKUs so cross-site transfers can begin immediately.
              </span>
            </div>

            {stockSuccess && (
              <div className="p-2.5 rounded-sm bg-[#4b6357] text-white text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-[#facc15] shrink-0" />
                <span>{stockSuccess}</span>
              </div>
            )}

            <form onSubmit={handleStockWarehouse} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#1b1e1c] mb-1 uppercase tracking-wide">
                  Item / SKU Name <span className="text-[#8b4a3f]">*</span>
                </label>
                <div className="relative flex items-center">
                  <Boxes className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corrugated Shipping Box (M)"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    disabled={submitting}
                    style={{ paddingLeft: '38px' }}
                    className="w-full pr-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] input-with-icon-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#1b1e1c] mb-1 uppercase tracking-wide">
                    Category
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    disabled={submitting}
                    className="w-full px-2 py-2 text-xs bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357]"
                  >
                    <option value="Packaging">Packaging</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Safety">Safety</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Materials">Materials</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1b1e1c] mb-1 uppercase tracking-wide">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    disabled={submitting}
                    className="w-full px-2.5 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1b1e1c] mb-1 uppercase tracking-wide">
                    Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={reorderThreshold}
                    onChange={(e) => setReorderThreshold(e.target.value)}
                    disabled={submitting}
                    className="w-full px-2.5 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm font-semibold"
                  />
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-sm bg-[#fee2e2] border border-[#8b4a3f]/30 text-xs text-[#8b4a3f] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-[#e2ddce]">
                <button
                  type="submit"
                  disabled={submitting || !itemName.trim()}
                  className="btn btn-primary text-xs px-3.5 py-2 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Adding...' : '+ Stock Item'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="btn btn-secondary text-xs px-4 py-2 font-bold flex items-center gap-1"
                >
                  <span>Finish & View Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
