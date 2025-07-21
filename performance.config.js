module.exports = {
  // Enhanced performance budgets for different route types
  budgets: [
    {
      // Homepage and landing pages - strictest budget
      path: '/',
      resourceSizes: [
        { resourceType: 'script', budget: 350 }, // 350KB max for JavaScript
        { resourceType: 'document', budget: 40 }, // 40KB max for HTML
        { resourceType: 'stylesheet', budget: 40 }, // 40KB max for CSS
        { resourceType: 'image', budget: 150 }, // 150KB max for images
        { resourceType: 'font', budget: 80 }, // 80KB max for fonts
        { resourceType: 'total', budget: 650 } // 650KB max total
      ]
    },
    {
      // Search and finder pages - moderate budget
      path: '/award-finder',
      resourceSizes: [
        { resourceType: 'script', budget: 450 },
        { resourceType: 'document', budget: 50 },
        { resourceType: 'stylesheet', budget: 50 },
        { resourceType: 'image', budget: 200 },
        { resourceType: 'total', budget: 800 }
      ]
    },
    {
      // Heavy interactive pages - higher budget
      path: '/jetblue/**',
      resourceSizes: [
        { resourceType: 'script', budget: 600 }, // Higher budget for heavy routes
        { resourceType: 'document', budget: 60 },
        { resourceType: 'stylesheet', budget: 60 },
        { resourceType: 'image', budget: 250 },
        { resourceType: 'total', budget: 1000 }
      ]
    },
    {
      // Seat type viewer and analysis tools
      path: '/seat-type-delay',
      resourceSizes: [
        { resourceType: 'script', budget: 550 },
        { resourceType: 'document', budget: 55 },
        { resourceType: 'stylesheet', budget: 55 },
        { resourceType: 'image', budget: 220 },
        { resourceType: 'total', budget: 900 }
      ]
    },
    {
      // API routes - very strict budget
      path: '/api/**',
      resourceSizes: [
        { resourceType: 'total', budget: 30 } // Very light for API responses
      ]
    }
  ],

  // Core Web Vitals thresholds - realistic for complex app
  assertions: [
    {
      metric: 'largest-contentful-paint',
      threshold: 2800 // 2.8s for LCP (realistic for complex app)
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
      threshold: 3200 // 3.2s for Speed Index
    },
    {
      metric: 'total-blocking-time',
      threshold: 200 // 200ms for TBT
    },
    {
      metric: 'time-to-interactive',
      threshold: 3500 // 3.5s for TTI
    }
  ],

  // Lighthouse CI configuration
  lighthouserc: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
      url: [
        'http://localhost:3000',
        'http://localhost:3000/award-finder',
        'http://localhost:3000/live-search',
        'http://localhost:3000/seat-type-delay'
      ],
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        skipAudits: [
          'uses-http2', // May not be available in all environments
          'bf-cache' // Not critical for this application
        ],
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false
        }
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.90 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  },

  // Bundle analysis thresholds
  bundleAnalysis: {
    maxInitialBundleSize: 350 * 1024, // 350KB
    maxChunkSize: 250 * 1024, // 250KB
    maxTotalSize: 1000 * 1024, // 1MB total
    warnOnLargeChunks: true,
    analyzePackages: [
      'antd',
      '@radix-ui',
      'react',
      'react-dom',
      'next',
      '@supabase/supabase-js',
      'date-fns',
      'lucide-react'
    ]
  },

  // Performance monitoring alerts
  alerts: {
    // Core Web Vitals degradation thresholds
    lcpDegradation: 200, // Alert if LCP increases by 200ms
    fidDegradation: 20,  // Alert if FID increases by 20ms
    clsDegradation: 0.02, // Alert if CLS increases by 0.02
    
    // Bundle size alerts
    bundleSizeIncrease: 10, // Alert if bundle increases by 10%
    chunkSizeThreshold: 300 * 1024, // Alert for chunks over 300KB
    
    // Resource loading alerts
    slowResourceThreshold: 1500, // Alert for resources taking over 1.5s
    failedResourceThreshold: 0.02 // Alert if >2% of resources fail to load
  }
};