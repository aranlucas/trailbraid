import { z } from "zod/mini";
import type { RoutePoint } from "@/route";

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

export const RoutePointsSchema = z
  .array(RoutePointSchema, { error: POINT_COUNT })
  .check(z.minLength(2, { error: POINT_COUNT }), z.maxLength(MAX_POINTS, { error: POINT_COUNT }));

// Untrusted route imports are validated immediately by the schema at this boundary.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function validatePoints(values: unknown): RoutePoint[] {
  const result = RoutePointsSchema.safeParse(values);

  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }

  return result.data;
}
