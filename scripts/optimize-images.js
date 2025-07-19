#!/usr/bin/env node

/**
 * Image Optimization Script
 * 
 * This script optimizes images in the public directory:
 * - Converts large JPG files to WebP format
 * - Compresses PNG files
 * - Generates multiple sizes for responsive images
 * - Creates modern format alternatives
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PUBLIC_DIR = path.join(__dirname, '../public');
const OPTIMIZE_DIR = path.join(PUBLIC_DIR, 'optimized');

// Image optimization settings
const QUALITY_SETTINGS = {
  webp: { quality: 85 },
  avif: { quality: 80 },
  jpeg: { quality: 85, mozjpeg: true },
  png: { compressionLevel: 9, effort: 10 }
};

// Size configurations for responsive images
const RESPONSIVE_SIZES = [32, 48, 64, 96, 128, 256];

async function ensureDir(dir) {
  try {
    await fs.promises.access(dir);
  } catch {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

async function optimizeImage(filePath, outputDir) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const ext = path.extname(filePath).toLowerCase();
  
  console.log(`Optimizing: ${fileName}${ext}`);
  
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Skip if image is already small enough
    if (metadata.size < 5000) {
      console.log(`  Skipping ${fileName} - already optimized`);
      return;
    }
    
    // Generate WebP version
    await image
      .webp(QUALITY_SETTINGS.webp)
      .toFile(path.join(outputDir, `${fileName}.webp`));
    
    // Generate AVIF version for even better compression
    await image
      .avif(QUALITY_SETTINGS.avif)
      .toFile(path.join(outputDir, `${fileName}.avif`));
    
    // Generate responsive sizes for logos/icons
    if (metadata.width <= 256 && metadata.height <= 256) {
      for (const size of RESPONSIVE_SIZES) {
        if (size >= Math.max(metadata.width, metadata.height)) continue;
        
        await image
          .resize(size, size, { fit: 'inside', withoutEnlargement: true })
          .webp(QUALITY_SETTINGS.webp)
          .toFile(path.join(outputDir, `${fileName}-${size}.webp`));
      }
    }
    
    // Optimize original format
    if (ext === '.jpg' || ext === '.jpeg') {
      await image
        .jpeg(QUALITY_SETTINGS.jpeg)
        .toFile(path.join(outputDir, `${fileName}.jpg`));
    } else if (ext === '.png') {
      await image
        .png(QUALITY_SETTINGS.png)
        .toFile(path.join(outputDir, `${fileName}.png`));
    }
    
    // Calculate savings
    const originalStats = await fs.promises.stat(filePath);
    const webpStats = await fs.promises.stat(path.join(outputDir, `${fileName}.webp`));
    const savings = ((originalStats.size - webpStats.size) / originalStats.size * 100).toFixed(1);
    
    console.log(`  ✓ ${fileName}: ${originalStats.size} → ${webpStats.size} bytes (${savings}% savings)`);
    
  } catch (error) {
    console.error(`  ✗ Error optimizing ${fileName}:`, error.message);
  }
}

async function optimizeDirectory(dir) {
  const files = await fs.promises.readdir(dir);
  
  // Filter image files
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png'].includes(ext);
  });
  
  if (imageFiles.length === 0) {
    console.log('No images found to optimize');
    return;
  }
  
  // Create output directory
  await ensureDir(OPTIMIZE_DIR);
  
  console.log(`Found ${imageFiles.length} images to optimize...\n`);
  
  // Process images in parallel (but limit concurrency)
  const BATCH_SIZE = 5;
  for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
    const batch = imageFiles.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(file => 
        optimizeImage(path.join(dir, file), OPTIMIZE_DIR)
      )
    );
  }
  
  console.log('\n✓ Image optimization complete!');
  console.log(`Optimized images are in: ${OPTIMIZE_DIR}`);
  console.log('\nTo use optimized images, update your imports to use the optimized versions.');
}

// Check if Sharp is available
async function checkDependencies() {
  try {
    require('sharp');
    return true;
  } catch (error) {
    console.error('Sharp is not installed. Install it with: npm install sharp');
    return false;
  }
}

async function main() {
  console.log('🖼️  Image Optimization Script\n');
  
  if (!(await checkDependencies())) {
    process.exit(1);
  }
  
  try {
    await optimizeDirectory(PUBLIC_DIR);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { optimizeDirectory, optimizeImage };