import { Product, Transaction, TransactionType, Warehouse } from './types'

export const warehouses: Warehouse[] = [
  {
    id: 'wh-north',
    name: 'North Distribution Center',
    location: 'Elkridge, MD',
  },
  { id: 'wh-south', name: 'South Fulfillment Hub', location: 'Waco, TX' },
]

export const products: Product[] = [
  {
    id: 'p-001',
    name: 'Corrugated Shipping Box (M)',
    category: 'Packaging',
    warehouseId: 'wh-north',
    currentStock: 420,
    reorderThreshold: 100,
  },
  {
    id: 'p-002',
    name: 'Corrugated Shipping Box (M)',
    category: 'Packaging',
    warehouseId: 'wh-south',
    currentStock: 38,
    reorderThreshold: 100,
  },
  {
    id: 'p-003',
    name: 'Stretch Wrap Film 18in',
    category: 'Packaging',
    warehouseId: 'wh-north',
    currentStock: 64,
    reorderThreshold: 60,
  },
  {
    id: 'p-004',
    name: 'Stretch Wrap Film 18in',
    category: 'Packaging',
    warehouseId: 'wh-south',
    currentStock: 15,
    reorderThreshold: 60,
  },
  {
    id: 'p-005',
    name: 'Packing Tape, Clear 48mm',
    category: 'Packaging',
    warehouseId: 'wh-north',
    currentStock: 210,
    reorderThreshold: 80,
  },
  {
    id: 'p-006',
    name: 'Heavy-Duty Pallet Jack',
    category: 'Equipment',
    warehouseId: 'wh-south',
    currentStock: 6,
    reorderThreshold: 5,
  },
  {
    id: 'p-007',
    name: 'Heavy-Duty Pallet Jack',
    category: 'Equipment',
    warehouseId: 'wh-north',
    currentStock: 3,
    reorderThreshold: 5,
  },
  {
    id: 'p-008',
    name: 'Steel Shelving Unit 5-Tier',
    category: 'Equipment',
    warehouseId: 'wh-north',
    currentStock: 12,
    reorderThreshold: 4,
  },
  {
    id: 'p-009',
    name: 'Forklift Safety Vest',
    category: 'Safety',
    warehouseId: 'wh-south',
    currentStock: 25,
    reorderThreshold: 20,
  },
  {
    id: 'p-010',
    name: 'Forklift Safety Vest',
    category: 'Safety',
    warehouseId: 'wh-north',
    currentStock: 20,
    reorderThreshold: 20,
  },
  {
    id: 'p-011',
    name: 'Nitrile Gloves (Box of 100)',
    category: 'Safety',
    warehouseId: 'wh-north',
    currentStock: 140,
    reorderThreshold: 50,
  },
  {
    id: 'p-012',
    name: 'Nitrile Gloves (Box of 100)',
    category: 'Safety',
    warehouseId: 'wh-south',
    currentStock: 9,
    reorderThreshold: 50,
  },
  {
    id: 'p-013',
    name: 'First Aid Kit, Wall-Mount',
    category: 'Safety',
    warehouseId: 'wh-south',
    currentStock: 8,
    reorderThreshold: 8,
  },
  {
    id: 'p-014',
    name: 'Handheld Barcode Scanner',
    category: 'Electronics',
    warehouseId: 'wh-north',
    currentStock: 18,
    reorderThreshold: 6,
  },
  {
    id: 'p-015',
    name: 'Handheld Barcode Scanner',
    category: 'Electronics',
    warehouseId: 'wh-south',
    currentStock: 4,
    reorderThreshold: 6,
  },
  {
    id: 'p-016',
    name: 'Label Printer, Thermal',
    category: 'Electronics',
    warehouseId: 'wh-north',
    currentStock: 9,
    reorderThreshold: 3,
  },
  {
    id: 'p-017',
    name: 'Warehouse Radio, Two-Way',
    category: 'Electronics',
    warehouseId: 'wh-south',
    currentStock: 11,
    reorderThreshold: 10,
  },
  {
    id: 'p-018',
    name: 'Wooden Pallet, Standard',
    category: 'Materials',
    warehouseId: 'wh-north',
    currentStock: 320,
    reorderThreshold: 150,
  },
  {
    id: 'p-019',
    name: 'Wooden Pallet, Standard',
    category: 'Materials',
    warehouseId: 'wh-south',
    currentStock: 132,
    reorderThreshold: 150,
  },
  {
    id: 'p-020',
    name: 'Cardboard Dunnage Sheets',
    category: 'Materials',
    warehouseId: 'wh-south',
    currentStock: 55,
    reorderThreshold: 55,
  },
]

