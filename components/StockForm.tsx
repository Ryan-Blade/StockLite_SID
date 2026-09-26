'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Product } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { Lock, LogIn, CheckCircle2, AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export default function StockForm({
  products: initialProducts,
}: {
  products: Product[]
}) {
  const { isReadOnly, canEditWarehouse, user } = useAuth()
  const [products, setProducts] = useState(initialProducts)
  const [productId, setProductId] = useState(initialProducts[0]?.id ?? '')
  const [quantity, setQuantity] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedProduct = products.find((p) => p.id === productId)
  const isAuthorized = selectedProduct ? canEditWarehouse(selectedProduct.warehouseId) : false

  async function submitMovement(direction: 'IN' | 'OUT') {
    setError('')
    setSuccess('')

    if (isReadOnly) {
      setError('Read-Only Mode: You must be signed in with a manager or admin account to perform stock operations.')
      return
    }

    if (!isAuthorized) {
      setError(`Permission Denied: You are not authorized to modify stock in warehouse '${selectedProduct?.warehouseId}'.`)
      return
    }

    const parsedQuantity = Number(quantity)
    if (!quantity || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Enter a quantity greater than 0.')
      return
    }
    if (
      direction === 'OUT' &&
      selectedProduct &&
      parsedQuantity > selectedProduct.currentStock
    ) {
      setError(
        `Only ${selectedProduct.currentStock} in stock — cannot stock out more than that.`,
      )
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stock',
          productId,
          quantity: parsedQuantity,
          direction,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === data.product.id ? data.product : p)),
      )
      setSuccess(
        `${direction === 'IN' ? 'Stocked in' : 'Stocked out'} ${parsedQuantity} unit${parsedQuantity === 1 ? '' : 's'} of ${data.product.name}.`,
      )
      setQuantity('')
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="panel form-panel">
      {/* Read-Only Notice Box */}
      {isReadOnly && (
        <div className="mb-4 p-3 rounded-sm bg-[#fef3c7] border border-[#f59e0b]/40 text-xs text-[#92400e] flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#d97706] shrink-0" />
            <span>
              <strong>Mutation Protection:</strong> Sign in to execute stock movements.
            </span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-bold underline hover:text-[#78350f]"
          >
            Sign In →
          </Link>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="form-field">
          <label htmlFor="product">Product</label>
          <select
            id="product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={submitting}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.warehouseId} ({p.currentStock} on hand)
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            min={1}
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={submitting}
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-sm bg-[#fee2e2] border border-[#8b4a3f]/30 text-xs text-[#8b4a3f] flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!error && success && (
          <div className="p-2.5 rounded-sm bg-[#4b6357]/15 border border-[#4b6357]/30 text-xs text-[#364a40] font-medium flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[#4b6357] shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="form-actions flex items-center gap-3">
          <button
            type="button"
            className="btn btn-primary flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting || isReadOnly}
            title={isReadOnly ? 'Sign in to stock in items' : 'Stock in inventory'}
            onClick={() => submitMovement('IN')}
          >
            {isReadOnly && <Lock className="w-3.5 h-3.5 text-[#ca8a04]" />}
            <span>Stock in</span>
          </button>

          <button
            type="button"
            className="btn btn-danger flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting || isReadOnly}
            title={isReadOnly ? 'Sign in to stock out items' : 'Stock out inventory'}
            onClick={() => submitMovement('OUT')}
          >
            {isReadOnly && <Lock className="w-3.5 h-3.5 text-white/80" />}
            <span>Stock out</span>
          </button>
        </div>
      </form>
    </div>
  )
}
