const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['storage.googleapis.com', 'dbaixrvzmfwhhbgyoebt.supabase.co'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  swcMinify: true,
  reactStrictMode: true,
  
  // Bundle optimization
  experimental: {
    optimizePackageImports: [
      'antd',
      'lucide-react', 
      '@radix-ui/react-icons',
      'react-icons',
      'date-fns',
      'date-fns-tz',
      '@tanstack/react-query'
    ],
    serverComponentsExternalPackages: ['ioredis', 'iovalkey'],
    optimizeCss: true,
    legacyBrowsers: false,
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Optimize CSS
      config.optimization.minimizer.push(
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: ['default', { discardComments: { removeAll: true } }],
          },
        })
      );

      // Enhanced code splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          default: false,
          vendors: false,
          // Framework chunks
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Library chunks
          lib: {
            test(module) {
              return module.size() > 160000 &&
                /node_modules[/\\]/.test(module.identifier());
            },
            name(module) {
              const hash = crypto.createHash('sha1');
              hash.update(module.identifier());
              return hash.digest('hex').substring(0, 8);
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          // Specific vendor chunks
          antd: {
            test: /[\\/]node_modules[\\/]antd[\\/]/,
            name: 'antd',
            chunks: 'all',
            priority: 20,
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            chunks: 'all',
            priority: 20,
          },
          icons: {
            test: /[\\/]node_modules[\\/](lucide-react|@radix-ui[\\/]react-icons|react-icons)[\\/]/,
            name: 'icons',
            chunks: 'all',
            priority: 20,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 10,
          },
        },
      };

      // Enable module concatenation
      config.optimization.concatenateModules = true;
    }
    
    return config;
  },
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
}

module.exports = withBundleAnalyzer(nextConfig); 