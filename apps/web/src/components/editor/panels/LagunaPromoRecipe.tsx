import { useState } from "react";
import { Button, Input } from "@openreel/ui";
import { Loader2 } from "lucide-react";
import { useProjectStore } from "../../../stores/project-store";
import { toast } from "../../../stores/notification-store";
import { MIN_PROMO_SECONDS, applyPromo, planPromo, type PromoTexts } from "../../../services/laguna-swim-promo";

const EXAMPLE: PromoTexts = {
  title: "¡Aprende a nadar con Laguna Swim!",
  points: ["Clases para bebés, niños y adultos", "Grupos reducidos", "Instructores certificados"],
  offer: "Inscripción GRATIS este mes",
  contact: "WhatsApp: 000 000 0000",
};

/** Form for "Promo Laguna Swim": the owner writes the texts, the timeline gets them placed and animated. */
export function LagunaPromoRecipe() {
  const [texts, setTexts] = useState<PromoTexts>({ title: "", points: ["", "", ""], offer: "", contact: "" });
  const [busy, setBusy] = useState(false);
  const duration = useProjectStore((s) =>
    s.project.timeline.tracks.flatMap((t) => t.clips).reduce((end, c) => Math.max(end, c.startTime + c.duration), 0),
  );
  const planned = planPromo(texts, duration).length;
  const set = (patch: Partial<PromoTexts>) => setTexts((t) => ({ ...t, ...patch }));
  const setPoint = (i: number, value: string) => setTexts((t) => ({ ...t, points: t.points.map((p, j) => (j === i ? value : p)) }));

  const create = async () => {
    setBusy(true);
    try {
      const added = await applyPromo(texts);
      if (added) toast.success("Promo lista", `Se agregaron ${added} textos. Revísalos y exporta.`);
      else toast.error("No se agregaron textos", "Revisa que haya video en la línea de tiempo.");
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-fg-2">{label}</span>
      <Input aria-label={label} className="h-8 text-xs" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );

  return (
    <div className="space-y-3" data-testid="laguna-promo-recipe">
      <p className="text-xs text-fg-2">
        Pon tus clips en la línea de tiempo, escribe tus textos y toca «Crear promo». Los textos se acomodan solos:
        título al inicio, beneficios en medio y tu promoción con contacto al final.
      </p>
      {field("Título", texts.title, (v) => set({ title: v }), EXAMPLE.title)}
      {texts.points.map((p, i) => (
        <div key={i}>{field(`Beneficio ${i + 1}`, p, (v) => setPoint(i, v), EXAMPLE.points[i])}</div>
      ))}
      {field("Promoción", texts.offer, (v) => set({ offer: v }), EXAMPLE.offer)}
      {field("Contacto", texts.contact, (v) => set({ contact: v }), EXAMPLE.contact)}
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="h-8 text-xs" disabled={busy || planned === 0} onClick={create}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : null} Crear promo
        </Button>
        <Button variant="ghost" className="h-8 text-xs" disabled={busy} onClick={() => setTexts({ ...EXAMPLE, points: [...EXAMPLE.points] })}>
          Usar ejemplo
        </Button>
      </div>
      {duration < MIN_PROMO_SECONDS && (
        <p className="text-[11px] text-fg-muted">Agrega al menos {MIN_PROMO_SECONDS} segundos de video para crear la promo.</p>
      )}
      <p className="text-[11px] text-fg-muted">
        Consejo: haz primero «Estilo Laguna Swim» para pasar a vertical. Tu logo y la marca de agua se agregan al exportar.
      </p>
    </div>
  );
}
