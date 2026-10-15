import { restore, seedRoutes } from "@/route";
import type { Route } from "@/route";

export const ATLAS_KEY = "trailbraid.atlas.v1";

const READ_FAILURE = "Saved atlas was unreadable. Demo routes loaded; import a GPX to start again.";

const WRITE_FAILURE = "Browser storage is unavailable or full. Export notes before closing.";

type AtlasSnapshot = {
  routes: Route[];
  notice: string;
};

type AtlasStorage = Pick<Storage, "getItem" | "setItem">;

type StorageAccess = () => AtlasStorage;

function readSnapshot(storage: StorageAccess): AtlasSnapshot {
  try {
    return { routes: restore(storage().getItem(ATLAS_KEY)), notice: "" };
  } catch {
    return { routes: seedRoutes(), notice: READ_FAILURE };
  }
}

export function createAtlasStore(storage: StorageAccess) {
  const serverSnapshot = readSnapshot(storage);
  let snapshot = serverSnapshot;
  let mounted = false;
  const listeners = new Set<() => void>();

  function publish(next: AtlasSnapshot) {
    snapshot = next;

    for (const listener of listeners) {
      listener();
    }
  }

  function persist(next: AtlasSnapshot): AtlasSnapshot {
    try {
      storage().setItem(ATLAS_KEY, JSON.stringify({ version: 1, routes: next.routes }));

      return next;
    } catch {
      return { ...next, notice: WRITE_FAILURE };
    }
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      if (!mounted) {
        mounted = true;
        const persisted = persist(snapshot);

        if (persisted !== snapshot) {
          publish(persisted);
        }
      }

      return () => {
        listeners.delete(listener);
      };
    },
    setRoutes: (routes: Route[], notice: string) => {
      publish(persist({ routes, notice }));
    },
    setNotice: (notice: string) => {
      if (notice !== snapshot.notice) {
        publish({ ...snapshot, notice });
      }
    },
  };
}
