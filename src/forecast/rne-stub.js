/**
 * Stub for react-native-executorch used when the native module is not linked
 * (Expo Go, web, unit tests). Exports only the two symbols modelLoader.ts uses.
 * Metro resolves this file instead of the real package via metro.config.js
 * when the JSI bridge is unavailable.
 *
 * loadModel and tensor both throw so the try/catch in loadNativeModule
 * falls through to createStubModule as intended.
 */

function loadModel() {
  throw new Error('react-native-executorch native module not available');
}

function tensor() {
  throw new Error('react-native-executorch native module not available');
}

module.exports = { loadModel, tensor };
