/**
 * Brand overlay for exported videos: a watermark burned into every frame and an end card
 * (logo on a solid background) appended after the last frame of the timeline.
 *
 * The overlay is passed per export run (ExportVideoOptions.brand), so internal renders such as
 * linked compositions and motion frames are never branded — only the videos people deliver.
 */

export type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

export interface BrandWatermark {
  /** The watermark image (a transparent PNG/SVG logo works best). */
  image: CanvasImageSource & { width: number; height: number };
  position: WatermarkPosition;
  /** 0–1. */
  opacity: number;
  /** Watermark width as a fraction of the frame's shorter side (0.18 = 18%). */
  scale: number;
  /** Gap from the frame edge as a fraction of the frame's shorter side. */
  margin: number;
  /** Optional CSS colour of a soft halo behind the watermark, so a dark logo stays readable on dark or busy footage. */
  glow?: string;
}

export interface BrandEndCard {
  /** The logo shown centred on the end card. */
  image: CanvasImageSource & { width: number; height: number };
  /** Seconds the end card stays on screen. */
  duration: number;
  /** CSS colour behind the logo. */
  background: string;
  /** Logo width as a fraction of the frame's shorter side. */
  scale: number;
  /** Seconds of fade-in at the start of the card (0 for a hard cut). */
  fadeIn: number;
}

export interface BrandOverlay {
  watermark?: BrandWatermark;
  endCard?: BrandEndCard;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Size an image to `scale` × the frame's shorter side, keeping its aspect ratio and fitting inside the frame. */
export function fitImage(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  scale: number,
): { width: number; height: number } {
  const aspect = imageWidth > 0 && imageHeight > 0 ? imageWidth / imageHeight : 1;
  let width = Math.max(1, Math.min(frameWidth, frameHeight) * scale);
  let height = width / aspect;
  if (height > frameHeight * 0.9) {
    height = frameHeight * 0.9;
    width = height * aspect;
  }
  if (width > frameWidth * 0.9) {
    width = frameWidth * 0.9;
    height = width / aspect;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

export function watermarkRect(watermark: Pick<BrandWatermark, "position" | "scale" | "margin">, imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number): Rect {
  const { width, height } = fitImage(imageWidth, imageHeight, frameWidth, frameHeight, watermark.scale);
  const margin = Math.round(Math.min(frameWidth, frameHeight) * watermark.margin);
  const left = margin;
  const right = frameWidth - margin - width;
  const top = margin;
  const bottom = frameHeight - margin - height;
  switch (watermark.position) {
    case "top-left": return { x: left, y: top, width, height };
    case "top-right": return { x: right, y: top, width, height };
    case "bottom-left": return { x: left, y: bottom, width, height };
    case "center": return { x: Math.round((frameWidth - width) / 2), y: Math.round((frameHeight - height) / 2), width, height };
    case "bottom-right":
    default: return { x: right, y: bottom, width, height };
  }
}

export function endCardLogoRect(endCard: Pick<BrandEndCard, "scale">, imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number): Rect {
  const { width, height } = fitImage(imageWidth, imageHeight, frameWidth, frameHeight, endCard.scale);
  return { x: Math.round((frameWidth - width) / 2), y: Math.round((frameHeight - height) / 2), width, height };
}

/** Number of end-card frames to append at `frameRate`. */
export function endCardFrameCount(brand: BrandOverlay | undefined, frameRate: number): number {
  const duration = brand?.endCard?.duration ?? 0;
  if (!(duration > 0) || !(frameRate > 0)) return 0;
  return Math.max(1, Math.round(duration * frameRate));
}

export function hasBrandOverlay(brand: BrandOverlay | undefined): brand is BrandOverlay {
  return !!brand && (!!brand.watermark || endCardFrameCount(brand, 30) > 0);
}

/** Opacity of the end-card logo `secondsIntoCard` after the card starts. */
export function endCardFade(endCard: Pick<BrandEndCard, "fadeIn">, secondsIntoCard: number): number {
  if (!(endCard.fadeIn > 0)) return 1;
  return Math.max(0, Math.min(1, secondsIntoCard / endCard.fadeIn));
}

/** Draw the watermark over a rendered frame. Consumes `frame` and returns a new bitmap. */
export async function applyWatermark(frame: ImageBitmap, watermark: BrandWatermark): Promise<ImageBitmap> {
  const { width, height } = frame;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return frame;
  ctx.drawImage(frame, 0, 0);
  frame.close();
  const rect = watermarkRect(watermark, watermark.image.width, watermark.image.height, width, height);
  ctx.globalAlpha = Math.max(0, Math.min(1, watermark.opacity));
  if (watermark.glow) {
    ctx.shadowColor = watermark.glow;
    ctx.shadowBlur = Math.max(2, Math.round(rect.height * 0.06));
    // Two passes build a denser halo than one blur alone.
    ctx.drawImage(watermark.image, rect.x, rect.y, rect.width, rect.height);
  }
  ctx.drawImage(watermark.image, rect.x, rect.y, rect.width, rect.height);
  return canvas.transferToImageBitmap();
}

/** Render one end-card frame: the logo centred on the card background. */
export async function renderEndCardFrame(width: number, height: number, endCard: BrandEndCard, secondsIntoCard: number): Promise<ImageBitmap> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = endCard.background;
  ctx.fillRect(0, 0, width, height);
  const rect = endCardLogoRect(endCard, endCard.image.width, endCard.image.height, width, height);
  ctx.globalAlpha = endCardFade(endCard, secondsIntoCard);
  ctx.drawImage(endCard.image, rect.x, rect.y, rect.width, rect.height);
  return canvas.transferToImageBitmap();
}
