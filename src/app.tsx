import { useRef, useState, useSyncExternalStore } from "react";
import { Atlas, Profile } from "@/atlas";
import { summary } from "@/route";
import { MAX_GPX_BYTES, parseGpx } from "@/gpx";

import { createAtlasStore } from "@/atlas-storage";

const format = (n: number | null, suffix: string) =>
  n === null
    ? "Unknown"
    : `${suffix === "km" ? n.toFixed(1) : Math.round(n).toLocaleString()} ${suffix}`;

export default function App() {
  const [store] = useState(() => createAtlasStore(() => localStorage));

  const { routes, notice, canUndo } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const { setNotice } = store;
  const [active, setActive] = useState(routes[0]?.id ?? "");
  const [compare, setCompare] = useState(true);
  const [from, setFrom] = useState(1.5);
  const [to, setTo] = useState(5.5);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const chosen = routes.find((r) => r.id === active) ?? routes[0];
  const visible = compare ? routes : chosen ? [chosen] : [];
  const max = Math.max(1, ...visible.map((r) => summary(r.points).distance));

  const end = Math.min(to, max);
  const start = Math.min(from, end);

  function loadDemo() {
    setActive(store.loadDemo());
  }

  function undo() {
    const restored = store.undo();
    if (restored !== undefined) {
      setActive(restored);
    }
  }

  async function importFile(file?: File) {
    if (!file || busy) {
      return;
    }

    setBusy(true);

    try {
      if (file.size > MAX_GPX_BYTES) {
        throw new Error("GPX files are limited to 5 MB.");
      }

      const parsed = parseGpx(await file.text(), (t) =>
        new DOMParser().parseFromString(t, "application/xml"),
      );

      const route = {
        ...parsed,
        id: crypto.randomUUID(),
      };

      store.addRoute(route);
      setActive(route.id);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);

      if (input.current) {
        input.current.value = "";
      }
    }
  }

  function exportNotes() {
    const data = {
      version: 1,
      generatedAt: new Date().toISOString(),
      windowKm: { from: start, to: end },
      routes: routes.map((r) => ({
        name: r.name,
        ...summary(r.points),
        selected: summary(r.points, start, end),
      })),
      note: "Geometry/elevation diagnostics only. Decorative contours are not terrain. Raw GPX ascent is unsmoothed.",
    };

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = "trailbraid-notes.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Route notes exported.");
  }

  const overview = chosen ? summary(chosen.points) : null;
  const segment = chosen ? summary(chosen.points, start, end) : null;

  return (
    <>
      <header>
        <div>
          <h1>Trailbraid</h1>
          <p>Your routes, seen differently.</p>
        </div>
        <nav>
          <button
            type="button"
            className="primary"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            {busy ? "Reading GPX…" : "Import GPX"}
          </button>
          <button type="button" onClick={exportNotes} disabled={!routes.length}>
            Export notes
          </button>
        </nav>
        <input
          ref={input}
          hidden
          type="file"
          accept=".gpx,application/gpx+xml"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </header>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
      <main>
        <aside>
          <div className="row">
            <h2>Routes</h2>
            <button
              type="button"
              className="icon"
              onClick={() => input.current?.click()}
              aria-label="Import another route"
              disabled={busy}
            >
              +
            </button>
          </div>
          <div className="routes">
            {routes.map((r) => (
              <div className={`route-row ${chosen?.id === r.id ? "selected" : ""}`} key={r.id}>
                <button
                  type="button"
                  className="route-select"
                  onClick={() => setActive(r.id)}
                  aria-pressed={chosen?.id === r.id}
                >
                  <i style={{ background: r.color }} />
                  <span>
                    <strong>{r.name}</strong>
                    <small>
                      {format(summary(r.points).distance, "km")} ·{" "}
                      {format(summary(r.points).ascent, "m")} ascent
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  className="icon remove"
                  onClick={() => store.removeRoute(r.id)}
                  aria-label={`Remove ${r.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="compare"
            onClick={() => setCompare((c) => !c)}
            aria-pressed={compare}
          >
            <span aria-hidden="true">◯◯</span> {compare ? "Comparing routes" : "Compare routes"}
          </button>
          {overview && (
            <section>
              <h2>Route overview</h2>
              <dl>
                {[
                  ["Distance", format(overview.distance, "km")],
                  ["Ascent", format(overview.ascent, "m")],
                  ["Descent", format(overview.descent, "m")],
                  ["High point", format(overview.high, "m")],
                  ["Low point", format(overview.low, "m")],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {segment && (
            <section>
              <h2>Selected segment</h2>
              <dl>
                {[
                  ["From", format(start, "km")],
                  ["To", format(end, "km")],
                  ["Distance", format(segment.distance, "km")],
                  ["Ascent", format(segment.ascent, "m")],
                  ["Descent", format(segment.descent, "m")],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <section className="tools">
            <h2>Keep exploring</h2>
            <button type="button" onClick={undo} disabled={!canUndo}>
              Undo route change
            </button>
            <button type="button" onClick={loadDemo}>
              Load demo routes
            </button>
            <small>
              Raw elevation, without smoothing. Gaps stay separate; missing elevation stays unknown.
            </small>
          </section>
        </aside>
        <div className="workspace">
          {routes.length ? (
            <>
              <Atlas
                routes={visible}
                active={chosen?.id ?? ""}
                from={start}
                to={end}
                onSelect={setActive}
              />
              <div className="explore">
                <div className="row">
                  <h2>Explore the climb</h2>
                  <span>
                    {start.toFixed(1)} – {end.toFixed(1)} km
                  </span>
                </div>
                <p>Move the window. The map and profiles update together.</p>
                <div className="window-controls">
                  <label>
                    From{" "}
                    <input
                      aria-label="Window start"
                      type="range"
                      min="0"
                      max={max}
                      step="0.1"
                      value={start}
                      onChange={(e) => setFrom(Math.min(Number(e.target.value), end))}
                    />
                  </label>
                  <label>
                    To{" "}
                    <input
                      aria-label="Window end"
                      type="range"
                      min="0"
                      max={max}
                      step="0.1"
                      value={end}
                      onChange={(e) => setTo(Math.max(Number(e.target.value), start))}
                    />
                  </label>
                </div>
                {visible.map((r) => (
                  <Profile route={r} from={start} to={end} maximum={max} key={r.id} />
                ))}
              </div>
            </>
          ) : (
            <div className="empty">
              <h2>A fresh page in your atlas.</h2>
              <p>Import a GPX track or explore the two synthetic demo routes.</p>
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                Import your first GPX
              </button>
              <button type="button" onClick={loadDemo}>
                Load demo routes
              </button>
            </div>
          )}
        </div>
      </main>
      <footer>
        Local files. No map service. Synthetic demo routes.{" "}
        <span>Distances in km · elevations in m</span>
      </footer>
    </>
  );
}
