import { expect, test } from "vitest";
import { parseGpx } from "@/gpx";
import { summary } from "@/route";
import { gpxDocument, gpxNode } from "@test/helpers/gpx";

test("parser refuses entity declarations before XML parsing", () => {
  expect(() =>
    parseGpx("<!DOCTYPE gpx []>", () => {
      throw new Error("should not parse");
    }),
  ).toThrow(/DTD/);
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

test.each([null, "   "])("GPX missing or blank names use the fallback: %s", (name) => {
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
