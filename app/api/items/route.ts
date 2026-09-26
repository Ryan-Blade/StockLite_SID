import { NextResponse } from 'next/server'
import {
  addProduct,
  addWarehouse,
  applyStockMovement,
  applyTransfer,
  products,
  removeProduct,
  restockProduct,
  transactions,
  warehouses,
} from '@/lib/seed-data'

export async function GET() {
  return NextResponse.json({ products, warehouses, transactions })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = body.action

  try {
    if (action === 'add_product') {
      const {
        name,
        category,
        warehouseId,
        initialStock,
        currentStock,
        stock,
        reorderThreshold,
        threshold,
      } = body as {
        name?: string
        category?: string
        warehouseId?: string
        initialStock?: number
        currentStock?: number
        stock?: number
        reorderThreshold?: number
        threshold?: number
      }
      const initStock = Number(initialStock ?? currentStock ?? stock ?? 0)
      const reorder = Number(reorderThreshold ?? threshold ?? 10)
      const product = addProduct({
        name: typeof name === 'string' ? name : '',
        category: typeof category === 'string' ? category : '',
        warehouseId: typeof warehouseId === 'string' ? warehouseId : '',
        initialStock: initStock,
        reorderThreshold: reorder,
      })
      return NextResponse.json({ product, products, warehouses, transactions })
    }

    if (action === 'remove_product' || action === 'delete_product') {
      const { productId, id } = body as { productId?: string; id?: string }
      const targetId = (productId ?? id ?? '') as string
      const result = removeProduct(targetId)
      return NextResponse.json({ ...result, products, warehouses, transactions })
    }

    if (action === 'restock' || action === 'restock_threshold') {
      const { productId, id, quantity } = body as {
        productId?: string
        id?: string
        quantity?: number
      }
      const targetId = (productId ?? id ?? '') as string
      const qty = quantity !== undefined && quantity !== null ? Number(quantity) : undefined
      const result = restockProduct(targetId, qty)
      return NextResponse.json({ ...result, products, warehouses, transactions })
    }

    if (action === 'stock') {
      const { productId, quantity, direction } = body as {
        productId: string
        quantity: number
        direction: 'IN' | 'OUT'
      }
      if (direction !== 'IN' && direction !== 'OUT') {
        return NextResponse.json(
          { error: 'direction must be IN or OUT' },
          { status: 400 },
        )
      }
      const product = applyStockMovement(productId, Number(quantity), direction)
      return NextResponse.json({ product, products, warehouses, transactions })
    }

    if (action === 'transfer') {
      const { productId, destWarehouseId, quantity } = body as {
        productId: string
        destWarehouseId: string
        quantity: number
      }
      const { source, destination } = applyTransfer(
        productId,
        destWarehouseId,
        Number(quantity),
      )
      return NextResponse.json({ source, destination, products, warehouses, transactions })
    }

    if (action === 'add_warehouse') {
      const { name, location, id } = body as {
        name?: string
        location?: string
        id?: string
      }
      const warehouse = addWarehouse({
        name: typeof name === 'string' ? name : '',
        location: typeof location === 'string' ? location : '',
        id: typeof id === 'string' && id.trim() ? id.trim() : undefined,
      })
      return NextResponse.json({ warehouse, warehouses, products, transactions })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

