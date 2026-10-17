import { gpxDocument, gpxNode } from "@test/helpers/gpx";
import { expect, test } from "vitest";
import {
  elevationPath,
  mapPaths,
  restore,
  samples,
  seedRoutes,
  summary,
  unwrap,
  validatePoints,
  parseGpx,
} from "@/route.ts";

const points = [
  { lon: 0, lat: 0, ele: 10 },
  { lon: 0.01, lat: 0, ele: 30 },
  { lon: 0.02, lat: 0, ele: 20 },
];

test("Turf distance and raw ascent/descent are physical, not seed metrics", () => {
  const s = summary(points);
  expect(Math.abs(s.distance - 2.2239)).toBeLessThan(0.001);
  expect(s.ascent).toBe(20);
  expect(s.descent).toBe(10);
});

test("selection interpolates partial edges, including ascent", () => {
  const half = samples(points)[1].km / 2;
  const s = summary(points, half, half * 2);
  expect(Math.abs(s.distance - half)).toBeLessThan(1e-10);
  expect(s.ascent).toBeCloseTo(10, 10);
});

test("selection extrema include interpolated boundaries within a single edge", () => {
  const edge = points.slice(0, 2);
  const length = samples(edge)[1].km;
  const selected = summary(edge, length / 4, (length * 3) / 4);

  expect(selected.low).toBeCloseTo(15, 10);
  expect(selected.high).toBeCloseTo(25, 10);
  expect(selected.ascent).toBeCloseTo(10, 10);
});

test("selection extrema include both clipped boundaries and interior samples", () => {
  const length = samples(points)[1].km;
  const selected = summary(points, length / 2, length * 1.5);

  expect(selected.low).toBeCloseTo(20, 10);
  expect(selected.high).toBe(30);
});

test("selection extrema do not interpolate across missing elevations or segment gaps", () => {
  const length = samples(points)[1].km;
  const missing = [{ lon: 0, lat: 0 }, points[1]];
  expect(summary(missing, length / 4, (length * 3) / 4).high).toBeNull();
  const separated = [points[0], { ...points[1], breakBefore: true }, points[2]];
  const selected = summary(separated, length / 4, (length * 3) / 4);

  expect(selected.low).toBeCloseTo(22.5, 10);
  expect(selected.high).toBeCloseTo(27.5, 10);
});

test("segment gaps never add distance or elevation", () => {
  const data = [...points, { lon: 120, lat: 40, ele: 1000, breakBefore: true }];
  expect(summary(data).distance).toBe(summary(points).distance);
  expect(summary(data).ascent).toBe(20);
});

test("missing elevation remains unknown", () => {
  expect(
    summary([
      { lon: 0, lat: 0 },
      { lon: 0.01, lat: 0, ele: 30 },
    ]).ascent,
  ).toBeNull();
});

test("duplicates do not divide by zero", () => {
  const s = summary([points[0], points[0], points[1]]);
  expect(Number.isFinite(s.maxGrade)).toBe(true);
});

test("dateline unwrap keeps map local", () => {
  const r = {
    id: "x",
    name: "Dateline",
    color: "#000",
    points: [
      { lon: 179.9, lat: 0 },
      { lon: -179.9, lat: 0.1 },
    ],
  };

  expect(summary(r.points).distance).toBeLessThan(30);
  expect(Math.abs(unwrap(r.points)[1].lon - 180.1)).toBeLessThan(1e-6);
  expect(mapPaths([r])[0].path).toMatch(/M.+L/);
});

test("validation rejects NaN, out-of-world coordinates and too few points", () => {
  expect(() => validatePoints([{ lon: 181, lat: 0 }, points[0]])).toThrow(/Coordinates/);
  expect(() => validatePoints([{ lon: NaN, lat: 0 }, points[0]])).toThrow(/Coordinates/);
  expect(() => validatePoints([points[0]])).toThrow("A route needs 2–20,000 points.");
  expect(() => validatePoints([{ lon: 0, lat: 0, ele: 30_000 }, points[0]])).toThrow(/Elevation/);
  expect(() => validatePoints(["x", points[0]])).toThrow("Invalid route point.");
  expect(validatePoints([{ ...points[0], extra: 1 }, points[1]])[0]).toEqual(points[0]);
});

test("restore accepts empty atlas, validates imported points and catches corrupt schemas", () => {
  expect(restore('{"version":1,"routes":[]}')).toEqual([]);
  expect(() => restore("broken")).toThrow(/JSON/);
  expect(() => restore('{"version":2,"routes":[]}')).toThrow("The saved atlas could not be read.");
  expect(restore(null)).toHaveLength(2);
  expect(() =>
    restore(JSON.stringify({ version: 1, routes: [{ id: 1, name: "x", points }] })),
  ).toThrow("The saved atlas could not be read.");
  expect(() =>
    restore(
      JSON.stringify({
        version: 1,
        routes: [
          { id: "a", name: "x", points },
          { id: "a", name: "y", points },
        ],
      }),
    ),
  ).toThrow("Invalid saved route.");
});

