/**
 * Visibilité agents selon périodes d'inactivité.
 * Règle : visible s'il existe au moins un jour actif dans [start, end]
 * (ex. inactif jusqu'au 31/08 → visible en semaine 36 car mardi = 01/09).
 * Fallback legacy : is_active / date_desactivation.
 */

function toDateStr(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value?.format === 'function') {
    return value.format('YYYY-MM-DD');
  }
  if (typeof value?.toDate === 'function') {
    return toDateStr(value.toDate());
  }
  return String(value).slice(0, 10);
}

/** True si la période d'inactivité couvre le jour donné (inclusif). */
export function periodeCouvreJour(periode, day) {
  const pStart = toDateStr(periode?.date_debut);
  const pEnd = periode?.date_fin ? toDateStr(periode.date_fin) : null;
  const d = toDateStr(day);
  if (!pStart || !d) return false;
  if (d < pStart) return false;
  if (pEnd && d > pEnd) return false;
  return true;
}

/** True si la période d'inactivité chevauche [rangeStart, rangeEnd] (dates inclusives). */
export function periodeChevaucheRange(periode, rangeStart, rangeEnd) {
  const pStart = toDateStr(periode?.date_debut);
  const pEnd = periode?.date_fin ? toDateStr(periode.date_fin) : null;
  const start = toDateStr(rangeStart);
  const end = toDateStr(rangeEnd);
  if (!pStart || !start || !end) return false;
  if (pStart > end) return false;
  if (pEnd && pEnd < start) return false;
  return true;
}

function isInactiveOnDay(periods, dayStr) {
  return periods.some((p) => periodeCouvreJour(p, dayStr));
}

/**
 * Agent visible sur la plage [start, end] ?
 * - Avec périodes : oui s'il existe au moins un jour non couvert par une inactivité
 * - Sinon fallback : is_active || date_desactivation >= start
 */
export function agentVisibleForRange(agent, rangeStart, rangeEnd) {
  if (!agent) return false;
  const start = toDateStr(rangeStart);
  const end = toDateStr(rangeEnd);
  if (!start || !end) {
    return agent.is_active === true || agent.is_active === undefined;
  }

  const periods = agent.periodes_inactivite;
  if (Array.isArray(periods) && periods.length > 0) {
    const cursor = new Date(`${start}T12:00:00`);
    const last = new Date(`${end}T12:00:00`);
    if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) {
      return false;
    }
    while (cursor <= last) {
      const dayStr = toDateStr(cursor);
      if (!isInactiveOnDay(periods, dayStr)) {
        return true;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  }

  if (agent.is_active === true || agent.is_active === undefined) return true;
  const dd = toDateStr(agent.date_desactivation);
  // Legacy : visible tant que la désactivation n'est pas antérieure au début de plage
  // et qu'il reste des jours après la désactivation dans la plage n'est pas modélisé ;
  // avec périodes backfillées, ce chemin est rare.
  if (dd && dd >= start && dd <= end) {
    // Désactivé en cours de plage → encore présent une partie de la plage
    return true;
  }
  if (dd && dd > end) return true;
  return false;
}

/** Bornes d'un mois calendaire YYYY-MM ou month/year. */
export function monthRangeBounds(monthOrKey, year) {
  let y;
  let m;
  if (typeof monthOrKey === 'string' && monthOrKey.includes('-')) {
    const [ys, ms] = monthOrKey.split('-');
    y = Number(ys);
    m = Number(ms);
  } else {
    y = Number(year);
    m = Number(monthOrKey);
  }
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/** Libellé courte d'une période pour l'UI. */
export function formatPeriodeInactivite(periode) {
  if (!periode?.date_debut) return '';
  const debut = new Date(periode.date_debut).toLocaleDateString('fr-FR');
  if (!periode.date_fin) return `depuis le ${debut}`;
  const fin = new Date(periode.date_fin).toLocaleDateString('fr-FR');
  return `du ${debut} au ${fin}`;
}
