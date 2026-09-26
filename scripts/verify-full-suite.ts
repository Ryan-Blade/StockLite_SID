/**
 * Comprehensive Automated Verification Suite for StockLite
 *
 * Test Suites:
 * 1. Core Inventory Logic (Stock In, Stock Out, Zero/Negative Stock bounds, Threshold Low Stock)
 * 2. Cross-Warehouse Transfers (Atomic deduction, Destination creation, Reciprocal linked transactions)
 * 3. Dynamic Warehouse Addition (addWarehouse, duplicate ID rejection, automatic slug generation)
 * 4. Staff Authentication & Credentials (validateCredentials, role resolution, invalid PIN/ID rejection)
 * 5. Forecast & Rebalance Algorithms (Consumption forecasting, runway, lead-time, donor surplus protection)
 */

import {
  products as initialProducts,
  warehouses as initialWarehouses,
  transactions as initialTransactions,
  applyStockMovement,
  applyTransfer,
  addWarehouse,
  findProduct,
  recordTransaction,
} from '../lib/seed-data'
import {
  Product,
  Warehouse,
  Transaction,
  getStockStatus,
  getStockStatusLabel,
} from '../lib/types'
import {
  validateCredentials,
  getCurrentUser,
  STAFF_USERS,
} from '../lib/auth'
import {
  calculateDailyBurnRate,
  estimateDaysOfStockRemaining,
  calculateConsumptionForecasts,
} from '../lib/forecast'
import {
  calculateRebalanceSuggestions,
} from '../lib/rebalance'

// Test runner state
let totalTests = 0
let passedTests = 0
let failedTests = 0
const failureMessages: string[] = []

