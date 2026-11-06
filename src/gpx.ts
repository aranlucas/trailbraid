import type { Route, RoutePoint } from "@/route";
import { MAX_POINTS, validatePoints } from "@/route-validation";

export const MAX_GPX_BYTES = 5_000_000;

export type ImportedRoute = Pick<Route, "name" | "points">;

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
  if (text.length > MAX_GPX_BYTES) {
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
