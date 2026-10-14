import { expect, test, vi } from "vitest";
import { ATLAS_KEY, createAtlasStore } from "@/atlas-storage";
import { seedRoutes } from "@/route";

function storage(initial: string | null = null) {
  return {
    getItem: vi.fn(() => initial),
    setItem: vi.fn<(key: string, value: string) => void>(),
  };
}

test("mount persists the initial atlas once and keeps a stable snapshot", () => {
  const backend = storage();
  const store = createAtlasStore(() => backend);
  const initial = store.getSnapshot();
  expect(backend.setItem).not.toHaveBeenCalled();
  const listener = vi.fn();
  const unsubscribe = store.subscribe(listener);
  expect(backend.setItem).toHaveBeenCalledExactlyOnceWith(
    ATLAS_KEY,
    JSON.stringify({ version: 1, routes: initial.routes }),
  );
  expect(store.getSnapshot()).toBe(initial);
  expect(listener).not.toHaveBeenCalled();
  unsubscribe();
  const remount = store.subscribe(listener);
  expect(backend.setItem).toHaveBeenCalledTimes(1);
  remount();
});

test("corrupt saved data falls back to demos and keeps the read error visible", () => {
  const backend = storage("broken");
  const store = createAtlasStore(() => backend);
  const unsubscribe = store.subscribe(vi.fn());
  expect(store.getSnapshot().routes).toEqual(seedRoutes());
  expect(store.getSnapshot().notice).toMatch(/Saved atlas was unreadable/);
  expect(backend.setItem).toHaveBeenCalledOnce();
  unsubscribe();
});

test("initial write failure is visible and dismissing it does not write again", () => {
  const backend = storage();
  backend.setItem.mockImplementation(() => {
    throw new Error("Quota exceeded");
  });
  const store = createAtlasStore(() => backend);
  const listener = vi.fn();
  const unsubscribe = store.subscribe(listener);
  expect(store.getSnapshot().notice).toMatch(/Browser storage is unavailable or full/);
  expect(listener).toHaveBeenCalledOnce();
  store.setNotice("");
  expect(store.getSnapshot().notice).toBe("");
  expect(backend.setItem).toHaveBeenCalledOnce();
  unsubscribe();
});

test("storage access exceptions are handled during both loading and mount persistence", () => {
  const store = createAtlasStore(() => {
    throw new Error("Storage blocked");
  });
  expect(store.getSnapshot().notice).toMatch(/Saved atlas was unreadable/);
  const unsubscribe = store.subscribe(vi.fn());
  expect(store.getSnapshot().notice).toMatch(/Browser storage is unavailable or full/);
  expect(store.getSnapshot().routes).toHaveLength(2);
  unsubscribe();
});

test("route changes and undo persist their exact routes without persisting notices", () => {
  const backend = storage();
  const store = createAtlasStore(() => backend);
  const listener = vi.fn();
  const unsubscribe = store.subscribe(listener);
  const initial = store.getSnapshot().routes;
  store.setRoutes([], "Route removed. Undo is available.");
  expect(store.getSnapshot()).toEqual({ routes: [], notice: "Route removed. Undo is available." });
  expect(backend.setItem).toHaveBeenLastCalledWith(
    ATLAS_KEY,
    JSON.stringify({ version: 1, routes: [] }),
  );
  store.setRoutes(initial, "Last route change undone.");
  expect(store.getSnapshot().routes).toBe(initial);
  expect(backend.setItem).toHaveBeenLastCalledWith(
    ATLAS_KEY,
    JSON.stringify({ version: 1, routes: initial }),
  );
  const writes = backend.setItem.mock.calls.length;
  store.setNotice("Route notes exported.");
  expect(backend.setItem).toHaveBeenCalledTimes(writes);
  unsubscribe();
  listener.mockClear();
  store.setNotice("");
  expect(listener).not.toHaveBeenCalled();
});

test("failed writes retain in-memory edits and take precedence over success notices", () => {
  const backend = storage();
  const store = createAtlasStore(() => backend);
  const unsubscribe = store.subscribe(vi.fn());
  backend.setItem.mockImplementationOnce(() => {
    throw new Error("Quota exceeded");
  });
  store.setRoutes([], "Route removed. Undo is available.");
  expect(store.getSnapshot().routes).toEqual([]);
  expect(store.getSnapshot().notice).toMatch(/Browser storage is unavailable or full/);
  const restored = seedRoutes();
  store.setRoutes(restored, "Last route change undone.");
  expect(store.getSnapshot()).toEqual({ routes: restored, notice: "Last route change undone." });
  unsubscribe();
});

test("server snapshots stay stable and independent stores do not leak updates", () => {
  const backend = storage();
  const first = createAtlasStore(() => backend);
  const second = createAtlasStore(() => backend);
  const serverSnapshot = first.getServerSnapshot();
  expect(first.getServerSnapshot()).toBe(serverSnapshot);
  first.setRoutes([], "Changed");
  expect(first.getServerSnapshot()).toBe(serverSnapshot);
  expect(second.getSnapshot().routes).toHaveLength(2);
  expect(second.getSnapshot().notice).toBe("");
});

test("failed initial persistence is not repeated by Strict Mode subscriptions", () => {
  const backend = storage();
  backend.setItem.mockImplementation(() => {
    throw new Error("Quota exceeded");
  });
  const store = createAtlasStore(() => backend);
  const first = vi.fn();
  const unsubscribe = store.subscribe(first);
  const failedSnapshot = store.getSnapshot();
  unsubscribe();
  const second = vi.fn();
  const resubscribe = store.subscribe(second);
  expect(backend.setItem).toHaveBeenCalledOnce();
  expect(store.getSnapshot()).toBe(failedSnapshot);
  store.setNotice("");
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledOnce();
  resubscribe();
});
