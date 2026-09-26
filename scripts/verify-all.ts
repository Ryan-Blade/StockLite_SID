import {
  products,
  warehouses,
  transactions,
  applyStockMovement,
  applyTransfer,
  findProduct,
  recordTransaction,
} from '../lib/seed-data'
import { getStockStatus, getStockStatusLabel, Product } from '../lib/types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`✅ PASS: ${message}`)
}

console.log('\n--- TESTING TASK 1 & TASK 5: Low stock status rule ---')
// Test getStockStatus
const productAbove: Product = {
  id: 'test-1',
  name: 'Item Above',
  category: 'Test',
  warehouseId: 'wh-north',
  currentStock: 100,
  reorderThreshold: 50,
}
const productAt: Product = {
  id: 'test-2',
  name: 'Item At Threshold',
  category: 'Test',
  warehouseId: 'wh-north',
  currentStock: 50,
  reorderThreshold: 50,
}
const productBelow: Product = {
  id: 'test-3',
  name: 'Item Below Threshold',
  category: 'Test',
  warehouseId: 'wh-north',
  currentStock: 20,
  reorderThreshold: 50,
}

assert(getStockStatus(productAbove) === 'ok', 'product above threshold is "ok"')
assert(getStockStatus(productAt) === 'low', 'product at threshold is "low"')
assert(getStockStatus(productBelow) === 'low', 'product below threshold is "low"')
assert(getStockStatusLabel('low') === 'Low stock', 'label for low status is "Low stock"')
assert(getStockStatusLabel('ok') === 'In stock', 'label for ok status is "In stock"')

console.log('\n--- TESTING TASK 2: Stock In / Stock Out ---')
const testP1 = findProduct('p-001')!
const initialStock = testP1.currentStock
const initialTxCount = transactions.length

// Valid IN
const stockedIn = applyStockMovement('p-001', 50, 'IN')
assert(stockedIn.currentStock === initialStock + 50, 'Stock In increases currentStock by quantity')
assert(transactions.length === initialTxCount + 1, 'Stock In logs 1 transaction')
const lastTx = transactions[transactions.length - 1]
assert(lastTx.type === 'IN' && lastTx.productId === 'p-001' && lastTx.quantity === 50, 'Transaction has correct type, product, and quantity')

// Valid OUT
const stockAfterIn = testP1.currentStock
const stockedOut = applyStockMovement('p-001', 20, 'OUT')
assert(stockedOut.currentStock === stockAfterIn - 20, 'Stock Out decreases currentStock by quantity')

// OUT of exactly available stock
const testP13 = findProduct('p-013')!
const exactQty = testP13.currentStock
applyStockMovement('p-013', exactQty, 'OUT')
assert(testP13.currentStock === 0, 'OUT of exactly available stock leaves currentStock === 0')

// OUT exceeding available stock (should throw and not mutate)
let threw = false
try {
  applyStockMovement('p-013', 1, 'OUT')
} catch (e: any) {
  threw = true
  assert(e.message.includes('Insufficient stock'), 'OUT exceeding stock throws Insufficient stock error')
}
assert(threw, 'OUT exceeding stock throws error')
assert(testP13.currentStock === 0, 'currentStock is unchanged on failed OUT (no negative inventory)')

// Invalid quantities: 0, negative, NaN
for (const badQty of [0, -10, NaN]) {
  let badThrew = false
  try {
    applyStockMovement('p-001', badQty, 'IN')
  } catch (e) {
    badThrew = true
  }
  assert(badThrew, `Stock In with invalid quantity ${badQty} is rejected`)
}

console.log('\n--- TESTING TASK 3: Warehouse Transfer ---')
const testP3 = findProduct('p-003')! // wh-north
const testP4 = findProduct('p-004')! // wh-south (same name: 'Stretch Wrap Film 18in')
const p3Initial = testP3.currentStock
const p4Initial = testP4.currentStock
const txCountBeforeTransfer = transactions.length

// Valid transfer between existing products
const transferResult = applyTransfer('p-003', 'wh-south', 10)
assert(transferResult.source.currentStock === p3Initial - 10, 'Transfer deducts from source warehouse')
assert(transferResult.destination.currentStock === p4Initial + 10, 'Transfer adds to destination warehouse')
assert(transactions.length === txCountBeforeTransfer + 2, 'Transfer records 2 transactions')

const outTx = transactions[transactions.length - 2]
const inTx = transactions[transactions.length - 1]
assert(outTx.type === 'TRANSFER_OUT' && inTx.type === 'TRANSFER_IN', 'Transaction types are TRANSFER_OUT and TRANSFER_IN')
assert(outTx.linkedTransactionId === inTx.id && inTx.linkedTransactionId === outTx.id, 'Transactions are reciprocally linked via linkedTransactionId')
assert(outTx.timestamp === inTx.timestamp, 'Transactions share matching timestamps')

// Transfer exceeding source stock (all-or-nothing check)
const p3BeforeFail = testP3.currentStock
const p4BeforeFail = testP4.currentStock
let transferThrew = false
try {
  applyTransfer('p-003', 'wh-south', p3BeforeFail + 100)
} catch (e: any) {
  transferThrew = true
  assert(e.message.includes('Insufficient stock'), 'Transfer exceeding stock throws Insufficient stock error')
}
assert(transferThrew, 'Transfer exceeding source stock throws error')
assert(testP3.currentStock === p3BeforeFail, 'Source warehouse untouched on failed transfer')
assert(testP4.currentStock === p4BeforeFail, 'Destination warehouse untouched on failed transfer')

// Transfer to same warehouse (should throw)
let sameWhThrew = false
try {
  applyTransfer('p-003', 'wh-north', 5)
} catch (e) {
  sameWhThrew = true
}
assert(sameWhThrew, 'Transfer to same warehouse is rejected')

// Transfer product that doesn't exist yet at destination warehouse
// p-016 (Label Printer, Thermal) only exists at wh-north
const p16 = findProduct('p-016')!
const p16Initial = p16.currentStock
const destCountBefore = products.filter((p) => p.name === p16.name && p.warehouseId === 'wh-south').length
assert(destCountBefore === 0, 'p-016 does not exist at wh-south before transfer')

const newDestResult = applyTransfer('p-016', 'wh-south', 3)
assert(newDestResult.source.currentStock === p16Initial - 3, 'Source stock deducted for new destination transfer')
assert(newDestResult.destination.currentStock === 3, 'Destination row created with transferred quantity')
assert(newDestResult.destination.warehouseId === 'wh-south', 'Destination row has correct warehouseId')
assert(newDestResult.destination.name === p16.name, 'Destination row has matching product name')
assert(newDestResult.destination.category === p16.category, 'Destination row has matching category')
assert(newDestResult.destination.reorderThreshold === p16.reorderThreshold, 'Destination row has matching reorderThreshold')
assert(products.some((p) => p.id === newDestResult.destination.id), 'Newly created destination product is in products array')

console.log('\n--- ALL VERIFICATIONS PASSED SUCCESSFULLY! ---')
