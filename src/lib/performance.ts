// Performance monitoring utilities
export function reportWebVitals(metric: any) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric)
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    // You can integrate with your analytics service here
    // Example: gtag('event', metric.name, { value: metric.value })
  }
}

// Preload critical resources
export function preloadCriticalResources() {
  // Preload critical fonts
  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = '/fonts/inter.woff2'
  link.as = 'font'
  link.type = 'font/woff2'
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

// Image optimization utilities
export function getOptimizedImageProps(src: string, { width, height, quality = 75 }: { width: number, height: number, quality?: number }) {
  return {
    src,
    width,
    height,
    quality,
    placeholder: 'blur' as const,
    blurDataURL: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyGLzSEPuAFff8AK8EBhBEGhcDcRN0lInUJhIm0l5wfzyOKkCpA6hh6Q==',
  }
}

// Lazy loading intersection observer
export function createLazyLoader(callback: () => void, options: IntersectionObserverInit = {}) {
  const defaultOptions = {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback()
        observer.disconnect()
      }
    })
  }, defaultOptions)

  return observer
}

// Bundle size monitoring
export function logBundleInfo() {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available with: npm run analyze')
  }
}