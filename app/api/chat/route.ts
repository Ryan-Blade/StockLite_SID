import { NextResponse } from 'next/server'
import { products, warehouses, transactions } from '@/lib/seed-data'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

interface ChatMessage {
  role?: string
  content?: string
  text?: string
  message?: string
}

function buildSystemContext(): string {
  const lowStockProducts = products.filter((p) => p.currentStock <= p.reorderThreshold)

  const summary = {
    totalProducts: products.length,
    lowStockCount: lowStockProducts.length,
    warehouses: warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      location: w.location,
    })),
    products: products.map((p) => {
      const wh = warehouses.find((w) => w.id === p.warehouseId)
      const isLow = p.currentStock <= p.reorderThreshold
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        warehouseId: p.warehouseId,
        warehouseName: wh?.name ?? p.warehouseId,
        currentStock: p.currentStock,
        reorderThreshold: p.reorderThreshold,
        isLowStock: isLow,
        deficit: isLow ? p.reorderThreshold - p.currentStock : 0,
      }
    }),
    recentTransactions: transactions.slice(-15).reverse().map((t) => ({
      id: t.id,
      timestamp: t.timestamp,
      productName: t.productName,
      warehouseName: t.warehouseName,
      type: t.type,
      quantity: t.quantity,
      status: t.status ?? 'SUCCESS',
      failureReason: t.failureReason,
    })),
  }

  return `You are StockLite AI Assistant, an expert warehouse logistics, stock management, and inventory optimization copilot.
You have direct, real-time access to the live inventory snapshot below.

### LIVE INVENTORY & WAREHOUSE DATABASE SNAPSHOT:
${JSON.stringify(summary, null, 2)}

### GUIDELINES:
1. Answer questions clearly, accurately, and concisely using the real-time data above.
2. If asked about low stock, identify the items, their current quantities, warehouses, and reorder thresholds.
3. If asked for rebalancing or transfer recommendations, suggest transfers from warehouses with surplus stock to warehouses with deficit stock.
4. If asked about stock movement or restock actions, provide precise quantities and IDs.
5. Format your output using clean markdown with bolding, lists, and tables where appropriate.`
}

export async function POST(request: Request) {
  try {
    let body: { message?: string; prompt?: string; history?: ChatMessage[] } = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const userMessage = (body.message || body.prompt || '').trim()
    if (!userMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const systemPrompt = buildSystemContext()

    // Format previous conversation history
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []

    if (Array.isArray(body.history)) {
      for (const msg of body.history) {
        const text = (msg.content || msg.text || msg.message || '').trim()
        if (!text) continue
        const role =
          msg.role === 'assistant' || msg.role === 'model' || msg.role === 'bot'
            ? 'model'
            : 'user'
        contents.push({
          role,
          parts: [{ text }],
        })
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    })

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        const reply =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          'Analysis complete based on the real-time warehouse snapshot.'
        return NextResponse.json({ reply, response: reply })
      }

      // If systemInstruction is not accepted or rate-limited, try inline fallback
      const fallbackPayload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }

      const fallbackRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload),
      })

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json()
        const fallbackReply =
          fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text ||
          'Analysis complete based on the real-time warehouse snapshot.'
        return NextResponse.json({ reply: fallbackReply, response: fallbackReply })
      }
    } catch (networkErr) {
      console.error('Fetch error calling Gemini API:', networkErr)
    }

    // Deterministic snapshot-informed local fallback
    const lowCount = products.filter((p) => p.currentStock <= p.reorderThreshold).length
    const fallbackMessage = `**StockLite Real-Time Status:**\n- **Tracked SKUs:** ${products.length} items across ${warehouses.length} active hubs.\n- **Low Stock Alerts:** ${lowCount} item(s) below threshold.\n- **Recent Transactions:** ${transactions.length} operations recorded.\n\n*Query processed:* "${userMessage}"`
    return NextResponse.json({ reply: fallbackMessage, response: fallbackMessage })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Chat API Handler Error:', errorMsg)
    return NextResponse.json(
      {
        error: 'Failed to process chat query',
        details: errorMsg,
        reply: 'Sorry, I encountered an issue analyzing the inventory data. Please try again.',
      },
      { status: 500 },
    )
  }
}
