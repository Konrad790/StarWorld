import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { initDatabase } from '../db/client';
import { loadAllModels } from '../forecast/modelLoader';
import { ForecastEngineState, ModelLoadStatus } from '../types';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AppInitState {
  dbReady: boolean;
  modelsStatus: ModelLoadStatus;
  engineState: ForecastEngineState | null;
  initError: string | null;
}

const DEFAULT_STATE: AppInitState = {
  dbReady: false,
  modelsStatus: 'loading',
  engineState: null,
  initError: null,
};

const AppInitContext = createContext<AppInitState>(DEFAULT_STATE);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AppInitProviderProps {
  children: React.ReactNode;
}

export function AppInitProvider({ children }: AppInitProviderProps) {
  const [state, setState] = useState<AppInitState>(DEFAULT_STATE);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Run DB init and model loading in the background.
    // The landing screen renders immediately; tabs show loading state
    // until this resolves.
    void (async () => {
      try {
        // DB init (sequential — models need the FS copy from init)
        await initDatabase();
        setState((s) => ({ ...s, dbReady: true }));

        // Model loading (parallel with app interaction, non-blocking)
        const engineState = await loadAllModels();
        setState((s) => ({
          ...s,
          modelsStatus: engineState.status,
          engineState,
        }));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'App initialisation failed';
        console.error('[AppInit] Error:', msg, err);
        setState((s) => ({ ...s, initError: msg }));
      }
    })();
  }, []);

  return (
    <AppInitContext.Provider value={state}>
      {children}
    </AppInitContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppInit(): AppInitState {
  return useContext(AppInitContext);
}
