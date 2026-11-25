import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { settle } from "./helpers";
import { ensureLumetriFixtures, openWithClips } from "./lumetri-basic-lib";

test.beforeAll(() => ensureLumetriFixtures());

// "Promo Laguna Swim": vertical first, then the example texts land on the timeline and in the exported file.
test("Promo Laguna Swim places the promo texts and exports them", async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  await openWithClips(page, ["lumetri-gradient.mp4", "lumetri-flat.mp4", "lumetri-cool.mp4", "lumetri-warm.mp4"]);
  await page.evaluate(() => (window as any).__openreelE2E.workspace.getState().setSection("recipes"));
  await settle(page, 800);
  await page.locator("article", { hasText: "Estilo Laguna Swim" }).getByRole("button", { name: "Run" }).click();
  await page.getByTestId("laguna-swim-recipe").getByRole("button", { name: "Pasar a vertical" }).click();
  await expect(page.getByText("Ya está en vertical (1080×1920)")).toBeVisible();
  await page.getByRole("button", { name: "All recipes" }).click();
  await page.locator("article", { hasText: "Promo Laguna Swim" }).getByRole("button", { name: "Run" }).click();
  const form = page.getByTestId("laguna-promo-recipe");
  await form.getByRole("button", { name: "Usar ejemplo" }).click();
  await form.getByRole("button", { name: "Crear promo" }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__openreelE2E.project.getState().project.textClips?.length ?? 0)).toBe(6);

  await page.getByRole("button", { name: "Export", exact: true }).first().click();
  await settle(page, 1500);
  const download = page.waitForEvent("download", { timeout: 480_000 });
  await page.getByRole("button", { name: "Export Video" }).last().click();
  const out = testInfo.outputPath("promo.mp4");
  await (await download).saveAs(out);
  const dir = process.env.PROMO_FRAMES_DIR ?? testInfo.outputDir;
  for (const [name, t] of [["1-titulo", 1], ["2-beneficio", 3.6], ["3-cierre", 6.5], ["4-logo", 9.5]] as const)
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(t), "-i", out, "-frames:v", "1", "-vf", "scale=360:-1", `${dir}/promo-${name}.png`]);
});
