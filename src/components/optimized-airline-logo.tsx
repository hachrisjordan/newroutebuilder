'use client'

import Image from 'next/image'
import { useState } from 'react'

interface AirlineLogoProps {
  airlineCode: string
  className?: string
  size?: number
  alt?: string
  priority?: boolean
}

export function AirlineLogo({ 
  airlineCode, 
  className = '', 
  size = 32, 
  alt,
  priority = false 
}: AirlineLogoProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const logoSrc = `/airline-logos/${airlineCode.toUpperCase()}.png`
  const fallbackSrc = '/airline-logos/default.png'

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      {!imageError ? (
        <Image
          src={logoSrc}
          alt={alt || `${airlineCode} airline logo`}
          width={size}
          height={size}
          className="object-contain"
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setImageError(true)
            setIsLoading(false)
          }}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyGLzSEPuAFff8AK8EBhBEGhcDcRN0lInUJhIm0l5wfzyOKkCpA6hh6Q=="
        />
      ) : (
        <Image
          src={fallbackSrc}
          alt={alt || `${airlineCode} airline logo`}
          width={size}
          height={size}
          className="object-contain opacity-50"
          onLoad={() => setIsLoading(false)}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyGLzSEPuAFff8AK8EBhBEGhcDcRN0lInUJhIm0l5wfzyOKkCpA6hh6Q=="
        />
      )}
      
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse rounded"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  )
}