'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Product, Warehouse } from '@/lib/types'
import { ArrowRight, Boxes, ShieldAlert, Sparkles, Zap, RotateCcw, Play, CheckCircle2 } from 'lucide-react'

export interface ActiveTransferInfo {
  sourceWarehouseId: string
  destWarehouseId: string
  quantity?: number
  productName?: string
  isAnimating?: boolean
}

export interface ObsidianWarehouseGraphProps {
  warehouses: Warehouse[]
  products: Product[]
  selectedWarehouseId?: string | 'all'
  onSelectWarehouse?: (id: string) => void
  activeTransfer?: ActiveTransferInfo | null
  onQuickTransferSelect?: (sourceId: string, destId: string) => void
  mode?: 'dashboard' | 'transfer' | 'compact'
  height?: number
  interactive?: boolean
  className?: string
}

interface NodeState {
  id: string
  name: string
  location: string
  x: number
  y: number
  vx: number
  vy: number
  targetX: number
  targetY: number
  radius: number
  totalSkus: number
  totalUnits: number
  lowStockCount: number
  status: 'optimal' | 'low' | 'critical'
  isDragging: boolean
}

interface Particle {
  id: number
  progress: number // 0 to 1
  speed: number
  size: number
  color: string
}

export default function ObsidianWarehouseGraph({
  warehouses,
  products,
  selectedWarehouseId = 'all',
  onSelectWarehouse,
  activeTransfer,
  onQuickTransferSelect,
  mode = 'dashboard',
  height = 360,
  interactive = true,
  className = '',
}: ObsidianWarehouseGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 700, height })
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<boolean>(false)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [simulatedTransferActive, setSimulatedTransferActive] = useState<boolean>(false)
  const [simTimer, setSimTimer] = useState<NodeJS.Timeout | null>(null)
  const [physicsTick, setPhysicsTick] = useState(0)

  // Calculate warehouse metrics
  const warehouseStats = useMemo(() => {
    return warehouses.map((w) => {
      const wProducts = products.filter((p) => p.warehouseId === w.id)
      const lowStock = wProducts.filter((p) => p.currentStock <= p.reorderThreshold)
      const critical = wProducts.filter((p) => p.currentStock === 0)
      const totalUnits = wProducts.reduce((sum, p) => sum + p.currentStock, 0)

      let status: 'optimal' | 'low' | 'critical' = 'optimal'
      if (critical.length > 0) status = 'critical'
      else if (lowStock.length > 0) status = 'low'

      return {
        id: w.id,
        name: w.name,
        location: w.location,
        totalSkus: wProducts.length,
        totalUnits,
        lowStockCount: lowStock.length,
        status,
        products: wProducts,
      }
    })
  }, [warehouses, products])

  // Nodes state with spring positions
  const nodesRef = useRef<Map<string, NodeState>>(new Map())

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current
        setDimensions({
          width: clientWidth || 700,
          height: typeof height === 'number' ? height : 360,
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [height])

  // Initialize or update node positions based on dimensions
  useEffect(() => {
    const w = dimensions.width
    const h = dimensions.height
    const count = warehouses.length

    warehouses.forEach((wh, idx) => {
      const stat = warehouseStats.find((s) => s.id === wh.id)
      const existing = nodesRef.current.get(wh.id)

      // Default layout: 2 hubs placed on left and right, or circular for N hubs
      let targetX = w / 2
      let targetY = h / 2
      if (count === 2) {
        targetX = idx === 0 ? w * 0.28 : w * 0.72
        targetY = h * 0.5
      } else if (count > 2) {
        const angle = (idx / count) * 2 * Math.PI - Math.PI / 2
        const radius = Math.min(w, h) * 0.35
        targetX = w / 2 + Math.cos(angle) * radius
        targetY = h / 2 + Math.sin(angle) * radius
      }

      if (existing) {
        existing.name = wh.name
        existing.location = wh.location
        existing.targetX = targetX
        existing.targetY = targetY
        existing.totalSkus = stat?.totalSkus ?? 0
        existing.totalUnits = stat?.totalUnits ?? 0
        existing.lowStockCount = stat?.lowStockCount ?? 0
        existing.status = stat?.status ?? 'optimal'
      } else {
        nodesRef.current.set(wh.id, {
          id: wh.id,
          name: wh.name,
          location: wh.location,
          x: targetX + (Math.random() - 0.5) * 20,
          y: targetY + (Math.random() - 0.5) * 20,
          vx: 0,
          vy: 0,
          targetX,
          targetY,
          radius: 44,
          totalSkus: stat?.totalSkus ?? 0,
          totalUnits: stat?.totalUnits ?? 0,
          lowStockCount: stat?.lowStockCount ?? 0,
          status: stat?.status ?? 'optimal',
          isDragging: false,
        })
      }
    })
  }, [warehouses, warehouseStats, dimensions])

  // Active particles for transfer animation
  const particlesRef = useRef<Particle[]>([
    { id: 1, progress: 0.05, speed: 0.009, size: 4.5, color: '#facc15' },
    { id: 2, progress: 0.28, speed: 0.010, size: 5.5, color: '#eab308' },
    { id: 3, progress: 0.52, speed: 0.008, size: 4.0, color: '#f59e0b' },
    { id: 4, progress: 0.76, speed: 0.011, size: 5.0, color: '#4b6357' },
    { id: 5, progress: 0.94, speed: 0.009, size: 4.0, color: '#fef08a' },
  ])

  // Determine effective active transfer (from props or simulated test)
  const effectiveTransfer = useMemo<ActiveTransferInfo | null>(() => {
    if (activeTransfer && activeTransfer.sourceWarehouseId && activeTransfer.destWarehouseId) {
      return {
        ...activeTransfer,
        isAnimating: activeTransfer.isAnimating !== false,
      }
    }
    if (simulatedTransferActive && warehouses.length >= 2) {
      return {
        sourceWarehouseId: warehouses[0].id,
        destWarehouseId: warehouses[1].id,
        quantity: 50,
        productName: 'Simulated Rebalance Order',
        isAnimating: true,
      }
    }
    return null
  }, [activeTransfer, simulatedTransferActive, warehouses])

  const isTransferActive = Boolean(
    effectiveTransfer &&
      effectiveTransfer.sourceWarehouseId &&
      effectiveTransfer.destWarehouseId &&
      effectiveTransfer.sourceWarehouseId !== effectiveTransfer.destWarehouseId &&
      effectiveTransfer.isAnimating,
  )

  // Physics Simulation loop
  useEffect(() => {
    let animId: number
    const springK = 0.04
    const damping = 0.82

    const step = () => {
      const nodes = Array.from(nodesRef.current.values())

      // Only advance particle positions if a transfer is actively occurring or hovered
      if (isTransferActive || hoveredEdge) {
        particlesRef.current.forEach((p) => {
          p.progress += p.speed
          if (p.progress > 1) p.progress = 0
        })
      }

      // Spring physics & node repulsion
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i]
        if (n1.isDragging) continue

        // Spring to target anchor
        const dx = n1.targetX - n1.x
        const dy = n1.targetY - n1.y
        n1.vx += dx * springK
        n1.vy += dy * springK

        // Repulsion between nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j]
          const rx = n1.x - n2.x
          const ry = n1.y - n2.y
          const distSq = rx * rx + ry * ry || 1
          const dist = Math.sqrt(distSq)
          const minDist = n1.radius + n2.radius + 60
          if (dist < minDist) {
            const force = (minDist - dist) / dist
            n1.vx += rx * force * 0.05
            n1.vy += ry * force * 0.05
            if (!n2.isDragging) {
              n2.vx -= rx * force * 0.05
              n2.vy -= ry * force * 0.05
            }
          }
        }

        // Apply velocity & damping
        n1.vx *= damping
        n1.vy *= damping
        n1.x += n1.vx
        n1.y += n1.vy

        // Bounds check
        n1.x = Math.max(n1.radius + 10, Math.min(dimensions.width - n1.radius - 10, n1.x))
        n1.y = Math.max(n1.radius + 10, Math.min(dimensions.height - n1.radius - 10, n1.y))
      }

      setPhysicsTick((t) => (t + 1) % 1000)
      animId = requestAnimationFrame(step)
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [dimensions, isTransferActive, hoveredEdge])

  // Mouse Dragging Handlers
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    if (!interactive) return
    e.stopPropagation()
    const node = nodesRef.current.get(nodeId)
    if (node) {
      node.isDragging = true
      setDraggedNodeId(nodeId)
    }
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedNodeId || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const node = nodesRef.current.get(draggedNodeId)
      if (node) {
        node.x = mouseX
        node.y = mouseY
        node.vx = 0
        node.vy = 0
      }
    },
    [draggedNodeId],
  )

  const handleMouseUp = useCallback(() => {
    if (draggedNodeId) {
      const node = nodesRef.current.get(draggedNodeId)
      if (node) node.isDragging = false
      setDraggedNodeId(null)
    }
  }, [draggedNodeId])

  const resetPositions = () => {
    nodesRef.current.forEach((n) => {
      n.x = n.targetX
      n.y = n.targetY
      n.vx = 0
      n.vy = 0
    })
  }

  // Trigger simulated live transfer for 4 seconds
  const handleSimulateTransfer = () => {
    if (simTimer) clearTimeout(simTimer)
    setSimulatedTransferActive(true)
    const t = setTimeout(() => {
      setSimulatedTransferActive(false)
    }, 4500)
    setSimTimer(t)
  }

  const nodesList = Array.from(nodesRef.current.values())

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full rounded-md bg-[#fbfaf6] border border-[#d8d2c2] overflow-hidden select-none shadow-xs ${className}`}
      style={{ minHeight: height }}
    >
      {/* Radar Animation Keyframes */}
      <style>{`
        @keyframes radarPingSource {
          0% {
            r: 44px;
            opacity: 0.85;
            stroke-width: 3.5px;
          }
          60% {
            opacity: 0.45;
            stroke-width: 2px;
          }
          100% {
            r: 96px;
            opacity: 0;
            stroke-width: 0.5px;
          }
        }
        @keyframes radarPingDest {
          0% {
            r: 44px;
            opacity: 0.85;
            stroke-width: 3.5px;
          }
          60% {
            opacity: 0.45;
            stroke-width: 2px;
          }
          100% {
            r: 96px;
            opacity: 0;
            stroke-width: 0.5px;
          }
        }
        .radar-source-1 {
          animation: radarPingSource 2.2s cubic-bezier(0.1, 0.4, 0.2, 1) infinite;
        }
        .radar-source-2 {
          animation: radarPingSource 2.2s cubic-bezier(0.1, 0.4, 0.2, 1) infinite;
          animation-delay: 0.75s;
        }
        .radar-source-3 {
          animation: radarPingSource 2.2s cubic-bezier(0.1, 0.4, 0.2, 1) infinite;
          animation-delay: 1.5s;
        }
        .radar-dest-1 {
          animation: radarPingDest 2.2s cubic-bezier(0.1, 0.4, 0.2, 1) infinite;
        }
        .radar-dest-2 {
          animation: radarPingDest 2.2s cubic-bezier(0.1, 0.4, 0.2, 1) infinite;
          animation-delay: 0.75s;
        }
        .radar-dest-3 {
          animation: radarPingDest 2.2s cubic-bezier(0.1, 0.4, 0.2, 1) infinite;
          animation-delay: 1.5s;
        }
      `}</style>

      {/* Subtle Graph Grid & Ambient Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle, #6b6f68 1px, transparent 1px), linear-gradient(to right, rgba(107,111,104,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(107,111,104,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px, 32px 32px, 32px 32px',
        }}
      />

      {/* Top Overlay Badge Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#eee9dc]/90 backdrop-blur-xs border border-[#d8d2c2] text-xs font-semibold text-[#1b1e1c] shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#ca8a04]" />
          <span>Obsidian Warehouse Network</span>
        </div>

        {isTransferActive ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#eab308]/20 border border-[#ca8a04] text-xs font-bold text-[#78521a] animate-pulse">
            <Zap className="w-3.5 h-3.5 text-[#ca8a04]" />
            <span>
              Transfer Active:{' '}
              {effectiveTransfer?.quantity
                ? `${effectiveTransfer.quantity} units`
                : 'In Flight'}
            </span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[#fbfaf6]/80 border border-[#d8d2c2] text-[11px] text-[#6b6f68]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4b6357]" />
            <span>Topology Idle</span>
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {/* Trigger Test Simulated Transfer */}
        <button
          type="button"
          onClick={handleSimulateTransfer}
          title="Simulate Live Transfer Pulse"
          className={`px-2.5 py-1 rounded-sm text-xs font-bold flex items-center gap-1.5 border transition-all shadow-2xs ${
            simulatedTransferActive
              ? 'bg-[#eab308] text-[#1b1e1c] border-[#ca8a04]'
              : 'bg-[#eee9dc] hover:bg-[#e2ddce] text-[#1b1e1c] border-[#d8d2c2]'
          }`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{simulatedTransferActive ? 'Pulsing...' : 'Simulate Transfer'}</span>
        </button>

        <button
          type="button"
          onClick={resetPositions}
          title="Reset Node Layout"
          className="p-1.5 rounded-sm bg-[#eee9dc] hover:bg-[#e2ddce] text-[#6b6f68] hover:text-[#1b1e1c] border border-[#d8d2c2] transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main SVG Graph Layer */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 w-full h-full overflow-visible"
      >
        <defs>
          {/* Node Glow Filters */}
          <filter id="aura-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="transfer-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#eab308" floodOpacity="0.8" />
          </filter>

          {/* Gradients */}
          <linearGradient id="link-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4b6357" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#8b4a3f" />
          </linearGradient>

          <linearGradient id="active-flow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4b6357" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
        </defs>

        {/* ------------------------------------------------------------- */}
        {/* EDGES / LINKS BETWEEN WAREHOUSES */}
        {/* ------------------------------------------------------------- */}
        {nodesList.length >= 2 && (
          <g className="edges-layer">
            {nodesList.map((sourceNode, idx) => {
              return nodesList.slice(idx + 1).map((destNode) => {
                const isEdgeTransferActive =
                  isTransferActive &&
                  ((effectiveTransfer?.sourceWarehouseId === sourceNode.id &&
                    effectiveTransfer?.destWarehouseId === destNode.id) ||
                    (effectiveTransfer?.sourceWarehouseId === destNode.id &&
                      effectiveTransfer?.destWarehouseId === sourceNode.id))

                // Determine directional flow
                const isForward =
                  effectiveTransfer?.sourceWarehouseId === sourceNode.id &&
                  effectiveTransfer?.destWarehouseId === destNode.id

                const x1 = isForward ? sourceNode.x : destNode.x
                const y1 = isForward ? sourceNode.y : destNode.y
                const x2 = isForward ? destNode.x : sourceNode.x
                const y2 = isForward ? destNode.y : sourceNode.y

                // Control point for Obsidian curve
                const midX = (x1 + x2) / 2
                const midY = (y1 + y2) / 2 - 25
                const pathD = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`

                return (
                  <g
                    key={`edge-${sourceNode.id}-${destNode.id}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredEdge(true)}
                    onMouseLeave={() => setHoveredEdge(false)}
                    onClick={() => {
                      if (onQuickTransferSelect) {
                        onQuickTransferSelect(sourceNode.id, destNode.id)
                      }
                    }}
                  >
                    {/* Background wide hit area */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="24"
                    />

                    {/* Edge Base Track — Solid quiet line when idle, glowing dashed pulse when active */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={
                        isEdgeTransferActive
                          ? '#eab308'
                          : hoveredEdge
                          ? '#ca8a04'
                          : '#d8d2c2'
                      }
                      strokeWidth={isEdgeTransferActive ? '3.5' : hoveredEdge ? '2.5' : '1.8'}
                      strokeDasharray={isEdgeTransferActive ? '6,6' : 'none'}
                      className={isEdgeTransferActive ? 'animate-pulse' : ''}
                      filter={isEdgeTransferActive ? 'url(#transfer-glow)' : undefined}
                    />

                    {/* Dynamic Transfer Particles along Path (ONLY active when transfer is occurring or hovered) */}
                    {(isEdgeTransferActive || hoveredEdge) && (
                      <g>
                        {particlesRef.current.map((p) => {
                          // Quadratic bezier interpolation: (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
                          const t = p.progress
                          const px =
                            (1 - t) * (1 - t) * x1 +
                            2 * (1 - t) * t * midX +
                            t * t * x2
                          const py =
                            (1 - t) * (1 - t) * y1 +
                            2 * (1 - t) * t * midY +
                            t * t * y2

                          return (
                            <circle
                              key={p.id}
                              cx={px}
                              cy={py}
                              r={p.size}
                              fill={p.color}
                              filter="url(#transfer-glow)"
                              className="shadow-md"
                            />
                          )
                        })}
                      </g>
                    )}

                    {/* Midpoint Transfer Badge */}
                    <g transform={`translate(${midX}, ${midY})`}>
                      <rect
                        x="-48"
                        y="-12"
                        width="96"
                        height="24"
                        rx="12"
                        fill="#fbfaf6"
                        stroke={isEdgeTransferActive ? '#eab308' : '#d8d2c2'}
                        strokeWidth="1.5"
                        className="shadow-xs hover:border-[#ca8a04]"
                      />
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill={isEdgeTransferActive ? '#78521a' : '#6b6f68'}
                        fontFamily="var(--font-display)"
                      >
                        {isEdgeTransferActive
                          ? `⇄ ${effectiveTransfer?.quantity ? `${effectiveTransfer.quantity} QTY` : 'TRANSFER'}`
                          : '⇄ TRANSFER'}
                      </text>
                    </g>
                  </g>
                )
              })
            })}
          </g>
        )}

        {/* ------------------------------------------------------------- */}
        {/* WAREHOUSE FORCE NODES WITH PULSATING RADAR WAVES */}
        {/* ------------------------------------------------------------- */}
        <g className="nodes-layer">
          {nodesList.map((node) => {
            const isSelected = selectedWarehouseId === node.id
            const isHovered = hoveredNodeId === node.id
            const isSource = isTransferActive && effectiveTransfer?.sourceWarehouseId === node.id
            const isDest = isTransferActive && effectiveTransfer?.destWarehouseId === node.id

            // Status Colors
            const statusColor =
              node.status === 'optimal'
                ? '#4b6357'
                : node.status === 'low'
                ? '#eab308'
                : '#8b4a3f'

            const statusBg =
              node.status === 'optimal'
                ? 'rgba(75, 99, 87, 0.12)'
                : node.status === 'low'
                ? 'rgba(234, 179, 8, 0.18)'
                : 'rgba(139, 74, 63, 0.18)'

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-grab active:cursor-grabbing transition-transform duration-75"
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => {
                  if (onSelectWarehouse) {
                    onSelectWarehouse(isSelected ? 'all' : node.id)
                  }
                }}
              >
                {/* ========================================================= */}
                {/* PULSATING RADAR WAVE RINGS ON ACTIVE SOURCE / DEST NODES */}
                {/* ========================================================= */}
                {isSource && (
                  <g className="pointer-events-none">
                    <circle
                      r={node.radius}
                      fill="none"
                      stroke="#4b6357"
                      className="radar-source-1"
                    />
                    <circle
                      r={node.radius}
                      fill="none"
                      stroke="#4b6357"
                      className="radar-source-2"
                    />
                    <circle
                      r={node.radius}
                      fill="none"
                      stroke="#4b6357"
                      className="radar-source-3"
                    />
                  </g>
                )}

                {isDest && (
                  <g className="pointer-events-none">
                    <circle
                      r={node.radius}
                      fill="none"
                      stroke="#eab308"
                      className="radar-dest-1"
                    />
                    <circle
                      r={node.radius}
                      fill="none"
                      stroke="#eab308"
                      className="radar-dest-2"
                    />
                    <circle
                      r={node.radius}
                      fill="none"
                      stroke="#eab308"
                      className="radar-dest-3"
                    />
                  </g>
                )}

                {/* Outer Rotating Aura Ring for Selection / Hover */}
                {(isSelected || isHovered) && !isSource && !isDest && (
                  <circle
                    r={node.radius + 16}
                    fill="none"
                    stroke={statusColor}
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    className="animate-spin"
                    style={{ animationDuration: '10s', transformOrigin: '0 0' }}
                    opacity="0.6"
                  />
                )}

                {/* Pulsing Aura */}
                <circle
                  r={node.radius + 8}
                  fill={statusBg}
                  className="animate-pulse"
                />

                {/* Main Node Body */}
                <circle
                  r={node.radius}
                  fill="#fbfaf6"
                  stroke={
                    isSource
                      ? '#4b6357'
                      : isDest
                      ? '#ca8a04'
                      : isSelected
                      ? '#ca8a04'
                      : statusColor
                  }
                  strokeWidth={isSelected || isSource || isDest ? 3.5 : 2.5}
                  filter="url(#aura-glow)"
                  className="shadow-md transition-all duration-200"
                />

                {/* Node Center Label & Content */}
                <g textAnchor="middle" className="pointer-events-none select-none">
                  {/* Hub Code / Initials */}
                  <circle
                    cx="0"
                    cy="-14"
                    r="12"
                    fill="#1b1e1c"
                  />
                  <text
                    x="0"
                    y="-10"
                    fill="#facc15"
                    fontSize="9"
                    fontWeight="800"
                    fontFamily="var(--font-display)"
                  >
                    {node.id === 'wh-north'
                      ? 'DC-N'
                      : node.id === 'wh-south'
                      ? 'FH-S'
                      : node.id.slice(0, 4).toUpperCase()}
                  </text>

                  {/* Warehouse Title */}
                  <text
                    x="0"
                    y="7"
                    fill="#1b1e1c"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="var(--font-display)"
                  >
                    {node.name.length > 15 ? `${node.name.slice(0, 13)}…` : node.name}
                  </text>

                  {/* Units Count */}
                  <text
                    x="0"
                    y="21"
                    fill="#6b6f68"
                    fontSize="9.5"
                    fontWeight="500"
                  >
                    {node.totalUnits} Units • {node.totalSkus} SKUs
                  </text>
                </g>

                {/* Status Indicator Pip */}
                <circle
                  cx={node.radius * 0.7}
                  cy={-node.radius * 0.7}
                  r="7"
                  fill={statusColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Transfer Role Pip (Source / Dest) */}
                {isSource && (
                  <g transform={`translate(${-node.radius * 0.7}, ${-node.radius * 0.7})`}>
                    <rect x="-16" y="-7" width="32" height="14" rx="7" fill="#4b6357" />
                    <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="800">
                      SRC
                    </text>
                  </g>
                )}

                {isDest && (
                  <g transform={`translate(${-node.radius * 0.7}, ${-node.radius * 0.7})`}>
                    <rect x="-14" y="-7" width="28" height="14" rx="7" fill="#ca8a04" />
                    <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="800">
                      DEST
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* ------------------------------------------------------------- */}
      {/* RICH OBSIDIAN GLASS TOOLTIP ON HOVER */}
      {/* ------------------------------------------------------------- */}
      {hoveredNodeId && (
        (() => {
          const hoveredNode = nodesList.find((n) => n.id === hoveredNodeId)
          const stat = warehouseStats.find((s) => s.id === hoveredNodeId)
          if (!hoveredNode || !stat) return null

          // Keep tooltip inside view bounds
          const tipX = Math.min(Math.max(hoveredNode.x, 140), dimensions.width - 140)
          const tipY = hoveredNode.y > dimensions.height * 0.6 ? hoveredNode.y - 130 : hoveredNode.y + 60

          return (
            <div
              className="absolute z-30 pointer-events-none p-3 rounded-md bg-[#1b1e1c]/95 backdrop-blur-md text-[#fbfaf6] shadow-xl border border-[#ca8a04]/40 text-xs w-[220px] -translate-x-1/2 transition-all duration-150"
              style={{ left: tipX, top: tipY }}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5 border-b border-[#6b6f68]/40 pb-1">
                <span className="font-display font-bold text-sm text-[#facc15] truncate">
                  {hoveredNode.name}
                </span>
                <span className="text-[10px] text-[#eee9dc]/70">{hoveredNode.location}</span>
              </div>

              <div className="space-y-1 text-[11.5px]">
                <div className="flex justify-between">
                  <span className="text-[#eee9dc]/80">Total SKUs:</span>
                  <strong className="text-white">{stat.totalSkus}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#eee9dc]/80">Units On Hand:</span>
                  <strong className="text-white">{stat.totalUnits.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#eee9dc]/80">Stock Status:</span>
                  <strong
                    className={
                      stat.lowStockCount === 0
                        ? 'text-[#4b6357]'
                        : stat.status === 'critical'
                        ? 'text-[#8b4a3f]'
                        : 'text-[#eab308]'
                    }
                  >
                    {stat.lowStockCount === 0
                      ? 'Optimal'
                      : `${stat.lowStockCount} Low SKUs`}
                  </strong>
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-[#6b6f68]/40 text-[10px] text-[#ca8a04] text-center font-medium">
                Click to filter • Drag to reposition
              </div>
            </div>
          )
        })()
      )}

      {/* Footer helper legend */}
      <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-[#6b6f68] pointer-events-none flex-wrap gap-2">
        <div className="flex items-center gap-3 bg-[#fbfaf6]/90 px-2.5 py-1 rounded backdrop-blur-xs border border-[#d8d2c2]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#4b6357]" /> Optimal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#eab308]" /> Low Threshold
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#8b4a3f]" /> Critical
          </span>
        </div>

        <div className="hidden sm:block text-[10.5px] bg-[#fbfaf6]/90 px-2 py-0.5 rounded border border-[#d8d2c2]">
          💡 Radar rings pulse dynamically during active rebalances
        </div>
      </div>
    </div>
  )
}
