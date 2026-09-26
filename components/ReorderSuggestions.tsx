'use client'

import React, { useMemo } from 'react'
import { Product, Warehouse } from '@/lib/types'
import { ArrowRight, Sparkles, RefreshCw, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react'

export interface RebalanceSuggestion {
  id: string
  productId: string
  productName: string
  category: string
  sourceWarehouseId: string
  sourceWarehouseName: string
  sourceCurrentStock: number
  destWarehouseId: string
  destWarehouseName: string
  destCurrentStock: number
  destThreshold: number
  suggestedQuantity: number
  reason: string
  severity: 'critical' | 'warning' | 'optimal'
}

export interface ReorderSuggestionsProps {
  products: Product[]
  warehouses: Warehouse[]
  onApplySuggestion?: (suggestion: {
    productId: string
    sourceWarehouseId: string
    destWarehouseId: string
    quantity: number
    productName: string
  }) => void
  onHoverSuggestion?: (suggestion: RebalanceSuggestion | null) => void
  className?: string
}

export default function ReorderSuggestions({
  products,
  warehouses,
  onApplySuggestion,
  onHoverSuggestion,
  className = '',
}: ReorderSuggestionsProps) {
  const warehouseName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name ?? id

  // Compute intelligent rebalancing recommendations
  const suggestions: RebalanceSuggestion[] = useMemo(() => {
    const list: RebalanceSuggestion[] = []

    // Group products by exact product name
    const grouped = new Map<string, Product[]>()
    products.forEach((p) => {
      const existing = grouped.get(p.name) || []
      existing.push(p)
      grouped.set(p.name, existing)
    })

    grouped.forEach((prodInstances, name) => {
      // Find low stock instances
      const needy = prodInstances.filter((p) => p.currentStock <= p.reorderThreshold)
      const surpluses = prodInstances.filter((p) => p.currentStock > p.reorderThreshold)

      needy.forEach((dest) => {
        // Find best source with the biggest surplus
        if (surpluses.length > 0) {
          const sortedSurplus = [...surpluses].sort(
            (a, b) => b.currentStock - a.currentStock,
          )
          const source = sortedSurplus[0]

          // Calculate safe transfer quantity:
          // Deficit at destination: dest.reorderThreshold - dest.currentStock + buffer
          const deficit = dest.reorderThreshold - dest.currentStock
          const sourceSurplus = source.currentStock - source.reorderThreshold

          if (sourceSurplus > 0) {
            // Transfer either enough to bring dest above threshold or up to half source's surplus
            const transferQty = Math.max(
              1,
              Math.min(
                deficit > 0 ? deficit + 5 : 5,
                Math.floor(sourceSurplus * 0.7),
                source.currentStock - 1,
              ),
            )

            if (transferQty > 0) {
              const severity: 'critical' | 'warning' =
                dest.currentStock === 0 || dest.currentStock <= dest.reorderThreshold * 0.25
                  ? 'critical'
                  : 'warning'

              list.push({
                id: `sug-${source.id}-${dest.id}`,
                productId: source.id,
                productName: name,
                category: source.category,
                sourceWarehouseId: source.warehouseId,
                sourceWarehouseName: warehouseName(source.warehouseId),
                sourceCurrentStock: source.currentStock,
                destWarehouseId: dest.warehouseId,
                destWarehouseName: warehouseName(dest.warehouseId),
                destCurrentStock: dest.currentStock,
                destThreshold: dest.reorderThreshold,
                suggestedQuantity: transferQty,
                reason: `${warehouseName(dest.warehouseId)} is low (${dest.currentStock}/${dest.reorderThreshold} units), while ${warehouseName(source.warehouseId)} holds ${source.currentStock} units.`,
                severity,
              })
            }
          }
        }
      })
    })

    return list.sort((a, b) => (a.severity === 'critical' ? -1 : 1))
  }, [products, warehouses])

  return (
    <div className={`bg-[#fbfaf6] border border-[#d8d2c2] rounded-md p-5 shadow-xs ${className}`}>
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e2ddce]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-sm bg-[#eab308]/20 text-[#ca8a04]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-[#1b1e1c]">
              Smart Rebalancing Recommendations
            </h3>
            <p className="text-xs text-[#6b6f68]">
              Automated cross-hub stock balancing to prevent stockouts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#eee9dc] text-[#1b1e1c] border border-[#d8d2c2]">
            {suggestions.length} available
          </span>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-8 px-4 bg-[#eee9dc]/30 rounded-md border border-dashed border-[#d8d2c2]">
          <CheckCircle2 className="w-8 h-8 text-[#4b6357] mx-auto mb-2" />
          <h4 className="font-semibold text-sm text-[#1b1e1c]">All Hubs Well-Balanced</h4>
          <p className="text-xs text-[#6b6f68] max-w-sm mx-auto mt-1">
            No inter-warehouse transfers needed at this moment. Current inventory meets buffer thresholds.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {suggestions.map((sug) => (
            <div
              key={sug.id}
              onMouseEnter={() => onHoverSuggestion && onHoverSuggestion(sug)}
              onMouseLeave={() => onHoverSuggestion && onHoverSuggestion(null)}
              className="group relative p-3.5 rounded-md border border-[#d8d2c2] bg-[#ffffff] hover:border-[#ca8a04] hover:shadow-xs transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-sm text-[#1b1e1c]">
                      {sug.productName}
                    </span>
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[#eee9dc] text-[#6b6f68]">
                      {sug.category}
                    </span>
                    {sug.severity === 'critical' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#8b4a3f]/15 text-[#8b4a3f]">
                        <AlertCircle className="w-3 h-3" /> Critical Stockout
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#eab308]/20 text-[#a67c3d]">
                        <TrendingDown className="w-3 h-3" /> Low Threshold
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#6b6f68] mt-1.5 leading-relaxed">
                    {sug.reason}
                  </p>

                  <div className="flex items-center gap-2 text-xs mt-2.5 font-medium">
                    <span className="text-[#4b6357] font-semibold">
                      {sug.sourceWarehouseName} ({sug.sourceCurrentStock} units)
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#ca8a04]" />
                    <span className="text-[#8b4a3f] font-semibold">
                      {sug.destWarehouseName} ({sug.destCurrentStock} units)
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right flex flex-col items-end gap-2">
                  <div className="bg-[#eee9dc] px-2.5 py-1 rounded text-center border border-[#d8d2c2]">
                    <div className="text-[10px] text-[#6b6f68] font-semibold uppercase">Suggest</div>
                    <div className="font-display font-bold text-sm text-[#1b1e1c]">
                      +{sug.suggestedQuantity} units
                    </div>
                  </div>

                  {onApplySuggestion && (
                    <button
                      type="button"
                      onClick={() =>
                        onApplySuggestion({
                          productId: sug.productId,
                          sourceWarehouseId: sug.sourceWarehouseId,
                          destWarehouseId: sug.destWarehouseId,
                          quantity: sug.suggestedQuantity,
                          productName: sug.productName,
                        })
                      }
                      className="btn btn-primary text-xs py-1 px-2.5 flex items-center gap-1 shadow-2xs font-semibold"
                    >
                      <span>Pre-fill Transfer</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
