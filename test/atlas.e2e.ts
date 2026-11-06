import { readFile } from "node:fs/promises";
import { z } from "zod/mini";
import { expect } from "e2e";
import { test } from "@e2e-dev/web";

test("import, persist, remove, undo and export a GPX without losing a failed import", async ({
  app,
  browser,
  screen,
}) => {
  await app.open("/");
  const file = browser.locator('input[type="file"]');
  await file.setInputFiles("test/fixtures/walk.gpx");
  const walk = screen.getByRole("button", { name: /Fixture walk.*2.2 km.*20 m ascent/ });
  await expect(walk).toHaveAttribute("aria-pressed", "true");
  await browser.reload();
  await expect(walk).toBeVisible();
  await file.setInputFiles("test/fixtures/invalid.gpx");
  await expect(screen.getByRole("status")).toContainText("Every GPX point needs coordinates.");
  await expect(walk).toBeVisible();
  await screen.getByRole("button", { name: "Remove Fixture walk", exact: true }).tap();
  await expect(walk).toHaveCount(0);
  await screen.getByRole("button", { name: "Undo route change", exact: true }).tap();
  await expect(walk).toBeVisible();

  const download = await browser.waitForDownload(() =>
    screen.getByRole("button", { name: "Export notes", exact: true }).tap(),
  );

  const notes = z
    .object({
      routes: z.array(
        z.object({
          name: z.string(),
          distance: z.number(),
          ascent: z.nullable(z.number()),
          descent: z.nullable(z.number()),
        }),
      ),
    })
    .parse(JSON.parse(await readFile(download.absolutePath, "utf8")));

  expect(notes.routes).toHaveLength(3);
  expect(notes.routes[2]).toMatchObject({ name: "Fixture walk", ascent: 20, descent: 10 });
  expect(notes.routes[2].distance).toBeCloseTo(2.2239, 3);
  await browser.reload();
  await expect(walk).toBeVisible();
});
