/**
 * ExecuTorch model loader — react-native-executorch v0.10 API.
 *
 * Uses the low-level `loadModel` / `tensor` / `model.execute` primitives.
 * Requires a native development or production build; Expo Go does not include
 * the ExecuTorch JSI module.
 */

import {
  copyAsync,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
  documentDirectory,
} from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { ForecastEngineState, ForecastHorizon, ModelLoadStatus } from '../types';
import { MODEL_ASSETS, MODEL_DEST_DIR } from '../constants/models';

const CURRENT_MODEL_VERSION = 'v2_base_score_pte';

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

  const versionFlagPath = modelsDir + CURRENT_MODEL_VERSION;
  const versionInfo = await getInfoAsync(versionFlagPath);
  const shouldForceRefresh = !versionInfo.exists;

  await Promise.all(
    MODEL_ASSETS.map(async ({ horizon, assetRequire, filename }) => {
      try {
        const destPath = modelsDir + filename;

        const destInfo = await getInfoAsync(destPath);
        if (!destInfo.exists || shouldForceRefresh) {
          const asset = Asset.fromModule(assetRequire);
          await asset.downloadAsync();
          if (!asset.localUri) throw new Error(`No localUri for ${filename}`);
          if (destInfo.exists) {
            await deleteAsync(destPath, { idempotent: true });
          }
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

  if (shouldForceRefresh && failedHorizons.length === 0) {
    try {
      await writeAsStringAsync(versionFlagPath, 'v2');
    } catch {
      // Non-fatal
    }
  }

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
    // expo-file-system returns file:// URIs, while ExecuTorch expects an
    // absolute native filesystem path.
    const nativeModelPath = modelPath.startsWith('file://')
      ? decodeURIComponent(modelPath.slice('file://'.length))
      : modelPath;
    const model = rne.loadModel(nativeModelPath);

    // Extract exact input/output shapes from model schema (e.g. [1, 16] for input and [1, 1] for output)
    const forwardMethod = model.schema?.forward;
    const inputShape: number[] = (() => {
      const inParam = forwardMethod?.inputs?.[0];
      if (inParam && 'shape' in inParam && Array.isArray(inParam.shape)) {
        return inParam.shape.map((d: any) =>
          typeof d === 'number' ? d : (d?.value ?? 1)
        );
      }
      return [1, MODEL_INPUT_SIZE];
    })();

    const outputShape: number[] = (() => {
      const outParam = forwardMethod?.outputs?.[0];
      if (outParam && 'shape' in outParam && Array.isArray(outParam.shape)) {
        return outParam.shape.map((d: any) =>
          typeof d === 'number' ? d : (d?.value ?? 1)
        );
      }
      return [1, 1];
    })();

    return {
      async forward(input: number[]): Promise<number[]> {
        const inputTensor = rne.tensor(
          'float32',
          inputShape,
          new Float32Array(input)
        );
        const outputTensor = rne.tensor('float32', outputShape);
        try {
          model.execute('forward', [inputTensor], [outputTensor]);
          const result = outputTensor.getData(new Float32Array(outputTensor.numel || 1));
          return Array.from(result);
        } finally {
          inputTensor.dispose();
          outputTensor.dispose();
        }
      },
      dispose() {
        model.dispose();
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `ExecuTorch failed to load model h${horizon}m. ` +
        `Use a native development build (not Expo Go). ${reason}`,
      { cause: error }
    );
  }
}
