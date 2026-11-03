import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";
import App from "@/app";

test("server rendering uses the initial atlas snapshot without browser storage", () => {
  const markup = renderToString(createElement(App));
  expect(markup).toContain("Trailbraid");
  expect(markup).toContain("Fern Loop");
  expect(markup).toContain("Ridge Traverse");
  expect(markup).toContain("Saved atlas was unreadable");
});
