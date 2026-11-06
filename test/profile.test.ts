import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Profile } from "@/atlas";

test("distance axis stays bounded for a long valid route", () => {
  const markup = renderToStaticMarkup(
    createElement(Profile, {
      route: {
        id: "long",
        name: "Long route",
        color: "#000",
        points: [
          { lon: 0, lat: 0, ele: 0 },
          { lon: 9, lat: 0, ele: 100 },
        ],
      },
      from: 0,
      to: 1000,
      maximum: 1000,
    }),
  );

  // Three elevation labels plus at most eleven kilometre labels.
  expect(markup.match(/<text /g)?.length).toBeLessThanOrEqual(14);
  expect(markup).toContain(">1000</text>");
});
