import { calculateRebalanceSuggestions } from '../lib/rebalance'
import { calculateConsumptionForecasts, calculateDailyBurnRate, estimateDaysOfStockRemaining } from '../lib/forecast'
import { generateInventoryCSV, generateTransactionsCSV, escapeCSVValue } from '../lib/csv'
import { Product, Warehouse, Transaction } from '../lib/types'
import { products as seedProducts, warehouses as seedWarehouses, transactions as seedTransactions } from '../lib/seed-data'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${message}`)
    process.exit(1)
  } else {
    console.log(`✅ Passed: ${message}`)
  }
}

console.log('\n--- 1. Testing Rebalance Algorithm (lib/rebalance.ts) ---')

// Test 1.1: Seed data rebalancing
const seedSuggestions = calculateRebalanceSuggestions(seedProducts, seedWarehouses)
assert(seedSuggestions.length > 0, `Generated ${seedSuggestions.length} rebalance suggestions from seed data`)

for (const s of seedSuggestions) {
  assert(s.suggestedQuantity > 0, `Suggestion for ${s.productName} has positive quantity: ${s.suggestedQuantity}`)
  assert(
    s.sourceCurrentStock - s.suggestedQuantity >= s.sourceReorderThreshold,
    `Donor ${s.sourceWarehouseName} is never pulled below threshold (${s.sourceCurrentStock} - ${s.suggestedQuantity} >= ${s.sourceReorderThreshold})`
  )
}

// Test 1.2: Strict threshold & surplus capping
const mockWarehouses: Warehouse[] = [
  { id: 'w1', name: 'Warehouse 1', location: 'NYC' },
  { id: 'w2', name: 'Warehouse 2', location: 'LA' },
  { id: 'w3', name: 'Warehouse 3', location: 'Chicago' },
]

const mockProducts: Product[] = [
  { id: 'p1-w1', name: 'Widget Alpha', category: 'General', warehouseId: 'w1', currentStock: 10, reorderThreshold: 50 }, // Deficit = 40
  { id: 'p1-w2', name: 'Widget Alpha', category: 'General', warehouseId: 'w2', currentStock: 70, reorderThreshold: 50 }, // Surplus = 20
  { id: 'p1-w3', name: 'Widget Alpha', category: 'General', warehouseId: 'w3', currentStock: 90, reorderThreshold: 50 }, // Surplus = 40
]

const testSuggestions = calculateRebalanceSuggestions(mockProducts, mockWarehouses)
assert(testSuggestions.length >= 1, 'Generates suggestions for multiple donors')

// Total transferred should not exceed target deficit of 40
const totalTransferred = testSuggestions.reduce((sum, s) => sum + s.suggestedQuantity, 0)
assert(totalTransferred === 40, `Transferred quantity exactly covers deficit: ${totalTransferred} === 40`)

// Test 1.3: No surplus available
const noSurplusProducts: Product[] = [
  { id: 'p2-w1', name: 'Widget Beta', category: 'General', warehouseId: 'w1', currentStock: 5, reorderThreshold: 50 },
  { id: 'p2-w2', name: 'Widget Beta', category: 'General', warehouseId: 'w2', currentStock: 50, reorderThreshold: 50 }, // exactly at threshold
]
const noSurplusSuggestions = calculateRebalanceSuggestions(noSurplusProducts, mockWarehouses)
assert(noSurplusSuggestions.length === 0, 'No suggestions generated when donor has 0 surplus')

console.log('\n--- 2. Testing Forecast Algorithm (lib/forecast.ts) ---')

// Test 2.1: Burn rate & runway helpers
assert(calculateDailyBurnRate(30, 30) === 1, 'Burn rate 30 units in 30 days = 1.0/day')
assert(calculateDailyBurnRate(45, 30) === 1.5, 'Burn rate 45 units in 30 days = 1.5/day')
assert(estimateDaysOfStockRemaining(10, 2) === 5, '10 stock with 2/day burn rate = 5 days runway')
assert(estimateDaysOfStockRemaining(0, 2) === 0, '0 stock gives 0 runway')
assert(estimateDaysOfStockRemaining(50, 0) === null, '0 burn rate with stock gives null (infinite) runway')

// Test 2.2: Lead-time & reorder suggestions
const refDate = new Date('2026-09-26T12:00:00Z')
const forecastProducts: Product[] = [
  { id: 'fp-1', name: 'Fast Mover', category: 'Gadgets', warehouseId: 'w1', currentStock: 14, reorderThreshold: 20 },
  { id: 'fp-2', name: 'Out of Stock Item', category: 'Gadgets', warehouseId: 'w1', currentStock: 0, reorderThreshold: 50 },
  { id: 'fp-3', name: 'Slow Mover', category: 'Gadgets', warehouseId: 'w1', currentStock: 200, reorderThreshold: 20 },
]

const forecastTransactions: Transaction[] = [
  // Fast mover: 60 units consumed in past 30 days (2 units/day)
  {
    id: 'tx-1',
    productId: 'fp-1',
    productName: 'Fast Mover',
    warehouseId: 'w1',
    warehouseName: 'Warehouse 1',
    type: 'OUT',
    quantity: 60,
    timestamp: '2026-09-15T12:00:00Z',
  },
  // Fast mover: 10 units transfer out
  {
    id: 'tx-2',
    productId: 'fp-1',
    productName: 'Fast Mover',
    warehouseId: 'w1',
    warehouseName: 'Warehouse 1',
    type: 'TRANSFER_OUT',
    quantity: 30,
    timestamp: '2026-09-20T12:00:00Z',
  },
]

const forecasts = calculateConsumptionForecasts(forecastProducts, forecastTransactions, {
  windowDays: 30,
  leadTimeDays: 7,
  bufferDays: 7,
  referenceDate: refDate,
})

assert(forecasts.length === 3, 'Calculated forecasts for all 3 products')

const fastMoverForecast = forecasts.find((f) => f.productId === 'fp-1')!
assert(fastMoverForecast.totalOutflow === 90, `Fast mover total outflow: ${fastMoverForecast.totalOutflow} === 90`)
assert(fastMoverForecast.dailyBurnRate === 3, `Fast mover daily burn rate: ${fastMoverForecast.dailyBurnRate} === 3.0`)
assert(fastMoverForecast.daysOfStockRemaining === 4.7, `Fast mover runway: ${fastMoverForecast.daysOfStockRemaining} === 4.7 days`)
assert(fastMoverForecast.status === 'CRITICAL', `Fast mover status is CRITICAL (runway 4.7d < lead time 7d)`)
assert(fastMoverForecast.suggestedReorderQuantity > 0, `Fast mover has recommended reorder quantity > 0 (${fastMoverForecast.suggestedReorderQuantity})`)

const oosForecast = forecasts.find((f) => f.productId === 'fp-2')!
assert(oosForecast.status === 'OUT_OF_STOCK', `Out of stock item identified: ${oosForecast.status}`)
assert(oosForecast.suggestedReorderQuantity >= oosForecast.reorderThreshold, `Reorder quantity replenishes at least threshold`)

console.log('\n--- 3. Testing CSV Utilities (lib/csv.ts) ---')

// Test 3.1: Escaping and CSV injection safety
assert(escapeCSVValue('Hello, World') === '"Hello, World"', 'Escapes commas')
assert(escapeCSVValue('Line 1\nLine 2') === '"Line 1\nLine 2"', 'Escapes newlines')
assert(escapeCSVValue('Say "Hi"') === '"Say ""Hi"""', 'Escapes quotes')
assert(escapeCSVValue('=SUM(A1:B2)') === '"\'=SUM(A1:B2)"', 'Protects against formula injection (=)')
assert(escapeCSVValue('+12345') === '"\'+12345"', 'Protects against formula injection (+)')

// Test 3.2: Full CSV generation
const inventoryCSV = generateInventoryCSV(seedProducts, seedWarehouses)
assert(inventoryCSV.startsWith('\uFEFF'), 'Includes UTF-8 BOM')
assert(inventoryCSV.includes('Product ID'), 'Includes header')
assert(inventoryCSV.includes('Corrugated Shipping Box (M)'), 'Includes product row')

const transactionsCSV = generateTransactionsCSV(seedTransactions)
assert(transactionsCSV.startsWith('\uFEFF'), 'Transactions CSV includes UTF-8 BOM')
assert(transactionsCSV.includes('Transaction ID'), 'Transactions CSV includes header')
assert(transactionsCSV.includes('t-001'), 'Transactions CSV includes transaction row')

console.log('\n🎉 ALL ALGORITHM AND MODULE TESTS PASSED PERFECTLY!\n')
