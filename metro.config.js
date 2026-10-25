// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Register .pte (ExecuTorch model) and .db (SQLite) as binary asset extensions
// so Metro bundles them and expo-asset can resolve them at runtime.
config.resolver.assetExts.push('pte', 'db');

module.exports = config;
