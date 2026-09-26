import { Product, Transaction, Warehouse, getStockStatusLabel, getStockStatus } from './types'

/**
 * Safely escapes a single value for RFC 4180 compliant CSV output.
 * Handles commas, quotes, newlines, and prevents CSV formula injection.
 */
export function escapeCSVValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '""'
  }

  let str = String(val)

  // Prevent CSV formula injection in spreadsheet applications (Excel, LibreOffice, etc.)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  // If contains double quotes, commas, or newlines, enclose in quotes and escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return `"${str}"`
}

/**
 * Converts an array of string headers and an array of row values into a full CSV string with UTF-8 BOM.
 */
export function buildCSVString(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCSVValue).join(',')
  const rowLines = rows.map((row) => row.map(escapeCSVValue).join(','))
  // Prepend UTF-8 BOM for Microsoft Excel / multi-language character encoding support
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n')
}

/**
 * Generates formatted CSV string for products and warehouse inventory.
 */
export function generateInventoryCSV(
  products: Product[],
  warehouses: Warehouse[],
): string {
  const warehouseMap = new Map<string, Warehouse>()
  for (const wh of warehouses || []) {
    warehouseMap.set(wh.id, wh)
  }

  const headers = [
    'Product ID',
    'Product Name',
    'Category',
    'Warehouse ID',
    'Warehouse Name',
    'Warehouse Location',
    'Current Stock',
    'Reorder Threshold',
    'Stock Status',
    'Variance (Stock vs Threshold)',
  ]

  const rows = (products || []).map((p) => {
    const wh = warehouseMap.get(p.warehouseId)
    const status = getStockStatus(p)
    const statusLabel = getStockStatusLabel(status)
    const variance = p.currentStock - p.reorderThreshold

    return [
      p.id,
      p.name,
      p.category,
      p.warehouseId,
      wh?.name || p.warehouseId,
      wh?.location || 'N/A',
      p.currentStock,
      p.reorderThreshold,
      statusLabel,
      variance >= 0 ? `+${variance}` : `${variance}`,
    ]
  })

  return buildCSVString(headers, rows)
}

/**
 * Generates formatted CSV string for audit transactions.
 */
export function generateTransactionsCSV(transactions: Transaction[]): string {
  const headers = [
    'Transaction ID',
    'Timestamp (ISO)',
    'Timestamp (Formatted)',
    'Product ID',
    'Product Name',
    'Warehouse ID',
    'Warehouse Name',
    'Transaction Type',
    'Quantity',
    'Linked Transaction ID',
  ]

  const rows = (transactions || []).map((tx) => {
    let formattedDate = ''
    try {
      formattedDate = new Date(tx.timestamp).toLocaleString()
    } catch {
      formattedDate = tx.timestamp
    }

    return [
      tx.id,
      tx.timestamp,
      formattedDate,
      tx.productId,
      tx.productName,
      tx.warehouseId,
      tx.warehouseName,
      tx.type,
      tx.quantity,
      tx.linkedTransactionId || '',
    ]
  })

  return buildCSVString(headers, rows)
}

/**
 * Triggers a browser file download with the given filename and CSV payload.
 * Safe for SSR environments (no-op if window/document is undefined).
 */
export function downloadCSV(filename: string, csvContent: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()

  // Clean up DOM and memory object URL
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Exports current inventory state to CSV and triggers browser download.
 */
export function exportInventoryToCSV(
  products: Product[],
  warehouses: Warehouse[],
  filename?: string,
): void {
  const dateStr = new Date().toISOString().split('T')[0]
  const targetFilename = filename || `inventory-export-${dateStr}.csv`
  const csvContent = generateInventoryCSV(products, warehouses)
  downloadCSV(targetFilename, csvContent)
}

/**
 * Exports inventory transactions to CSV and triggers browser download.
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  filename?: string,
): void {
  const dateStr = new Date().toISOString().split('T')[0]
  const targetFilename = filename || `transactions-export-${dateStr}.csv`
  const csvContent = generateTransactionsCSV(transactions)
  downloadCSV(targetFilename, csvContent)
}
