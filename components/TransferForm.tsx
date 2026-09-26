'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Product, Warehouse } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import ObsidianWarehouseGraph, { ActiveTransferInfo } from '@/components/ObsidianWarehouseGraph'
import ReorderSuggestions, { RebalanceSuggestion } from '@/components/ReorderSuggestions'
import AddWarehouseModal from '@/components/AddWarehouseModal'
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Zap,
  AlertCircle,
  Info,
  Sparkles,
  Lock,
  Plus,
  Warehouse as WarehouseIcon,
} from 'lucide-react'

export default function TransferForm({
  products: initialProducts,
  warehouses: initialWarehouses,
}: {
  products: Product[]
  warehouses: Warehouse[]
}) {
  const { isReadOnly, canTransfer, user } = useAuth()
  const [products, setProducts] = useState(initialProducts)
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const [sourceWarehouseId, setSourceWarehouseId] = useState(
    initialWarehouses[0]?.id ?? '',
  )
  const [destWarehouseId, setDestWarehouseId] = useState(
    initialWarehouses[1]?.id ?? '',
  )

  const sourceProducts = useMemo(
    () => products.filter((p) => p.warehouseId === sourceWarehouseId),
    [products, sourceWarehouseId],
  )
  const [productId, setProductId] = useState(sourceProducts[0]?.id ?? '')
  const [quantity, setQuantity] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [hoveredSuggestion, setHoveredSuggestion] = useState<RebalanceSuggestion | null>(null)

  function handleSourceChange(id: string) {
    setSourceWarehouseId(id)
    const firstAtSource = products.find((p) => p.warehouseId === id)
    setProductId(firstAtSource?.id ?? '')
    if (id === destWarehouseId) {
      const alt = warehouses.find((w) => w.id !== id)
      if (alt) setDestWarehouseId(alt.id)
    }
  }

  const selectedProduct = products.find((p) => p.id === productId)
  const destProduct = products.find(
    (p) => p.name === selectedProduct?.name && p.warehouseId === destWarehouseId,
  )

  const isTransferAuthorized = canTransfer(sourceWarehouseId)

  const parsedQty = Number(quantity) || 0
  const sourceAfterStock = selectedProduct ? Math.max(0, selectedProduct.currentStock - parsedQty) : 0
  const destAfterStock = (destProduct ? destProduct.currentStock : 0) + parsedQty

  // Dynamic active transfer state for ObsidianWarehouseGraph visualization
  const activeTransferInfo: ActiveTransferInfo | null = useMemo(() => {
    if (hoveredSuggestion) {
      return {
        sourceWarehouseId: hoveredSuggestion.sourceWarehouseId,
        destWarehouseId: hoveredSuggestion.destWarehouseId,
        quantity: hoveredSuggestion.suggestedQuantity,
        productName: hoveredSuggestion.productName,
        isAnimating: true,
      }
    }

    if (sourceWarehouseId && destWarehouseId && sourceWarehouseId !== destWarehouseId) {
      return {
        sourceWarehouseId,
        destWarehouseId,
        quantity: parsedQty > 0 ? parsedQty : undefined,
        productName: selectedProduct?.name,
        isAnimating: submitting || parsedQty > 0,
      }
    }
    return null
  }, [
    hoveredSuggestion,
    sourceWarehouseId,
    destWarehouseId,
    parsedQty,
    selectedProduct,
    submitting,
  ])

  // Handle applying a smart recommendation
  const handleApplySuggestion = (suggestion: {
    productId: string
    sourceWarehouseId: string
    destWarehouseId: string
    quantity: number
    productName: string
  }) => {
    setError('')
    setSuccess('')
    setSourceWarehouseId(suggestion.sourceWarehouseId)
    setDestWarehouseId(suggestion.destWarehouseId)
    setProductId(suggestion.productId)
    setQuantity(String(suggestion.quantity))
  }

  const handleWarehouseAdded = (newWarehouse: Warehouse) => {
    setWarehouses((prev) => [...prev, newWarehouse])
    setDestWarehouseId(newWarehouse.id)
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (isReadOnly) {
      setError('Read-Only Mode: Sign in with a staff account to commit inventory transfers.')
      return
    }

    if (!isTransferAuthorized) {
      setError('Permission Denied: You are only authorized to transfer items originating from your assigned warehouse.')
      return
    }

    if (!productId || !selectedProduct) {
      setError('Select a product to transfer.')
      return
    }

    if (sourceWarehouseId === destWarehouseId) {
      setError('Source and destination warehouses must be different.')
      return
    }

    const parsedQuantity = Number(quantity)
    if (!quantity || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Enter a quantity greater than 0.')
      return
    }

    if (parsedQuantity > selectedProduct.currentStock) {
      setError(
        `Only ${selectedProduct.currentStock} in stock — cannot transfer more than that.`,
      )
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer',
          productId,
          destWarehouseId,
          quantity: parsedQuantity,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }

      if (data.products) {
        setProducts(data.products)
      } else {
        setProducts((prev) => {
          return prev.map((p) => {
            if (p.id === data.source.id) return data.source
            if (p.id === data.destination.id) return data.destination
            return p
          })
        })
      }

      const destWh = warehouses.find((w) => w.id === destWarehouseId)?.name ?? destWarehouseId
      const srcWh = warehouses.find((w) => w.id === sourceWarehouseId)?.name ?? sourceWarehouseId

      setSuccess(
        `Transferred ${parsedQuantity} unit${parsedQuantity === 1 ? '' : 's'} of "${data.source.name}" from ${srcWh} to ${destWh}.`,
      )
      setQuantity('')
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Topology Graph Visualizer */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-[#6b6f68]">
            <span className="font-semibold text-[#1b1e1c]">Interactive Topology Graph</span>
            <span>•</span>
            <span>Click hubs or drag to reposition nodes</span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 font-bold shadow-2xs"
            title={isReadOnly ? 'Sign in to add warehouse' : 'Register new hub'}
          >
            {isReadOnly ? <Lock className="w-3 h-3 text-[#ca8a04]" /> : <Plus className="w-3 h-3 text-[#1b1e1c]" />}
            <span>Add Warehouse</span>
          </button>
        </div>

        <ObsidianWarehouseGraph
          warehouses={warehouses}
          products={products}
          selectedWarehouseId={sourceWarehouseId}
          activeTransfer={activeTransferInfo}
          onQuickTransferSelect={(src, dst) => {
            setSourceWarehouseId(src)
            setDestWarehouseId(dst)
          }}
          height={320}
        />
      </div>

      {/* Main Form & Recommendation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Transfer Form */}
        <div className="lg:col-span-6 panel form-panel !p-6 bg-[#fbfaf6]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e2ddce]">
            <div>
              <h2 className="font-display font-bold text-base text-[#1b1e1c]">
                Initiate Transfer
              </h2>
              <p className="text-xs text-[#6b6f68]">
                Atomic cross-site inventory rebalancing with zero loss guarantee
              </p>
            </div>
            <div className="p-2 rounded-sm bg-[#eab308]/20 text-[#ca8a04]">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>

          {/* Read-Only Notice */}
          {isReadOnly && (
            <div className="mb-4 p-3 rounded-sm bg-[#fef3c7] border border-[#f59e0b]/40 text-xs text-[#92400e] flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#d97706] shrink-0" />
                <span>
                  <strong>Read-Only Mode:</strong> Sign in to execute transfers.
                </span>
              </div>
              <Link
                href="/login"
                className="font-bold underline hover:text-[#78350f] shrink-0"
              >
                Sign In →
              </Link>
            </div>
          )}

          <form onSubmit={handleTransfer} className="space-y-4">
            {/* Warehouse Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-field !mb-0">
                <label htmlFor="t-source" className="text-xs font-semibold text-[#1b1e1c]">
                  Source Warehouse
                </label>
                <select
                  id="t-source"
                  value={sourceWarehouseId}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className="w-full text-sm font-medium"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field !mb-0">
                <label htmlFor="t-dest" className="text-xs font-semibold text-[#1b1e1c]">
                  Destination Warehouse
                </label>
                <select
                  id="t-dest"
                  value={destWarehouseId}
                  onChange={(e) => setDestWarehouseId(e.target.value)}
                  className="w-full text-sm font-medium"
                >
                  {warehouses
                    .filter((w) => w.id !== sourceWarehouseId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Product Selector */}
            <div className="form-field !mb-0">
              <label htmlFor="t-product" className="text-xs font-semibold text-[#1b1e1c]">
                Select Item to Transfer
              </label>
              <select
                id="t-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                disabled={sourceProducts.length === 0 || submitting}
                className="w-full text-sm font-medium"
              >
                {sourceProducts.length === 0 ? (
                  <option value="">No products at this warehouse</option>
                ) : (
                  sourceProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ({p.currentStock} in stock | Min {p.reorderThreshold})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Quantity Input */}
            <div className="form-field !mb-0">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="t-quantity" className="text-xs font-semibold text-[#1b1e1c]">
                  Transfer Units
                </label>
                {selectedProduct && (
                  <span className="text-[11.5px] text-[#6b6f68]">
                    Available on hand:{' '}
                    <strong className="text-[#1b1e1c]">{selectedProduct.currentStock}</strong>
                  </span>
                )}
              </div>
              <input
                id="t-quantity"
                type="number"
                min={1}
                max={selectedProduct?.currentStock}
                placeholder="Enter quantity (e.g. 25)"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={submitting}
                className="w-full text-sm"
              />
            </div>

            {/* Live Rebalance Preview Strip */}
            {selectedProduct && parsedQty > 0 && (
              <div className="p-3.5 rounded-md bg-[#eee9dc]/60 border border-[#d8d2c2] space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold text-[#1b1e1c]">
                  <span className="flex items-center gap-1 text-[#ca8a04]">
                    <Sparkles className="w-3.5 h-3.5" /> Transfer Impact Preview
                  </span>
                  <span>{parsedQty} units moving</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#d8d2c2]">
                  <div>
                    <span className="text-[#6b6f68] block text-[11px]">Source balance after:</span>
                    <strong
                      className={
                        sourceAfterStock <= selectedProduct.reorderThreshold
                          ? 'text-[#8b4a3f]'
                          : 'text-[#4b6357]'
                      }
                    >
                      {sourceAfterStock} units (Threshold: {selectedProduct.reorderThreshold})
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#6b6f68] block text-[11px]">Dest balance after:</span>
                    <strong className="text-[#4b6357]">
                      {destAfterStock} units
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Error and Success Feedback */}
            {error && (
              <div className="p-3 rounded-md bg-[#8b4a3f]/10 border border-[#8b4a3f]/30 text-[#8b4a3f] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!error && success && (
              <div className="p-3 rounded-md bg-[#4b6357]/10 border border-[#4b6357]/30 text-[#4b6357] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                className="btn btn-primary w-full shadow-xs text-sm py-2.5 flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={submitting || sourceProducts.length === 0 || isReadOnly}
                title={isReadOnly ? 'Sign in to execute transfer' : 'Commit transfer'}
              >
                {isReadOnly ? (
                  <>
                    <Lock className="w-4 h-4 text-[#ca8a04]" />
                    <span>Sign In Required to Transfer</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>{submitting ? 'Executing Transfer...' : 'Commit Warehouse Transfer'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right / Recommendations List */}
        <div className="lg:col-span-6">
          <ReorderSuggestions
            products={products}
            warehouses={warehouses}
            onApplySuggestion={handleApplySuggestion}
            onHoverSuggestion={(sug) => setHoveredSuggestion(sug)}
          />
        </div>
      </div>

      {/* Add Warehouse Modal */}
      <AddWarehouseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onWarehouseAdded={handleWarehouseAdded}
      />
    </div>
  )
}
