import { useEffect, useMemo, useState } from "react";
import axios from "axios";

function calcDatePrevue(dateEnvoi, delai) {
  if (!dateEnvoi) return null;
  const d = new Date(dateEnvoi);
  if (isNaN(d.getTime())) return null;
  const n = parseInt(delai, 10);
  if (!n || n <= 0) return null;
  d.setDate(d.getDate() + n);
  return d;
}

function fmtDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return String(d);
  }
}

/**
 * Calcule les 3 listes de paiements à partir des situations et factures de l'année.
 * Retourne { encaissementsRecus, paiementsAVenir, paiementsEnRetard, loading }
 */
export function usePaymentsDetail(selectedYear) {
  const [situations, setSituations] = useState([]);
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedYear) return;
    setLoading(true);
    const year = parseInt(selectedYear, 10);
    Promise.all([
      axios.get(`/api/situations/by-year/?annee=${year}`).catch(() => ({ data: [] })),
      axios.get(`/api/facture/?date_envoi__year=${year}`).catch(() => ({ data: [] })),
      axios.get(`/api/facture/?date_creation__year=${year}`).catch(() => ({ data: [] })),
    ]).then(([sitRes, factEnvRes, factCreRes]) => {
      setSituations(sitRes.data || []);
      const seen = new Set();
      const merged = [];
      (factEnvRes.data || []).forEach((f) => { if (!seen.has(f.id)) { seen.add(f.id); merged.push(f); } });
      (factCreRes.data || []).forEach((f) => { if (!seen.has(f.id) && !f.date_envoi) { seen.add(f.id); merged.push(f); } });
      setFactures(merged);
    }).finally(() => setLoading(false));
  }, [selectedYear]);

  const { encaissementsRecus, paiementsAVenir, paiementsEnRetard } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in15 = new Date(today);
    in15.setDate(today.getDate() + 15);

    const encaissementsRecus = [];
    const paiementsAVenir = [];
    const paiementsEnRetard = [];

    // --- Situations ---
    situations.forEach((s) => {
      const montant = parseFloat(s.montant_apres_retenues) || parseFloat(s.montant_reel_ht) || 0;
      const label = s.numero_situation || s.numero || `#${s.id}`;
      const chantier = s.chantier_name || s.chantier || "";

      if (s.date_paiement_reel) {
        encaissementsRecus.push({
          label, chantier, montant,
          date: fmtDate(s.date_paiement_reel),
          type: "Situation",
        });
      } else {
        const prevue = calcDatePrevue(s.date_envoi, s.delai_paiement);
        if (prevue) {
          if (prevue >= today && prevue <= in15) {
            paiementsAVenir.push({ label, chantier, montant, date: fmtDate(prevue), type: "Situation" });
          } else if (prevue < today) {
            paiementsEnRetard.push({ label, chantier, montant, date: fmtDate(prevue), type: "Situation" });
          }
        }
      }
    });

    // --- Factures ---
    factures.forEach((f) => {
      const montant = parseFloat(f.montant_ht) || parseFloat(f.price_ht) || 0;
      const label = f.numero || `#${f.id}`;
      const chantier = f.chantier_name || f.chantier || "";

      if (f.date_paiement) {
        encaissementsRecus.push({
          label, chantier, montant,
          date: fmtDate(f.date_paiement),
          type: "Facture",
        });
      } else {
        const prevue = calcDatePrevue(f.date_envoi || f.date_creation, f.delai_paiement);
        if (prevue) {
          if (prevue >= today && prevue <= in15) {
            paiementsAVenir.push({ label, chantier, montant, date: fmtDate(prevue), type: "Facture" });
          } else if (prevue < today) {
            paiementsEnRetard.push({ label, chantier, montant, date: fmtDate(prevue), type: "Facture" });
          }
        }
      }
    });

    // Tri par montant décroissant
    const byMontant = (a, b) => b.montant - a.montant;
    encaissementsRecus.sort(byMontant);
    paiementsAVenir.sort(byMontant);
    paiementsEnRetard.sort(byMontant);

    return { encaissementsRecus, paiementsAVenir, paiementsEnRetard };
  }, [situations, factures]);

  return { encaissementsRecus, paiementsAVenir, paiementsEnRetard, loading };
}
