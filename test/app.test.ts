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

test("atlas controls explicitly use non-submit buttons", () => {
  const markup = renderToString(createElement(App));
  const buttons = markup.match(/<button\b[^>]*>/g) ?? [];

  expect(buttons.length).toBeGreaterThan(0);
  expect(buttons.every((button) => button.includes('type="button"'))).toBe(true);
});
