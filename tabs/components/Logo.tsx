import React from "react"

export function Logo({ width = 40, height = 40, color = "currentColor" }: { width?: number; height?: number; color?: string }) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      {/* Body Block */}
      <path 
        d="M30 85L30 20L50 40L70 20L70 55L52 85H30Z" 
        fill={color}
      />
      {/* Fold Block */}
      <path 
        d="M58 85H75V62L58 85Z" 
        fill={color}
      />
    </svg>
  )
}
