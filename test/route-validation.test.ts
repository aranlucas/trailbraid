import { expect, test } from "vitest";
import { validatePoints } from "@/route-validation";

const points = [
  { lon: 0, lat: 0, ele: 10 },
  { lon: 0.01, lat: 0, ele: 30 },
  { lon: 0.02, lat: 0, ele: 20 },
];

test("validation rejects NaN, out-of-world coordinates and too few points", () => {
  expect(() => validatePoints([{ lon: 181, lat: 0 }, points[0]])).toThrow(/Coordinates/);
  expect(() => validatePoints([{ lon: NaN, lat: 0 }, points[0]])).toThrow(/Coordinates/);
  expect(() => validatePoints([points[0]])).toThrow("A route needs 2–20,000 points.");
  expect(() => validatePoints([{ lon: 0, lat: 0, ele: 30_000 }, points[0]])).toThrow(/Elevation/);
  expect(() => validatePoints(["x", points[0]])).toThrow("Invalid route point.");
  expect(validatePoints([{ ...points[0], extra: 1 }, points[1]])[0]).toEqual(points[0]);
});
