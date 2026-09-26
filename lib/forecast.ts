import { Product, Transaction } from './types'

export interface ForecastOptions {
  /**
   * Analysis window in days for calculating recent consumption velocity.
   * Default: 30 days.
   */
  windowDays?: number
  /**
   * Standard supplier delivery lead time in days.
   * Default: 7 days.
   */
  leadTimeDays?: number
  /**
   * Additional safety buffer in days beyond standard lead time.
   * Default: 7 days.
   */
  bufferDays?: number
  /**
   * Reference date for deterministic time-window evaluation.
   * Defaults to current time (new Date()).
   */
  referenceDate?: Date | string
  /**
   * Whether to include TRANSFER_OUT transactions in consumption velocity.
   * Default: true.
   */
  includeTransfers?: boolean
}

export type ForecastStatus =
  | 'OUT_OF_STOCK'
  | 'CRITICAL'
  | 'WARNING'
  | 'HEALTHY'
  | 'SURPLUS'

export type ForecastUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface ForecastAlert {
  productId: string
  productName: string
  category: string
  warehouseId: string
  warehouseName?: string
  currentStock: number
  reorderThreshold: number
  windowDays: number
  totalOutflow: number
  dailyBurnRate: number
  daysOfStockRemaining: number | null // null when dailyBurnRate is 0 and currentStock > 0
  leadTimeDays: number
  bufferDays: number
  leadTimeDemand: number
  safetyStockTarget: number
  suggestedReorderQuantity: number
  status: ForecastStatus
  urgency: ForecastUrgency
  message: string
}

/**
 * Calculates daily burn rate/velocity for an item based on historical outflow transactions.
 */
export function calculateDailyBurnRate(
  outflowQuantity: number,
  windowDays: number,
): number {
  if (windowDays <= 0) return 0
  const rate = outflowQuantity / windowDays
  return Number(rate.toFixed(2))
}

/**
 * Estimates remaining days of inventory based on current stock and daily burn rate.
 * Returns null if burn rate is 0 and stock > 0 (infinite runway).
 */
export function estimateDaysOfStockRemaining(
  currentStock: number,
  dailyBurnRate: number,
): number | null {
  if (currentStock <= 0) return 0
  if (dailyBurnRate <= 0) return null
  const days = currentStock / dailyBurnRate
  return Number(days.toFixed(1))
}

/**
 * Computes consumption velocity, runway projections, and lead-time reordering forecasts.
 * 
 * Rules:
 * 1. Analyzes outflow ('OUT' and optionally 'TRANSFER_OUT') over the given time window (e.g. 7, 14, 30 days).
 * 2. Computes daily burn rate = totalOutflow / windowDays.
 * 3. Estimates stock runway = currentStock / dailyBurnRate.
 * 4. Determines recommended reorder quantity to cover lead time + safety buffer.
 * 5. Classifies alerts into OUT_OF_STOCK, CRITICAL, WARNING, HEALTHY, or SURPLUS.
 */
