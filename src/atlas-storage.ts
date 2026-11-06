import { COLORS, MAX_ROUTES, restore, seedRoutes, serializeAtlas } from "@/atlas-data";
import type { Route } from "@/route";

export const ATLAS_KEY = "trailbraid.atlas.v1";

const READ_FAILURE = "Saved atlas was unreadable. Demo routes loaded; import a GPX to start again.";

const WRITE_FAILURE = "Browser storage is unavailable or full. Export notes before closing.";

type AtlasSnapshot = {
  routes: Route[];
  notice: string;
  canUndo: boolean;
};

type AtlasStorage = Pick<Storage, "getItem" | "setItem">;

type StorageAccess = () => AtlasStorage;

function readSnapshot(storage: StorageAccess): AtlasSnapshot {
  try {
    return { routes: restore(storage().getItem(ATLAS_KEY)), notice: "", canUndo: false };
  } catch {
    return { routes: seedRoutes(), notice: READ_FAILURE, canUndo: false };
  }
}

export function createAtlasStore(storage: StorageAccess) {
  const serverSnapshot = readSnapshot(storage);
  let snapshot = serverSnapshot;
  let mounted = false;
  let history: Route[][] = [];
  const listeners = new Set<() => void>();

  function publish(next: AtlasSnapshot) {
    snapshot = next;

    for (const listener of listeners) {
      listener();
    }
  }

  function persist(next: AtlasSnapshot): AtlasSnapshot {
    try {
      storage().setItem(ATLAS_KEY, serializeAtlas(next.routes));

      return next;
    } catch {
      return { ...next, notice: WRITE_FAILURE };
    }
  }

  function change(routes: Route[], notice: string) {
    history = [...history.slice(-19), snapshot.routes];
    publish(persist({ routes, notice, canUndo: true }));
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
    addRoute: (route: Omit<Route, "color">) => {
      if (snapshot.routes.length >= MAX_ROUTES) {
        throw new Error("This atlas holds four routes. Remove one before importing.");
      }

      const color = COLORS.filter(
        (candidate) => !snapshot.routes.some((r) => r.color === candidate),
      )[0];
      change(
        [...snapshot.routes, { ...route, color }],
        `Imported ${route.name}. Its geometry stays on this device.`,
      );
    },
    removeRoute: (id: string) => {
      change(
        snapshot.routes.filter((r) => r.id !== id),
        "Route removed. Undo is available.",
      );
    },
    loadDemo: () => {
      const routes = seedRoutes();
      change(routes, "Synthetic demo routes restored.");
      return routes[0].id;
    },
    undo: () => {
      const routes = history.at(-1);
      if (!routes) {
        return;
      }

      history = history.slice(0, -1);
      publish(
        persist({ routes, notice: "Last route change undone.", canUndo: history.length > 0 }),
      );
      return routes[0]?.id ?? "";
    },
    setNotice: (notice: string) => {
      if (notice !== snapshot.notice) {
        publish({ ...snapshot, notice });
      }
    },
  };
}
