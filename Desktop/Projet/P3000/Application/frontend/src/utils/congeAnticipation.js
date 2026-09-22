import dayjs from "dayjs";
import "dayjs/locale/fr";

dayjs.locale("fr");

export const formatCongeDate = (iso) => {
  if (!iso) return "";
  return dayjs(iso).format("D MMMM YYYY");
};

export const formatJoursConge = (value) => {
  if (value == null || value === "" || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const congeEnCoursText = (anticipation) => {
  const current = anticipation?.conge_en_cours;
  if (!current) return "Aucun congé en cours";
  const kind = (current.label || "payé").toLowerCase();
  const until = formatCongeDate(current.end);
  const rest = Number(current.jours_restants || 0);
  const restLabel =
    rest > 1 ? `${rest} jours restants` : rest === 1 ? "dernier jour" : "";
  return `Congé ${kind} en cours jusqu'au ${until}${restLabel ? ` (${restLabel})` : ""}`;
};

export const congeEpuisementText = (anticipation) => {
  if (!anticipation) return "";
  const poses = Number(anticipation.jours_poses_a_venir || 0);
  if (anticipation.statut === "epuise") {
    const reliquat = Number(anticipation.reliquat || 0);
    const base =
      reliquat > 0
        ? `Plus de jour de congé entier (${formatJoursConge(reliquat)} j restant).`
        : "Plus de congé disponible.";
    if (poses > 0 && anticipation.epuise_le) {
      return `${base} Les congés déjà posés ne sont pas couverts.`;
    }
    return base;
  }
  if (anticipation.epuise_le && anticipation.statut === "depasse") {
    const jusquau = anticipation.dernier_jour
      ? ` Le solde couvre encore jusqu'au ${formatCongeDate(anticipation.dernier_jour)}.`
      : "";
    return `Les congés déjà posés dépassent le solde à partir du ${formatCongeDate(anticipation.epuise_le)}.${jusquau}`;
  }
  if (anticipation.couvert_jusqu_au_reset) {
    return `Le solde couvre les congés jusqu'au ${anticipation.reset_le || "31 mai"}.`;
  }
  if (anticipation.dernier_jour) {
    const suite = poses > 0 ? `, dont ${poses} j déjà posés` : "";
    return `Plus de congé après le ${formatCongeDate(anticipation.dernier_jour)}${suite}.`;
  }
  return "";
};

export const countWeekdaysInclusive = (start, end) => {
  if (!start) return 0;
  let cursor = dayjs(start).startOf("day");
  const last = dayjs(end || start).startOf("day");
  if (last.isBefore(cursor, "day")) return 0;
  let count = 0;
  while (cursor.isBefore(last, "day") || cursor.isSame(last, "day")) {
    const dow = cursor.day();
    if (dow !== 0 && dow !== 6) count += 1;
    cursor = cursor.add(1, "day");
  }
  return count;
};
