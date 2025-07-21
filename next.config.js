const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization with better compression and formats
  images: {
    domains: ['storage.googleapis.com', 'dbaixrvzmfwhhbgyoebt.supabase.co'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 20, 24, 32, 48, 64, 96, 128],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Enhanced bundle optimization
  experimental: {
    optimizePackageImports: [
      'antd',
      'lucide-react', 
      '@radix-ui/react-icons',
      'react-icons',
      'date-fns',
      'date-fns-tz',
      '@tanstack/react-query',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip'
    ],
    serverComponentsExternalPackages: ['ioredis', 'iovalkey'],
    optimizeCss: true,
    scrollRestoration: true,
  },
  
  // Enhanced webpack optimizations
  webpack: (config, { dev, isServer, webpack }) => {
    // Production optimizations
    if (!dev) {
      // Better tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Enhanced code splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Framework chunks
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 20,
          },
          // UI library chunks
          antd: {
            test: /[\\/]node_modules[\\/]antd[\\/]/,
            name: 'antd',
            chunks: 'all',
            priority: 30,
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            chunks: 'all',
            priority: 30,
          },
          // Supabase chunks
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 25,
          },
          // Date libraries
          date: {
            test: /[\\/]node_modules[\\/](date-fns|dayjs)[\\/]/,
            name: 'date-libs',
            chunks: 'all',
            priority: 25,
          },
          // Common utilities
          utils: {
            test: /[\\/]node_modules[\\/](lodash|clsx|class-variance-authority|tailwind-merge)[\\/]/,
            name: 'utils',
            chunks: 'all',
            priority: 25,
          },
        },
      };
      
      // Minimize re-exports
      config.optimization.concatenateModules = true;
    }
    
    // Performance optimizations for client-side
    if (!isServer) {
      // Reduce bundle size by aliasing server-only modules
      config.resolve.alias = {
        ...config.resolve.alias,
        'server-only': false,
      };
      
      // Add performance hints
      config.performance = {
        hints: 'warning',
        maxEntrypointSize: 400000, // 400KB
        maxAssetSize: 250000, // 250KB
      };
    }
    
    return config;
  },
  
  // Enhanced headers for performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400'
          }
        ]
      },
      {
        source: '/:path*.{png,jpg,jpeg,gif,webp,avif,ico,svg}',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
}

module.exports = withBundleAnalyzer(nextConfig); 