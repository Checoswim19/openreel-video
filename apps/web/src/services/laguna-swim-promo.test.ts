import { describe, expect, it, vi } from "vitest";
vi.mock("../stores/project-store", () => ({ useProjectStore: { getState: () => ({}) } }));
vi.mock("../stores/project/insert-timeline-overlay", () => ({ insertTimelineOverlay: vi.fn() }));
import { planPromo, promoStyle, wrapPromoText } from "./laguna-swim-promo";

const texts = { title: "Aprende a nadar", points: ["Bebés", "Niños", "Adultos"], offer: "Inscripción gratis", contact: "WhatsApp 123" };

describe("planPromo", () => {
  it("title first, points in the middle, offer + contact over the last 4 s", () => {
    const plan = planPromo(texts, 20);
    expect(plan.map((p) => p.role)).toEqual(["title", "point", "point", "point", "offer", "contact"]);
    expect(plan[0]).toMatchObject({ start: 0, duration: 3 });
    expect(plan[1].start).toBe(3);
    const last = plan[3];
    expect(last.start + last.duration).toBeCloseTo(16);
    expect(plan[4]).toMatchObject({ start: 16, duration: 4 });
    expect(plan[5]).toMatchObject({ start: 16, duration: 4 });
  });

  it("never overlaps the closing with the points and stays inside the video", () => {
    for (const d of [6, 8, 12, 45]) {
      const plan = planPromo(texts, d);
      const closing = plan.find((p) => p.role === "offer")!;
      for (const p of plan) {
        expect(p.start).toBeGreaterThanOrEqual(0);
        expect(p.start + p.duration).toBeLessThanOrEqual(d + 1e-9);
        if (p.role === "point") expect(p.start + p.duration).toBeLessThanOrEqual(closing.start + 1e-9);
      }
    }
  });

  it("skips blank fields and refuses videos that are too short", () => {
    expect(planPromo({ title: " ", points: ["", "Solo uno"], offer: "", contact: "" }, 10).map((p) => p.role)).toEqual(["point"]);
    expect(planPromo(texts, 4)).toEqual([]);
  });

  it("sizes text from the frame height", () => {
    const [title] = planPromo(texts, 20);
    expect(promoStyle(title, 1920).fontSize).toBe(96);
  });
});

describe("wrapPromoText", () => {
  it("splits a long title so every line fits a vertical frame", () => {
    const wrapped = wrapPromoText("¡Aprende a nadar con Laguna Swim!", 96, 1080);
    const lines = wrapped.split("\n");
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(l.length * 96 * 0.58).toBeLessThanOrEqual(1080 * 0.86);
    expect(lines.join(" ")).toBe("¡Aprende a nadar con Laguna Swim!");
  });
  it("keeps short text on one line", () => {
    expect(wrapPromoText("Grupos reducidos", 73, 1080)).toBe("Grupos reducidos");
  });
});
