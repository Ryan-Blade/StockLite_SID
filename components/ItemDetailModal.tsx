'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Product, Warehouse, Transaction, getStockStatus, getStockStatusLabel } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import StatusBadge from '@/components/StatusBadge'
import { calculateConsumptionForecasts } from '@/lib/forecast'
import {
  X,
  Package,
  Building2,
  Tag,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Zap,
  Trash2,
  History,
  Calendar,
  Lock,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

interface ItemDetailModalProps {
  product: Product | null
  warehouses: Warehouse[]
  transactions: Transaction[]
  isOpen: boolean
  onClose: () => void
  onRestock: (product: Product) => void
  onDelete: (productId: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  IN: 'Stock in',
  OUT: 'Stock out',
  TRANSFER_OUT: 'Transfer out',
  TRANSFER_IN: 'Transfer in',
}

const TYPE_COLORS: Record<string, string> = {
  IN: '#4b6357',
  OUT: '#8b4a3f',
  TRANSFER_OUT: '#ca8a04',
  TRANSFER_IN: '#eab308',
}

export default function ItemDetailModal({
  product,
  warehouses,
  transactions,
  isOpen,
  onClose,
  onRestock,
  onDelete,
}: ItemDetailModalProps) {
  const { isReadOnly, canEditWarehouse, user } = useAuth()
  const [restocking, setRestocking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  useEffect(() => {
    setConfirmDelete(false)
    setFeedback(null)
  }, [product, isOpen])

  // Forecast data for runway days estimate
  const forecast = useMemo(() => {
    if (!product) return null
    const forecasts = calculateConsumptionForecasts([product], transactions)
    return forecasts[0] || null
  }, [product, transactions])

  // Filter chronological transactions for this SKU
  const itemTransactions = useMemo(() => {
    if (!product) return []
    return transactions
      .filter(
        (t) =>
          t.productId === product.id ||
          (t.productName === product.name && t.warehouseId === product.warehouseId)
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [product, transactions])

  if (!isOpen || !product) return null

  const warehouseObj = warehouses.find((w) => w.id === product.warehouseId)
  const warehouseName = warehouseObj?.name ?? product.warehouseId
  const status = getStockStatus(product)
  const isAuthorized = canEditWarehouse(product.warehouseId)

  // Handle 1-Click Quick Restock
  const handleQuickRestock = async () => {
    if (isReadOnly || !isAuthorized) {
      setFeedback({
        type: 'error',
        message: 'Permission denied: You cannot modify stock in this warehouse.',
      })
      return
    }

    setRestocking(true)
    setFeedback(null)

    try {
      // Calculate replenish amount: restore to threshold + 25 or at least 25
      const replenishAmount = Math.max(25, product.reorderThreshold - product.currentStock + 20)

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stock',
          productId: product.id,
          quantity: replenishAmount,
          direction: 'IN',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to restock item')
      }

      const updatedProduct = data.product || {
        ...product,
        currentStock: product.currentStock + replenishAmount,
      }

      setFeedback({
        type: 'success',
        message: `Successfully restocked +${replenishAmount} units! New balance: ${updatedProduct.currentStock}`,
      })
      onRestock(updatedProduct)
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to restock',
      })
    } finally {
      setRestocking(false)
    }
  }

  // Handle Delete Product
  const handleDeleteProduct = async () => {
    if (isReadOnly || !isAuthorized) {
      setFeedback({
        type: 'error',
        message: 'Permission denied: Only authorized staff may delete items.',
      })
      return
    }

    setDeleting(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_product',
          productId: product.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product')
      }

      onDelete(product.id)
      onClose()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to remove item',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-drawer-title"
      className="fixed inset-0 z-50 flex items-center justify-end bg-[#1b1e1c]/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl h-full bg-[#fbfaf6] border-l border-[#d8d2c2] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between pb-4 mb-4 border-b border-[#e2ddce]">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-md bg-[#eee9dc] text-[#1b1e1c] shrink-0 mt-0.5">
                <Package className="w-5 h-5 text-[#ca8a04]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#eee9dc] text-[#6b6f68]">
                    {product.id}
                  </span>
                  <StatusBadge status={status} label={getStockStatusLabel(status)} />
                </div>
                <h2
                  id="item-drawer-title"
                  className="font-display font-bold text-xl text-[#1b1e1c] leading-snug mt-1"
                >
                  {product.name}
                </h2>
                <div className="flex items-center gap-3 text-xs text-[#6b6f68] mt-1">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{product.category}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{warehouseName}</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="p-1 rounded text-[#6b6f68] hover:text-[#1b1e1c] hover:bg-[#eee9dc] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div
              className={`mb-4 p-3 rounded-sm text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-[#4b6357] text-white shadow-sm'
                  : 'bg-[#fee2e2] text-[#8b4a3f] border border-[#8b4a3f]/30'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#facc15] shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="p-3 rounded-md bg-[#eee9dc]/60 border border-[#d8d2c2]">
              <span className="text-[11px] text-[#6b6f68] font-semibold block uppercase">
                Current Stock
              </span>
              <span className="font-display font-bold text-xl text-[#1b1e1c] block mt-0.5">
                {product.currentStock} <span className="text-xs font-normal text-[#6b6f68]">units</span>
              </span>
            </div>

            <div className="p-3 rounded-md bg-[#eee9dc]/60 border border-[#d8d2c2]">
              <span className="text-[11px] text-[#6b6f68] font-semibold block uppercase">
                Threshold Level
              </span>
              <span className="font-display font-bold text-xl text-[#1b1e1c] block mt-0.5">
                {product.reorderThreshold} <span className="text-xs font-normal text-[#6b6f68]">units</span>
              </span>
            </div>

            <div className="p-3 rounded-md bg-[#eee9dc]/60 border border-[#d8d2c2]">
              <span className="text-[11px] text-[#6b6f68] font-semibold block uppercase">
                Stock Runway
              </span>
              <span className="font-display font-bold text-xl text-[#1b1e1c] block mt-0.5">
                {forecast && forecast.daysOfStockRemaining !== null ? (
                  <>
                    {forecast.daysOfStockRemaining} <span className="text-xs font-normal text-[#6b6f68]">days</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-[#4b6357]">Surplus / Safe</span>
                )}
              </span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-[#ffffff] border border-[#d8d2c2] rounded-md p-4 mb-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#1b1e1c] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#ca8a04]" />
                <span>Quick Floor Actions</span>
              </span>
              {!isAuthorized && (
                <span className="text-[10px] text-[#8b4a3f] font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked by Role
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleQuickRestock}
                disabled={isReadOnly || !isAuthorized || restocking}
                className="btn btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-xs font-bold disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{restocking ? 'Restocking...' : '⚡ Quick Restock (+25/Safe)'}</span>
              </button>

              <Link
                href={`/stock`}
                className="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1 font-semibold"
              >
                <span>Stock In/Out</span>
                <ArrowRight className="w-3 h-3" />
              </Link>

              <Link
                href={`/transfer`}
                className="btn btn-secondary text-xs px-3 py-2 flex items-center gap-1 font-semibold"
              >
                <span>Transfer Hub</span>
                <ArrowRightLeft className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Chronological Item Audit Trail / Transaction History */}
          <div className="mb-6">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#e2ddce]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1b1e1c] uppercase tracking-wider">
                <History className="w-4 h-4 text-[#4b6357]" />
                <span>Order Flow & Audit Events ({itemTransactions.length})</span>
              </div>
              <span className="text-[11px] text-[#6b6f68]">Chronological Log</span>
            </div>

            {itemTransactions.length === 0 ? (
              <div className="p-5 text-center bg-[#eee9dc]/30 rounded border border-[#d8d2c2] text-xs text-[#6b6f68]">
                No transaction events recorded for this SKU yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {itemTransactions.map((tx) => {
                  const typeColor = TYPE_COLORS[tx.type] || '#6b6f68'
                  const isFailed = tx.status === 'FAILED'
                  return (
                    <div
                      key={tx.id}
                      className={`p-2.5 rounded-sm border text-xs flex items-center justify-between ${
                        isFailed
                          ? 'bg-[#fee2e2]/60 border-[#8b4a3f]/30'
                          : 'bg-[#ffffff] border-[#d8d2c2]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isFailed ? '#fee2e2' : `${typeColor}20`,
                            color: isFailed ? '#8b4a3f' : typeColor,
                          }}
                        >
                          {tx.type === 'IN' ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : tx.type === 'OUT' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowRightLeft className="w-4 h-4" />
                          )}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1b1e1c]">
                              {TYPE_LABELS[tx.type] ?? tx.type}
                            </span>
                            {isFailed && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#fee2e2] text-[#8b4a3f] font-bold border border-[#8b4a3f]/40">
                                FAILED
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#6b6f68]">
                            {new Date(tx.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className="font-mono font-bold block"
                          style={{ color: isFailed ? '#8b4a3f' : typeColor }}
                        >
                          {tx.type === 'OUT' || tx.type === 'TRANSFER_OUT' ? '-' : '+'}
                          {tx.quantity} units
                        </span>
                        {isFailed && tx.failureReason && (
                          <span className="text-[10px] text-[#8b4a3f] max-w-[150px] truncate block" title={tx.failureReason}>
                            {tx.failureReason}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions: Danger zone delete product */}
        <div className="pt-4 border-t border-[#e2ddce] flex items-center justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2 w-full justify-between animate-fadeIn">
              <span className="text-xs text-[#8b4a3f] font-semibold">
                Confirm remove SKU from registry?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn btn-secondary text-xs px-2.5 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProduct}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-[#8b4a3f] text-white text-xs font-bold rounded hover:bg-[#6b352b] transition-colors"
                >
                  {deleting ? 'Removing...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={isReadOnly || !isAuthorized}
                className="text-xs text-[#8b4a3f] hover:text-[#6b352b] font-semibold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                title={
                  !isAuthorized
                    ? 'Only authorized managers for this warehouse can delete SKUs'
                    : 'Remove this SKU permanently'
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete SKU</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary text-xs px-4 py-2 font-semibold"
              >
                Close Drawer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