function test(description: string, fn: () => void) {
  totalTests++
  try {
    fn()
    passedTests++
    console.log(`  ✓ ${description}`)
  } catch (err: any) {
    failedTests++
    const errorMsg = `  ✗ ${description} -> ${err.message || err}`
    failureMessages.push(errorMsg)
    console.error(errorMsg)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function section(name: string) {
  console.log(`\n==================================================`)
  console.log(`  SUITE: ${name}`)
  console.log(`==================================================`)
}

// ---------------------------------------------------------------------------
// SUITE 1: Core Inventory Logic
// ---------------------------------------------------------------------------
section('1. Core Inventory Logic')

test('Threshold low-stock rules: product above threshold is "ok"', () => {
  const p: Product = {
    id: 'test-ok',
    name: 'Item OK',
    category: 'Test',
    warehouseId: 'wh-north',
    currentStock: 100,
    reorderThreshold: 50,
  }
  assert(getStockStatus(p) === 'ok', 'Expected ok when stock > threshold')
  assert(getStockStatusLabel('ok') === 'In stock', 'Label for ok must be "In stock"')
})

test('Threshold low-stock rules: product at or below threshold is "low"', () => {
  const pExact: Product = {
    id: 'test-exact',
    name: 'Item Exact',
    category: 'Test',
    warehouseId: 'wh-north',
    currentStock: 50,
    reorderThreshold: 50,
  }
  const pBelow: Product = {
    id: 'test-below',
    name: 'Item Below',
    category: 'Test',
    warehouseId: 'wh-north',
    currentStock: 12,
    reorderThreshold: 50,
  }
  const pZero: Product = {
    id: 'test-zero',
    name: 'Item Zero',
    category: 'Test',
    warehouseId: 'wh-north',
    currentStock: 0,
    reorderThreshold: 50,
  }
  assert(getStockStatus(pExact) === 'low', 'Expected low when stock == threshold')
  assert(getStockStatus(pBelow) === 'low', 'Expected low when stock < threshold')
  assert(getStockStatus(pZero) === 'low', 'Expected low when stock == 0')
  assert(getStockStatusLabel('low') === 'Low stock', 'Label for low must be "Low stock"')
})

test('Stock In: successfully increases inventory and records transaction', () => {
  const p = findProduct('p-001')!
  const prevStock = p.currentStock
  const txCountBefore = initialTransactions.length

  const updated = applyStockMovement('p-001', 25, 'IN')
  assert(updated.currentStock === prevStock + 25, 'Stock In should increment currentStock')
  assert(initialTransactions.length === txCountBefore + 1, 'Stock In should append 1 transaction')

  const tx = initialTransactions[initialTransactions.length - 1]
  assert(tx.type === 'IN', 'Transaction type must be IN')
  assert(tx.productId === 'p-001', 'Transaction productId must match')
  assert(tx.quantity === 25, 'Transaction quantity must match')
})

test('Stock Out: successfully decreases inventory and records transaction', () => {
  const p = findProduct('p-001')!
  const prevStock = p.currentStock
  const txCountBefore = initialTransactions.length

  const updated = applyStockMovement('p-001', 15, 'OUT')
  assert(updated.currentStock === prevStock - 15, 'Stock Out should decrement currentStock')
  assert(initialTransactions.length === txCountBefore + 1, 'Stock Out should append 1 transaction')

  const tx = initialTransactions[initialTransactions.length - 1]
  assert(tx.type === 'OUT', 'Transaction type must be OUT')
  assert(tx.productId === 'p-001', 'Transaction productId must match')
  assert(tx.quantity === 15, 'Transaction quantity must match')
})

test('Zero Stock: Stock Out to exact remaining stock leaves exactly 0', () => {
  const p = findProduct('p-007')! // current stock is small
  const initialQty = p.currentStock
  assert(initialQty > 0, 'Target product must have stock to drain')

  const updated = applyStockMovement('p-007', initialQty, 'OUT')
  assert(updated.currentStock === 0, 'Stock must reach exactly 0')
})

test('Negative Stock Prevention: Stock Out exceeding current stock throws error and preserves stock level', () => {
  const p = findProduct('p-007')!
  assert(p.currentStock === 0, 'Product should currently be at 0 stock')

  let threw = false
  try {
    applyStockMovement('p-007', 1, 'OUT')
  } catch (err: any) {
    threw = true
    assert(err.message.includes('Insufficient stock'), 'Error should specify insufficient stock')
  }
  assert(threw, 'Stock Out with quantity > stock must throw')
  assert(p.currentStock === 0, 'Stock must remain 0 and never become negative')
})

test('Input Validation: Rejects non-positive, zero, and NaN quantities for Stock Movement', () => {
  for (const badQty of [0, -5, -100, NaN, Infinity, -Infinity]) {
    let threw = false
    try {
      applyStockMovement('p-001', badQty, 'IN')
    } catch {
      threw = true
    }
    assert(threw, `Should reject invalid stock movement quantity: ${badQty}`)
  }
})

// ---------------------------------------------------------------------------
// SUITE 2: Cross-Warehouse Transfers
// ---------------------------------------------------------------------------
section('2. Cross-Warehouse Transfers')

test('Atomic transfer between existing warehouse products', () => {
  const source = findProduct('p-003')! // wh-north
  const dest = findProduct('p-004')!   // wh-south
  const srcPrev = source.currentStock
  const dstPrev = dest.currentStock
  const txCountBefore = initialTransactions.length

  const transferQty = 5
  const result = applyTransfer('p-003', 'wh-south', transferQty)

  assert(result.source.currentStock === srcPrev - transferQty, 'Source stock deducted atomically')
  assert(result.destination.currentStock === dstPrev + transferQty, 'Destination stock credited atomically')
  assert(initialTransactions.length === txCountBefore + 2, 'Two reciprocal transactions logged')

  const outTx = initialTransactions[initialTransactions.length - 2]
  const inTx = initialTransactions[initialTransactions.length - 1]

  assert(outTx.type === 'TRANSFER_OUT', 'First tx is TRANSFER_OUT')
  assert(inTx.type === 'TRANSFER_IN', 'Second tx is TRANSFER_IN')
  assert(outTx.linkedTransactionId === inTx.id, 'outTx links to inTx ID')
  assert(inTx.linkedTransactionId === outTx.id, 'inTx links to outTx ID')
  assert(outTx.timestamp === inTx.timestamp, 'Reciprocal transactions have synchronized timestamps')
  assert(outTx.warehouseId === 'wh-north' && inTx.warehouseId === 'wh-south', 'Correct warehouse attribution')
})

test('Transfer creating new product entry at destination warehouse if absent', () => {
  // Check for a product that only exists at wh-north
  const p14 = findProduct('p-014')! // Handheld Barcode Scanner at wh-north
  const prevSrc = p14.currentStock

  // Let's transfer to a warehouse where the item might or might not exist
  const existingAtSouth = initialProducts.find(
    (p) => p.name === 'Steel Shelving Unit 5-Tier' && p.warehouseId === 'wh-south'
  )
  assert(!existingAtSouth, 'Steel Shelving Unit 5-Tier should not initially exist in wh-south')

  const p8 = findProduct('p-008')! // Steel Shelving Unit 5-Tier (wh-north)
  const p8Prev = p8.currentStock

  const transferRes = applyTransfer('p-008', 'wh-south', 2)
  assert(transferRes.source.currentStock === p8Prev - 2, 'Source stock decremented')
  assert(transferRes.destination.currentStock === 2, 'New destination product created with transferred qty')
  assert(transferRes.destination.warehouseId === 'wh-south', 'New product assigned to dest warehouse')
  assert(transferRes.destination.name === p8.name, 'New product maintains name')
  assert(transferRes.destination.category === p8.category, 'New product maintains category')
  assert(transferRes.destination.reorderThreshold === p8.reorderThreshold, 'New product maintains reorderThreshold')
  assert(initialProducts.some((p) => p.id === transferRes.destination.id), 'New product registered in catalog')
})

test('Transfer failure rollback: exceeding available source stock does not modify either warehouse', () => {
  const source = findProduct('p-003')!
  const dest = findProduct('p-004')!
  const srcBefore = source.currentStock
  const dstBefore = dest.currentStock

  let threw = false
  try {
    applyTransfer('p-003', 'wh-south', srcBefore + 999)
  } catch (err: any) {
    threw = true
    assert(err.message.includes('Insufficient stock'), 'Should throw insufficient stock error')
  }
  assert(threw, 'Excessive transfer must fail')
  assert(source.currentStock === srcBefore, 'Source stock unchanged on failed transfer')
  assert(dest.currentStock === dstBefore, 'Destination stock unchanged on failed transfer')
})

test('Transfer validation: transfer to identical warehouse or negative qty is rejected', () => {
  let sameWhThrew = false
  try {
    applyTransfer('p-003', 'wh-north', 5)
  } catch {
    sameWhThrew = true
  }
  assert(sameWhThrew, 'Transferring to the same source warehouse must throw error')

  let badQtyThrew = false
  try {
    applyTransfer('p-003', 'wh-south', -10)
  } catch {
    badQtyThrew = true
  }
  assert(badQtyThrew, 'Transferring negative quantity must throw error')
})

// ---------------------------------------------------------------------------
// SUITE 3: Dynamic Warehouse Addition
// ---------------------------------------------------------------------------
section('3. Dynamic Warehouse Addition')

test('addWarehouse: creates warehouse with auto-generated slug', () => {
  const newWh = addWarehouse({
    name: 'East Coast Logistics Center',
    location: 'Philadelphia, PA',
  })

  assert(newWh.id === 'wh-east-coast-logistics-center', `Expected slug ID, got ${newWh.id}`)
  assert(newWh.name === 'East Coast Logistics Center', 'Name preserved')
  assert(newWh.location === 'Philadelphia, PA', 'Location preserved')
  assert(initialWarehouses.some((w) => w.id === newWh.id), 'Added to warehouses list')
})

test('addWarehouse: preserves custom ID if explicitly provided', () => {
  const customWh = addWarehouse({
    id: 'wh-west-01',
    name: 'West Coast Hub',
    location: 'Oakland, CA',
  })

  assert(customWh.id === 'wh-west-01', 'Custom ID preserved')
  assert(initialWarehouses.some((w) => w.id === 'wh-west-01'), 'Added to warehouses list')
})

test('addWarehouse: duplicate warehouse ID rejection', () => {
  let threw = false
  try {
    addWarehouse({
      id: 'wh-north',
      name: 'Duplicate North Hub',
      location: 'Nowhere, XX',
    })
  } catch (err: any) {
    threw = true
    assert(err.message.includes('already exists'), 'Should indicate duplicate exists')
  }
  assert(threw, 'Should reject duplicate warehouse ID')
})

test('addWarehouse: rejects empty name or location', () => {
  let threwName = false
  try {
    addWarehouse({ name: '   ', location: 'Valid City' })
  } catch {
    threwName = true
  }
  assert(threwName, 'Empty name should throw')

  let threwLoc = false
  try {
    addWarehouse({ name: 'Valid Name', location: '   ' })
  } catch {
    threwLoc = true
  }
  assert(threwLoc, 'Empty location should throw')
})

// ---------------------------------------------------------------------------
// SUITE 4: Staff Authentication & Credentials
// ---------------------------------------------------------------------------
section('4. Staff Authentication & Credentials')

test('validateCredentials: successfully authenticates all seed staff accounts', () => {
  for (const expectedUser of STAFF_USERS) {
    const auth = validateCredentials(expectedUser.id, expectedUser.pin)
    assert(auth !== null, `Failed to authenticate ${expectedUser.id}`)
    assert(auth?.id === expectedUser.id, `ID matches for ${expectedUser.id}`)
    assert(auth?.name === expectedUser.name, `Name matches for ${expectedUser.id}`)
    assert(auth?.role === expectedUser.role, `Role matches for ${expectedUser.id}`)
  }
})

test('validateCredentials: case-insensitive staff ID and whitespace trimming', () => {
  const authUpper = validateCredentials('  ADMIN-01  ', '1234')
  assert(authUpper !== null, 'Should authenticate with uppercase ID and whitespace')
  assert(authUpper?.id === 'admin-01', 'Normalizes ID to lowercase')
  assert(authUpper?.role === 'admin', 'Resolves admin role')

  const authManager = validateCredentials(' MANAGER-NORTH ', '1234 ')
  assert(authManager !== null, 'Should authenticate with leading/trailing spaces in PIN')
  assert(authManager?.role === 'manager', 'Resolves manager role')
})

test('validateCredentials: rejects invalid PIN or non-existent staff ID', () => {
  const wrongPin = validateCredentials('admin-01', '9999')
  assert(wrongPin === null, 'Wrong PIN must return null')

  const invalidUser = validateCredentials('unknown-user', '1234')
  assert(invalidUser === null, 'Non-existent user must return null')

  const emptyPin = validateCredentials('admin-01', '')
  assert(emptyPin === null, 'Empty PIN must return null')

  const emptyId = validateCredentials('', '1234')
  assert(emptyId === null, 'Empty ID must return null')
})

test('getCurrentUser: returns default fallback staff user', () => {
  const defaultUser = getCurrentUser()
  assert(defaultUser.id === 'staff-01', 'Default user ID is staff-01')
  assert(defaultUser.role === 'staff', 'Default user role is staff')
})

// ---------------------------------------------------------------------------
// SUITE 5: Forecast & Rebalance Algorithms
// ---------------------------------------------------------------------------
section('5. Forecast & Rebalance Algorithms')

test('Forecast calculations: Daily burn rate and runway estimation', () => {
  // Burn rate
  assert(calculateDailyBurnRate(60, 30) === 2, '60 units over 30 days = 2.0/day')
  assert(calculateDailyBurnRate(0, 30) === 0, '0 units = 0/day')
  assert(calculateDailyBurnRate(15, 0) === 0, '0 window days returns 0')

  // Days remaining
  assert(estimateDaysOfStockRemaining(100, 10) === 10, '100 stock / 10 daily burn = 10 days runway')
  assert(estimateDaysOfStockRemaining(0, 5) === 0, '0 stock = 0 runway')
  assert(estimateDaysOfStockRemaining(50, 0) === null, '0 burn rate = null (infinite) runway')
})

test('Forecast status classifications: OUT_OF_STOCK, CRITICAL, WARNING, HEALTHY, SURPLUS', () => {
  const refDate = new Date('2026-09-26T12:00:00Z')
  const testItems: Product[] = [
    { id: 'f-oos', name: 'Stockout Item', category: 'Test', warehouseId: 'w1', currentStock: 0, reorderThreshold: 20 },
    { id: 'f-crit', name: 'Critical Item', category: 'Test', warehouseId: 'w1', currentStock: 10, reorderThreshold: 20 },
    { id: 'f-warn', name: 'Warning Runway Item', category: 'Test', warehouseId: 'w1', currentStock: 25, reorderThreshold: 20 },
    { id: 'f-healthy', name: 'Healthy Item', category: 'Test', warehouseId: 'w1', currentStock: 60, reorderThreshold: 20 },
    { id: 'f-surplus', name: 'Surplus Item', category: 'Test', warehouseId: 'w1', currentStock: 300, reorderThreshold: 20 },
  ]

  const testTxs: Transaction[] = [
    // Critical item: 60 consumed in 30 days -> 2/day burn rate. Stock is 10 -> 5 days runway (< 7 days lead time -> CRITICAL)
    {
      id: 'tx-crit-1',
      productId: 'f-crit',
      productName: 'Critical Item',
      warehouseId: 'w1',
      warehouseName: 'W1',
      type: 'OUT',
      quantity: 60,
      timestamp: '2026-09-20T10:00:00Z',
    },
    // Warning item: 60 consumed in 30 days -> 2/day burn rate. Stock is 25 -> 12.5 days runway (<= 14d coverage -> WARNING)
    {
      id: 'tx-warn-1',
      productId: 'f-warn',
      productName: 'Warning Runway Item',
      warehouseId: 'w1',
      warehouseName: 'W1',
      type: 'OUT',
      quantity: 60,
      timestamp: '2026-09-20T10:00:00Z',
    },
    // Healthy item: 60 consumed in 30 days -> 2/day burn rate. Stock is 60 -> 30 days runway (14d < 30d <= 56d -> HEALTHY)
    {
      id: 'tx-healthy-1',
      productId: 'f-healthy',
      productName: 'Healthy Item',
      warehouseId: 'w1',
      warehouseName: 'W1',
      type: 'OUT',
      quantity: 60,
      timestamp: '2026-09-20T10:00:00Z',
    },
    // Surplus item: 30 consumed in 30 days -> 1/day burn rate. Stock is 300 -> 300 days runway (> 56d -> SURPLUS)
    {
      id: 'tx-surplus-1',
      productId: 'f-surplus',
      productName: 'Surplus Item',
      warehouseId: 'w1',
      warehouseName: 'W1',
      type: 'OUT',
      quantity: 30,
      timestamp: '2026-09-20T10:00:00Z',
    },
  ]

  const forecasts = calculateConsumptionForecasts(testItems, testTxs, {
    windowDays: 30,
    leadTimeDays: 7,
    bufferDays: 7,
    referenceDate: refDate,
  })

  const oos = forecasts.find((f) => f.productId === 'f-oos')!
  const crit = forecasts.find((f) => f.productId === 'f-crit')!
  const warn = forecasts.find((f) => f.productId === 'f-warn')!
  const healthy = forecasts.find((f) => f.productId === 'f-healthy')!
  const surplus = forecasts.find((f) => f.productId === 'f-surplus')!

  assert(oos.status === 'OUT_OF_STOCK', '0 stock gives OUT_OF_STOCK')
  assert(oos.suggestedReorderQuantity >= oos.reorderThreshold, 'OOS suggests reorder to at least threshold')

  assert(crit.status === 'CRITICAL', 'Runway < leadTime gives CRITICAL')
  assert(crit.dailyBurnRate === 2, 'Daily burn rate is 2')
  assert(crit.daysOfStockRemaining === 5, 'Runway is 5 days')

  assert(warn.status === 'WARNING', 'Runway < leadTime + buffer gives WARNING')
  assert(warn.daysOfStockRemaining === 12.5, 'Runway is 12.5 days')

  assert(healthy.status === 'HEALTHY', 'Adequate stock gives HEALTHY')
  assert(healthy.daysOfStockRemaining === 30, 'Runway is 30 days')

  assert(surplus.status === 'SURPLUS', 'Excessive runway gives SURPLUS')
  assert(surplus.daysOfStockRemaining === 300, 'Runway is 300 days')
})

test('Rebalance suggestions: donor is never pulled below threshold and target deficit is covered', () => {
  const whs: Warehouse[] = [
    { id: 'wh-1', name: 'Hub 1', location: 'Location 1' },
    { id: 'wh-2', name: 'Hub 2', location: 'Location 2' },
    { id: 'wh-3', name: 'Hub 3', location: 'Location 3' },
  ]

  // Product Alpha:
  // wh-1 has deficit: stock 10, threshold 50 -> deficit = 40
  // wh-2 has surplus: stock 80, threshold 50 -> surplus = 30
  // wh-3 has surplus: stock 70, threshold 50 -> surplus = 20
  const products: Product[] = [
    { id: 'p1', name: 'Alpha Part', category: 'Parts', warehouseId: 'wh-1', currentStock: 10, reorderThreshold: 50 },
    { id: 'p2', name: 'Alpha Part', category: 'Parts', warehouseId: 'wh-2', currentStock: 80, reorderThreshold: 50 },
    { id: 'p3', name: 'Alpha Part', category: 'Parts', warehouseId: 'wh-3', currentStock: 70, reorderThreshold: 50 },
  ]

  const suggestions = calculateRebalanceSuggestions(products, whs)
  assert(suggestions.length > 0, 'Rebalance suggestions generated')

  let totalTransferred = 0
  for (const s of suggestions) {
    assert(s.productName === 'Alpha Part', 'Product name matches')
    assert(s.targetWarehouseId === 'wh-1', 'Target warehouse is deficit warehouse')
    assert(
      s.sourceCurrentStock - s.suggestedQuantity >= s.sourceReorderThreshold,
      `Donor ${s.sourceWarehouseName} retains threshold stock`
    )
    totalTransferred += s.suggestedQuantity
  }

  // Deficit was 40, wh-2 can give up to 30, wh-3 can give up to 20. Total transferred should exactly equal deficit (40)
  assert(totalTransferred === 40, `Total transfer (${totalTransferred}) exactly meets deficit (40)`)
})

test('Rebalance suggestions: no transfer suggested when donor has zero surplus', () => {
  const whs: Warehouse[] = [
    { id: 'wh-1', name: 'Hub 1', location: 'Location 1' },
    { id: 'wh-2', name: 'Hub 2', location: 'Location 2' },
  ]

  const products: Product[] = [
    { id: 'p1', name: 'Beta Part', category: 'Parts', warehouseId: 'wh-1', currentStock: 10, reorderThreshold: 50 },
    { id: 'p2', name: 'Beta Part', category: 'Parts', warehouseId: 'wh-2', currentStock: 50, reorderThreshold: 50 }, // exactly at threshold
  ]

  const suggestions = calculateRebalanceSuggestions(products, whs)
  assert(suggestions.length === 0, 'No suggestion when donor has 0 surplus')
})

// ---------------------------------------------------------------------------
// TEST SUMMARY & EXIT
// ---------------------------------------------------------------------------
console.log('\n==================================================')
console.log(`  VERIFICATION RESULTS`)
console.log(`==================================================`)
console.log(`  Total Tests  : ${totalTests}`)
console.log(`  Passed       : ${passedTests}`)
console.log(`  Failed       : ${failedTests}`)
console.log(`  Pass Rate    : ${((passedTests / totalTests) * 100).toFixed(1)}%`)
console.log(`==================================================\n`)

if (failedTests > 0) {
  console.error('❌ Failures encountered:')
  for (const msg of failureMessages) {
    console.error(msg)
  }
  process.exit(1)
} else {
  console.log('🎉 ALL TEST SUITES PASSED WITH 100% SUCCESS RATE!\n')
  process.exit(0)
}
