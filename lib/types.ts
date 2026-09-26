// Shared types used across the StockLite app.

export type Warehouse = {
  id: string
  name: string
  location: string
}

export type Product = {
  id: string
  name: string
  category: string
  warehouseId: string
  currentStock: number
  reorderThreshold: number
}

export type TransactionType = 'IN' | 'OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN'

export type Transaction = {
  id: string
  productId: string
  productName: string
  warehouseId: string
  warehouseName: string
  type: TransactionType
  quantity: number
  timestamp: string // ISO string
  linkedTransactionId?: string // pairs TRANSFER_OUT with TRANSFER_IN
  status?: 'SUCCESS' | 'FAILED'
  failureReason?: string
}

export type StaffRole = 'viewer' | 'manager' | 'admin' | 'staff'

export type StaffUser = {
  id: string
  name: string
  role: StaffRole
  assignedWarehouseId?: string
}

// Low-stock status shared by the inventory table and status badge.
export type StockStatus = 'ok' | 'low'

export function getStockStatus(product: Product): StockStatus {
  if (product.currentStock <= product.reorderThreshold) return 'low'
  return 'ok'
}

export function getStockStatusLabel(status: StockStatus): string {
  if (status === 'low') return 'Low stock'
  return 'In stock'
}

