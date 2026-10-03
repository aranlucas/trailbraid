import { useEffect, useRef, useState } from "react";
import { Atlas, Profile } from "./Atlas";
import { COLORS, parseGpx, restore, seedRoutes, summary } from "./route";
import type { Route } from "./route";

const KEY = "trailbraid.atlas.v1";

const format = (n: number | null, suffix: string) =>
  n === null
    ? "Unknown"
    : `${suffix === "km" ? n.toFixed(1) : Math.round(n).toLocaleString()} ${suffix}`;

function initial() {
  try {
    return { routes: restore(localStorage.getItem(KEY)), error: "" };
  } catch {
    return {
      routes: seedRoutes(),
      error:
        "Saved atlas was unreadable. Demo routes loaded; import a GPX to start again.",
    };
  }
}

export default function App() {
  const [boot] = useState(initial);
  const [routes, setRoutes] = useState<Route[]>(boot.routes);
  const [active, setActive] = useState(boot.routes[0]?.id ?? "");
  const [compare, setCompare] = useState(true);
  const [from, setFrom] = useState(1.5);
  const [to, setTo] = useState(5.5);
  const [notice, setNotice] = useState(boot.error);
  const [history, setHistory] = useState<Route[][]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const chosen = routes.find((r) => r.id === active) ?? routes[0];
  const visible = compare ? routes : chosen ? [chosen] : [];
  const max = Math.max(1, ...visible.map((r) => summary(r.points).distance));

  const end = Math.min(to, max),
    start = Math.min(from, end);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, routes }));
    } catch {
      setNotice(
        "Browser storage is unavailable or full. Export notes before closing.",
      );
    }
  }, [routes]);

  function change(next: Route[]) {
    setHistory((h) => [...h.slice(-19), routes]);
    setRoutes(next);
  }

  function undo() {
    const previous = history.at(-1);

    if (previous) {
      setRoutes(previous);
      setHistory((h) => h.slice(0, -1));
      setActive(previous[0]?.id ?? "");
      setNotice("Last route change undone.");
    }
  }

  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);

    try {
      if (routes.length >= 4)
        throw new Error(
          "This atlas holds four routes. Remove one before importing.",
        );

      if (file.size > 5_000_000)
        throw new Error("GPX files are limited to 5 MB.");

      const parsed = parseGpx(await file.text(), (t) =>
        new DOMParser().parseFromString(t, "application/xml"),
      );

      const route = {
        ...parsed,
        id: crypto.randomUUID(),
        color: COLORS[routes.length],
      };

      change([...routes, route]);
      setActive(route.id);
      setNotice(`Imported ${route.name}. Its geometry stays on this device.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);

      if (input.current) input.current.value = "";
    }
  }

  function remove(id: string) {
    change(routes.filter((r) => r.id !== id));
    setNotice("Route removed. Undo is available.");
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

  const overview = chosen ? summary(chosen.points) : null,
    segment = chosen ? summary(chosen.points, start, end) : null;

  return (
    <>
      <header>
        <div>
          <h1>Trailbraid</h1>
          <p>Your routes, seen differently.</p>
        </div>
        <nav>
          <button
            className="primary"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            {busy ? "Reading GPX…" : "Import GPX"}
          </button>
          <button onClick={exportNotes} disabled={!routes.length}>
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
          <button onClick={() => setNotice("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
      <main>
        <aside>
          <div className="row">
            <h2>Routes</h2>
            <button
              className="icon"
              onClick={() => input.current?.click()}
              aria-label="Import another route"
            >
              +
            </button>
          </div>
          <div className="routes">
            {routes.map((r) => (
              <div
                className={`route-row ${chosen?.id === r.id ? "selected" : ""}`}
                key={r.id}
              >
                <button
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
                  className="icon remove"
                  onClick={() => remove(r.id)}
                  aria-label={`Remove ${r.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            className="compare"
            onClick={() => setCompare((c) => !c)}
            aria-pressed={compare}
          >
            <span aria-hidden="true">◯◯</span>{" "}
            {compare ? "Comparing routes" : "Compare routes"}
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
            <button onClick={undo} disabled={!history.length}>
              Undo route change
            </button>
            <button
              onClick={() => {
                change(seedRoutes());
                setActive("fern");
                setNotice("Synthetic demo routes restored.");
              }}
            >
              Load demo routes
            </button>
            <small>
              Raw elevation, without smoothing. Gaps stay separate; missing
              elevation stays unknown.
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
                      onChange={(e) =>
                        setFrom(Math.min(Number(e.target.value), end))
                      }
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
                      onChange={(e) =>
                        setTo(Math.max(Number(e.target.value), start))
                      }
                    />
                  </label>
                </div>
                {visible.map((r) => (
                  <Profile
                    route={r}
                    from={start}
                    to={end}
                    maximum={max}
                    key={r.id}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="empty">
              <h2>A fresh page in your atlas.</h2>
              <p>
                Import a GPX track or explore the two synthetic demo routes.
              </p>
              <button
                className="primary"
                onClick={() => input.current?.click()}
              >
                Import your first GPX
              </button>
              <button
                onClick={() => {
                  change(seedRoutes());
                  setActive("fern");
                }}
              >
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
