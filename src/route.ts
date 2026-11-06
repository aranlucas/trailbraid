import { distance } from "@turf/distance";
import { point } from "@turf/helpers";

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
