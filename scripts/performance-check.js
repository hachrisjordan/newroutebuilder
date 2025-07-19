#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * 
 * Checks bundle sizes, validates optimizations, and reports performance metrics
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(__dirname, '../.next');
const STATIC_DIR = path.join(BUILD_DIR, 'static');

// Performance thresholds
const THRESHOLDS = {
  mainBundle: 400 * 1024, // 400 KB
  vendorBundle: 300 * 1024, // 300 KB
  chunkSize: 200 * 1024, // 200 KB
  totalJS: 800 * 1024, // 800 KB
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function findJSFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJSFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      files.push({
        name: entry.name,
        path: fullPath,
        size: getFileSize(fullPath),
        relativePath: path.relative(STATIC_DIR, fullPath)
      });
    }
  }
  
  return files;
}

function analyzeChunks(files) {
  const chunks = {
    framework: [],
    vendor: [],
    pages: [],
    chunks: [],
    other: []
  };
  
  for (const file of files) {
    const name = file.name;
    if (name.includes('framework') || name.includes('react')) {
      chunks.framework.push(file);
    } else if (name.includes('vendor') || name.includes('antd') || name.includes('radix')) {
      chunks.vendor.push(file);
    } else if (name.includes('pages/')) {
      chunks.pages.push(file);
    } else if (name.includes('chunks/')) {
      chunks.chunks.push(file);
    } else {
      chunks.other.push(file);
    }
  }
  
  return chunks;
}

function calculateTotalSize(files) {
  return files.reduce((total, file) => total + file.size, 0);
}

function checkThresholds(analysis) {
  const issues = [];
  
  // Check main bundle size
  const mainFiles = [...analysis.framework, ...analysis.vendor];
  const mainSize = calculateTotalSize(mainFiles);
  if (mainSize > THRESHOLDS.mainBundle) {
    issues.push(`Main bundle too large: ${formatBytes(mainSize)} > ${formatBytes(THRESHOLDS.mainBundle)}`);
  }
  
  // Check individual vendor chunks
  for (const file of analysis.vendor) {
    if (file.size > THRESHOLDS.chunkSize) {
      issues.push(`Large vendor chunk: ${file.name} (${formatBytes(file.size)})`);
    }
  }
  
  // Check total JS size
  const totalJS = calculateTotalSize([
    ...analysis.framework,
    ...analysis.vendor,
    ...analysis.chunks
  ]);
  if (totalJS > THRESHOLDS.totalJS) {
    issues.push(`Total JS too large: ${formatBytes(totalJS)} > ${formatBytes(THRESHOLDS.totalJS)}`);
  }
  
  return issues;
}

function reportOptimizations() {
  console.log('🔍 Checking for optimization implementations...\n');
  
  const optimizations = [
    {
      name: 'Bundle Analyzer',
      check: () => fs.existsSync(path.join(__dirname, '../.next/analyze')),
      description: 'Bundle analysis reports generated'
    },
    {
      name: 'Image Optimization Script',
      check: () => fs.existsSync(path.join(__dirname, 'optimize-images.js')),
      description: 'Image optimization script available'
    },
    {
      name: 'Performance Config',
      check: () => fs.existsSync(path.join(__dirname, '../performance.config.js')),
      description: 'Performance budgets configured'
    },
    {
      name: 'Next.js Optimizations',
      check: () => {
        const config = fs.readFileSync(path.join(__dirname, '../next.config.js'), 'utf-8');
        return config.includes('splitChunks') && config.includes('optimizePackageImports');
      },
      description: 'Next.js optimizations configured'
    }
  ];
  
  for (const opt of optimizations) {
    const status = opt.check() ? '✅' : '❌';
    console.log(`${status} ${opt.name}: ${opt.description}`);
  }
  console.log();
}

function generateReport(analysis, issues) {
  console.log('📊 Performance Analysis Report\n');
  
  // Bundle size summary
  console.log('Bundle Sizes:');
  console.log('├─ Framework:', formatBytes(calculateTotalSize(analysis.framework)));
  console.log('├─ Vendor:', formatBytes(calculateTotalSize(analysis.vendor)));
  console.log('├─ Chunks:', formatBytes(calculateTotalSize(analysis.chunks)));
  console.log('└─ Total JS:', formatBytes(calculateTotalSize([
    ...analysis.framework,
    ...analysis.vendor,
    ...analysis.chunks
  ])));
  console.log();
  
  // Detailed breakdown
  if (analysis.vendor.length > 0) {
    console.log('Vendor Chunks:');
    analysis.vendor
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .forEach(file => {
        console.log(`├─ ${file.name}: ${formatBytes(file.size)}`);
      });
    console.log();
  }
  
  // Issues
  if (issues.length > 0) {
    console.log('🚨 Performance Issues:');
    issues.forEach(issue => console.log(`├─ ${issue}`));
    console.log();
  } else {
    console.log('✅ No performance issues found!\n');
  }
  
  // Recommendations
  console.log('💡 Recommendations:');
  if (calculateTotalSize(analysis.vendor) > THRESHOLDS.vendorBundle) {
    console.log('├─ Consider splitting large vendor libraries');
  }
  if (analysis.framework.length === 0) {
    console.log('├─ Framework chunk not found - check code splitting config');
  }
  console.log('├─ Run `npm run optimize-images` to compress images');
  console.log('├─ Monitor Core Web Vitals in production');
  console.log('└─ Use Lighthouse CI for continuous monitoring');
}

async function main() {
  console.log('⚡ Performance Check\n');
  
  // Check if build exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.log('❌ No build found. Run `npm run build` first.');
    process.exit(1);
  }
  
  // Report optimizations
  reportOptimizations();
  
  // Analyze bundle
  console.log('📦 Analyzing bundle sizes...\n');
  
  const jsFiles = findJSFiles(STATIC_DIR);
  if (jsFiles.length === 0) {
    console.log('❌ No JavaScript files found in build.');
    process.exit(1);
  }
  
  const analysis = analyzeChunks(jsFiles);
  const issues = checkThresholds(analysis);
  
  generateReport(analysis, issues);
  
  // Exit with error if critical issues
  const criticalIssues = issues.filter(issue => 
    issue.includes('too large') || issue.includes('Large vendor')
  );
  
  if (criticalIssues.length > 0) {
    console.log(`❌ Found ${criticalIssues.length} critical performance issues.`);
    process.exit(1);
  } else {
    console.log('✅ Performance check passed!');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

module.exports = { analyzeChunks, checkThresholds, calculateTotalSize };