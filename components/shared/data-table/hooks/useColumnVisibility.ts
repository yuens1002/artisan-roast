import type { VisibilityState } from "@tanstack/react-table";
import { useCallback, useState } from "react";

function loadVisibility(key: string): VisibilityState {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return {};
}

function saveVisibility(key: string, state: VisibilityState) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useColumnVisibility(
  storageKey?: string,
  defaultHidden?: VisibilityState
) {
  const [userVisibility, setUserVisibility] = useState<VisibilityState>(
    () => {
      const saved = storageKey ? loadVisibility(storageKey) : {};
      // Apply defaults only for columns the user hasn't explicitly set
      if (defaultHidden) {
        return { ...defaultHidden, ...saved };
      }
      return saved;
    }
  );

  const handleVisibilityChange = useCallback(
    (columnId: string, visible: boolean) => {
      setUserVisibility((prev) => {
        const next = { ...prev, [columnId]: visible };
        if (storageKey) saveVisibility(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  return { columnVisibility: userVisibility, handleVisibilityChange };
}
