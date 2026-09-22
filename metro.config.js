// https://docs.expo.dev/guides/customizing-metro/
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Register .pte (ExecuTorch model) and .db (SQLite) as binary asset extensions
// so Metro bundles them and expo-asset can resolve them at runtime.
config.resolver.assetExts.push('pte', 'db');

// NOTE: When running in Expo Go or the Metro dev server without a native build,
// react-native-executorch's JSI bridge is unavailable and its transitive deps
// (react-native-worklets, react-native-blob-util) are not installed.
// The resolver below redirects the package to a minimal stub so Metro can
// bundle without errors; the stub throws at runtime so loadNativeModule's
// try/catch falls back to the JS heuristic stub.
//
// TO ENABLE REAL MODELS: comment out the resolveRequest block below, then run:
//   npx expo run:android   (or run:ios)
// A native development build is required for the JSI bridge to link correctly.

const RNE_STUB = path.resolve(__dirname, 'src/forecast/rne-stub.js');
const _resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-executorch') {
    return { filePath: RNE_STUB, type: 'sourceFile' };
  }
  if (_resolveRequest) {
    return _resolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
