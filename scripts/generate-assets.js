/**
 * Simple script to generate placeholder assets for Expo app
 * Run: node scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('⚠️  This script creates placeholder files.');
console.log('📝 For production, replace these with actual image assets.\n');

// Create a simple SVG-based placeholder (will be converted to PNG by Expo)
const createPlaceholderSVG = (size, text, bgColor, textColor) => {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bgColor}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
};

// Note: These are SVG placeholders. For actual builds, you need PNG files.
// You can convert these using online tools or ImageMagick

console.log('✅ Placeholder asset files created!');
console.log('\n📋 Next steps:');
console.log('1. Replace these with actual PNG images:');
console.log('   - icon.png (1024x1024px)');
console.log('   - splash.png (1242x2436px)');
console.log('   - adaptive-icon.png (1024x1024px)');
console.log('   - favicon.png (48x48px)');
console.log('\n2. Use online tools:');
console.log('   - https://www.appicon.co/');
console.log('   - https://www.favicon-generator.org/');
console.log('\n3. Or use Expo CLI:');
console.log('   npx expo install expo-asset-generator');

