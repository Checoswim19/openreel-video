/**
 * Laguna Swim branding for every exported video.
 *
 * To change the logo, replace the files in `public/brand/` (keep the same names) or point the paths below
 * at new ones. A transparent PNG or SVG works best for the watermark.
 */
import type { BrandOverlay, WatermarkPosition } from "@openreel/core";

export const BRAND_NAME = "Laguna Swim";

export const BRAND_CONFIG = {
  watermark: {
    enabled: true,
    /** Image burned into every frame. */
    src: "/brand/laguna-swim-logo.png",
    position: "bottom-right" as WatermarkPosition,
    /** 0 = invisible, 1 = solid. */
    opacity: 0.75,
    /** Width as a fraction of the video's shorter side. */
    scale: 0.18,
    /** Distance from the edge as a fraction of the video's shorter side. */
    margin: 0.04,
    /** Soft white halo so the blue logo stays visible over water. Set to undefined to turn it off. */
    glow: "rgba(255, 255, 255, 0.95)" as string | undefined,
  },
  endCard: {
    enabled: true,
    /** Logo shown at the end of every video. */
    src: "/brand/laguna-swim-logo.png",
    /** Seconds. */
    duration: 2.5,
    background: "#ffffff",
    /** Width as a fraction of the video's shorter side. */
    scale: 0.6,
    fadeIn: 0.5,
  },
} as const;

type BrandImage = ImageBitmap;

const imageCache = new Map<string, Promise<BrandImage>>();

/** Load an image (PNG/JPG/SVG) as a bitmap at a size large enough for 4K output. */
function loadBrandImage(src: string): Promise<BrandImage> {
  let cached = imageCache.get(src);
  if (!cached) {
    cached = new Promise<BrandImage>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // SVGs can report tiny intrinsic sizes; rasterise at up to 2048px wide for crisp output.
        const naturalW = img.naturalWidth || 1024;
        const naturalH = img.naturalHeight || 1024;
        const factor = Math.max(1, 2048 / naturalW);
        const canvas = new OffscreenCanvas(Math.round(naturalW * factor), Math.round(naturalH * factor));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not prepare the brand logo"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.transferToImageBitmap());
      };
      img.onerror = () => reject(new Error(`Could not load the brand logo at ${src}`));
      img.src = src;
    });
    cached.catch(() => imageCache.delete(src));
    imageCache.set(src, cached);
  }
  return cached;
}

/**
 * The brand overlay for a user-facing export, or undefined when branding is off or the logo failed to load
 * (an export is never blocked by a missing logo).
 */
export async function loadBrandOverlay(): Promise<BrandOverlay | undefined> {
  const { watermark, endCard } = BRAND_CONFIG;
  try {
    const overlay: BrandOverlay = {};
    if (watermark.enabled) {
      overlay.watermark = {
        image: await loadBrandImage(watermark.src),
        position: watermark.position,
        opacity: watermark.opacity,
        scale: watermark.scale,
        margin: watermark.margin,
        glow: watermark.glow,
      };
    }
    if (endCard.enabled) {
      overlay.endCard = {
        image: await loadBrandImage(endCard.src),
        duration: endCard.duration,
        background: endCard.background,
        scale: endCard.scale,
        fadeIn: endCard.fadeIn,
      };
    }
    return overlay.watermark || overlay.endCard ? overlay : undefined;
  } catch (error) {
    console.warn("[brand] logo unavailable; exporting without the brand overlay", error);
    return undefined;
  }
}
