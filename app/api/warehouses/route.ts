import { NextResponse } from 'next/server'
import { warehouses, addWarehouse } from '@/lib/seed-data'

export async function GET() {
  return NextResponse.json({ warehouses })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, location, id } = body
    if (!name || !location) {
      return NextResponse.json(
        { error: 'Warehouse name and location are required' },
        { status: 400 }
      )
    }
    const warehouse = addWarehouse({ id, name, location })
    return NextResponse.json({ warehouse, warehouses })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add warehouse'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
