'use client'

import React, { useState, useId } from 'react'

export interface DonutSegment {
  id?: string
  label: string
  value: number
  color?: string
  subtext?: string
}

export interface DonutChartProps {
  data: DonutSegment[]
  centerLabel?: string
  centerValue?: string | number
  centerSubtext?: string
  size?: number
  thickness?: number
  selectedId?: string
  onSliceClick?: (segment: DonutSegment) => void
  showLegend?: boolean
  legendPosition?: 'right' | 'bottom'
  formatValue?: (val: number) => string
  className?: string
  emptyMessage?: string
}

const DEFAULT_PALETTE = [
  '#eab308', // warm yellow accent
  '#4b6357', // moss green
  '#a67c3d', // brass
  '#8b4a3f', // rust
  '#6b6f68', // steel
  '#ca8a04', // dark yellow
  '#364a40', // dark moss
  '#f59e0b', // amber
  '#0d9488', // teal
  '#e11d48', // rose
]

export default function DonutChart({
  data,
  centerLabel,
  centerValue,
  centerSubtext,
  size = 180,
  thickness = 26,
  selectedId,
  onSliceClick,
  showLegend = true,
  legendPosition = 'right',
  formatValue = (v) => v.toLocaleString(),
  className = '',
  emptyMessage = 'No data available',
}: DonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const filterId = useId().replace(/:/g, '')

  const total = data.reduce((acc, curr) => acc + (curr.value > 0 ? curr.value : 0), 0)

  // Color assignments
  const coloredData = data.map((d, i) => ({
    ...d,
    color: d.color || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
  }))

  const radius = (size - thickness) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  // Compute strokeDasharray and strokeDashoffset for each segment
  let cumulativeOffset = 0
  const slices = coloredData.map((d, i) => {
    const fraction = total > 0 ? Math.max(0, d.value) / total : 0
    const strokeDash = fraction * circumference
    const offset = -cumulativeOffset
    cumulativeOffset += strokeDash

    const isHovered = hoveredIdx === i
    const isSelected = selectedId && (d.id === selectedId || d.label === selectedId)

    return {
      ...d,
      index: i,
      fraction,
      percentage: Math.round(fraction * 100),
      strokeDash,
      offset,
      isHovered,
      isSelected,
    }
  })

  const activeSegment = hoveredIdx !== null ? slices[hoveredIdx] : slices.find((s) => s.isSelected)

  const displayCenterValue =
    activeSegment !== undefined
      ? formatValue(activeSegment.value)
      : centerValue !== undefined
      ? centerValue
      : formatValue(total)

  const displayCenterLabel =
    activeSegment !== undefined
      ? activeSegment.label
      : centerLabel !== undefined
      ? centerLabel
      : 'Total'

  const displayCenterSubtext =
    activeSegment !== undefined
      ? `${activeSegment.percentage}% of total`
      : centerSubtext

  return (
    <div
      className={`inline-flex items-center gap-5 ${
        legendPosition === 'bottom' ? 'flex-col items-center' : 'flex-row items-center'
      } ${className}`}
    >
      {/* SVG Donut */}
      <div
        className="relative shrink-0 select-none group"
        style={{ width: size, height: size }}
      >
        {total === 0 ? (
          <div className="w-full h-full rounded-full border-2 border-dashed border-[#d8d2c2] flex flex-col items-center justify-center p-4 text-center">
            <span className="text-xs text-[#6b6f68] font-medium">{emptyMessage}</span>
          </div>
        ) : (
          <>
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90 origin-center overflow-visible"
            >
              <defs>
                <filter id={`glow-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1b1e1c" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Background ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#e2ddce"
                strokeWidth={thickness}
                className="opacity-50"
              />

              {/* Data rings */}
              {slices.map((slice) => {
                if (slice.fraction <= 0) return null
                const highlight = slice.isHovered || slice.isSelected

                return (
                  <circle
                    key={slice.id || slice.label || slice.index}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={highlight ? thickness + 4 : thickness}
                    strokeDasharray={`${Math.max(0, slice.strokeDash - (slices.length > 1 ? 2 : 0))} ${circumference}`}
                    strokeDashoffset={slice.offset}
                    strokeLinecap={slices.length === 1 ? 'round' : 'butt'}
                    filter={highlight ? `url(#glow-${filterId})` : undefined}
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      transformOrigin: `${center}px ${center}px`,
                      transform: highlight ? 'scale(1.02)' : 'scale(1)',
                    }}
                    onMouseEnter={() => setHoveredIdx(slice.index)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => onSliceClick && onSliceClick(slice)}
                  />
                )
              })}
            </svg>

            {/* Center Info Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#6b6f68] line-clamp-1 max-w-[80%]">
                {displayCenterLabel}
              </span>
              <span className="font-display font-bold text-lg sm:text-xl text-[#1b1e1c] leading-tight mt-0.5">
                {displayCenterValue}
              </span>
              {displayCenterSubtext && (
                <span className="text-[10px] text-[#8b4a3f] font-medium mt-0.5">
                  {displayCenterSubtext}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      {showLegend && total > 0 && (
        <div
          className={`flex flex-col gap-1.5 text-xs ${
            legendPosition === 'bottom' ? 'w-full grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2' : 'min-w-[140px]'
          }`}
        >
          {slices.map((slice) => {
            const isHighlighted = slice.isHovered || slice.isSelected
            return (
              <button
                key={slice.id || slice.label}
                type="button"
                onClick={() => onSliceClick && onSliceClick(slice)}
                onMouseEnter={() => setHoveredIdx(slice.index)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between gap-2.5 px-2 py-1 rounded text-left transition-colors ${
                  isHighlighted
                    ? 'bg-[#eee9dc] font-semibold text-[#1b1e1c]'
                    : 'text-[#6b6f68] hover:bg-[#eee9dc]/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate max-w-[110px] text-[12px]">{slice.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-medium text-[#1b1e1c] text-[12px]">
                    {formatValue(slice.value)}
                  </span>
                  <span className="text-[10.5px] text-[#6b6f68]">
                    ({slice.percentage}%)
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
