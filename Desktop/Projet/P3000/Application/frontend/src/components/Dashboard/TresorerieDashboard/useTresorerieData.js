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
  const [chantiers, setChantiers] = useState([]);
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
      axios.get(`/api/chantier/`).catch(() => ({ data: [] })),
    ])
      .then(([sitRes, factEnvoiRes, factCreationRes, fournRes, stRes, chantierRes]) => {
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
        setChantiers(chantierRes.data || []);
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

  // ── Helper : agrège un tableau de lignes par clé "nom" ───────────────────
  const buildClassement = (rows, nomField) => {
    const map = {};
    (rows || []).forEach((row) => {
      const key = row[nomField] || "Inconnu";
      if (!map[key]) {
        map[key] = { nom: key, totalAPayer: 0, totalPaye: 0, chantiers: {} };
      }
      const entry = map[key];
      const aPayer = parseFloat(row.a_payer) || 0;
      const paye = parseFloat(row.paye) || 0;
      entry.totalAPayer += aPayer;
      entry.totalPaye += paye;

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
  };

  // ── Classement fournisseurs ───────────────────────────────────────────────
  const classementFournisseurs = useMemo(
    () => buildClassement(fournisseurs, "fournisseur"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fournisseurs]
  );

  // ── Classement sous-traitants ─────────────────────────────────────────────
  const classementSousTraitants = useMemo(
    () => buildClassement(sousTraitants, "sous_traitant"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sousTraitants]
  );

  // ── Classement sociétés (clients) ─────────────────────────────────────────
  // Agrégation par société cliente via situations + factures, mappées sur chantiers
  const classementSocietes = useMemo(() => {
    if (!chantiers.length) return [];

    // Map chantier_id → { societe_name, chantier_name }
    const chantierMap = {};
    chantiers.forEach((c) => {
      const societeName =
        c.maitre_ouvrage_nom_societe ||
        c.societe?.nom_societe ||
        c.client_name ||
        "Société inconnue";
      chantierMap[c.id] = { societeName, chantierName: c.chantier_name || `Chantier #${c.id}` };
    });

    const map = {};

    const addEntry = (societeName, chantierId, chantierName, ca, encaisse) => {
      if (!societeName) return;
      if (!map[societeName]) {
        map[societeName] = { nom: societeName, totalAPayer: 0, totalPaye: 0, chantiers: {} };
      }
      const entry = map[societeName];
      entry.totalAPayer += ca;
      entry.totalPaye += encaisse;

      const key = chantierId || chantierName || "?";
      if (!entry.chantiers[key]) {
        entry.chantiers[key] = {
          chantier_id: chantierId,
          chantier_name: chantierName || key,
          totalAPayer: 0,
          totalPaye: 0,
        };
      }
      entry.chantiers[key].totalAPayer += ca;
      entry.chantiers[key].totalPaye += encaisse;
    };

    // Situations
    situations.forEach((s) => {
      const chantierId = s.chantier_id || s.chantier;
      const info = chantierMap[chantierId];
      if (!info) return;
      const ca = parseFloat(s.montant_apres_retenues) || parseFloat(s.montant_reel_ht) || 0;
      const encaisse = s.date_paiement_reel ? (parseFloat(s.montant_reel_ht) || ca) : 0;
      addEntry(info.societeName, chantierId, info.chantierName, ca, encaisse);
    });

    // Factures
    factures.forEach((f) => {
      const chantierId = f.chantier_id || f.chantier;
      const info = chantierMap[chantierId];
      if (!info) return;
      const ca = parseFloat(f.montant_ht) || parseFloat(f.price_ht) || 0;
      const encaisse = f.date_paiement ? ca : 0;
      addEntry(info.societeName, chantierId, info.chantierName, ca, encaisse);
    });

    return Object.values(map)
      .map((s) => ({
        ...s,
        resteAPayer: Math.max(0, s.totalAPayer - s.totalPaye),
        tauxPaiement: s.totalAPayer > 0 ? (s.totalPaye / s.totalAPayer) * 100 : 0,
        chantiers: Object.values(s.chantiers).map((ch) => ({
          ...ch,
          resteAPayer: Math.max(0, ch.totalAPayer - ch.totalPaye),
          tauxPaiement: ch.totalAPayer > 0 ? (ch.totalPaye / ch.totalAPayer) * 100 : 0,
        })),
      }))
      .sort((a, b) => b.totalAPayer - a.totalAPayer);
  }, [chantiers, situations, factures]);

  // ── Classement chantiers ──────────────────────────────────────────────────
  const classementChantiers = useMemo(() => {
    const map = {};

    // Map chantier_id → info chantier
    const chantierInfo = {};
    chantiers.forEach((c) => {
      const societeName =
        c.maitre_ouvrage_nom_societe ||
        c.societe?.nom_societe ||
        c.client_name ||
        "—";
      chantierInfo[c.id] = { societeName, chantierName: c.chantier_name || `Chantier #${c.id}` };
    });

    situations.forEach((s) => {
      const chantierId = s.chantier_id || s.chantier;
      if (!chantierId) return;

      const info = chantierInfo[chantierId] || {
        societeName: "—",
        chantierName: `Chantier #${chantierId}`,
      };

      if (!map[chantierId]) {
        map[chantierId] = {
          chantier_id: chantierId,
          chantier_name: info.chantierName,
          societe: info.societeName,
          ca: 0,
          encaisse: 0,
          avancement: 0,
          dernierNumero: -1,
          situations: [],
        };
      }

      const entry = map[chantierId];
      const montant = parseFloat(s.montant_apres_retenues) || parseFloat(s.montant_reel_ht) || 0;
      entry.ca += montant;

      if (s.date_paiement_reel) {
        entry.encaisse += parseFloat(s.montant_reel_ht) || montant;
      }

      // Avancement = pourcentage_avancement de la situation avec le numéro le plus grand
      const num = parseInt(String(s.numero || s.numero_situation || "0").replace(/\D/g, ""), 10) || 0;
      if (num > entry.dernierNumero) {
        entry.dernierNumero = num;
        entry.avancement = parseFloat(s.pourcentage_avancement) || 0;
      }

      entry.situations.push({
        id: s.id,
        numero:
          (s.numero_situation != null && String(s.numero_situation).trim()) ||
          (s.numero != null && String(s.numero)) ||
          `#${s.id}`,
        montant,
        pourcentage_avancement: parseFloat(s.pourcentage_avancement) || 0,
        date_envoi: s.date_envoi,
        date_paiement_reel: s.date_paiement_reel,
        encaisse: s.date_paiement_reel ? (parseFloat(s.montant_reel_ht) || montant) : 0,
      });
    });

    return Object.values(map).map((c) => ({
      ...c,
      resteAEncaisser: Math.max(0, c.ca - c.encaisse),
      tauxEncaissement: c.ca > 0 ? (c.encaisse / c.ca) * 100 : 0,
      situations: c.situations.sort((a, b) => {
        const na = parseInt(String(a.numero).replace(/\D/g, ""), 10) || 0;
        const nb = parseInt(String(b.numero).replace(/\D/g, ""), 10) || 0;
        return na - nb;
      }),
    }));
  }, [situations, chantiers]);

  return { monthlyData, classementFournisseurs, classementSousTraitants, classementSocietes, classementChantiers, loading, error };
}
