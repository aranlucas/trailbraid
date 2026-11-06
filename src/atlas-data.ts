import { z } from "zod/mini";
import { summary } from "@/route";
import type { Route, RoutePoint } from "@/route";
import { RoutePointsSchema } from "@/route-validation";

export const COLORS = ["#24624c", "#c16b39", "#5868a1", "#a33f64"];

export const MAX_ROUTES = COLORS.length;

const ATLAS_VERSION = 1;

const SavedAtlasSchema = z.object({
  version: z.literal(ATLAS_VERSION),
  routes: z
    .array(z.object({ id: z.string(), name: z.string(), points: RoutePointsSchema }))
    .check(z.maxLength(MAX_ROUTES)),
});

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

export function serializeAtlas(routes: Route[]): string {
  return JSON.stringify({ version: ATLAS_VERSION, routes });
}
