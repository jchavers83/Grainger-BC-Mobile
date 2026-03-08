// Run: node scripts/generate-icons.js
// Generates simple PWA placeholder icons (192x192 and 512x512)
// Replace these with your actual brand icons before production deploy

import { writeFileSync } from 'fs';

function createPNG(size) {
  // Minimal valid PNG with a colored square
  // For production, replace with actual branded icons
  const { createCanvas } = await import('canvas').catch(() => null) || {};

  if (createCanvas) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Blue background
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(0, 0, size, size);

    // White "BC" text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.35}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BC', size / 2, size / 2);

    return canvas.toBuffer('image/png');
  }

  console.log(`  Icon ${size}x${size}: Install 'canvas' package or manually create public/icon-${size}.png`);
  return null;
}

console.log('PWA Icon Generation');
console.log('===================');
console.log('');
console.log('For production, create two PNG icons and place them in the public/ directory:');
console.log('  - public/icon-192.png  (192x192 pixels)');
console.log('  - public/icon-512.png  (512x512 pixels)');
console.log('');
console.log('You can use any image editor or online PWA icon generator like:');
console.log('  https://www.pwabuilder.com/imageGenerator');
