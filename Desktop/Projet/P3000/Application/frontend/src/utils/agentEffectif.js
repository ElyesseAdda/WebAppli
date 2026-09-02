/**
 * Visibilité agents : contrats (carte agent) ou périodes d'inactivité (legacy).
 * Règle contrats : visible si la plage chevauche au moins un contrat (début inclus, fin CDD incluse).
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

/** True si l'agent a au moins un contrat avec date de début (nouveau système). */
export function agentUsesContratVisibility(agent) {
  return (
    Array.isArray(agent?.contrats) &&
    agent.contrats.some((c) => c.date_debut_contrat)
  );
}

/** Fin CDD effective (avenants ou date initiale). */
export function getContratFinEffective(contrat) {
  const avenants = contrat?.avenants || [];
  if (avenants.length > 0) {
    const withDate = avenants.filter((a) => a.date_fin_contrat);
    if (withDate.length > 0) {
      return [...withDate].sort((a, b) =>
        String(b.date_fin_contrat).localeCompare(String(a.date_fin_contrat))
      )[0].date_fin_contrat;
    }
  }
  return contrat?.date_fin_effective || contrat?.date_fin_contrat || null;
}

function contratOverlapsRange(contrat, rangeStart, rangeEnd) {
  const debut = toDateStr(contrat?.date_debut_contrat);
  const start = toDateStr(rangeStart);
  const end = toDateStr(rangeEnd);
  if (!debut || !start || !end) return false;

  let finEff = '9999-12-31';
  if (contrat.type_contrat === 'cdd') {
    const fin = toDateStr(getContratFinEffective(contrat));
    if (fin) finEff = fin;
  }

  return debut <= end && finEff >= start;
}

export function agentVisibleForRangeViaContrats(agent, rangeStart, rangeEnd) {
  const contrats = agent?.contrats || [];
  return contrats.some((c) => contratOverlapsRange(c, rangeStart, rangeEnd));
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
 * - Contrats (si dates) : chevauchement avec au moins un contrat
 * - Sinon périodes d'inactivité / is_active legacy
 */
export function agentVisibleForRange(agent, rangeStart, rangeEnd) {
  if (!agent) return false;
  const start = toDateStr(rangeStart);
  const end = toDateStr(rangeEnd);

  if (agentUsesContratVisibility(agent)) {
    if (!start || !end) {
      return agent.is_active === true || agent.is_active === undefined;
    }
    return agentVisibleForRangeViaContrats(agent, rangeStart, rangeEnd);
  }

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
  if (dd && dd >= start && dd <= end) {
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
