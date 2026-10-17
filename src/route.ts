import { distance } from "@turf/distance";
import { point } from "@turf/helpers";
import { z } from "zod/mini";

export type RoutePoint = {
  lon: number;
  lat: number;
  ele?: number;
  breakBefore?: boolean;
};

export type Route = {
  id: string;
  name: string;
  color: string;
  points: RoutePoint[];
};

export type Sample = RoutePoint & { km: number };

export const COLORS = ["#24624c", "#c16b39", "#5868a1", "#a33f64"];

export const MAX_POINTS = 20_000;

const COORDINATES = "Coordinates must be finite longitude/latitude values.";

const ELEVATION = "Elevation must be a finite value in metres.";

const POINT_COUNT = "A route needs 2–20,000 points.";

const bounded = (limit: number, error: string) =>
  z.number({ error }).check(z.refine((v) => Math.abs(v) <= limit, { error }));

const RoutePointSchema = z.object(
  {
    lon: bounded(180, COORDINATES),
    lat: bounded(90, COORDINATES),
    ele: z.optional(bounded(20_000, ELEVATION)),
    breakBefore: z.optional(z.boolean()),
  },
  { error: "Invalid route point." },
);

const RoutePointsSchema = z
  .array(RoutePointSchema, { error: POINT_COUNT })
  .check(z.minLength(2, { error: POINT_COUNT }), z.maxLength(MAX_POINTS, { error: POINT_COUNT }));

const SavedAtlasSchema = z.object({
  version: z.literal(1),
  routes: z
    .array(z.object({ id: z.string(), name: z.string(), points: RoutePointsSchema }))
    .check(z.maxLength(4)),
});

// Untrusted route imports are validated immediately by the schema at this boundary.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function validatePoints(values: unknown): RoutePoint[] {
  const result = RoutePointsSchema.safeParse(values);

  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }

  return result.data;
}

export function samples(points: RoutePoint[]): Sample[] {
  let km = 0;

  return points.map((p, i) => {
    if (i && !p.breakBefore) {
      km += distance(point([points[i - 1].lon, points[i - 1].lat]), point([p.lon, p.lat]), {
        units: "kilometers",
      });
    }

    return { ...p, km };
  });
}

export function summary(points: RoutePoint[], from = 0, to = Infinity) {
  const data = samples(points);
  const total = data.at(-1)?.km ?? 0;
  const start = Math.max(0, Math.min(from, total));
  const end = Math.max(start, Math.min(to, total));

  const elevations = data
    .filter((p) => p.km >= start && p.km <= end)
    .flatMap((p) => (p.ele === undefined ? [] : [p.ele]));

  let ascent = 0;
  let descent = 0;
  let known = true;
  let maxGrade = 0;

  for (let i = 1; i < data.length; i++) {
    const a = data[i - 1];
    const b = data[i];

    const d = b.km - a.km;

    if (b.breakBefore || d <= 0 || b.km <= start || a.km >= end) {
      continue;
    }

    const share = (Math.min(b.km, end) - Math.max(a.km, start)) / d;

    if (a.ele === undefined || b.ele === undefined) {
      known = false;
      continue;
    }

    const delta = (b.ele - a.ele) * share;
    // The window can begin or end between recorded points. Include those
    // clipped elevations as well as any samples inside the selection.
    elevations.push(
      a.ele + ((b.ele - a.ele) * (Math.max(a.km, start) - a.km)) / d,
      a.ele + ((b.ele - a.ele) * (Math.min(b.km, end) - a.km)) / d,
    );
    ascent += Math.max(0, delta);
    descent += Math.max(0, -delta);
    maxGrade = Math.max(maxGrade, (Math.abs(b.ele - a.ele) / (d * 1000)) * 100);
  }

  if (data.every((p) => p.ele === undefined)) {
    known = false;
  }

  return {
    distance: end - start,
    total,
    ascent: known ? ascent : null,
    descent: known ? descent : null,
    high: elevations.length ? Math.max(...elevations) : null,
    low: elevations.length ? Math.min(...elevations) : null,
    maxGrade: known ? maxGrade : null,
  };
}

type ImportedRoute = Pick<Route, "name" | "points">;

export type GpxNode = {
  localName: string;
  textContent: string | null;
  getAttribute: (name: string) => string | null;
  getElementsByTagNameNS: (namespace: string, name: string) => ArrayLike<GpxNode>;
};

export type GpxDocument = {
  documentElement: GpxNode;
  querySelector: (selector: string) => GpxNode | null;
  getElementsByTagNameNS: (namespace: string, name: string) => ArrayLike<GpxNode>;
};

