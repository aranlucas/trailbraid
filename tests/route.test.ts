import test from "node:test";
import assert from "node:assert/strict";
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
  assert.ok(Math.abs(s.distance - 2.2239) < 0.001);
  assert.equal(s.ascent, 20);
  assert.equal(s.descent, 10);
});
test("selection interpolates partial edges, including ascent", () => {
  const half = samples(points)[1].km / 2;
  const s = summary(points, half, half * 2);
  assert.ok(Math.abs(s.distance - half) < 1e-10);
  assert.ok(Math.abs(s.ascent! - 10) < 1e-10);
});
test("segment gaps never add distance or elevation", () => {
  const data = [...points, { lon: 120, lat: 40, ele: 1000, breakBefore: true }];
  assert.equal(summary(data).distance, summary(points).distance);
  assert.equal(summary(data).ascent, 20);
});
test("missing elevation remains unknown", () => {
  assert.equal(
    summary([
      { lon: 0, lat: 0 },
      { lon: 0.01, lat: 0, ele: 30 },
    ]).ascent,
    null,
  );
});
test("duplicates do not divide by zero", () => {
  const s = summary([points[0], points[0], points[1]]);
  assert.ok(Number.isFinite(s.maxGrade));
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
  assert.ok(summary(r.points).distance < 30);
  assert.ok(Math.abs(unwrap(r.points)[1].lon - 180.1) < 1e-6);
  assert.match(mapPaths([r])[0].path, /M.+L/);
});
test("validation rejects NaN, out-of-world coordinates and too few points", () => {
  assert.throws(() => validatePoints([{ lon: 181, lat: 0 }, points[0]]));
  assert.throws(() => validatePoints([{ lon: NaN, lat: 0 }, points[0]]));
  assert.throws(() => validatePoints([points[0]]));
});
test("restore accepts empty atlas, validates imported points and catches corrupt schemas", () => {
  assert.deepEqual(restore('{"version":1,"routes":[]}'), []);
  assert.throws(() => restore("broken"));
  assert.throws(() => restore('{"version":2,"routes":[]}'));
  assert.equal(restore(null).length, 2);
});
test("parser refuses entity declarations before XML parsing", () => {
  assert.throws(
    () =>
      parseGpx("<!DOCTYPE gpx []>", () => {
        throw new Error("should not parse");
      }),
    /DTD/,
  );
});
test("synthetic routes have truthful measured totals", () => {
  for (const [i, r] of seedRoutes().entries()) {
    assert.ok(Math.abs(summary(r.points).distance - [8.2, 10.6][i]) < 0.01);
    assert.equal(summary(r.points).ascent, [410, 620][i]);
  }
});
