import { describe, expect, it } from "vitest";
import { endCardFade, endCardFrameCount, endCardLogoRect, fitImage, hasBrandOverlay, watermarkRect } from "./brand-overlay";

describe("brand overlay layout", () => {
  it("sizes the watermark from the frame's shorter side, keeping aspect", () => {
    expect(fitImage(1200, 400, 1920, 1080, 0.2)).toEqual({ width: 216, height: 72 });
    expect(fitImage(1200, 400, 1080, 1920, 0.2)).toEqual({ width: 216, height: 72 });
  });

  it("places the watermark in each corner with the margin", () => {
    const wm = { scale: 0.2, margin: 0.05 };
    expect(watermarkRect({ ...wm, position: "bottom-right" }, 1200, 400, 1920, 1080)).toEqual({ x: 1920 - 54 - 216, y: 1080 - 54 - 72, width: 216, height: 72 });
    expect(watermarkRect({ ...wm, position: "top-left" }, 1200, 400, 1920, 1080)).toEqual({ x: 54, y: 54, width: 216, height: 72 });
  });

  it("keeps an oversized end-card logo inside the frame and centred", () => {
    const rect = endCardLogoRect({ scale: 3 }, 1000, 1000, 1920, 1080);
    expect(rect.height).toBeLessThanOrEqual(1080 * 0.9);
    expect(rect.x * 2 + rect.width).toBe(1920);
  });

  it("counts end-card frames and fades in", () => {
    const card = { image: {} as never, duration: 2.5, background: "#000", scale: 0.5, fadeIn: 0.5 };
    expect(endCardFrameCount({ endCard: card }, 30)).toBe(75);
    expect(endCardFrameCount({}, 30)).toBe(0);
    expect(endCardFade(card, 0.25)).toBe(0.5);
    expect(endCardFade(card, 2)).toBe(1);
    expect(hasBrandOverlay({})).toBe(false);
    expect(hasBrandOverlay({ endCard: card })).toBe(true);
  });
});
