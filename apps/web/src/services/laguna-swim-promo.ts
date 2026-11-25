/**
 * "Promo Laguna Swim": lays the owner's promo texts over their own class footage.
 *   opening title → selling points one after another → closing offer + contact.
 * The logo end card and watermark are added at export (config/brand.ts), so they are not placed here.
 */
import type { TextAnimationPreset, TextStyle } from "@openreel/core";
import { useProjectStore } from "../stores/project-store";
import { insertTimelineOverlay } from "../stores/project/insert-timeline-overlay";

export interface PromoTexts {
  title: string;
  points: string[];
  offer: string;
  contact: string;
}

export interface PlannedText {
  role: "title" | "point" | "offer" | "contact";
  text: string;
  start: number;
  duration: number;
  /** Normalized 0–1 vertical centre. */
  y: number;
  /** Font size as a fraction of the frame height. */
  size: number;
  animation: TextAnimationPreset;
}

export const LAGUNA_NAVY = "#0d3b7a";
export const LAGUNA_BLUE = "#29a3e3";
export const MIN_PROMO_SECONDS = 6;

const TITLE_SECONDS = 3;
const CLOSING_SECONDS = 4;

/** Where each text goes on a timeline of `duration` seconds. Blank texts are skipped. */
export function planPromo(texts: PromoTexts, duration: number): PlannedText[] {
  const plan: PlannedText[] = [];
  if (!(duration >= MIN_PROMO_SECONDS)) return plan;
  const title = texts.title.trim();
  const points = texts.points.map((p) => p.trim()).filter(Boolean);
  const offer = texts.offer.trim();
  const contact = texts.contact.trim();
  const hasClosing = !!(offer || contact);

  const titleEnd = title ? Math.min(TITLE_SECONDS, duration * 0.3) : 0;
  const closingStart = hasClosing ? Math.max(titleEnd, duration - Math.min(CLOSING_SECONDS, duration * 0.35)) : duration;

  if (title) plan.push({ role: "title", text: title, start: 0, duration: titleEnd, y: 0.2, size: 0.05, animation: "pop" });
  if (points.length) {
    const slot = (closingStart - titleEnd) / points.length;
    points.forEach((text, i) => {
      if (slot <= 0.4) return;
      plan.push({ role: "point", text, start: titleEnd + i * slot, duration: slot, y: 0.76, size: 0.038, animation: "slide-up" });
    });
  }
  if (offer) plan.push({ role: "offer", text: offer, start: closingStart, duration: duration - closingStart, y: 0.42, size: 0.048, animation: "scale" });
  if (contact) plan.push({ role: "contact", text: contact, start: closingStart, duration: duration - closingStart, y: 0.58, size: 0.034, animation: "fade" });
  return plan;
}

export function promoStyle(item: PlannedText, frameHeight: number): Partial<TextStyle> {
  const fontSize = Math.round(frameHeight * item.size);
  const boxed = item.role === "title" || item.role === "offer";
  return {
    fontFamily: "Inter",
    fontSize,
    fontWeight: item.role === "contact" ? 600 : 800,
    color: "#ffffff",
    backgroundColor: boxed ? LAGUNA_NAVY : item.role === "point" ? "rgba(13, 59, 122, 0.85)" : undefined,
    strokeColor: boxed || item.role === "point" ? undefined : LAGUNA_NAVY,
    strokeWidth: boxed || item.role === "point" ? 0 : Math.max(2, Math.round(fontSize / 10)),
    textAlign: "center",
    verticalAlign: "middle",
    lineHeight: 1.15,
  };
}

/**
 * Break `text` into lines that fit `frameWidth` at `fontSize` (bold Inter is about 0.58 em per character),
 * leaving a 7% margin each side so nothing runs off a vertical frame.
 */
export function wrapPromoText(text: string, fontSize: number, frameWidth: number): string {
  const maxChars = Math.max(8, Math.floor((frameWidth * 0.86) / (fontSize * 0.58)));
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/)) {
    if (line && (line + " " + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

/** End of the last picture/audio clip on the timeline, in seconds. */
export function contentDuration(): number {
  const { project } = useProjectStore.getState();
  return project.timeline.tracks.flatMap((t) => t.clips).reduce((end, c) => Math.max(end, c.startTime + c.duration), 0);
}

/** Place every planned text on the timeline. Returns how many were added. */
export async function applyPromo(texts: PromoTexts): Promise<number> {
  const plan = planPromo(texts, contentDuration());
  const { width, height } = useProjectStore.getState().project.settings;
  let added = 0;
  for (const item of plan) {
    const style = promoStyle(item, height);
    const text = wrapPromoText(item.text, style.fontSize ?? 48, width);
    const created = await insertTimelineOverlay(item.start, item.duration, (trackId) =>
      useProjectStore.getState().createTextClip(trackId, item.start, text, item.duration, style),
    );
    if (!created) continue;
    const store = useProjectStore.getState();
    store.updateTextTransform(created.id, { position: { x: 0.5, y: item.y } });
    store.applyTextAnimationPreset(created.id, item.animation, Math.min(0.5, item.duration / 4));
    added++;
  }
  return added;
}
