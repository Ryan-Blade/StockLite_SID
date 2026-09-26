'use client'

import { useMemo, useState } from 'react'
import {
  Product,
  Warehouse,
  Transaction,
  getStockStatus,
  getStockStatusLabel,
} from '@/lib/types'
import StatusBadge from '@/components/StatusBadge'
import LowStockSummary from '@/components/LowStockSummary'
import ObsidianWarehouseGraph from '@/components/ObsidianWarehouseGraph'
import DonutChart from '@/components/DonutChart'
import AddWarehouseModal from '@/components/AddWarehouseModal'
import AddItemModal from '@/components/AddItemModal'
import ItemDetailModal from '@/components/ItemDetailModal'
import { useAuth } from '@/context/AuthContext'
import {
  Download,
  Search,
  Table,
  GitFork,
  PieChart,
  Boxes,
  Warehouse as WarehouseIcon,
  Layers,
  AlertTriangle,
  Plus,
  Lock,
  ArrowUpDown,
  Zap,
  Trash2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'

type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'stock-desc'
  | 'stock-asc'
  | 'threshold-desc'
  | 'threshold-asc'

export default function InventoryTable({
  products: initialProducts,
  warehouses: initialWarehouses,
  transactions: initialTransactions = [],
}: {
  products: Product[]
  warehouses: Warehouse[]
  transactions?: Transaction[]
}) {
  const { isReadOnly, canEditWarehouse, canAddWarehouse } = useAuth()
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses)
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)

  // Modals state
  const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false)
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null)
  const [restockingId, setRestockingId] = useState<string | null>(null)
  const [toastAlert, setToastAlert] = useState<string | null>(null)

  // Filters & Sorting state
  const [activeTab, setActiveTab] = useState<'table' | 'graph' | 'analytics'>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products]
  )

  const warehouseName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name ?? id

  const showToast = (msg: string) => {
    setToastAlert(msg)
    setTimeout(() => setToastAlert(null), 3000)
  }

  // Filtered & Sorted Products
  const visibleProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase()
          const matchesName = p.name.toLowerCase().includes(q)
          const matchesCat = p.category.toLowerCase().includes(q)
          const matchesWh = warehouseName(p.warehouseId).toLowerCase().includes(q)
          const matchesId = p.id.toLowerCase().includes(q)
          if (!matchesName && !matchesCat && !matchesWh && !matchesId) return false
        }
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false
        if (selectedWarehouse !== 'all' && p.warehouseId !== selectedWarehouse) return false
        if (lowStockOnly && p.currentStock > p.reorderThreshold) return false
        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name-asc':
            return a.name.localeCompare(b.name)
          case 'name-desc':
            return b.name.localeCompare(a.name)
          case 'stock-desc':
            return b.currentStock - a.currentStock
          case 'stock-asc':
            return a.currentStock - b.currentStock
          case 'threshold-desc':
            return b.reorderThreshold - a.reorderThreshold
          case 'threshold-asc':
            return a.reorderThreshold - b.reorderThreshold
          default:
            return 0
        }
      })
  }, [products, searchQuery, selectedCategory, selectedWarehouse, lowStockOnly, warehouses, sortBy])

  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.currentStock, 0),
    [products]
  )

  const totalLowStock = useMemo(
    () => products.filter((p) => p.currentStock <= p.reorderThreshold).length,
    [products]
  )

  // Category distribution data for DonutChart
  const categoryDonutData = useMemo(() => {
    const counts: Record<string, number> = {}
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + p.currentStock
    })
    return Object.entries(counts).map(([cat, count]) => ({
      id: cat,
      label: cat,
      value: count,
    }))
  }, [products])

  // Warehouse distribution data for DonutChart
  const warehouseDonutData = useMemo(() => {
    return warehouses.map((w) => {
      const units = products
        .filter((p) => p.warehouseId === w.id)
        .reduce((sum, p) => sum + p.currentStock, 0)
      return {
        id: w.id,
        label: w.name,
        value: units,
      }
    })
  }, [warehouses, products])

  // ⚡ Restock to Threshold handler
  const handleRestockToThreshold = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isReadOnly || !canEditWarehouse(product.warehouseId)) {
      showToast('⚠️ Role Restriction: Unauthorized to restock in this warehouse.')
      return
    }

    setRestockingId(product.id)
    try {
      const needed = Math.max(1, product.reorderThreshold - product.currentStock + 20)
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stock',
          productId: product.id,
          quantity: needed,
          direction: 'IN',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to restock item')
      }

      const updated = data.product || {
        ...product,
        currentStock: product.currentStock + needed,
      }

      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      if (data.transactions) {
        setTransactions(data.transactions)
      }
      showToast(`⚡ Restocked "${product.name}" (+${needed} units to safe level)!`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Restock failed')
    } finally {
      setRestockingId(null)
    }
  }

  // Delete item handler
  const handleDeleteProduct = async (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const target = products.find((p) => p.id === productId)
    if (!target) return

    if (isReadOnly || !canEditWarehouse(target.warehouseId)) {
      showToast('⚠️ Role Restriction: You cannot delete items in this warehouse.')
      return
    }

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_product',
          productId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete product')
      }

      setProducts((prev) => prev.filter((p) => p.id !== productId))
      if (selectedProductForDetail?.id === productId) {
        setSelectedProductForDetail(null)
      }
      showToast(`SKU "${target.name}" removed from registry.`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleProductAdded = (newProduct: Product) => {
    setProducts((prev) => [...prev, newProduct])
    showToast(`New SKU "${newProduct.name}" registered in ${warehouseName(newProduct.warehouseId)}.`)
  }

  const handleWarehouseAdded = (newWarehouse: Warehouse) => {
    setWarehouses((prev) => [...prev, newWarehouse])
    setSelectedWarehouse(newWarehouse.id)
    showToast(`Warehouse "${newWarehouse.name}" registered.`)
  }

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      'Product ID',
      'Product Name',
      'Category',
      'Warehouse',
      'Current Stock',
      'Reorder Threshold',
      'Status',
    ]
    const rows = visibleProducts.map((p) => {
      const status = getStockStatus(p)
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category}"`,
        `"${warehouseName(p.warehouseId)}"`,
        p.currentStock,
        p.reorderThreshold,
        getStockStatusLabel(status),
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Toast Alert Banner */}
      {toastAlert && (
        <div className="fixed top-5 right-5 z-50 p-3.5 bg-[#1b1e1c] text-[#facc15] text-xs font-semibold rounded-md shadow-2xl flex items-center gap-2 border border-[#ca8a04] animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-[#facc15] shrink-0" />
          <span>{toastAlert}</span>
        </div>
      )}

      {/* Top Metrics Strip */}
      <div className="summary-strip">
        <div className="summary-tile">
          <div className="value">{products.length}</div>
          <div className="label">Total SKUs tracked</div>
        </div>
        <div className="summary-tile">
          <div className="value">{warehouses.length}</div>
          <div className="label">Warehouses</div>
        </div>
        <div className="summary-tile">
          <div className="value">{categories.length}</div>
          <div className="label">Categories</div>
        </div>
        <div className="summary-tile">
          <div className="value">{totalUnits.toLocaleString()}</div>
          <div className="label">Units on hand</div>
        </div>
      </div>

      {/* Radial Low Stock Summary Section */}
      <LowStockSummary
        products={products}
        warehouses={warehouses}
        selectedWarehouse={selectedWarehouse}
        onSelectWarehouse={(id) => setSelectedWarehouse(id)}
      />

      {/* Main View Mode Selector Tabs & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* View mode toggle tabs */}
        <div className="inline-flex bg-[#eee9dc] p-1 rounded-sm border border-[#d8d2c2]">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'table'
                ? 'bg-[#ffffff] text-[#1b1e1c] shadow-2xs'
                : 'text-[#6b6f68] hover:text-[#1b1e1c]'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-[#4b6357]" />
            <span>Table Grid ({visibleProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'graph'
                ? 'bg-[#ffffff] text-[#1b1e1c] shadow-2xs'
                : 'text-[#6b6f68] hover:text-[#1b1e1c]'
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-[#ca8a04]" />
            <span>Obsidian Warehouse Graph</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xs transition-all flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-[#ffffff] text-[#1b1e1c] shadow-2xs'
                : 'text-[#6b6f68] hover:text-[#1b1e1c]'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-[#a67c3d]" />
            <span>Category & Stock Analytics</span>
          </button>
        </div>

        {/* Header Action Buttons: Add Item, Add Warehouse, CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add New Item Button */}
          <button
            type="button"
            onClick={() => setIsAddItemOpen(true)}
            className="btn btn-primary text-xs px-3.5 py-2 flex items-center justify-center gap-1.5 shadow-2xs font-bold"
            title={isReadOnly ? 'Sign in to add items' : 'Register a new SKU'}
          >
            {isReadOnly ? <Lock className="w-3.5 h-3.5 text-[#ca8a04]" /> : <Plus className="w-3.5 h-3.5" />}
            <span>+ Add New Item</span>
          </button>

          {/* Add Warehouse Button */}
          <button
            type="button"
            onClick={() => setIsAddWarehouseOpen(true)}
            className="btn btn-secondary text-xs px-3 py-2 flex items-center justify-center gap-1.5 shadow-2xs font-semibold"
            title={canAddWarehouse ? 'Register new warehouse facility' : 'Admin access required'}
          >
            {!canAddWarehouse ? <Lock className="w-3.5 h-3.5 text-[#6b6f68]" /> : <WarehouseIcon className="w-3.5 h-3.5 text-[#1b1e1c]" />}
            <span>Add Warehouse</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-secondary text-xs px-3 py-2 flex items-center justify-center gap-1.5 shadow-2xs font-semibold"
            title="Export current view to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#1b1e1c]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: OBSIDIAN GRAPH VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'graph' && (
        <div className="mb-6">
          <ObsidianWarehouseGraph
            warehouses={warehouses}
            products={products}
            selectedWarehouseId={selectedWarehouse}
            onSelectWarehouse={(id) => {
              setSelectedWarehouse(id)
            }}
            height={420}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ANALYTICS & RADIAL DONUTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Category Distribution Donut */}
          <div className="bg-[#fbfaf6] border border-[#d8d2c2] rounded-md p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-sm bg-[#4b6357]/15 text-[#4b6357]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#1b1e1c]">
                  Category Volume Breakdown
                </h3>
                <p className="text-xs text-[#6b6f68]">Units stored by product classification</p>
              </div>
            </div>

            <div className="flex items-center justify-center py-4">
              <DonutChart
                data={categoryDonutData}
                centerLabel="Total Units"
                centerValue={totalUnits.toLocaleString()}
                size={190}
                thickness={26}
                legendPosition="right"
                onSliceClick={(slice) => {
                  setSelectedCategory(slice.id === selectedCategory ? 'all' : slice.id || 'all')
                }}
              />
            </div>

            <div className="pt-3 border-t border-[#e2ddce] text-[11px] text-[#6b6f68] text-center">
              Click slice to filter table by category
            </div>
          </div>

          {/* Warehouse Unit Distribution Donut */}
          <div className="bg-[#fbfaf6] border border-[#d8d2c2] rounded-md p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-sm bg-[#eab308]/20 text-[#ca8a04]">
                <WarehouseIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-[#1b1e1c]">
                  Warehouse Volume Split
                </h3>
                <p className="text-xs text-[#6b6f68]">Total physical units housed across sites</p>
              </div>
            </div>

            <div className="flex items-center justify-center py-4">
              <DonutChart
                data={warehouseDonutData}
                centerLabel="Network Units"
                centerValue={totalUnits.toLocaleString()}
                size={190}
                thickness={26}
                legendPosition="right"
                onSliceClick={(slice) => {
                  setSelectedWarehouse(slice.id === selectedWarehouse ? 'all' : slice.id || 'all')
                }}
              />
            </div>

            <div className="pt-3 border-t border-[#e2ddce] text-[11px] text-[#6b6f68] text-center">
              Click slice to filter table by warehouse
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FILTER & SORT CONTROLS BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="filter-bar flex flex-wrap gap-2.5">
        {/* Instant Search Bar */}
        <div className="relative flex-1 min-w-[200px] flex items-center">
          <Search className="w-4 h-4 text-[#6b6f68] absolute left-3 pointer-events-none shrink-0" />
          <input
            type="text"
            placeholder="Search SKU name, ID, or hub..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px', paddingRight: '32px' }}
            className="w-full text-sm bg-white border border-[#d8d2c2] rounded-sm focus:border-[#4b6357]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-xs text-[#6b6f68] hover:text-[#1b1e1c] p-1"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-1.5 bg-white border border-[#d8d2c2] rounded-sm px-2 py-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#6b6f68]" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-transparent text-xs font-semibold text-[#1b1e1c] border-none outline-none pr-1"
            aria-label="Sort inventory"
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="stock-desc">Stock: High to Low</option>
            <option value="stock-asc">Stock: Low to High</option>
            <option value="threshold-desc">Threshold: High to Low</option>
            <option value="threshold-asc">Threshold: Low to High</option>
          </select>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Warehouse Filter */}
        <select
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
          aria-label="Filter by warehouse"
        >
          <option value="all">All warehouses ({warehouses.length})</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        {/* Low Stock Checkbox Filter */}
        <label className="checkbox-filter">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          <span className="text-xs font-medium text-[#1b1e1c]">
            Low stock only ({totalLowStock})
          </span>
        </label>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TABLE PANEL */}
      {/* ------------------------------------------------------------- */}
      <div className="panel table-panel">
        {visibleProducts.length === 0 ? (
          <div className="empty-state">
            <h3>No products match these filters</h3>
            <p>Try a different keyword, category, or clear the low stock filter.</p>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Inventory table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Warehouse</th>
                  <th>Current stock</th>
                  <th>Reorder threshold</th>
                  <th>Status</th>
                  <th className="text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const status = getStockStatus(product)
                  const isLow = status === 'low'
                  const isAuthorized = canEditWarehouse(product.warehouseId)

                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProductForDetail(product)}
                      className="cursor-pointer hover:bg-[#eee9dc]/50 transition-colors group"
                      title="Click to view detailed SKU specs and chronological order flow"
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[#6b6f68] font-bold">
                            {product.id}
                          </span>
                          <span className="font-semibold text-[#1b1e1c] group-hover:text-[#ca8a04] transition-colors">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#eee9dc] text-[#1b1e1c]">
                          {product.category}
                        </span>
                      </td>
                      <td>{warehouseName(product.warehouseId)}</td>
                      <td className="font-bold text-[#1b1e1c]">
                        <span className={isLow ? 'text-[#8b4a3f]' : ''}>
                          {product.currentStock}
                        </span>
                      </td>
                      <td className="text-[#6b6f68]">{product.reorderThreshold}</td>
                      <td>
                        <StatusBadge
                          status={status}
                          label={getStockStatusLabel(status)}
                        />
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* ⚡ Restock to Threshold Button for Low Stock Items */}
                          {isLow && (
                            <button
                              type="button"
                              onClick={(e) => handleRestockToThreshold(product, e)}
                              disabled={isReadOnly || !isAuthorized || restockingId === product.id}
                              className="px-2.5 py-1 text-[11px] font-bold bg-[#ca8a04] text-[#ffffff] hover:bg-[#a16207] rounded shadow-2xs transition-all flex items-center gap-1 disabled:opacity-40"
                              title="1-Click Restock: Instantly restore stock to safe threshold level"
                            >
                              <Zap className="w-3 h-3 text-[#fef08a]" />
                              <span>{restockingId === product.id ? 'Restocking...' : '⚡ Restock'}</span>
                            </button>
                          )}

                          {/* Inspect Detail Drawer trigger */}
                          <button
                            type="button"
                            onClick={() => setSelectedProductForDetail(product)}
                            className="p-1 rounded text-[#6b6f68] hover:text-[#1b1e1c] hover:bg-[#eee9dc]"
                            title="Open SKU Drawer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Delete SKU button if authorized */}
                          {isAuthorized && !isReadOnly && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteProduct(product.id, e)}
                              className="p-1 rounded text-[#6b6f68] hover:text-[#8b4a3f] hover:bg-[#fee2e2]"
                              title="Remove item from inventory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Warehouse Interactive Modal */}
      <AddWarehouseModal
        isOpen={isAddWarehouseOpen}
        onClose={() => setIsAddWarehouseOpen(false)}
        onWarehouseAdded={handleWarehouseAdded}
        onProductAdded={handleProductAdded}
      />

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onProductAdded={handleProductAdded}
        warehouses={warehouses}
        existingCategories={categories}
        defaultWarehouseId={selectedWarehouse !== 'all' ? selectedWarehouse : undefined}
      />

      {/* Item Details Interactive Drawer */}
      <ItemDetailModal
        product={selectedProductForDetail}
        warehouses={warehouses}
        transactions={transactions}
        isOpen={Boolean(selectedProductForDetail)}
        onClose={() => setSelectedProductForDetail(null)}
        onRestock={(updated) => {
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          setSelectedProductForDetail(updated)
        }}
        onDelete={(deletedId) => {
          setProducts((prev) => prev.filter((p) => p.id !== deletedId))
          setSelectedProductForDetail(null)
        }}
      />
    </>
  )
}