export function parseGpx(text: string, parse: (text: string) => GpxDocument): ImportedRoute {
  if (text.length > 5_000_000) {
    throw new Error("GPX files are limited to 5 MB.");
  }

  if (/<!DOCTYPE|<!ENTITY/i.test(text)) {
    throw new Error("GPX files with DTD or entity declarations are not supported.");
  }

  const doc = parse(text);

  if (doc.querySelector("parsererror") || doc.documentElement?.localName !== "gpx") {
    throw new Error("Choose a valid GPX file.");
  }

  const groups = Array.from(doc.getElementsByTagNameNS("*", "trkseg"));
  const fallback = Array.from(doc.getElementsByTagNameNS("*", "rte"));
  const points: RoutePoint[] = [];

  for (const group of groups.length ? groups : fallback) {
    const nodes = Array.from(group.getElementsByTagNameNS("*", groups.length ? "trkpt" : "rtept"));

    for (const [i, el] of nodes.entries()) {
      const lon = el.getAttribute("lon");
      const lat = el.getAttribute("lat");

      if (lon === null || lat === null || lon.trim() === "" || lat.trim() === "") {
        throw new Error("Every GPX point needs coordinates.");
      }

      const elevation = el.getElementsByTagNameNS("*", "ele")[0]?.textContent?.trim();

      const coordinate: RoutePoint = { lon: Number(lon), lat: Number(lat) };

      if (elevation) {
        coordinate.ele = Number(elevation);
      }

      if (i === 0 && points.length) {
        coordinate.breakBefore = true;
      }

      points.push(coordinate);

      if (points.length > MAX_POINTS) {
        throw new Error("A route is limited to 20,000 points.");
      }
    }
  }

  const importedName = doc.getElementsByTagNameNS("*", "name")[0]?.textContent?.trim().slice(0, 80);
  const name = importedName?.length ? importedName : "Imported route";

  return { name, points: validatePoints(points) };
}

export function unwrap(points: RoutePoint[], reference = points[0]?.lon ?? 0) {
  let previous = reference;

  return points.map((p) => {
    let lon = p.lon;

    while (lon - previous > 180) {
      lon -= 360;
    }

    while (lon - previous < -180) {
      lon += 360;
    }

    previous = lon;

    return { ...p, lon };
  });
}

export function mapPaths(routes: Route[], width = 960, height = 450) {
  const ref = routes[0]?.points[0]?.lon ?? 0;
  const flat = routes.flatMap((r) => unwrap(r.points, ref));

  if (!flat.length) {
    return [];
  }

  const cos = Math.max(
    0.01,
    Math.cos(((flat.reduce((s, p) => s + p.lat, 0) / flat.length) * Math.PI) / 180),
  );

  const xs = flat.map((p) => p.lon * cos);
  const ys = flat.map((p) => p.lat);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const scale = Math.min(
    (width - 100) / Math.max(0.00001, maxX - minX),
    (height - 90) / Math.max(0.00001, maxY - minY),
  );

  return routes.map((r) => {
    const data = samples(unwrap(r.points, ref));

    const occurrences = new Map<string, number>();

    const coords = data.map((p) => {
      const fingerprint = JSON.stringify([p.lon, p.lat, p.ele, p.breakBefore, p.km]);
      const occurrence = occurrences.get(fingerprint) ?? 0;
      occurrences.set(fingerprint, occurrence + 1);

      return {
        ...p,
        key: `${fingerprint}:${occurrence}`,
        x: width / 2 + (p.lon * cos - (minX + maxX) / 2) * scale,
        y: height / 2 - (p.lat - (minY + maxY) / 2) * scale,
      };
    });

    return {
      route: r,
      coords,
      path: coords
        .map((p, i) => `${i === 0 || p.breakBefore ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .join(" "),
    };
  });
}

function makeSeedRoute(
  id: string,
  name: string,
  target: number,
  base: number,
  gain: number,
  wide: number,
  color: string,
): Route {
  const pts: RoutePoint[] = Array.from({ length: 121 }, (_, i) => {
    const t = i / 120;
    const theta = t * Math.PI * 2;

    return {
      lon: -122 + (0.025 * wide * Math.cos(theta) + 0.007 * Math.sin(theta * 3)),
      lat: 45 + (0.018 * Math.sin(theta) + 0.003 * Math.sin(theta * 5)),
      ele: Math.round(base + gain * Math.pow(Math.sin(Math.PI * t), 2)),
    };
  });

  const current = summary(pts).distance;
  const factor = target / current;

  for (const p of pts) {
    p.lon = -122 + (p.lon + 122) * factor;
    p.lat = 45 + (p.lat - 45) * factor;
  }

  return { id, name, color, points: pts };
}

export function seedRoutes(): Route[] {
  return [
    makeSeedRoute("fern", "Fern Loop", 8.2, 732, 410, 1, COLORS[0]),
    makeSeedRoute("ridge", "Ridge Traverse", 10.6, 610, 620, 1.4, COLORS[1]),
  ];
}

export function restore(text: string | null): Route[] {
  if (text === null) {
    return seedRoutes();
  }

  const result = SavedAtlasSchema.safeParse(JSON.parse(text));

  if (!result.success) {
    throw new Error("The saved atlas could not be read.");
  }

  const ids = new Set<string>();

  return result.data.routes.map((r, i) => {
    if (ids.has(r.id)) {
      throw new Error("Invalid saved route.");
    }

    ids.add(r.id);

    return { id: r.id, name: r.name.slice(0, 80), color: COLORS[i], points: r.points };
  });
}

export function elevationPath(
  data: Sample[],
  x: (km: number) => number,
  y: (ele: number) => number,
) {
  return data
    .map((p, i) => {
      if (p.ele === undefined) {
        return "";
      }

      const connected = data[i - 1]?.ele !== undefined && !p.breakBefore;

      return `${connected ? "L" : "M"}${x(p.km)},${y(p.ele)}`;
    })
    .join(" ");
}
