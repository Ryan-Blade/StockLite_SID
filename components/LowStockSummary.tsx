'use client'

import React, { useMemo } from 'react'
import { Product, Warehouse } from '@/lib/types'
import DonutChart from './DonutChart'
import { AlertTriangle, CheckCircle2, ShieldAlert, Warehouse as WarehouseIcon } from 'lucide-react'

export interface LowStockSummaryProps {
  products: Product[]
  warehouses: Warehouse[]
  selectedWarehouse?: string
  onSelectWarehouse?: (warehouseId: string) => void
}

export default function LowStockSummary({
  products,
  warehouses,
  selectedWarehouse = 'all',
  onSelectWarehouse,
}: LowStockSummaryProps) {
  // Aggregate stats per warehouse
  const stats = useMemo(() => {
    return warehouses.map((w) => {
      const wProducts = products.filter((p) => p.warehouseId === w.id)
      const lowStock = wProducts.filter((p) => p.currentStock <= p.reorderThreshold)
      const criticalStock = wProducts.filter((p) => p.currentStock === 0)
      const healthyStock = wProducts.filter((p) => p.currentStock > p.reorderThreshold)
      const totalUnits = wProducts.reduce((sum, p) => sum + p.currentStock, 0)

      return {
        warehouse: w,
        totalSkus: wProducts.length,
        lowStockCount: lowStock.length,
        criticalCount: criticalStock.length,
        healthyCount: healthyStock.length,
        totalUnits,
        isAllClear: lowStock.length === 0,
        lowStockItems: lowStock,
      }
    })
  }, [warehouses, products])

  const totalLowStock = useMemo(
    () => products.filter((p) => p.currentStock <= p.reorderThreshold).length,
    [products],
  )

  const totalHealthy = products.length - totalLowStock

  // Data for overall stock health donut
  const stockHealthDonutData = useMemo(() => {
    return [
      {
        id: 'healthy',
        label: 'Optimal Stock',
        value: totalHealthy,
        color: '#4b6357', // moss green
      },
      {
        id: 'low',
        label: 'Low / Reorder',
        value: totalLowStock,
        color: '#eab308', // warm yellow / brass
      },
    ]
  }, [totalHealthy, totalLowStock])

  return (
    <div className="bg-[#fbfaf6] border border-[#d8d2c2] rounded-md p-5 sm:p-6 mb-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#e2ddce]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-sm bg-[#eee9dc] text-[#ca8a04]">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h2 className="font-display font-bold text-lg text-[#1b1e1c]">
              Inventory Health & Low Stock Summary
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#6b6f68] mt-1">
            Real-time threshold monitoring across distribution centers. Click any hub to focus the inventory filter.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eee9dc] border border-[#d8d2c2] text-xs font-semibold">
            {totalLowStock > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#8b4a3f] animate-ping" />
                <span className="text-[#8b4a3f]">{totalLowStock} SKUs Need Attention</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4b6357]" />
                <span className="text-[#4b6357]">All Warehouses Stocked</span>
              </>
            )}
          </div>
          {selectedWarehouse !== 'all' && (
            <button
              onClick={() => onSelectWarehouse && onSelectWarehouse('all')}
              className="text-xs text-[#ca8a04] hover:underline font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-center">
        {/* Radial Donut Chart for Network-wide Health */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 rounded-md bg-[#eee9dc]/40 border border-[#d8d2c2]/60">
          <span className="text-xs font-bold text-[#1b1e1c] tracking-wide mb-3 uppercase">
            Network Stock Health
          </span>
          <DonutChart
            data={stockHealthDonutData}
            centerValue={totalLowStock > 0 ? `${totalLowStock}` : '100%'}
            centerLabel={totalLowStock > 0 ? 'Low SKUs' : 'Nominal'}
            centerSubtext={totalLowStock > 0 ? 'Reorder needed' : 'All clear'}
            size={160}
            thickness={24}
            legendPosition="bottom"
            onSliceClick={(slice) => {
              // Could filter
            }}
          />
        </div>

        {/* Warehouse Specific Health Breakdown Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.map((stat) => {
            const isSelected = selectedWarehouse === stat.warehouse.id
            const ratio =
              stat.totalSkus > 0
                ? Math.round(((stat.totalSkus - stat.lowStockCount) / stat.totalSkus) * 100)
                : 100

            return (
              <div
                key={stat.warehouse.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (onSelectWarehouse) {
                    onSelectWarehouse(isSelected ? 'all' : stat.warehouse.id)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (onSelectWarehouse) {
                      onSelectWarehouse(isSelected ? 'all' : stat.warehouse.id)
                    }
                  }
                }}
                className={`relative p-4 rounded-md border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#fffde7] border-[#ca8a04] shadow-md ring-2 ring-[#eab308]/40'
                    : 'bg-[#fbfaf6] border-[#d8d2c2] hover:border-[#a67c3d] hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-sm flex items-center justify-center ${
                          stat.isAllClear
                            ? 'bg-[#4b6357]/15 text-[#4b6357]'
                            : 'bg-[#8b4a3f]/15 text-[#8b4a3f]'
                        }`}
                      >
                        <WarehouseIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-display font-bold text-sm text-[#1b1e1c] leading-tight">
                          {stat.warehouse.name}
                        </div>
                        <div className="text-[11px] text-[#6b6f68]">{stat.warehouse.location}</div>
                      </div>
                    </div>

                    {stat.isAllClear ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#4b6357]/15 text-[#364a40]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4b6357]" />
                        Optimal
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#8b4a3f]/15 text-[#8b4a3f]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8b4a3f] animate-pulse" />
                        {stat.lowStockCount} Low
                      </span>
                    )}
                  </div>

                  {/* Stock Gauge Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-[#6b6f68] mb-1 font-medium">
                      <span>Stock Fulfillment Ratio</span>
                      <span className="font-bold text-[#1b1e1c]">{ratio}% Healthy</span>
                    </div>
                    <div className="w-full h-2 bg-[#eee9dc] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          ratio === 100
                            ? 'bg-[#4b6357]'
                            : ratio >= 70
                            ? 'bg-[#eab308]'
                            : 'bg-[#8b4a3f]'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e2ddce] flex items-center justify-between text-xs">
                  <span className="text-[#6b6f68]">
                    <strong className="text-[#1b1e1c]">{stat.totalUnits}</strong> units on hand
                  </span>
                  <span
                    className={`font-semibold text-xs flex items-center gap-1 ${
                      isSelected ? 'text-[#ca8a04]' : 'text-[#4b6357]'
                    }`}
                  >
                    {isSelected ? '✓ Filtering this hub' : 'Filter Table →'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
