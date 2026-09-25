"use client";

/**
 * React access to saved data.
 *
 * useSyncExternalStore is React's built-in way to read from a store that
 * lives outside React (our storage module). When the store changes, every
 * component using it re-renders.
 *
 * The server can't see localStorage, so during the server render (and the
 * first browser render) we return an empty state, then switch to the real
 * data. `useHydrated()` tells components when real data is available, so we
 * never flash "no profile → onboarding" before the saved profile loads.
 */
import { useSyncExternalStore } from "react";
import { getState, subscribe } from "@/lib/storage";
import { emptyState, type AppState } from "@/lib/types";

const SERVER_SNAPSHOT = emptyState();
const noopSubscribe = () => () => {};

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_SNAPSHOT);
}

/** False during the server render and first paint; true once saved data is readable. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
