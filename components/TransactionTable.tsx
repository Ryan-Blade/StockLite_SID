'use client'

import { useMemo, useState } from 'react'
import { Transaction } from '@/lib/types'
import DonutChart from '@/components/DonutChart'
import {
  Download,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  PieChart,
  History,
  Activity,
  Layers,
  Calendar,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  IN: 'Stock in',
  OUT: 'Stock out',
  TRANSFER_OUT: 'Transfer out',
  TRANSFER_IN: 'Transfer in',
}

const TYPE_COLORS: Record<string, string> = {
  IN: '#4b6357', // moss green
  OUT: '#8b4a3f', // rust
  TRANSFER_OUT: '#ca8a04', // dark yellow
  TRANSFER_IN: '#eab308', // yellow accent
}

type TimeRangeFilter = 'all' | 'today' | '7days' | '30days'

export default function TransactionTable({
  transactions,
}: {
  transactions: Transaction[]
}) {
  const warehouseOptions = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.warehouseName))).sort(),
    [transactions]
  )

  const [typeFilter, setTypeFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'SUCCESS' | 'FAILED'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAnalytics, setShowAnalytics] = useState(true)

  const visibleTransactions = useMemo(() => {
    const now = new Date().getTime()
    const oneDayMs = 24 * 60 * 60 * 1000
    const sevenDaysMs = 7 * oneDayMs
    const thirtyDaysMs = 30 * oneDayMs

    return transactions
      .filter((t) => {
        // Text Search
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase()
          const matchProd = t.productName.toLowerCase().includes(q)
          const matchWh = t.warehouseName.toLowerCase().includes(q)
          const matchType = (TYPE_LABELS[t.type] || t.type).toLowerCase().includes(q)
          const matchId = t.id.toLowerCase().includes(q)
          const matchReason = t.failureReason?.toLowerCase().includes(q) || false
          if (!matchProd && !matchWh && !matchType && !matchId && !matchReason) return false
        }

        // Type Filter
        if (typeFilter !== 'all' && t.type !== typeFilter) return false

        // Warehouse Filter
        if (warehouseFilter !== 'all' && t.warehouseName !== warehouseFilter) return false

        // Status Filter
        if (statusFilter !== 'all') {
          const isFailed = t.status === 'FAILED'
          if (statusFilter === 'FAILED' && !isFailed) return false
          if (statusFilter === 'SUCCESS' && isFailed) return false
        }

        // Time Filter
        if (timeFilter !== 'all') {
          const txTime = new Date(t.timestamp).getTime()
          const age = now - txTime
          if (timeFilter === 'today' && age > oneDayMs) return false
          if (timeFilter === '7days' && age > sevenDaysMs) return false
          if (timeFilter === '30days' && age > thirtyDaysMs) return false
        }

        return true
      })
      .sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
  }, [transactions, typeFilter, warehouseFilter, timeFilter, statusFilter, searchQuery])

  // Movement mix distribution for Donut Chart (completed only)
  const movementMixData = useMemo(() => {
    const counts: Record<string, number> = {
      IN: 0,
      OUT: 0,
      TRANSFER_OUT: 0,
      TRANSFER_IN: 0,
    }

    transactions.forEach((t) => {
      if (t.status !== 'FAILED' && counts[t.type] !== undefined) {
        counts[t.type] += t.quantity
      }
    })

    return [
      { id: 'IN', label: 'Stock In', value: counts.IN, color: TYPE_COLORS.IN },
      { id: 'OUT', label: 'Stock Out', value: counts.OUT, color: TYPE_COLORS.OUT },
      { id: 'TRANSFER_OUT', label: 'Transfer Out', value: counts.TRANSFER_OUT, color: TYPE_COLORS.TRANSFER_OUT },
      { id: 'TRANSFER_IN', label: 'Transfer In', value: counts.TRANSFER_IN, color: TYPE_COLORS.TRANSFER_IN },
    ].filter((item) => item.value > 0)
  }, [transactions])

  const totalVolumeMoved = useMemo(
    () => transactions.filter((t) => t.status !== 'FAILED').reduce((sum, t) => sum + t.quantity, 0),
    [transactions]
  )

  const failedCount = useMemo(
    () => transactions.filter((t) => t.status === 'FAILED').length,
    [transactions]
  )

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Product Name',
      'Warehouse',
      'Operation Type',
      'Quantity',
      'Status',
      'Failure Reason',
      'Linked TX',
      'Timestamp',
    ]
    const rows = visibleTransactions.map((t) => {
      return [
        t.id,
        `"${t.productName.replace(/"/g, '""')}"`,
        `"${t.warehouseName}"`,
        TYPE_LABELS[t.type] ?? t.type,
        t.quantity,
        t.status ?? 'SUCCESS',
        `"${(t.failureReason ?? '').replace(/"/g, '""')}"`,
        t.linkedTransactionId || 'N/A',
        `"${t.timestamp}"`,
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `transactions-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Top Movement Mix & Volume Overview */}
      {showAnalytics && (
        <div className="bg-[#fbfaf6] border border-[#d8d2c2] rounded-md p-5 mb-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#e2ddce]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-sm bg-[#eab308]/20 text-[#ca8a04]">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#1b1e1c]">
                  Logistics Movement Mix & Health
                </h2>
                <p className="text-xs text-[#6b6f68]">
                  Breakdown of physical unit volume across inflows, outflows, and paired transfers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {failedCount > 0 && (
                <span
                  onClick={() => setStatusFilter(statusFilter === 'FAILED' ? 'all' : 'FAILED')}
                  className="cursor-pointer text-xs font-semibold px-2.5 py-1 rounded bg-[#fee2e2] text-[#8b4a3f] border border-[#8b4a3f]/30 hover:bg-[#fecaca] transition-colors flex items-center gap-1"
                  title="Filter failed transactions"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{failedCount} Blocked / Failed</span>
                </span>
              )}

              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#eee9dc] text-[#1b1e1c]">
                {totalVolumeMoved.toLocaleString()} Units Logged
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-2">
            <DonutChart
              data={movementMixData}
              centerLabel="Units Flow"
              centerValue={totalVolumeMoved.toLocaleString()}
              size={180}
              thickness={25}
              legendPosition="right"
              onSliceClick={(slice) => {
                setTypeFilter(slice.id === typeFilter ? 'all' : slice.id || 'all')
              }}
            />

            {/* Quick summary cards */}
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto min-w-[280px]">
              <div className="p-3 rounded-md bg-[#eee9dc]/60 border border-[#d8d2c2]">
                <span className="text-[11px] text-[#6b6f68] font-semibold flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-[#4b6357]" /> Stock Inflow
                </span>
                <span className="font-display font-bold text-base text-[#1b1e1c] block mt-1">
                  {transactions
                    .filter((t) => t.type === 'IN' && t.status !== 'FAILED')
                    .reduce((s, t) => s + t.quantity, 0)}{' '}
                  Units
                </span>
              </div>

              <div className="p-3 rounded-md bg-[#eee9dc]/60 border border-[#d8d2c2]">
                <span className="text-[11px] text-[#6b6f68] font-semibold flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#8b4a3f]" /> Stock Outflow
                </span>
                <span className="font-display font-bold text-base text-[#1b1e1c] block mt-1">
                  {transactions
                    .filter((t) => t.type === 'OUT' && t.status !== 'FAILED')
                    .reduce((s, t) => s + t.quantity, 0)}{' '}
                  Units
                </span>
              </div>

              <div className="p-3 rounded-md bg-[#eee9dc]/60 border border-[#d8d2c2] col-span-2">
                <span className="text-[11px] text-[#6b6f68] font-semibold flex items-center gap-1">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#ca8a04]" /> Paired Transfers
                </span>
                <span className="font-display font-bold text-base text-[#1b1e1c] block mt-1">
                  {transactions
                    .filter((t) => (t.type === 'TRANSFER_OUT' || t.type === 'TRANSFER_IN') && t.status !== 'FAILED')
                    .reduce((s, t) => s + t.quantity, 0)}{' '}
                  Units Rebalanced
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="filter-bar !mb-0 flex-1 flex flex-wrap gap-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-[#6b6f68] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search SKU, hub, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 text-sm bg-white border border-[#d8d2c2] rounded-sm focus:border-[#4b6357]"
            />
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center gap-1 bg-white border border-[#d8d2c2] rounded-sm px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-[#6b6f68]" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeRangeFilter)}
              className="bg-transparent text-xs font-semibold text-[#1b1e1c] border-none outline-none pr-1"
              aria-label="Filter by time range"
            >
              <option value="all">All Time</option>
              <option value="today">Today (24 Hours)</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by type"
          >
            <option value="all">All movement types</option>
            <option value="IN">Stock in</option>
            <option value="OUT">Stock out</option>
            <option value="TRANSFER_OUT">Transfer out</option>
            <option value="TRANSFER_IN">Transfer in</option>
          </select>

          {/* Warehouse Filter */}
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            aria-label="Filter by warehouse"
          >
            <option value="all">All warehouses</option>
            {warehouseOptions.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* CSV Export Button */}
        <button
          type="button"
          onClick={handleExportCSV}
          className="btn btn-secondary text-xs px-3 py-2 flex items-center justify-center gap-1.5 shadow-2xs font-semibold shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-[#1b1e1c]" />
          <span>Export Log ({visibleTransactions.length})</span>
        </button>
      </div>

      {/* Transactions Table Panel */}
      <div className="panel table-panel">
        {visibleTransactions.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions match these filters</h3>
            <p>Try a different keyword, time window, or warehouse filter.</p>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Transaction history table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Status & Failure Diagnostics</th>
                  <th>Audit Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((t) => {
                  const typeColor = TYPE_COLORS[t.type] || '#6b6f68'
                  const isFailed = t.status === 'FAILED'

                  return (
                    <tr
                      key={t.id}
                      className={isFailed ? 'bg-[#fff5f5]/60 hover:bg-[#fee2e2]/40' : ''}
                    >
                      <td className="font-medium text-[#1b1e1c]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-[#6b6f68]">{t.id}</span>
                          <span>{t.productName}</span>
                        </div>
                      </td>
                      <td>{t.warehouseName}</td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: isFailed ? '#fee2e2' : `${typeColor}18`,
                            color: isFailed ? '#8b4a3f' : typeColor,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isFailed ? '#8b4a3f' : typeColor }}
                          />
                          {TYPE_LABELS[t.type] ?? t.type}
                        </span>
                      </td>
                      <td className="font-bold text-[#1b1e1c]">
                        <span className={isFailed ? 'line-through text-[#8b4a3f]/70' : ''}>
                          {t.quantity}
                        </span>
                      </td>
                      <td>
                        {isFailed ? (
                          <div className="inline-flex items-center gap-1.5 group relative">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#fee2e2] text-[#8b4a3f] border border-[#8b4a3f]/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>FAILED: {t.failureReason?.slice(0, 22) || 'Insufficient stock'}...</span>
                            </span>

                            {/* Failure reason tooltip */}
                            {t.failureReason && (
                              <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-30 p-2 bg-[#1b1e1c] text-[#fbfaf6] text-xs rounded-sm shadow-xl min-w-[220px] max-w-[320px] border border-[#8b4a3f] pointer-events-none animate-fadeIn">
                                <div className="font-bold text-[#f87171] mb-0.5 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Safety Lock Triggered</span>
                                </div>
                                <div className="text-[11px] text-[#e2ddce] leading-tight">
                                  {t.failureReason}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#4b6357] font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#4b6357]" />
                            <span>Committed</span>
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-[#6b6f68]">
                        {new Date(t.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
