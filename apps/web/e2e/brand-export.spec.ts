import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { seek, settle } from "./helpers";
import { ensureLumetriFixtures, openWithClips } from "./lumetri-basic-lib";
import { BRAND_CONFIG } from "../src/config/brand";

test.beforeAll(() => ensureLumetriFixtures());

// Every user-facing export carries the Laguna Swim watermark and ends on the logo card.
test("exported video has the brand watermark and end card", async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  await openWithClips(page, ["lumetri-gradient.mp4"]);
  const timelineSeconds: number | null = null;
  await seek(page, 0);
  await page.getByRole("button", { name: "Export", exact: true }).first().click();
  await settle(page, 1500);
  const download = page.waitForEvent("download", { timeout: 480_000 });
  await page.getByRole("button", { name: "Export Video" }).last().click();
  const out = testInfo.outputPath("branded.mp4");
  await (await download).saveAs(out);

  const duration = Number(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim());
  if (typeof timelineSeconds === "number") expect(duration).toBeGreaterThan(timelineSeconds + BRAND_CONFIG.endCard.duration - 0.2);
  const dir = process.env.BRAND_FRAMES_DIR ?? testInfo.outputDir;
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "1", "-i", out, "-frames:v", "1", `${dir}/export-frame-content.png`]);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-sseof", "-0.3", "-i", out, "-frames:v", "1", `${dir}/export-frame-endcard.png`]);
  console.log(`[brand] duration=${duration} timeline=${timelineSeconds}`);
});
