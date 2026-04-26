import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

/** Renvoie le mois (0-11) et l'année d'une date ISO ou d'un objet Date */
function parseDateMonthYear(dateInput) {
  if (!dateInput) return null;
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return { month: d.getMonth(), year: d.getFullYear() };
}

/**
 * Parse "YYYY-MM" → { year, month (0-11) } ou null
 */
function parseYYYYMM(str) {
  if (!str) return null;
  const [y, m] = String(str).split("-").map(Number);
  if (!y || !m) return null;
  return { year: y, month: m - 1 };
}

/**
 * Calcule la date de paiement prévue = date_envoi + delai_paiement jours.
 * Retourne un objet Date ou null.
 */
function calcDatePrevue(dateEnvoi, delaiPaiement) {
  if (!dateEnvoi) return null;
  const d = new Date(dateEnvoi);
  if (isNaN(d.getTime())) return null;
  const delai = parseInt(delaiPaiement, 10);
  if (!delai || delai <= 0) return null;
  d.setDate(d.getDate() + delai);
  return d;
}

/** Convertit "MM/YY" en { month: 0-11, year: YYYY } */
function parseMMYY(mmyy) {
  if (!mmyy) return null;
  const parts = String(mmyy).split("/");
  if (parts.length !== 2) return null;
  const m = parseInt(parts[0], 10) - 1;
  const yy = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(yy)) return null;
  const year = yy < 100 ? 2000 + yy : yy;
  return { month: m, year };
}

function buildEmptyMonths(year, periodStart, periodEnd) {
  const start = parseYYYYMM(periodStart);
  const end = parseYYYYMM(periodEnd);

  // Bornes de filtrage (dans l'année sélectionnée)
  const startMonth = start && start.year === year ? start.month : 0;
  const endMonth = end && end.year === year ? end.month : 11;

  return MONTH_LABELS
    .map((label, idx) => ({
      month: label,
      monthIndex: idx,
      year,
      entreesReelles: 0,
      entreesPrevu: 0,
      sortiesReelles: 0,
      sortiesPrevu: 0,
      _entreesReellesDetail: [],
      _entreesPrevuDetail: [],
      _sortiesReellesDetail: [],
      _sortiesPrevuDetail: [],
    }))
    .filter((m) => m.monthIndex >= startMonth && m.monthIndex <= endMonth);
}

