import assert from 'assert'
import {
  products,
  warehouses,
  transactions,
  addProduct,
  removeProduct,
  restockProduct,
  applyStockMovement,
  applyTransfer,
  findProduct,
} from '../lib/seed-data'
import { validateCredentials, STAFF_USERS } from '../lib/auth'
import { POST as itemsHandler } from '../app/api/items/route'
import { POST as chatHandler } from '../app/api/chat/route'

console.log('--- Testing Backend Updates ---')

// 1. Test addProduct
const initCount = products.length
const newProd = addProduct({
  name: 'Heavy Duty Strapping Tape',
  category: 'Packaging',
  warehouseId: 'wh-north',
  initialStock: 50,
  reorderThreshold: 20,
})
assert.strictEqual(products.length, initCount + 1, 'Product added to list')
assert.strictEqual(newProd.name, 'Heavy Duty Strapping Tape')
assert.strictEqual(newProd.currentStock, 50)
assert.strictEqual(newProd.reorderThreshold, 20)
console.log('✓ addProduct verified')

// 2. Test restockProduct
const restocked = restockProduct(newProd.id, 30)
assert.strictEqual(restocked.product.currentStock, 80)
assert.strictEqual(restocked.addedQuantity, 30)

// Test default restock calculation (deficit to reorderThreshold + 20)
const lowItem = addProduct({
  name: 'Safety Glasses',
  category: 'Safety',
  warehouseId: 'wh-south',
  initialStock: 5,
  reorderThreshold: 25,
})
const defaultRestock = restockProduct(lowItem.id)
// target = 25 + 20 = 45; current = 5 -> added = 40
assert.strictEqual(defaultRestock.addedQuantity, 40)
assert.strictEqual(defaultRestock.product.currentStock, 45)
console.log('✓ restockProduct verified (explicit & default calculation)')

// 3. Test removeProduct
const removed = removeProduct(newProd.id)
assert.strictEqual(removed.success, true)
assert.strictEqual(removed.removedProduct.id, newProd.id)
assert.strictEqual(findProduct(newProd.id), undefined)
console.log('✓ removeProduct verified')

// 4. Test failed transaction recording in applyStockMovement
const txCountBefore = transactions.length
try {
  applyStockMovement(lowItem.id, 99999, 'OUT')
  assert.fail('Should have thrown error on stock overdraw')
} catch (e: any) {
  assert.ok(e.message.includes('Insufficient stock'))
}
const latestTx = transactions[transactions.length - 1]
assert.strictEqual(latestTx.status, 'FAILED')
assert.ok(latestTx.failureReason?.includes('Insufficient stock'))
console.log('✓ applyStockMovement FAILED transaction recording verified')

// 5. Test failed transaction recording in applyTransfer
try {
  applyTransfer(lowItem.id, 'wh-north', 99999)
  assert.fail('Should have thrown error on transfer overdraw')
} catch (e: any) {
  assert.ok(e.message.includes('Insufficient stock'))
}
const latestTransferTx = transactions[transactions.length - 1]
assert.strictEqual(latestTransferTx.status, 'FAILED')
assert.ok(latestTransferTx.failureReason?.includes('Insufficient stock'))
console.log('✓ applyTransfer FAILED transaction recording verified')

// 6. Test Staff Roles in auth.ts
const viewer = validateCredentials('viewer-01', '1234')
assert.strictEqual(viewer?.role, 'viewer')

const managerNorth = validateCredentials('manager-north', '1234')
assert.strictEqual(managerNorth?.role, 'manager')
assert.strictEqual(managerNorth?.assignedWarehouseId, 'wh-north')

const admin = validateCredentials('admin-01', '1234')
assert.strictEqual(admin?.role, 'admin')
console.log('✓ Staff roles (viewer, manager, admin) verified')

// 7. Test app/api/items API Route
async function testItemsRoute() {
  // add_product
  const req1 = new Request('http://localhost/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add_product',
      name: 'API Test Box',
      category: 'Test',
      warehouseId: 'wh-north',
      initialStock: 15,
      reorderThreshold: 5,
    }),
  })
  const res1 = await itemsHandler(req1)
  const json1 = await res1.json()
  assert.strictEqual(json1.product.name, 'API Test Box')
  assert.ok(Array.isArray(json1.products))
  assert.ok(Array.isArray(json1.warehouses))
  assert.ok(Array.isArray(json1.transactions))

  const createdId = json1.product.id

  // restock
  const req2 = new Request('http://localhost/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'restock',
      productId: createdId,
      quantity: 10,
    }),
  })
  const res2 = await itemsHandler(req2)
  const json2 = await res2.json()
  assert.strictEqual(json2.product.currentStock, 25)

  // remove_product
  const req3 = new Request('http://localhost/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'remove_product',
      productId: createdId,
    }),
  })
  const res3 = await itemsHandler(req3)
  const json3 = await res3.json()
  assert.strictEqual(json3.success, true)
  assert.strictEqual(json3.removedProduct.id, createdId)

  console.log('✓ app/api/items route actions (add_product, restock, remove_product) verified')
}

// 8. Test app/api/chat API Route
async function testChatRoute() {
  const req = new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'What items are currently low in stock?',
    }),
  })
  const res = await chatHandler(req)
  const json = await res.json()
  assert.ok(typeof json.reply === 'string' && json.reply.length > 0)
  console.log('✓ app/api/chat route verified, reply received:', json.reply.slice(0, 100) + '...')
}

async function runAll() {
  await testItemsRoute()
  await testChatRoute()
  console.log('\n🌟 ALL BACKEND REQUIREMENTS VERIFIED SUCCESSFULLY!')
}

runAll().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
