import { Product, Warehouse } from './types'

export interface RebalanceSuggestion {
  id: string
  productId: string
  productName: string
  category: string
  sourceProductId: string
  sourceWarehouseId: string
  sourceWarehouseName: string
  sourceCurrentStock: number
  sourceReorderThreshold: number
  sourceAvailableSurplus: number
  targetProductId: string
  targetWarehouseId: string
  targetWarehouseName: string
  targetCurrentStock: number
  targetReorderThreshold: number
  targetDeficit: number
  suggestedQuantity: number
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
}

export interface RebalanceOptions {
  /**
   * Additional safety buffer above the reorder threshold to replenish.
   * Default is 0 (replenish up to reorderThreshold).
   */
  safetyMargin?: number
  /**
   * Minimum transferable quantity to warrant a rebalancing action.
   * Default is 1.
   */
  minTransferQuantity?: number
}

/**
 * Calculates cross-warehouse inventory rebalancing suggestions.
 * 
 * Rules:
 * 1. Identifies products where currentStock <= reorderThreshold at target warehouse A.
 * 2. Finds donor warehouses B having the same product where currentStock > reorderThreshold.
 * 3. Suggested transfer quantity = min(deficit at A, available surplus at B).
 * 4. Never pulls donor warehouse B below its own reorderThreshold.
 * 5. Prioritizes largest donor surpluses and deepest deficits.
 */
export function calculateRebalanceSuggestions(
  products: Product[],
  warehouses: Warehouse[],
  options: RebalanceOptions = {},
): RebalanceSuggestion[] {
  const { safetyMargin = 0, minTransferQuantity = 1 } = options

  if (!products || products.length === 0) {
    return []
  }

  // Create a fast lookup map for warehouse names
  const warehouseMap = new Map<string, string>()
  for (const wh of warehouses || []) {
    warehouseMap.set(wh.id, wh.name)
  }

  const getWarehouseName = (id: string): string => {
    return warehouseMap.get(id) || id
  }

  // Group products by product name (SKU identifier)
  const productsBySku = new Map<string, Product[]>()
  for (const product of products) {
    if (!product || !product.name) continue
    const key = product.name.trim()
    const list = productsBySku.get(key) || []
    list.push(product)
    productsBySku.set(key, list)
  }

  const suggestions: RebalanceSuggestion[] = []
  let suggestionIndex = 1

  // Process each SKU group
  for (const [productName, skuProducts] of productsBySku.entries()) {
    if (skuProducts.length <= 1) {
      // Need at least 2 warehouses to rebalance
      continue
    }

    // Track simulated dynamic surplus available at each donor warehouse
    // so we never over-allocate from a donor across multiple deficit targets
    const donorSurplusMap = new Map<string, number>()
    for (const p of skuProducts) {
      const surplus = Math.max(0, p.currentStock - p.reorderThreshold)
      donorSurplusMap.set(p.id, surplus)
    }

    // Identify deficit targets (currentStock <= reorderThreshold)
    const deficitTargets = skuProducts
      .filter((p) => p.currentStock <= p.reorderThreshold)
      .map((p) => {
        const targetDeficit = Math.max(
          0,
          p.reorderThreshold + safetyMargin - p.currentStock,
        )
        return {
          product: p,
          deficit: targetDeficit,
        }
      })
      // Sort deepest deficit first (e.g. out-of-stock items first)
      .sort((a, b) => b.deficit - a.deficit)

    for (const target of deficitTargets) {
      let remainingDeficit = target.deficit
      if (remainingDeficit <= 0) continue

      // Find available donors with surplus > 0 in different warehouses
      const potentialDonors = skuProducts
        .filter(
          (p) =>
            p.warehouseId !== target.product.warehouseId &&
            (donorSurplusMap.get(p.id) ?? 0) >= minTransferQuantity,
        )
        .sort((a, b) => {
          const surplusA = donorSurplusMap.get(a.id) ?? 0
          const surplusB = donorSurplusMap.get(b.id) ?? 0
          return surplusB - surplusA
        })

      for (const donor of potentialDonors) {
        if (remainingDeficit <= 0) break

        const availableSurplus = donorSurplusMap.get(donor.id) ?? 0
        if (availableSurplus < minTransferQuantity) continue

        // Transfer quantity = min(deficit, available surplus)
        const transferQty = Math.min(remainingDeficit, availableSurplus)
        if (transferQty < minTransferQuantity) continue

        // Update remaining surplus for donor
        donorSurplusMap.set(donor.id, availableSurplus - transferQty)
        remainingDeficit -= transferQty

        // Determine priority level
        let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
        if (target.product.currentStock === 0) {
          priority = 'CRITICAL'
        } else if (target.product.currentStock <= target.product.reorderThreshold * 0.5) {
          priority = 'HIGH'
        } else if (target.product.currentStock <= target.product.reorderThreshold) {
          priority = 'MEDIUM'
        } else {
          priority = 'LOW'
        }

        const sourceWhName = getWarehouseName(donor.warehouseId)
        const targetWhName = getWarehouseName(target.product.warehouseId)

        const reason =
          target.product.currentStock === 0
            ? `Stockout at ${targetWhName}. Transfer ${transferQty} units from surplus at ${sourceWhName} (${availableSurplus} units above reorder threshold).`
            : `Low stock at ${targetWhName} (${target.product.currentStock}/${target.product.reorderThreshold}). Transfer ${transferQty} units from ${sourceWhName} (${donor.currentStock} in stock, threshold ${donor.reorderThreshold}).`

        suggestions.push({
          id: `reb-${String(suggestionIndex++).padStart(3, '0')}`,
          productId: target.product.id,
          productName,
          category: target.product.category,
          sourceProductId: donor.id,
          sourceWarehouseId: donor.warehouseId,
          sourceWarehouseName: sourceWhName,
          sourceCurrentStock: donor.currentStock,
          sourceReorderThreshold: donor.reorderThreshold,
          sourceAvailableSurplus: availableSurplus,
          targetProductId: target.product.id,
          targetWarehouseId: target.product.warehouseId,
          targetWarehouseName: targetWhName,
          targetCurrentStock: target.product.currentStock,
          targetReorderThreshold: target.product.reorderThreshold,
          targetDeficit: target.deficit,
          suggestedQuantity: transferQty,
          priority,
          reason,
        })
      }
    }
  }

  return suggestions
}
