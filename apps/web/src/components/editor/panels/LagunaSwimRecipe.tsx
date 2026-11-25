import { useState } from "react";
import { Button } from "@openreel/ui";
import { Smartphone, Scissors, Captions, Stamp, Check, Loader2 } from "lucide-react";
import { AutoCutSilenceSection } from "../inspector/AutoCutSilenceSection";
import { AutoCaptionPanel } from "../inspector/AutoCaptionPanel";
import { useProjectStore } from "../../../stores/project-store";
import { toast } from "../../../stores/notification-store";
import {
  LAGUNA_CAPTION_LANGUAGE,
  LAGUNA_CAPTION_STYLE,
  LAGUNA_MIN_SILENCE,
  isVertical,
  makeVerticalLagunaSwim,
} from "../../../services/laguna-swim-style";

/** The four steps of "Estilo Laguna Swim", in Spanish, each one undoable. */
export function LagunaSwimRecipe({ clipId }: { clipId: string | undefined }) {
  const settings = useProjectStore((s) => s.project.settings);
  const vertical = isVertical(settings);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<"silence" | "captions" | null>(null);

  const makeVertical = async () => {
    setBusy(true);
    try {
      const result = await makeVerticalLagunaSwim();
      if (result.ok) toast.success("Video en vertical", "Formato 9:16 (1080×1920), listo para Reels y TikTok.");
      else toast.error("No se pudo pasar a vertical", result.error ?? "Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="laguna-swim-recipe">
      <p className="text-xs text-fg-2">
        Haz los pasos en orden. Cada paso se puede deshacer con ⌘Z / Ctrl+Z.
      </p>

      <section className="rounded-[8px] border border-border p-2.5 space-y-2">
        <h4 className="flex items-center gap-2 text-xs font-semibold"><Smartphone size={14} /> 1. Pasar a vertical (9:16)</h4>
        <p className="text-[11px] text-fg-muted">El video llena toda la pantalla del celular, sin barras negras.</p>
        {vertical ? (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-accent"><Check size={13} /> Ya está en vertical ({settings.width}×{settings.height})</p>
        ) : (
          <Button variant="secondary" className="h-7 text-xs" disabled={busy} onClick={makeVertical}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : null} Pasar a vertical
          </Button>
        )}
      </section>

      <section className="rounded-[8px] border border-border p-2.5 space-y-2">
        <h4 className="flex items-center gap-2 text-xs font-semibold"><Scissors size={14} /> 2. Quitar silencios</h4>
        <p className="text-[11px] text-fg-muted">Corta las pausas de más de {LAGUNA_MIN_SILENCE} s para que el video tenga ritmo.</p>
        {open === "silence" && clipId ? (
          <AutoCutSilenceSection key={clipId} clipId={clipId} initialSettings={{ minSilenceDuration: LAGUNA_MIN_SILENCE }} />
        ) : (
          <Button variant="secondary" className="h-7 text-xs" disabled={!clipId} onClick={() => setOpen("silence")}>Buscar silencios</Button>
        )}
      </section>

      <section className="rounded-[8px] border border-border p-2.5 space-y-2">
        <h4 className="flex items-center gap-2 text-xs font-semibold"><Captions size={14} /> 3. Subtítulos Laguna Swim</h4>
        <p className="text-[11px] text-fg-muted">Subtítulos automáticos en español, con tus colores y sin muletillas. Se generan en tu navegador, gratis.</p>
        {open === "captions" && clipId ? (
          <AutoCaptionPanel
            clipId={clipId}
            initialLanguage={LAGUNA_CAPTION_LANGUAGE}
            initialStyle={LAGUNA_CAPTION_STYLE}
            initialRemoveFillers
            referenceStyles
          />
        ) : (
          <Button variant="secondary" className="h-7 text-xs" disabled={!clipId} onClick={() => setOpen("captions")}>Crear subtítulos</Button>
        )}
      </section>

      <section className="rounded-[8px] border border-border p-2.5 space-y-1">
        <h4 className="flex items-center gap-2 text-xs font-semibold"><Stamp size={14} /> 4. Tu logo</h4>
        <p className="text-[11px] text-fg-muted">La marca de agua y la placa final con tu logo se agregan solas al exportar.</p>
      </section>

      {!clipId && <p className="text-xs text-fg-muted">Agrega un video a la línea de tiempo para empezar.</p>}
    </div>
  );
}
