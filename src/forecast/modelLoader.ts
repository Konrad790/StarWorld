/**
 * ExecuTorch model loader — react-native-executorch v0.10 API.
 *
 * Uses the low-level `loadModel` / `tensor` / `model.execute` primitives.
 * Falls back to a JS stub when the native module is unavailable (Expo Go /
 * web / unit tests).
 */

import { copyAsync, getInfoAsync, makeDirectoryAsync, documentDirectory } from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { ForecastEngineState, ForecastHorizon, ModelLoadStatus } from '../types';
import { MODEL_ASSETS, MODEL_DEST_DIR } from '../constants/models';

// ─── ExecutorchModule interface ───────────────────────────────────────────────

export interface ExecutorchModule {
  /** Run forward pass. Input is a flat float32 array; returns a flat float32 array. */
  forward(input: number[]): Promise<number[]>;
  /** Release native resources. Call when the module is no longer needed. */
  dispose?(): void;
}

// ─── Module registry (singleton) ─────────────────────────────────────────────

const _registry = new Map<ForecastHorizon, ExecutorchModule>();
let _engineState: ForecastEngineState = {
  status: 'loading',
  loadedHorizons: [],
  failedHorizons: [],
};

export function getEngineState(): ForecastEngineState {
  return _engineState;
}

export function getModule(horizon: ForecastHorizon): ExecutorchModule | undefined {
  return _registry.get(horizon);
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loadAllModels(): Promise<ForecastEngineState> {
  const loadedHorizons: ForecastHorizon[] = [];
  const failedHorizons: ForecastHorizon[] = [];

  const modelsDir = (documentDirectory ?? '') + MODEL_DEST_DIR + '/';

  const dirInfo = await getInfoAsync(modelsDir);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(modelsDir, { intermediates: true });
  }

  await Promise.all(
    MODEL_ASSETS.map(async ({ horizon, assetRequire, filename }) => {
      try {
        const destPath = modelsDir + filename;

        const destInfo = await getInfoAsync(destPath);
        if (!destInfo.exists) {
          const asset = Asset.fromModule(assetRequire);
          await asset.downloadAsync();
          if (!asset.localUri) throw new Error(`No localUri for ${filename}`);
          await copyAsync({ from: asset.localUri, to: destPath });
        }

        const mod = await loadNativeModule(destPath, horizon);
        _registry.set(horizon, mod);
        loadedHorizons.push(horizon);
      } catch (err) {
        console.warn(`[ModelLoader] Failed to load model h${horizon}m:`, err);
        failedHorizons.push(horizon);
      }
    })
  );

  const status: ModelLoadStatus =
    failedHorizons.length === 0
      ? 'ready'
      : loadedHorizons.length === 0
      ? 'failed'
      : 'partial';

  _engineState = { status, loadedHorizons, failedHorizons };
  return _engineState;
}

// ─── Native module adapter ────────────────────────────────────────────────────

const MODEL_INPUT_SIZE = 16; // float32 elements — must match infer.ts

async function loadNativeModule(
  modelPath: string,
  horizon: ForecastHorizon
): Promise<ExecutorchModule> {
  try {
    type RneSubset = {
      loadModel: (path: string) => import('react-native-executorch').Model;
      tensor: (
        dtype: 'float32',
        shape: number[],
        src?: Float32Array
      ) => import('react-native-executorch').Tensor;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rne = require('react-native-executorch') as RneSubset;
    const model = rne.loadModel(modelPath);

    return {
      async forward(input: number[]): Promise<number[]> {
        const inputTensor = rne.tensor(
          'float32',
          [MODEL_INPUT_SIZE],
          new Float32Array(input)
        );
        const outputTensor = rne.tensor('float32', [1]);
        try {
          model.execute('forward', [inputTensor], [outputTensor]);
          const result = outputTensor.getData(new Float32Array(1));
          return [result[0]];
        } finally {
          inputTensor.dispose();
          outputTensor.dispose();
        }
      },
      dispose() {
        model.dispose();
      },
    };
  } catch {
    console.warn(
      `[ModelLoader] react-native-executorch unavailable for h${horizon}m — using stub`
    );
    return createStubModule(horizon);
  }
}

function createStubModule(horizon: ForecastHorizon): ExecutorchModule {
  return {
    async forward(input: number[]): Promise<number[]> {
      // input[9] = price_6m_ago (most recent observed market price)
      // input[0] = log_p_initial
      const price6mAgo = input[9] ?? 0;
      const logPInitial = input[0] ?? 0;
      const basePrice = price6mAgo > 0 ? price6mAgo : Math.expm1(logPInitial);
      const predicted = basePrice * Math.pow(1.003, horizon);
      return [predicted];
    },
  };
}
