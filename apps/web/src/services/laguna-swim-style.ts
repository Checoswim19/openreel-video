/**
 * "Estilo Laguna Swim": the house look for Reels / TikTok / Shorts.
 * The steps are run from the recipe card (WorkspaceRecipesPanel → LagunaSwimRecipe).
 */
import type { Project } from "@openreel/core";
import { useProjectStore } from "../stores/project-store";

export const LAGUNA_VERTICAL = { width: 1080, height: 1920 } as const;
export const LAGUNA_CAPTION_STYLE = "laguna-swim";
export const LAGUNA_CAPTION_LANGUAGE = "es";
/** Pauses longer than this are cut. Short enough to keep the pace of a Reel, long enough to keep a natural breath. */
export const LAGUNA_MIN_SILENCE = 0.5;

export function isVertical(settings: Pick<Project["settings"], "width" | "height">): boolean {
  return settings.height > settings.width;
}

/** Ids of the timeline clips that show picture (video or image media). */
export function visualClipIds(project: Pick<Project, "timeline" | "mediaLibrary">): string[] {
  const visual = new Set(
    project.mediaLibrary.items.filter((m) => m.type === "video" || m.type === "image").map((m) => m.id),
  );
  return project.timeline.tracks.flatMap((t) => t.clips).filter((c) => visual.has(c.mediaId)).map((c) => c.id);
}

/**
 * How a clip should sit in a vertical frame: upright footage fills it (cover); horizontal footage is shown whole
 * (contain) over a blurred copy of itself, because cropping a landscape shot to 9:16 keeps only a third of it.
 */
export function verticalFitFor(width: number, height: number): "cover" | "contain" {
  return width > 0 && height > 0 && width > height * 1.05 ? "contain" : "cover";
}

/**
 * Switch the sequence to 1080×1920. Upright clips fill the frame; horizontal clips are shown whole over a blurred
 * background, so nobody at the edges of a landscape shot gets cut off.
 */
export async function makeVerticalLagunaSwim(): Promise<{ ok: boolean; clips: number; error?: string }> {
  const store = useProjectStore.getState();
  const result = await store.updateSettings({ ...LAGUNA_VERTICAL });
  if (!result.success) return { ok: false, clips: 0, error: result.error?.message ?? "No se pudo cambiar el formato." };
  const { project } = useProjectStore.getState();
  const ids = visualClipIds(project);
  let horizontal = 0;
  for (const id of ids) {
    const clip = project.timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === id);
    const meta = project.mediaLibrary.items.find((m) => m.id === clip?.mediaId)?.metadata;
    const fitMode = verticalFitFor(meta?.width ?? 0, meta?.height ?? 0);
    if (fitMode === "contain") horizontal++;
    await useProjectStore.getState().updateClipTransform(id, { fitMode });
  }
  if (horizontal) await useProjectStore.getState().setCanvasBackground("blur", project.timeline.layoutBackgroundColor);
  return { ok: true, clips: ids.length };
}
