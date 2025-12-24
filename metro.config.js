const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver for Firebase
config.resolver.sourceExts.push('cjs');

module.exports = config;