export function calculateConsumptionForecasts(
  products: Product[],
  transactions: Transaction[],
  options: ForecastOptions = {},
): ForecastAlert[] {
  const {
    windowDays = 30,
    leadTimeDays = 7,
    bufferDays = 7,
    includeTransfers = true,
    referenceDate = new Date(),
  } = options

  if (!products || products.length === 0) {
    return []
  }

  const refTime =
    typeof referenceDate === 'string'
      ? new Date(referenceDate).getTime()
      : referenceDate.getTime()

  const windowMs = windowDays * 24 * 60 * 60 * 1000
  const cutoffTime = refTime - windowMs

  // Aggregate outflow per product within the time window
  const outflowMap = new Map<string, number>()
  const warehouseNameMap = new Map<string, string>()

  for (const tx of transactions || []) {
    if (!tx || !tx.timestamp) continue

    const txTime = new Date(tx.timestamp).getTime()
    if (isNaN(txTime)) continue

    // Filter within [cutoffTime, refTime]
    if (txTime < cutoffTime || txTime > refTime) continue

    // Check transaction type
    const isOutflow =
      tx.type === 'OUT' || (includeTransfers && tx.type === 'TRANSFER_OUT')
    if (!isOutflow) continue

    if (tx.warehouseId && tx.warehouseName) {
      warehouseNameMap.set(tx.warehouseId, tx.warehouseName)
    }

    const qty = Number(tx.quantity) || 0
    if (qty <= 0) continue

    // Track by product ID
    if (tx.productId) {
      outflowMap.set(tx.productId, (outflowMap.get(tx.productId) || 0) + qty)
    }
  }

  const alerts: ForecastAlert[] = []

  for (const product of products) {
    if (!product) continue

    const totalOutflow = outflowMap.get(product.id) || 0
    const dailyBurnRate = calculateDailyBurnRate(totalOutflow, windowDays)
    const daysOfStockRemaining = estimateDaysOfStockRemaining(
      product.currentStock,
      dailyBurnRate,
    )

    const totalCoverageDays = leadTimeDays + bufferDays
    const leadTimeDemand = Math.ceil(dailyBurnRate * leadTimeDays)
    const safetyStockTarget = Math.max(
      product.reorderThreshold,
      Math.ceil(dailyBurnRate * bufferDays),
    )
    const targetInventoryLevel = Math.ceil(
      dailyBurnRate * totalCoverageDays + product.reorderThreshold,
    )

    let suggestedReorderQuantity = 0
    let status: ForecastStatus
    let urgency: ForecastUrgency
    let message = ''

    const whName =
      warehouseNameMap.get(product.warehouseId) || product.warehouseId

    if (product.currentStock <= 0) {
      status = 'OUT_OF_STOCK'
      urgency = 'CRITICAL'
      suggestedReorderQuantity = Math.max(
        product.reorderThreshold,
        targetInventoryLevel,
      )
      message = `Stock depleted at ${whName}. Immediately order ${suggestedReorderQuantity} units to cover lead time (${leadTimeDays}d) and safety threshold.`
    } else if (
      daysOfStockRemaining !== null &&
      daysOfStockRemaining <= leadTimeDays
    ) {
      status = 'CRITICAL'
      urgency = 'CRITICAL'
      suggestedReorderQuantity = Math.max(
        0,
        targetInventoryLevel - product.currentStock,
      )
      message = `Critical runway: ${daysOfStockRemaining} days left at ${whName}. Stock will exhaust before standard supplier delivery (${leadTimeDays}d). Order ${suggestedReorderQuantity} units urgently.`
    } else if (
      (daysOfStockRemaining !== null &&
        daysOfStockRemaining <= totalCoverageDays) ||
      product.currentStock <= product.reorderThreshold
    ) {
      status = 'WARNING'
      urgency = 'HIGH'
      const needed = targetInventoryLevel - product.currentStock
      suggestedReorderQuantity = Math.max(
        needed,
        product.reorderThreshold - product.currentStock + leadTimeDemand,
        0,
      )
      message = `Low runway warning: ${
        daysOfStockRemaining !== null
          ? `${daysOfStockRemaining} days remaining`
          : 'Stock at reorder threshold'
      } at ${whName}. Order ${suggestedReorderQuantity} units for replenishment.`
    } else if (
      daysOfStockRemaining !== null &&
      daysOfStockRemaining > totalCoverageDays * 4
    ) {
      status = 'SURPLUS'
      urgency = 'LOW'
      suggestedReorderQuantity = 0
      message = `Surplus stock at ${whName}: ~${daysOfStockRemaining} days of runway at current velocity.`
    } else {
      status = 'HEALTHY'
      urgency = 'LOW'
      suggestedReorderQuantity = 0
      message = `Healthy inventory levels at ${whName}. ${
        daysOfStockRemaining !== null
          ? `Estimated ${daysOfStockRemaining} days of stock remaining.`
          : 'No recent consumption observed.'
      }`
    }

    alerts.push({
      productId: product.id,
      productName: product.name,
      category: product.category,
      warehouseId: product.warehouseId,
      warehouseName: whName,
      currentStock: product.currentStock,
      reorderThreshold: product.reorderThreshold,
      windowDays,
      totalOutflow,
      dailyBurnRate,
      daysOfStockRemaining,
      leadTimeDays,
      bufferDays,
      leadTimeDemand,
      safetyStockTarget,
      suggestedReorderQuantity,
      status,
      urgency,
      message,
    })
  }

  // Sort alerts by urgency (CRITICAL first, then HIGH, then WARNING/MEDIUM, then LOW)
  const urgencyWeight: Record<ForecastUrgency, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  }

  alerts.sort((a, b) => {
    const weightDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency]
    if (weightDiff !== 0) return weightDiff

    // If same urgency, sort lowest runway first
    const runwayA = a.daysOfStockRemaining ?? Number.POSITIVE_INFINITY
    const runwayB = b.daysOfStockRemaining ?? Number.POSITIVE_INFINITY
    return runwayA - runwayB
  })

  return alerts
}
