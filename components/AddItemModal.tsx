'use client'

import React, { useState, useEffect } from 'react'
import { Product, Warehouse } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import {
  PackagePlus,
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  Boxes,
  Building2,
  Tag,
  Hash,
  Layers,
  Lock,
} from 'lucide-react'
import Link from 'next/link'

interface AddItemModalProps {
  isOpen: boolean
  onClose: () => void
  onProductAdded: (product: Product) => void
  warehouses: Warehouse[]
  existingCategories: string[]
  defaultWarehouseId?: string
}

export default function AddItemModal({
  isOpen,
  onClose,
  onProductAdded,
  warehouses,
  existingCategories,
  defaultWarehouseId,
}: AddItemModalProps) {
  const { isReadOnly, canEditWarehouse, user } = useAuth()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [isCustomCat, setIsCustomCat] = useState(false)
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId || (warehouses[0]?.id ?? ''))
  const [initialStock, setInitialStock] = useState('50')
  const [reorderThreshold, setReorderThreshold] = useState('20')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (defaultWarehouseId) {
      setWarehouseId(defaultWarehouseId)
    } else if (user?.assignedWarehouseId) {
      setWarehouseId(user.assignedWarehouseId)
    } else if (warehouses.length > 0 && !warehouseId) {
      setWarehouseId(warehouses[0].id)
    }
  }, [defaultWarehouseId, user, warehouses, warehouseId])

  useEffect(() => {
    if (existingCategories.length > 0 && !category) {
      setCategory(existingCategories[0])
    }
  }, [existingCategories, category])

  if (!isOpen) return null

  const resolvedCategory = isCustomCat ? customCategory.trim() : category.trim()
  const isAllowedForTarget = canEditWarehouse(warehouseId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isReadOnly) {
      setError('Read-Only Mode: You must log in with an authorized role to add items.')
      return
    }

    if (!isAllowedForTarget) {
      setError(`Permission Denied: You are only authorized to manage items in your assigned warehouse.`)
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter a product name.')
      return
    }

    if (!resolvedCategory) {
      setError('Please select or specify a category.')
      return
    }

    if (!warehouseId) {
      setError('Please choose a destination warehouse.')
      return
    }

    const stockNum = parseInt(initialStock, 10)
    const thresholdNum = parseInt(reorderThreshold, 10)

    if (isNaN(stockNum) || stockNum < 0) {
      setError('Initial stock must be a positive number or 0.')
      return
    }

    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setError('Reorder threshold must be a positive number or 0.')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_product',
          name: trimmedName,
          category: resolvedCategory,
          warehouseId,
          initialStock: stockNum,
          reorderThreshold: thresholdNum,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add product.')
      }

      const createdProduct: Product = data.product

      setToastMessage(`SKU "${createdProduct.name}" added successfully!`)
      onProductAdded(createdProduct)

      setTimeout(() => {
        setName('')
        setCustomCategory('')
        setIsCustomCat(false)
        setInitialStock('50')
        setReorderThreshold('20')
        setToastMessage(null)
        onClose()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1b1e1c]/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#fbfaf6] border border-[#d8d2c2] rounded-md shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Alert overlay */}
        {toastMessage && (
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 p-3 bg-[#4b6357] text-white text-xs font-semibold rounded-sm shadow-md animate-slideDown">
            <CheckCircle2 className="w-4 h-4 text-[#facc15] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e2ddce]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-[#4b6357]/15 text-[#4b6357]">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="add-item-modal-title"
                className="font-display font-bold text-lg text-[#1b1e1c] leading-tight"
              >
                Register New Inventory Item
              </h2>
              <p className="text-xs text-[#6b6f68]">
                Catalog a new SKU with initial stock & replenishment threshold
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded text-[#6b6f68] hover:text-[#1b1e1c] hover:bg-[#eee9dc] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Banner */}
        {isReadOnly && (
          <div className="mb-4 p-3 rounded-sm bg-[#fef3c7] border border-[#f59e0b]/40 text-xs text-[#92400e] flex items-start gap-2">
            <Lock className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Sign In Required:</span> You are currently in Read-Only mode.{' '}
              <Link href="/login" className="underline font-bold text-[#b45309] hover:text-[#78350f]">
                Log in as manager or admin
              </Link>{' '}
              to register items.
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
              Product / Item Name <span className="text-[#8b4a3f]">*</span>
            </label>
            <div className="relative flex items-center">
              <Boxes className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
              <input
                type="text"
                required
                placeholder="e.g. Industrial Barcode Scanner Pro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isReadOnly || submitting}
                style={{ paddingLeft: '38px' }}
                className="w-full pr-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] disabled:bg-[#eee9dc] disabled:cursor-not-allowed input-with-icon-left"
              />
            </div>
          </div>

          {/* Category Selector / Custom */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#1b1e1c] uppercase tracking-wide">
                Category <span className="text-[#8b4a3f]">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCat(!isCustomCat)}
                className="text-xs text-[#ca8a04] hover:underline font-semibold"
              >
                {isCustomCat ? '← Choose Existing Category' : '+ New Category'}
              </button>
            </div>

            {isCustomCat ? (
              <div className="relative flex items-center">
                <Tag className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Robotics, Chemicals, Hardware"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  disabled={isReadOnly || submitting}
                  style={{ paddingLeft: '38px' }}
                  className="w-full pr-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] disabled:bg-[#eee9dc] input-with-icon-left"
                />
              </div>
            ) : (
              <div className="relative flex items-center">
                <Layers className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isReadOnly || submitting}
                  style={{ paddingLeft: '38px' }}
                  className="w-full pr-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] disabled:bg-[#eee9dc]"
                >
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Target Warehouse */}
          <div>
            <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
              Target Warehouse <span className="text-[#8b4a3f]">*</span>
            </label>
            <div className="relative flex items-center">
              <Building2 className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                disabled={isReadOnly || submitting}
                style={{ paddingLeft: '38px' }}
                className="w-full pr-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] disabled:bg-[#eee9dc]"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.location})
                  </option>
                ))}
              </select>
            </div>
            {!isAllowedForTarget && !isReadOnly && (
              <p className="text-[11px] text-[#8b4a3f] mt-1 font-medium">
                ⚠️ You are not authorized to create items in this warehouse (Role constraint).
              </p>
            )}
          </div>

          {/* Initial Stock & Threshold grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
                Initial Stock Qty
              </label>
              <input
                type="number"
                min="0"
                required
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                disabled={isReadOnly || submitting}
                className="w-full px-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] font-semibold text-[#1b1e1c]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1b1e1c] mb-1.5 uppercase tracking-wide">
                Reorder Threshold
              </label>
              <input
                type="number"
                min="0"
                required
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(e.target.value)}
                disabled={isReadOnly || submitting}
                className="w-full px-3 py-2 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] font-semibold text-[#1b1e1c]"
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
              onClick={onClose}
              className="btn btn-secondary text-xs px-3.5 py-2 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReadOnly || submitting || !isAllowedForTarget}
              className="btn btn-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span>Adding SKU...</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
