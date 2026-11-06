import { expect, test } from "vitest";
import { restore, seedRoutes } from "@/atlas-data";
import { summary } from "@/route";

const points = [
  { lon: 0, lat: 0, ele: 10 },
  { lon: 0.01, lat: 0, ele: 30 },
  { lon: 0.02, lat: 0, ele: 20 },
];

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

test("synthetic routes have truthful measured totals", () => {
  for (const [i, r] of seedRoutes().entries()) {
    expect(Math.abs(summary(r.points).distance - [8.2, 10.6][i])).toBeLessThan(0.01);
    expect(summary(r.points).ascent).toBe([410, 620][i]);
  }
});
