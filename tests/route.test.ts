import { expect, test } from "vitest";
import {
  mapPaths,
  restore,
  samples,
  seedRoutes,
  summary,
  unwrap,
  validatePoints,
  parseGpx,
} from "../src/route.ts";

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
  expect(() => validatePoints([{ lon: NaN, lat: 0 }, points[0]])).toThrow();
  expect(() => validatePoints([points[0]])).toThrow("A route needs 2–20,000 points.");
  expect(() => validatePoints([{ lon: 0, lat: 0, ele: 30_000 }, points[0]])).toThrow(/Elevation/);
  expect(() => validatePoints(["x", points[0]])).toThrow("Invalid route point.");
  expect(validatePoints([{ ...points[0], extra: 1 }, points[1]])[0]).toEqual(points[0]);
});

test("restore accepts empty atlas, validates imported points and catches corrupt schemas", () => {
  expect(restore('{"version":1,"routes":[]}')).toEqual([]);
  expect(() => restore("broken")).toThrow();
  expect(() => restore('{"version":2,"routes":[]}')).toThrow();
  expect(restore(null)).toHaveLength(2);
  expect(() =>
    restore(JSON.stringify({ version: 1, routes: [{ id: 1, name: "x", points }] })),
  ).toThrow();
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
