'use client'

import { useState, useEffect } from 'react'

interface FlagIconProps {
  countryCode: string
  className?: string
  size?: 'small' | 'medium' | 'large'
}

export function FlagIcon({ countryCode, className = '', size = 'medium' }: FlagIconProps) {
  const [flagLoaded, setFlagLoaded] = useState(false)

  useEffect(() => {
    // Dynamically load flag icons CSS only when first flag is rendered
    if (!flagLoaded) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/flag-icons/css/flag-icons.min.css'
      link.onload = () => setFlagLoaded(true)
      document.head.appendChild(link)
    }
  }, [flagLoaded])

  const sizeClasses = {
    small: 'fi-16',
    medium: 'fi-24', 
    large: 'fi-32'
  }

  return (
    <span 
      className={`fi fi-${countryCode.toLowerCase()} ${sizeClasses[size]} ${className}`}
      style={{ 
        display: flagLoaded ? 'inline-block' : 'none',
        opacity: flagLoaded ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out'
      }}
    />
  )
}