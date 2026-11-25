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
 * Switch the sequence to 1080×1920 and make every picture clip fill the frame (cover), so a horizontal recording
 * becomes a full-screen vertical video instead of a small strip with black bars.
 */
export async function makeVerticalLagunaSwim(): Promise<{ ok: boolean; clips: number; error?: string }> {
  const store = useProjectStore.getState();
  const result = await store.updateSettings({ ...LAGUNA_VERTICAL });
  if (!result.success) return { ok: false, clips: 0, error: result.error?.message ?? "No se pudo cambiar el formato." };
  const ids = visualClipIds(useProjectStore.getState().project);
  for (const id of ids) await useProjectStore.getState().updateClipTransform(id, { fitMode: "cover" });
  return { ok: true, clips: ids.length };
}
