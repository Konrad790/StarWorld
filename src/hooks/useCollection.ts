import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  getCollectionEntries,
  addCollectionEntry,
  updateCollectionEntryPrice,
  deleteCollectionEntry,
} from '../db/queries/collection';
import { getMinifigureById } from '../db/queries/minifigures';
import {
  AddCollectionInput,
  CollectionEntry,
  CollectionEntryView,
  Minifigure,
} from '../types';
import { useAppInit } from './useAppInit';

// ─── Normative ROI formula ────────────────────────────────────────────────────

export function computeRoi(
  purchasePriceEur: number,
  currentPriceEur: number | null
): number | null {
  if (currentPriceEur === null) return null;
  if (purchasePriceEur === 0) return null;
  return ((currentPriceEur - purchasePriceEur) / purchasePriceEur) * 100;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface CollectionContextValue {
  entries: CollectionEntryView[];
  isLoading: boolean;
  error: string | null;
  addEntry: (input: AddCollectionInput) => Promise<void>;
  updatePrice: (id: number, newPriceEur: number) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  refresh: () => void;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const { dbReady } = useAppInit();
  const [entries, setEntries] = useState<CollectionEntryView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRevision = useRef(0);

  const loadEntries = useCallback(async () => {
    if (!dbReady) return;
    loadRevision.current += 1;
    const rev = loadRevision.current;

    setIsLoading(true);
    setError(null);
    try {
      const rawEntries = await getCollectionEntries();

      const minifigMap = new Map<string, Minifigure | null>();
      await Promise.all(
        rawEntries.map(async (e) => {
          if (!minifigMap.has(e.figNum)) {
            const fig = await getMinifigureById(e.figNum);
            minifigMap.set(e.figNum, fig);
          }
        })
      );

      if (rev !== loadRevision.current) return;

      const views: CollectionEntryView[] = rawEntries.map((e) => {
        const minifig = minifigMap.get(e.figNum) ?? null;
        return {
          entry: e,
          minifig,
          roi: computeRoi(e.purchasePriceEur, minifig?.currentPrice ?? minifig?.pFirstObservedEu ?? null),
        };
      });

      setEntries(views);
    } catch (err) {
      if (rev === loadRevision.current) {
        setError(err instanceof Error ? err.message : 'Failed to load collection');
      }
    } finally {
      if (rev === loadRevision.current) setIsLoading(false);
    }
  }, [dbReady]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const addEntry = useCallback(
    async (input: AddCollectionInput): Promise<void> => {
      const newRaw = await addCollectionEntry(input);
      const minifig = await getMinifigureById(input.figNum);
      const newView: CollectionEntryView = {
        entry: newRaw,
        minifig,
        roi: computeRoi(newRaw.purchasePriceEur, minifig?.currentPrice ?? minifig?.pFirstObservedEu ?? null),
      };
      setEntries((prev) => [newView, ...prev]);
    },
    []
  );

  const updatePrice = useCallback(
    async (id: number, newPriceEur: number): Promise<void> => {
      await updateCollectionEntryPrice(id, newPriceEur);
      setEntries((prev) =>
        prev.map((v) => {
          if (v.entry.id !== id) return v;
          const updated: CollectionEntry = { ...v.entry, purchasePriceEur: newPriceEur };
          return {
            ...v,
            entry: updated,
            roi: computeRoi(newPriceEur, v.minifig?.currentPrice ?? v.minifig?.pFirstObservedEu ?? null),
          };
        })
      );
    },
    []
  );

  const deleteEntry = useCallback(
    async (id: number): Promise<void> => {
      await deleteCollectionEntry(id);
      setEntries((prev) => prev.filter((v) => v.entry.id !== id));
    },
    []
  );

  const refresh = useCallback(() => {
    void loadEntries();
  }, [loadEntries]);

  const value: CollectionContextValue = {
    entries,
    isLoading,
    error,
    addEntry,
    updatePrice,
    deleteEntry,
    refresh,
  };

  return React.createElement(CollectionContext.Provider, { value }, children);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCollection(): CollectionContextValue {
  const ctx = useContext(CollectionContext);
  if (!ctx) {
    throw new Error('useCollection must be used inside <CollectionProvider>');
  }
  return ctx;
}
