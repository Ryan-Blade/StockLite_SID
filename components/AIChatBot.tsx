'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  ArrowRight,
  TrendingDown,
  ArrowRightLeft,
  Activity,
  Boxes,
} from 'lucide-react'

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: string
}

const QUICK_PROMPT_CHIPS = [
  {
    label: 'Which items are below threshold?',
    icon: <TrendingDown className="w-3 h-3 text-[#8b4a3f]" />,
  },
  {
    label: 'Suggest inventory transfers',
    icon: <ArrowRightLeft className="w-3 h-3 text-[#ca8a04]" />,
  },
  {
    label: 'Summarize recent stock movements',
    icon: <Activity className="w-3 h-3 text-[#4b6357]" />,
  },
  {
    label: 'Fast moving items in North Hub',
    icon: <Boxes className="w-3 h-3 text-[#ca8a04]" />,
  },
]

// Simple markdown formatter helper for clean bullet points, bolding, code tags, etc.
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="space-y-1.5 text-xs text-[#1b1e1c] leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <div key={idx} className="h-1.5" />
        }

        // Format bold (**text**), inline code (`code`), and italics (*text*)
        const parseFormatting = (str: string) => {
          // split by tokens
          const parts = str.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g)
          return parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-[#1b1e1c]">
                  {part.slice(2, -2)}
                </strong>
              )
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code
                  key={pIdx}
                  className="px-1 py-0.5 rounded bg-[#eee9dc] font-mono text-[11px] font-semibold text-[#1b1e1c]"
                >
                  {part.slice(1, -1)}
                </code>
              )
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              return (
                <em key={pIdx} className="italic text-[#6b6f68]">
                  {part.slice(1, -1)}
                </em>
              )
            }
            return part
          })
        }

        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-2">
              <span className="text-[#ca8a04] font-bold shrink-0">•</span>
              <div>{parseFormatting(line.slice(2))}</div>
            </div>
          )
        }

        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+\.)\s(.*)/)
          if (match) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-2">
                <span className="font-bold text-[#ca8a04] shrink-0">{match[1]}</span>
                <div>{parseFormatting(match[2])}</div>
              </div>
            )
          }
        }

        return <p key={idx}>{parseFormatting(line)}</p>
      })}
    </div>
  )
}

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 **Hello! I'm your StockLite Logistics Assistant.**\nI can analyze real-time SKU levels, suggest cross-hub rebalancing, and track burn rates. Pick a prompt below or ask me anything!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim()
    if (!textToSend || loading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    if (!queryText) setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      })

      const data = await res.json()
      const botReply = data.response || 'Sorry, I could not process your query at this moment.'

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch {
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: '⚠️ An error occurred while communicating with the StockLite intelligence service.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: "👋 **Assistant reset.** How can I assist you with your warehouse inventory?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-[#1b1e1c] text-[#facc15] rounded-full shadow-2xl hover:bg-[#2b2f2c] transition-all duration-200 hover:scale-105 active:scale-95 border border-[#ca8a04]/40"
          aria-label="Open AI Warehouse Assistant"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#facc15] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#facc15]" />
          </span>
          <Sparkles className="w-4 h-4 text-[#facc15]" />
          <span className="font-display font-bold text-xs tracking-wide">StockLite AI</span>
        </button>
      )}

      {/* Expandable Chat Drawer */}
      {isOpen && (
        <div className="w-[360px] sm:w-[410px] h-[540px] max-h-[85vh] bg-[#fbfaf6] border border-[#d8d2c2] rounded-lg shadow-2xl flex flex-col justify-between overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="bg-[#1b1e1c] text-[#ffffff] px-4 py-3.5 flex items-center justify-between border-b border-[#353935]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#facc15] text-[#1b1e1c] flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-[#fbfaf6] leading-tight flex items-center gap-1.5">
                  <span>StockLite AI Copilot</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-[#4b6357] text-[#ffffff] rounded font-mono font-medium">
                    Live
                  </span>
                </h3>
                <p className="text-[10.5px] text-[#a4a8a0]">Deterministic Inventory Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="Reset Conversation"
                className="p-1.5 text-[#a4a8a0] hover:text-[#fbfaf6] hover:bg-[#2b2f2c] rounded transition-colors"
                aria-label="Reset chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close AI Assistant"
                className="p-1.5 text-[#a4a8a0] hover:text-[#fbfaf6] hover:bg-[#2b2f2c] rounded transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#eee9dc]/30">
            {messages.map((msg) => {
              const isBot = msg.sender === 'bot'
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}
                >
                  {isBot && (
                    <div className="w-6 h-6 rounded-full bg-[#1b1e1c] text-[#facc15] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-md p-3 shadow-2xs ${
                      isBot
                        ? 'bg-[#ffffff] border border-[#d8d2c2] text-[#1b1e1c]'
                        : 'bg-[#1b1e1c] text-[#fbfaf6]'
                    }`}
                  >
                    {isBot ? (
                      <FormattedMessage content={msg.text} />
                    ) : (
                      <p className="text-xs text-[#fbfaf6] whitespace-pre-wrap">{msg.text}</p>
                    )}
                    <span
                      className={`text-[9px] block mt-1.5 ${
                        isBot ? 'text-[#6b6f68]' : 'text-[#a4a8a0] text-right'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  {!isBot && (
                    <div className="w-6 h-6 rounded-full bg-[#ca8a04] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              )
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#6b6f68] pl-2">
                <div className="w-2 h-2 rounded-full bg-[#ca8a04] animate-ping" />
                <span>StockLite AI is analyzing network telemetry...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-[#fbfaf6] border-t border-[#e2ddce] overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-1.5">
            {QUICK_PROMPT_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip.label)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full bg-[#eee9dc] hover:bg-[#e2ddce] text-[#1b1e1c] border border-[#d8d2c2] transition-colors shrink-0 disabled:opacity-50"
              >
                {chip.icon}
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="p-3 bg-[#fbfaf6] border-t border-[#d8d2c2] flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about SKU balances, rebalancing, or audit..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 text-xs px-3 py-2 bg-white border border-[#d8d2c2] rounded-sm focus:outline-none focus:border-[#4b6357] text-[#1b1e1c]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn btn-primary p-2 rounded-sm shadow-xs disabled:opacity-50"
              aria-label="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
