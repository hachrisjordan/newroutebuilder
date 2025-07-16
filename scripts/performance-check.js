#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Performance Optimization Check\n');

// Check if large files are excluded from build
const checkLargeFiles = () => {
  console.log('📦 Checking bundle size optimization...');
  
  const nextDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(nextDir)) {
    console.log('❌ Build directory not found. Run `npm run build` first.');
    return;
  }

  // Check if large data files are not in build
  const buildSize = getDirSize(nextDir);
  console.log(`   Build directory size: ${(buildSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (buildSize < 50 * 1024 * 1024) { // Less than 50MB
    console.log('✅ Bundle size optimized - no large data files in build');
  } else {
    console.log('⚠️  Bundle might contain large files');
  }
};

// Check if optimized components exist
const checkOptimizedComponents = () => {
  console.log('\n🧩 Checking optimized components...');
  
  const components = [
    'src/components/lazy-seat-type-viewer.tsx',
    'src/components/optimized-airline-logo.tsx',
    'src/components/optimized-flag-loader.tsx',
    'src/lib/data-loader.ts',
    'src/lib/performance.ts'
  ];
  
  components.forEach(comp => {
    if (fs.existsSync(comp)) {
      console.log(`✅ ${comp}`);
    } else {
      console.log(`❌ Missing: ${comp}`);
    }
  });
};

// Check SEO files
const checkSEOFiles = () => {
  console.log('\n🔍 Checking SEO optimization...');
  
  const seoFiles = [
    'src/app/sitemap.ts',
    'src/app/robots.ts'
  ];
  
  seoFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ Missing: ${file}`);
    }
  });
};

// Check if data files are moved
const checkDataFiles = () => {
  console.log('\n📁 Checking data file organization...');
  
  // Check if large files are moved out
  if (!fs.existsSync('example.json')) {
    console.log('✅ example.json moved out of bundle');
  } else {
    console.log('⚠️  example.json still in root - should be moved');
  }
  
  if (fs.existsSync('data/example.json')) {
    console.log('✅ example.json properly located in data directory');
  }
  
  // Check airline logos organization
  if (fs.existsSync('public/airline-logos/')) {
    const logoCount = fs.readdirSync('public/airline-logos/').length;
    console.log(`✅ ${logoCount} airline logos organized in dedicated directory`);
  }
};

// Helper function to get directory size
function getDirSize(dirPath) {
  let totalSize = 0;
  
  if (!fs.existsSync(dirPath)) return 0;
  
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      totalSize += getDirSize(filePath);
    } else {
      totalSize += stats.size;
    }
  });
  
  return totalSize;
}

// Performance recommendations
const showRecommendations = () => {
  console.log('\n🚀 Performance Recommendations:');
  console.log('1. Run `npm run analyze` to see detailed bundle analysis');
  console.log('2. Test with Lighthouse after deployment');
  console.log('3. Monitor Core Web Vitals in production');
  console.log('4. Consider implementing Service Worker for caching');
  console.log('5. Add performance monitoring to track improvements');
};

// Run all checks
checkLargeFiles();
checkOptimizedComponents();
checkSEOFiles();
checkDataFiles();
showRecommendations();

console.log('\n✨ Performance optimization check complete!');