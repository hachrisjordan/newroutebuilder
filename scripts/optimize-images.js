#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

/**
 * Script to optimize airline logos by converting PNG to WebP using sharp
 * This can reduce image sizes by 25-35% while maintaining quality
 */

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const OUTPUT_DIR = PUBLIC_DIR;

async function getAirlineLogos() {
  try {
    const files = await fs.readdir(PUBLIC_DIR);
    // Filter for airline logo PNGs (2-letter codes + .png)
    return files.filter(file => 
      file.match(/^[A-Z0-9]{2}(-white)?\.png$/i)
    );
  } catch (error) {
    console.error('Error reading public directory:', error);
    return [];
  }
}

async function optimizeImage(filename) {
  const inputPath = path.join(PUBLIC_DIR, filename);
  const outputFilename = filename.replace('.png', '.webp');
  const outputPath = path.join(OUTPUT_DIR, outputFilename);
  
  try {
    // Check if WebP version already exists and is newer
    try {
      const [inputStat, outputStat] = await Promise.all([
        fs.stat(inputPath),
        fs.stat(outputPath)
      ]);
      
      if (outputStat.mtime > inputStat.mtime) {
        console.log(`⏭️  Skipping ${filename} (WebP already exists and is newer)`);
        return { skipped: true };
      }
    } catch {
      // Output file doesn't exist, continue with optimization
    }
    
    const startTime = Date.now();
    const originalSize = (await fs.stat(inputPath)).size;
    
    // Use sharp to convert PNG to WebP
    await sharp(inputPath)
      .webp({ 
        quality: 85,
        effort: 6, // 0-6, higher = better compression
        lossless: false 
      })
      .toFile(outputPath);
    
    const optimizedSize = (await fs.stat(outputPath)).size;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    const duration = Date.now() - startTime;
    
    return {
      filename,
      originalSize,
      optimizedSize,
      savings: parseFloat(savings),
      duration,
      skipped: false
    };
  } catch (error) {
    console.error(`❌ Error optimizing ${filename}:`, error.message);
    return { error: error.message, filename };
  }
}

async function main() {
  console.log('🖼️  Starting airline logo optimization...\n');
  
  const logos = await getAirlineLogos();
  if (logos.length === 0) {
    console.log('No airline logos found to optimize.');
    return;
  }
  
  console.log(`Found ${logos.length} airline logos to optimize`);
  console.log('Converting PNG → WebP for better performance...\n');
  
  const results = [];
  let processed = 0;
  
  // Process in smaller batches to avoid overwhelming the system
  const BATCH_SIZE = 5;
  for (let i = 0; i < logos.length; i += BATCH_SIZE) {
    const batch = logos.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (logo) => {
        const result = await optimizeImage(logo);
        processed++;
        
        if (!result.skipped && !result.error) {
          console.log(
            `✅ ${result.filename} → ${result.filename.replace('.png', '.webp')} ` +
            `(${result.savings}% smaller, ${result.duration}ms)`
          );
        }
        
        return result;
      })
    );
    
    results.push(...batchResults);
    
    // Show progress every 50 images
    if (processed % 50 === 0 && i + BATCH_SIZE < logos.length) {
      console.log(`\n📊 Progress: ${processed}/${logos.length} processed\n`);
    }
  }
  
  // Calculate summary
  const successful = results.filter(r => !r.error && !r.skipped);
  const skipped = results.filter(r => r.skipped).length;
  const errors = results.filter(r => r.error).length;
  
  if (successful.length > 0) {
    const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimizedSize = successful.reduce((sum, r) => sum + r.optimizedSize, 0);
    const totalSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
    const avgDuration = (successful.reduce((sum, r) => sum + r.duration, 0) / successful.length).toFixed(0);
    
    console.log('\n🎉 Optimization Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Optimized: ${successful.length} images`);
    console.log(`⏭️  Skipped: ${skipped} images (already optimized)`);
    console.log(`❌ Errors: ${errors} images`);
    console.log(`💾 Size reduction: ${totalSavings}%`);
    console.log(`📏 Original size: ${(totalOriginalSize / 1024).toFixed(1)} KB`);
    console.log(`📏 Optimized size: ${(totalOptimizedSize / 1024).toFixed(1)} KB`);
    console.log(`⚡ Saved: ${((totalOriginalSize - totalOptimizedSize) / 1024).toFixed(1)} KB`);
    console.log(`⏱️  Average time: ${avgDuration}ms per image`);
    
    // Provide Next.js usage instructions
    console.log('\n💡 Next Steps:');
    console.log('1. Update components to use the AirlineLogo component from @/components/ui/airline-logo');
    console.log('2. The new WebP images will be automatically used when supported');
    console.log('3. Run "npm run build:analyze" to see the bundle size improvements');
  } else if (skipped > 0) {
    console.log('\n✨ All images are already optimized!');
  } else {
    console.log('\n❌ No images were successfully optimized.');
  }
  
  if (errors > 0) {
    console.log(`\n⚠️  ${errors} images had errors and may need manual attention.`);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { optimizeImage, getAirlineLogos };