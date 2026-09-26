'use client'

import React, { useState } from 'react'
import { Product, Warehouse, Transaction } from '@/lib/types'
import ObsidianWarehouseGraph, { ActiveTransferInfo } from './ObsidianWarehouseGraph'
import { ArrowRightLeft, GitFork, Activity, Layers, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export interface WarehouseFlowDiagramProps {
  warehouses: Warehouse[]
  products: Product[]
  transactions?: Transaction[]
  selectedWarehouseId?: string | 'all'
  onSelectWarehouse?: (id: string) => void
  activeTransfer?: ActiveTransferInfo | null
  onQuickTransferSelect?: (sourceId: string, destId: string) => void
  className?: string
}

export default function WarehouseFlowDiagram({
  warehouses,
  products,
  transactions = [],
  selectedWarehouseId = 'all',
  onSelectWarehouse,
  activeTransfer,
  onQuickTransferSelect,
  className = '',
}: WarehouseFlowDiagramProps) {
  const [viewMode, setViewMode] = useState<'network' | 'chord'>('network')

  // Calculate transfer volume metrics between pairs
  const transferStats = React.useMemo(() => {
    let northToSouth = 0
    let southToNorth = 0
    let totalTransfers = 0

    transactions.forEach((t) => {
      if (t.type === 'TRANSFER_OUT') {
        totalTransfers += t.quantity
        if (t.warehouseId === 'wh-north') {
          northToSouth += t.quantity
        } else if (t.warehouseId === 'wh-south') {
          southToNorth += t.quantity
        }
      }
    })

    return {
      northToSouth,
      southToNorth,
      totalTransfers,
    }
  }, [transactions])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Controls Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-sm bg-[#eab308]/20 text-[#ca8a04]">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-[#1b1e1c]">
              Warehouse Topology & Flow Graph
            </h3>
            <p className="text-xs text-[#6b6f68]">
              Inter-warehouse logistics network and dynamic chord trade arcs
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-[#eee9dc] p-0.5 rounded-sm border border-[#d8d2c2]">
          <button
            type="button"
            onClick={() => setViewMode('network')}
            className={`px-3 py-1 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 ${
              viewMode === 'network'
                ? 'bg-[#ffffff] text-[#1b1e1c] shadow-2xs'
                : 'text-[#6b6f68] hover:text-[#1b1e1c]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#ca8a04]" />
            <span>Obsidian Network</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('chord')}
            className={`px-3 py-1 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5 ${
              viewMode === 'chord'
                ? 'bg-[#ffffff] text-[#1b1e1c] shadow-2xs'
                : 'text-[#6b6f68] hover:text-[#1b1e1c]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#4b6357]" />
            <span>Chord Arc Flow</span>
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      {viewMode === 'network' ? (
        <ObsidianWarehouseGraph
          warehouses={warehouses}
          products={products}
          selectedWarehouseId={selectedWarehouseId}
          onSelectWarehouse={onSelectWarehouse}
          activeTransfer={activeTransfer}
          onQuickTransferSelect={onQuickTransferSelect}
          height={380}
        />
      ) : (
        /* Chord Arc Flow Visualizer */
        <div className="p-6 rounded-md bg-[#fbfaf6] border border-[#d8d2c2] shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Chord Arc Graphic */}
            <div className="relative flex items-center justify-center p-4">
              <svg width="280" height="240" viewBox="0 0 280 240" className="overflow-visible">
                <defs>
                  <linearGradient id="chord-n2s" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4b6357" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                  <linearGradient id="chord-s2n" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ca8a04" />
                    <stop offset="100%" stopColor="#4b6357" />
                  </linearGradient>
                </defs>

                {/* Left Node (North DC) */}
                <g transform="translate(50, 120)">
                  <circle r="36" fill="#fbfaf6" stroke="#4b6357" strokeWidth="2.5" />
                  <circle r="42" fill="none" stroke="#4b6357" strokeWidth="1" strokeDasharray="3,3" />
                  <text textAnchor="middle" y="-6" fontSize="11" fontWeight="700" fill="#1b1e1c">
                    North DC
                  </text>
                  <text textAnchor="middle" y="10" fontSize="9.5" fill="#6b6f68">
                    Elkridge, MD
                  </text>
                </g>

                {/* Right Node (South FH) */}
                <g transform="translate(230, 120)">
                  <circle r="36" fill="#fbfaf6" stroke="#ca8a04" strokeWidth="2.5" />
                  <circle r="42" fill="none" stroke="#ca8a04" strokeWidth="1" strokeDasharray="3,3" />
                  <text textAnchor="middle" y="-6" fontSize="11" fontWeight="700" fill="#1b1e1c">
                    South FH
                  </text>
                  <text textAnchor="middle" y="10" fontSize="9.5" fill="#6b6f68">
                    Waco, TX
                  </text>
                </g>

                {/* Top Chord Arc: North -> South */}
                <path
                  d="M 86 100 Q 140 40 194 100"
                  fill="none"
                  stroke="url(#chord-n2s)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="opacity-80"
                />
                <circle cx="140" cy="70" r="4" fill="#eab308" className="animate-ping" />

                {/* Bottom Chord Arc: South -> North */}
                <path
                  d="M 194 140 Q 140 200 86 140"
                  fill="none"
                  stroke="url(#chord-s2n)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="opacity-70"
                />
              </svg>
            </div>

            {/* Chord Metrics & Balance Sheet */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-md bg-[#eee9dc]/60 border border-[#d8d2c2]">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-[#4b6357]">
                    <ArrowUpRight className="w-4 h-4 text-[#4b6357]" />
                    North → South Outbound
                  </span>
                  <span className="font-display font-bold text-sm text-[#1b1e1c]">
                    {transferStats.northToSouth} Units
                  </span>
                </div>
                <div className="w-full bg-[#d8d2c2] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#4b6357] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        transferStats.totalTransfers > 0
                          ? (transferStats.northToSouth / transferStats.totalTransfers) * 100
                          : 50
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-md bg-[#eee9dc]/60 border border-[#d8d2c2]">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5 text-[#ca8a04]">
                    <ArrowDownLeft className="w-4 h-4 text-[#ca8a04]" />
                    South → North Inbound
                  </span>
                  <span className="font-display font-bold text-sm text-[#1b1e1c]">
                    {transferStats.southToNorth} Units
                  </span>
                </div>
                <div className="w-full bg-[#d8d2c2] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#ca8a04] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        transferStats.totalTransfers > 0
                          ? (transferStats.southToNorth / transferStats.totalTransfers) * 100
                          : 50
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#e2ddce] text-xs text-[#6b6f68]">
                <span>Total Rebalanced Flow:</span>
                <strong className="text-[#1b1e1c] font-display font-bold text-sm">
                  {transferStats.totalTransfers} units moved
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