// A few sample transactions so the History page isn't empty on first load.
export const transactions: Transaction[] = [
  {
    id: 't-001',
    productId: 'p-002',
    productName: 'Corrugated Shipping Box (M)',
    warehouseId: 'wh-south',
    warehouseName: 'South Fulfillment Hub',
    type: 'OUT',
    quantity: 62,
    timestamp: '2026-09-15T14:32:00Z',
  },
  {
    id: 't-002',
    productId: 'p-018',
    productName: 'Wooden Pallet, Standard',
    warehouseId: 'wh-north',
    warehouseName: 'North Distribution Center',
    type: 'IN',
    quantity: 100,
    timestamp: '2026-09-16T09:05:00Z',
  },
  {
    id: 't-003',
    productId: 'p-011',
    productName: 'Nitrile Gloves (Box of 100)',
    warehouseId: 'wh-north',
    warehouseName: 'North Distribution Center',
    type: 'TRANSFER_OUT',
    quantity: 40,
    timestamp: '2026-09-17T11:20:00Z',
    linkedTransactionId: 't-004',
  },
  {
    id: 't-004',
    productId: 'p-012',
    productName: 'Nitrile Gloves (Box of 100)',
    warehouseId: 'wh-south',
    warehouseName: 'South Fulfillment Hub',
    type: 'TRANSFER_IN',
    quantity: 40,
    timestamp: '2026-09-17T11:20:00Z',
    linkedTransactionId: 't-003',
    status: 'SUCCESS',
  },
  {
    id: 't-005',
    productId: 'p-004',
    productName: 'Stretch Wrap Film 18in',
    warehouseId: 'wh-south',
    warehouseName: 'South Fulfillment Hub',
    type: 'OUT',
    quantity: 50,
    timestamp: '2026-09-18T16:45:00Z',
    status: 'FAILED',
    failureReason: 'Insufficient stock. Available: 15, requested: 50',
  },
  {
    id: 't-006',
    productId: 'p-007',
    productName: 'Heavy-Duty Pallet Jack',
    warehouseId: 'wh-north',
    warehouseName: 'North Distribution Center',
    type: 'TRANSFER_OUT',
    quantity: 10,
    timestamp: '2026-09-19T08:12:00Z',
    status: 'FAILED',
    failureReason: 'Insufficient stock in source warehouse. Available: 3, requested: 10',
  },
]

let nextTransactionSeq = transactions.length + 1

function warehouseName(id: string) {
  return warehouses.find((w) => w.id === id)?.name ?? id
}

export function findProduct(id: string) {
  return products.find((p) => p.id === id)
}

export function recordTransaction(input: {
  productId: string
  productName: string
  warehouseId: string
  type: TransactionType
  quantity: number
  linkedTransactionId?: string
  timestamp?: string
  status?: 'SUCCESS' | 'FAILED'
  failureReason?: string
}): Transaction {
  const tx: Transaction = {
    id: `t-${String(nextTransactionSeq++).padStart(3, '0')}`,
    productId: input.productId,
    productName: input.productName,
    warehouseId: input.warehouseId,
    warehouseName: warehouseName(input.warehouseId),
    type: input.type,
    quantity: input.quantity,
    timestamp: input.timestamp ?? new Date().toISOString(),
    linkedTransactionId: input.linkedTransactionId,
    status: input.status ?? 'SUCCESS',
    failureReason: input.failureReason,
  }
  transactions.push(tx)
  return tx
}

