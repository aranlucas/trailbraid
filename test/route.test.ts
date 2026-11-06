import { expect, test } from "vitest";
import { elevationPath, mapPaths, samples, summary, unwrap } from "@/route";

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
    )
      .trim()
      .split(/\s+/),
  ).toEqual(["M0,1", "L2,2", "M6,3", "M8,4", "L10,5"]);
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