test("parser refuses entity declarations before XML parsing", () => {
  expect(() =>
    parseGpx("<!DOCTYPE gpx []>", () => {
      throw new Error("should not parse");
    }),
  ).toThrow(/DTD/);
});

test("synthetic routes have truthful measured totals", () => {
  for (const [i, r] of seedRoutes().entries()) {
    expect(Math.abs(summary(r.points).distance - [8.2, 10.6][i])).toBeLessThan(0.01);
    expect(summary(r.points).ascent).toBe([410, 620][i]);
  }
});

test("elevation paths restart after missing elevations and segment gaps", () => {
  const data = [
    { lon: 0, lat: 0, km: 0, ele: 10 },
    { lon: 1, lat: 0, km: 1, ele: 20 },
    { lon: 2, lat: 0, km: 2 },
    { lon: 3, lat: 0, km: 3, ele: 30 },
    { lon: 4, lat: 0, km: 4, ele: 40, breakBefore: true },
    { lon: 5, lat: 0, km: 5, ele: 50 },
  ];

  expect(
    elevationPath(
      data,
      (km) => km * 2,
      (ele) => ele / 10,
    ),
  ).toBe("M0,1 L2,2  M6,3 M8,4 L10,5");
  expect(
    elevationPath(
      [],
      (km) => km,
      (ele) => ele,
    ),
  ).toBe("");
});

test("map coordinates retain unique stable identities for duplicate samples", () => {
  const route = {
    id: "duplicates",
    name: "Duplicates",
    color: "#000",
    points: [points[0], points[0], points[1]],
  };

  const keys = mapPaths([route])[0].coords.map((p) => p.key);
  expect(new Set(keys).size).toBe(3);
  expect(mapPaths([{ ...route, name: "Renamed" }])[0].coords.map((p) => p.key)).toEqual(keys);
});

test("GPX tracks retain segment gaps, elevation and trimmed names", () => {
  const document = gpxDocument(
    gpxNode("gpx", {}, [
      gpxNode("name", {}, [], "  Forest walk  "),
      gpxNode("trkseg", {}, [
        gpxNode("trkpt", { lon: "0", lat: "0" }, [gpxNode("ele", {}, [], " 12 ")]),
        gpxNode("trkpt", { lon: "0.01", lat: "0" }, []),
      ]),
      gpxNode("trkseg", {}, [
        gpxNode("trkpt", { lon: "5", lat: "1" }, []),
        gpxNode("trkpt", { lon: "5.01", lat: "1" }, []),
      ]),
    ]),
  );

  const route = parseGpx("<gpx/>", () => document);
  expect(route.name).toBe("Forest walk");
  expect(route.points).toEqual([
    { lon: 0, lat: 0, ele: 12 },
    { lon: 0.01, lat: 0 },
    { lon: 5, lat: 1, breakBefore: true },
    { lon: 5.01, lat: 1 },
  ]);
  expect(summary(route.points).distance).toBeLessThan(3);
});

test("GPX route fallback validates missing coordinates and malformed documents", () => {
  const route = gpxNode("rte", {}, [
    gpxNode("rtept", { lon: "0", lat: "0" }, []),
    gpxNode("rtept", { lon: "0.01", lat: "0" }, []),
  ]);

  expect(parseGpx("<gpx/>", () => gpxDocument(gpxNode("gpx", {}, [route]))).points).toEqual([
    { lon: 0, lat: 0 },
    { lon: 0.01, lat: 0 },
  ]);
  const invalid = gpxNode("gpx", {}, [gpxNode("rte", {}, [gpxNode("rtept", { lat: "0" }, [])])]);
  expect(() => parseGpx("<gpx/>", () => gpxDocument(invalid))).toThrow(
    "Every GPX point needs coordinates.",
  );
  expect(() => parseGpx("<html/>", () => gpxDocument(gpxNode("html", {}, [])))).toThrow(
    "Choose a valid GPX file.",
  );
  const malformed = gpxNode("gpx", {}, [gpxNode("parsererror", {}, [])]);
  expect(() => parseGpx("broken", () => gpxDocument(malformed))).toThrow(
    "Choose a valid GPX file.",
  );
});

test.each([null, "", "   "])("GPX missing or blank names use the fallback: %s", (name) => {
  const document = gpxDocument(
    gpxNode("gpx", {}, [
      gpxNode("name", {}, [], name),
      gpxNode("rte", {}, [
        gpxNode("rtept", { lon: "0", lat: "0" }, []),
        gpxNode("rtept", { lon: "0.01", lat: "0" }, []),
      ]),
    ]),
  );

  expect(parseGpx("<gpx/>", () => document).name).toBe("Imported route");
});