// -------------------------------------------------------------------------
// Product Management
// -------------------------------------------------------------------------
export function addProduct(data: {
  name: string
  category: string
  warehouseId: string
  initialStock: number
  reorderThreshold: number
}): Product {
  if (!data || typeof data.name !== 'string' || !data.name.trim()) {
    throw new Error('Product name is required')
  }
  if (typeof data.category !== 'string' || !data.category.trim()) {
    throw new Error('Product category is required')
  }
  if (typeof data.warehouseId !== 'string' || !data.warehouseId.trim()) {
    throw new Error('Warehouse ID is required')
  }

  const warehouse = warehouses.find((w) => w.id === data.warehouseId.trim())
  if (!warehouse) {
    throw new Error(`Warehouse '${data.warehouseId}' not found`)
  }

  const initialStock = Number.isFinite(data.initialStock) && data.initialStock >= 0 ? Math.round(data.initialStock) : 0
  const reorderThreshold = Number.isFinite(data.reorderThreshold) && data.reorderThreshold >= 0 ? Math.round(data.reorderThreshold) : 10

  let maxId = 0
  for (const p of products) {
    const match = p.id.match(/^p-(\d+)$/)
    if (match) {
      maxId = Math.max(maxId, parseInt(match[1], 10))
    }
  }
  const newId = `p-${String(maxId + 1).padStart(3, '0')}`

  const newProduct: Product = {
    id: newId,
    name: data.name.trim(),
    category: data.category.trim(),
    warehouseId: warehouse.id,
    currentStock: initialStock,
    reorderThreshold,
  }

  products.push(newProduct)

  if (initialStock > 0) {
    recordTransaction({
      productId: newProduct.id,
      productName: newProduct.name,
      warehouseId: newProduct.warehouseId,
      type: 'IN',
      quantity: initialStock,
      status: 'SUCCESS',
    })
  }

  return newProduct
}

export function removeProduct(productId: string): { success: boolean; removedProduct: Product } {
  if (!productId || typeof productId !== 'string') {
    throw new Error('Product ID is required')
  }
  const index = products.findIndex((p) => p.id === productId.trim())
  if (index === -1) {
    throw new Error(`Product with ID '${productId}' not found`)
  }
  const [removedProduct] = products.splice(index, 1)
  return { success: true, removedProduct }
}

export function restockProduct(
  productId: string,
  quantity?: number,
): { product: Product; addedQuantity: number } {
  const product = findProduct(productId)
  if (!product) {
    throw new Error(`Product with ID '${productId}' not found`)
  }

  let addedQuantity: number
  if (typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0) {
    addedQuantity = Math.round(quantity)
  } else {
    const target = product.reorderThreshold + 20
    addedQuantity = Math.max(1, target - product.currentStock)
  }

  product.currentStock += addedQuantity

  recordTransaction({
    productId: product.id,
    productName: product.name,
    warehouseId: product.warehouseId,
    type: 'IN',
    quantity: addedQuantity,
    status: 'SUCCESS',
  })

  return { product, addedQuantity }
}

// -------------------------------------------------------------------------
// TASK 2 — Stock In / Stock Out
// -------------------------------------------------------------------------
export function applyStockMovement(
  productId: string,
  quantity: number,
  direction: 'IN' | 'OUT',
): Product {
  const product = findProduct(productId)
  if (!product) throw new Error('Product not found')

  if (!Number.isFinite(quantity) || quantity <= 0) {
    const reason = 'Quantity must be a positive number'
    recordTransaction({
      productId: product.id,
      productName: product.name,
      warehouseId: product.warehouseId,
      type: direction,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      status: 'FAILED',
      failureReason: reason,
    })
    throw new Error(reason)
  }

  if (direction === 'OUT' && quantity > product.currentStock) {
    const reason = `Insufficient stock. Available: ${product.currentStock}, requested: ${quantity}`
    recordTransaction({
      productId: product.id,
      productName: product.name,
      warehouseId: product.warehouseId,
      type: 'OUT',
      quantity,
      status: 'FAILED',
      failureReason: reason,
    })
    throw new Error(reason)
  }

  if (direction === 'IN') {
    product.currentStock += quantity
  } else {
    product.currentStock -= quantity
  }

  recordTransaction({
    productId: product.id,
    productName: product.name,
    warehouseId: product.warehouseId,
    type: direction,
    quantity,
    status: 'SUCCESS',
  })

  return product
}

