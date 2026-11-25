import { test, expect } from "@playwright/test";
import { settle } from "./helpers";
import { ensureLumetriFixtures, openWithClips } from "./lumetri-basic-lib";

test.beforeAll(() => ensureLumetriFixtures());

// "Estilo Laguna Swim": the recipe makes the sequence 9:16 with every picture clip filling the frame,
// and opens captions preset to Spanish with the Laguna Swim caption style.
test("Estilo Laguna Swim recipe: vertical + brand captions", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const [clipId] = await openWithClips(page, ["lumetri-gradient.mp4"]);
  await page.evaluate(() => (window as any).__openreelE2E.workspace.getState().setSection("recipes"));
  await settle(page, 800);
  const card = page.locator("article", { hasText: "Estilo Laguna Swim" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Run" }).click();
  const recipe = page.getByTestId("laguna-swim-recipe");
  await expect(recipe).toBeVisible();
  await recipe.getByRole("button", { name: "Pasar a vertical" }).click();
  await expect(recipe.getByText("Ya está en vertical (1080×1920)")).toBeVisible();
  const state = await page.evaluate((id) => {
    const s = (window as any).__openreelE2E.project.getState();
    const clip = s.project.timeline.tracks.flatMap((t: any) => t.clips).find((c: any) => c.id === id);
    return { w: s.project.settings.width, h: s.project.settings.height, fit: clip?.transform?.fitMode };
  }, clipId);
  expect(state).toEqual({ w: 1080, h: 1920, fit: "cover" });
  await recipe.getByRole("button", { name: "Crear subtítulos" }).click();
  await expect(page.getByRole("radio", { name: "Laguna Swim caption style" })).toHaveAttribute("aria-checked", "true");
  await recipe.screenshot({ path: process.env.LAGUNA_SHOT ?? testInfo.outputPath("recipe.png") });
  await page.screenshot({ path: (process.env.LAGUNA_SHOT ?? testInfo.outputPath("recipe.png")).replace(".png", "-full.png") });
});
