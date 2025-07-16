module.exports = {
  // Performance budgets for different route types
  budgets: [
    {
      // Main routes budget
      path: '/',
      resourceSizes: [
        { resourceType: 'script', budget: 400 }, // 400KB max for JavaScript
        { resourceType: 'document', budget: 50 }, // 50KB max for HTML
        { resourceType: 'stylesheet', budget: 50 }, // 50KB max for CSS
        { resourceType: 'image', budget: 200 }, // 200KB max for images
        { resourceType: 'font', budget: 100 }, // 100KB max for fonts
        { resourceType: 'total', budget: 800 } // 800KB max total
      ]
    },
    {
      // Heavy routes (like jetblue/etihad) budget
      path: '/jetblue/**',
      resourceSizes: [
        { resourceType: 'script', budget: 500 }, // Higher budget for heavy routes
        { resourceType: 'total', budget: 1000 }
      ]
    },
    {
      // API routes budget
      path: '/api/**',
      resourceSizes: [
        { resourceType: 'total', budget: 50 } // Very light for API responses
      ]
    }
  ],

  // Core Web Vitals thresholds
  assertions: [
    {
      metric: 'largest-contentful-paint',
      threshold: 2500 // 2.5s for LCP
    },
    {
      metric: 'first-input-delay',
      threshold: 100 // 100ms for FID
    },
    {
      metric: 'cumulative-layout-shift',
      threshold: 0.1 // 0.1 for CLS
    },
    {
      metric: 'first-contentful-paint',
      threshold: 1800 // 1.8s for FCP
    },
    {
      metric: 'speed-index',
      threshold: 3000 // 3s for Speed Index
    }
  ],

  // Lighthouse CI configuration
  ci: {
    collect: {
      numberOfRuns: 3,
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/find-airport',
        'http://localhost:3000/award-finder',
        'http://localhost:3000/shortest-route'
      ]
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}