// -------------------------------------------------------------------------
// TASK 3 — Warehouse Transfer
// -------------------------------------------------------------------------
export function applyTransfer(
  productId: string,
  destWarehouseId: string,
  quantity: number,
): { source: Product; destination: Product } {
  const source = findProduct(productId)
  if (!source) throw new Error('Source product not found')

  const destWarehouse = warehouses.find((w) => w.id === destWarehouseId)
  if (!destWarehouse) {
    const reason = 'Destination warehouse not found'
    recordTransaction({
      productId: source.id,
      productName: source.name,
      warehouseId: source.warehouseId,
      type: 'TRANSFER_OUT',
      quantity: Number.isFinite(quantity) ? quantity : 0,
      status: 'FAILED',
      failureReason: reason,
    })
    throw new Error(reason)
  }

  if (destWarehouseId === source.warehouseId) {
    const reason = 'Destination warehouse must be different from source warehouse'
    recordTransaction({
      productId: source.id,
      productName: source.name,
      warehouseId: source.warehouseId,
      type: 'TRANSFER_OUT',
      quantity: Number.isFinite(quantity) ? quantity : 0,
      status: 'FAILED',
      failureReason: reason,
    })
    throw new Error(reason)
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    const reason = 'Quantity must be a positive number'
    recordTransaction({
      productId: source.id,
      productName: source.name,
      warehouseId: source.warehouseId,
      type: 'TRANSFER_OUT',
      quantity: Number.isFinite(quantity) ? quantity : 0,
      status: 'FAILED',
      failureReason: reason,
    })
    throw new Error(reason)
  }

  if (quantity > source.currentStock) {
    const reason = `Insufficient stock in source warehouse. Available: ${source.currentStock}, requested: ${quantity}`
    recordTransaction({
      productId: source.id,
      productName: source.name,
      warehouseId: source.warehouseId,
      type: 'TRANSFER_OUT',
      quantity,
      status: 'FAILED',
      failureReason: reason,
    })
    throw new Error(reason)
  }

  // Find or create destination product row
  let destination = products.find(
    (p) => p.name === source.name && p.warehouseId === destWarehouseId,
  )

  if (!destination) {
    let maxId = 0
    for (const p of products) {
      const match = p.id.match(/^p-(\d+)$/)
      if (match) {
        maxId = Math.max(maxId, parseInt(match[1], 10))
      }
    }
    const newId = `p-${String(maxId + 1).padStart(3, '0')}`
    destination = {
      id: newId,
      name: source.name,
      category: source.category,
      warehouseId: destWarehouseId,
      currentStock: 0,
      reorderThreshold: source.reorderThreshold,
    }
    products.push(destination)
  }

  // Perform mutations
  source.currentStock -= quantity
  destination.currentStock += quantity

  // Record linked transactions
  const outTxId = `t-${String(nextTransactionSeq).padStart(3, '0')}`
  const inTxId = `t-${String(nextTransactionSeq + 1).padStart(3, '0')}`
  const now = new Date().toISOString()

  recordTransaction({
    productId: source.id,
    productName: source.name,
    warehouseId: source.warehouseId,
    type: 'TRANSFER_OUT',
    quantity,
    linkedTransactionId: inTxId,
    timestamp: now,
    status: 'SUCCESS',
  })

  recordTransaction({
    productId: destination.id,
    productName: destination.name,
    warehouseId: destination.warehouseId,
    type: 'TRANSFER_IN',
    quantity,
    linkedTransactionId: outTxId,
    timestamp: now,
    status: 'SUCCESS',
  })

  return { source, destination }
}

// -------------------------------------------------------------------------
// Warehouse Management
// -------------------------------------------------------------------------
export function addWarehouse(data: {
  name: string
  location: string
  id?: string
}): Warehouse {
  if (!data || typeof data.name !== 'string' || typeof data.location !== 'string') {
    throw new Error('Warehouse name and location are required')
  }

  const name = data.name.trim()
  const location = data.location.trim()

  if (!name || !location) {
    throw new Error('Warehouse name and location cannot be empty')
  }

  let id = data.id?.trim()
  if (!id) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    id = slug ? (slug.startsWith('wh-') ? slug : `wh-${slug}`) : `wh-${warehouses.length + 1}`
  }

  if (warehouses.some((w) => w.id === id)) {
    throw new Error(`Warehouse with ID '${id}' already exists`)
  }

  const newWarehouse: Warehouse = {
    id,
    name,
    location,
  }

  warehouses.push(newWarehouse)
  return newWarehouse
}