export function useTresorerieData(selectedYear, periodStart, periodEnd) {
  const [situations, setSituations] = useState([]);
  const [factures, setFactures] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [sousTraitants, setSousTraitants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedYear) return;
    setLoading(true);
    setError(null);

    const year = parseInt(selectedYear, 10);

    Promise.all([
      axios.get(`/api/situations/by-year/?annee=${year}`).catch(() => ({ data: [] })),
      axios.get(`/api/facture/?date_envoi__year=${year}`).catch(() => ({ data: [] })),
      axios.get(`/api/facture/?date_creation__year=${year}`).catch(() => ({ data: [] })),
      axios.get(`/api/tableau-fournisseur-global/`).catch(() => ({ data: [] })),
      axios.get(`/api/tableau-sous-traitant-global/`).catch(() => ({ data: [] })),
    ])
      .then(([sitRes, factEnvoiRes, factCreationRes, fournRes, stRes]) => {
        setSituations(sitRes.data || []);

        // Dédupliquer factures (priorité à date_envoi)
        const factEnvoi = factEnvoiRes.data || [];
        const factCreation = factCreationRes.data || [];
        const seen = new Set();
        const merged = [];
        factEnvoi.forEach((f) => {
          if (!seen.has(f.id)) { seen.add(f.id); merged.push(f); }
        });
        factCreation.forEach((f) => {
          if (!seen.has(f.id) && !f.date_envoi) { seen.add(f.id); merged.push(f); }
        });
        setFactures(merged);

        setFournisseurs(fournRes.data || []);
        setSousTraitants(stRes.data || []);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  const monthlyData = useMemo(() => {
    if (!selectedYear) return [];
    const year = parseInt(selectedYear, 10);
    const months = buildEmptyMonths(year, periodStart, periodEnd);

    // months est potentiellement filtré : on retrouve la case par monthIndex
    const monthMap = Object.fromEntries(months.map((m) => [m.monthIndex, m]));

    const addToMonth = (monthIndex, field, detailField, amount, detail) => {
      if (monthIndex < 0 || monthIndex > 11 || amount <= 0) return;
      const slot = monthMap[monthIndex];
      if (!slot) return; // mois hors période sélectionnée
      slot[field] += amount;
      slot[detailField].push(detail);
    };

    // ── Entrées : situations ──────────────────────────────────────────────────
    // Réelles  → date_envoi (= mois de prestation facturée)
    // Prévues  → date_envoi + delai_paiement (= encaissement attendu)
    (situations || []).forEach((s) => {
      const montant = parseFloat(s.montant_apres_retenues) || parseFloat(s.montant_reel_ht) || 0;
      const label = `Sit. ${s.numero || s.id} — ${s.chantier_name || s.chantier || ""}`;
      const dateRef = s.date_envoi || s.date_creation;

      // Réelle : placée au mois d'envoi (prestation)
      if (dateRef) {
        const dp = parseDateMonthYear(dateRef);
        if (dp && dp.year === year) {
          addToMonth(dp.month, "entreesReelles", "_entreesReellesDetail", montant, { label, montant });
        }
      }

      // Prévue : placée à la date de paiement attendue
      const datePrevue = calcDatePrevue(dateRef, s.delai_paiement);
      if (datePrevue) {
        const dp = parseDateMonthYear(datePrevue);
        if (dp && dp.year === year) {
          addToMonth(dp.month, "entreesPrevu", "_entreesPrevuDetail", montant, { label, montant });
        }
      }
    });

    // ── Entrées : factures ────────────────────────────────────────────────────
    // Réelles  → date_envoi ou date_creation (= mois de prestation)
    // Prévues  → date_envoi + delai_paiement (= encaissement attendu)
    (factures || []).forEach((f) => {
      const montant = parseFloat(f.montant_ht) || parseFloat(f.price_ht) || 0;
      const label = `Fact. ${f.numero || f.id} — ${f.chantier_name || f.chantier || ""}`;
      const dateRef = f.date_envoi || f.date_creation;

      // Réelle : placée au mois d'envoi (prestation)
      if (dateRef) {
        const dp = parseDateMonthYear(dateRef);
        if (dp && dp.year === year) {
          addToMonth(dp.month, "entreesReelles", "_entreesReellesDetail", montant, { label, montant });
        }
      }

      // Prévue : placée à la date de paiement attendue
      const datePrevue = calcDatePrevue(dateRef, f.delai_paiement);
      if (datePrevue) {
        const dp = parseDateMonthYear(datePrevue);
        if (dp && dp.year === year) {
          addToMonth(dp.month, "entreesPrevu", "_entreesPrevuDetail", montant, { label, montant });
        }
      }
    });

    // ── Sorties : fournisseurs ────────────────────────────────────────────────
    // Réelles  → mois MM/YY de la ligne (= mois de la dépense/prestation)
    // Prévues  → date_paiement_prevue (= décaissement attendu)
    (fournisseurs || []).forEach((row) => {
      const mmyy = parseMMYY(row.mois);
      const label = `${row.fournisseur || "Fournisseur"} — ${row.chantier_name || ""}`;
      const aPayer = parseFloat(row.a_payer) || 0;
      const paye = parseFloat(row.paye) || 0;
      const resteAPayer = Math.max(0, aPayer - paye);

      // Réelle : montant à payer placé au mois de la dépense
      if (mmyy && mmyy.year === year && aPayer > 0) {
        addToMonth(mmyy.month, "sortiesReelles", "_sortiesReellesDetail", aPayer, { label, montant: aPayer });
      }

      // Prévue : reste à payer placé à la date de paiement prévue
      if (resteAPayer > 0 && row.date_paiement_prevue) {
        const dp = parseDateMonthYear(row.date_paiement_prevue);
        if (dp && dp.year === year) {
          addToMonth(dp.month, "sortiesPrevu", "_sortiesPrevuDetail", resteAPayer, { label, montant: resteAPayer });
        }
      }
    });

    // ── Sorties : sous-traitants ──────────────────────────────────────────────
    // Réelles  → mois MM/YY de la ligne (= mois de la prestation sous-traitée)
    // Prévues  → date_paiement_prevue (= décaissement attendu)
    (sousTraitants || []).forEach((row) => {
      const mmyy = parseMMYY(row.mois);
      const label = `${row.sous_traitant || "Sous-traitant"} — ${row.chantier_name || ""}`;
      const aPayer = parseFloat(row.a_payer) || 0;
      const paye = parseFloat(row.paye) || 0;
      const resteAPayer = Math.max(0, aPayer - paye);

      // Réelle : montant à payer placé au mois de la prestation
      if (mmyy && mmyy.year === year && aPayer > 0) {
        addToMonth(mmyy.month, "sortiesReelles", "_sortiesReellesDetail", aPayer, { label, montant: aPayer });
      }

      // Prévue : reste à payer placé à la date de paiement prévue
      if (resteAPayer > 0 && row.date_paiement_prevue) {
        const dp = parseDateMonthYear(row.date_paiement_prevue);
        if (dp && dp.year === year) {
          addToMonth(dp.month, "sortiesPrevu", "_sortiesPrevuDetail", resteAPayer, { label, montant: resteAPayer });
        }
      }
    });

    return months;
  }, [selectedYear, periodStart, periodEnd, situations, factures, fournisseurs, sousTraitants]);

  // ── Classement fournisseurs (agrégé par fournisseur) ─────────────────────
  const classementFournisseurs = useMemo(() => {
    const map = {};

    (fournisseurs || []).forEach((row) => {
      const key = row.fournisseur || "Inconnu";
      if (!map[key]) {
        map[key] = {
          fournisseur: key,
          totalFactures: 0,
          totalAPayer: 0,
          totalPaye: 0,
          chantiers: {},
        };
      }
      const entry = map[key];
      const aPayer = parseFloat(row.a_payer) || 0;
      const paye = parseFloat(row.paye) || 0;

      entry.totalAPayer += aPayer;
      entry.totalPaye += paye;

      // Détail par chantier (pour le modal)
      const chantierId = row.chantier_id || row.chantier_name || "?";
      if (!entry.chantiers[chantierId]) {
        entry.chantiers[chantierId] = {
          chantier_id: row.chantier_id,
          chantier_name: row.chantier_name || chantierId,
          totalAPayer: 0,
          totalPaye: 0,
          mois: [],
        };
      }
      const ch = entry.chantiers[chantierId];
      ch.totalAPayer += aPayer;
      ch.totalPaye += paye;
      if (row.mois) ch.mois.push(row.mois);
    });

    return Object.values(map)
      .map((f) => ({
        ...f,
        resteAPayer: Math.max(0, f.totalAPayer - f.totalPaye),
        tauxPaiement: f.totalAPayer > 0 ? (f.totalPaye / f.totalAPayer) * 100 : 0,
        chantiers: Object.values(f.chantiers).map((ch) => ({
          ...ch,
          resteAPayer: Math.max(0, ch.totalAPayer - ch.totalPaye),
          tauxPaiement: ch.totalAPayer > 0 ? (ch.totalPaye / ch.totalAPayer) * 100 : 0,
        })),
      }))
      .sort((a, b) => b.totalAPayer - a.totalAPayer);
  }, [fournisseurs]);

  return { monthlyData, classementFournisseurs, loading, error };
}
