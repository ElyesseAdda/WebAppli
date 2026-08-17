import { useEffect, useState } from "react";
import axios from "axios";

function fmtDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function mapApiPayment(payment, dateKey) {
  const rawDate = payment[dateKey];
  return {
    id: payment.id,
    type: payment.type === "situation" ? "Situation" : "Facture",
    label: payment.numero || `#${payment.id}`,
    chantier: payment.chantier_name || "",
    montant: parseFloat(payment.montant_ht) || 0,
    date: fmtDate(rawDate),
    dateSort: rawDate ? new Date(rawDate).getTime() : 0,
  };
}

/**
 * Listes de paiements pour les modales du dashboard.
 * Endpoints légers dédiés (pas de situations/by-year).
 */
export function usePaymentsDetail(selectedYear) {
  const [encaissementsRecus, setEncaissementsRecus] = useState([]);
  const [paiementsAVenir, setPaiementsAVenir] = useState([]);
  const [paiementsEnRetard, setPaiementsEnRetard] = useState([]);
  const [loadingEncaissements, setLoadingEncaissements] = useState(true);
  const [loadingAVenir, setLoadingAVenir] = useState(true);
  const [loadingRetard, setLoadingRetard] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoadingRetard(true);
    axios
      .get("/api/late-payments/")
      .then((res) => {
        if (cancelled) return;
        const rows = (res.data || []).map((p) =>
          mapApiPayment(p, "date_paiement_attendue")
        );
        rows.sort((a, b) => (a.dateSort || 0) - (b.dateSort || 0));
        setPaiementsEnRetard(rows);
      })
      .catch(() => {
        if (!cancelled) setPaiementsEnRetard([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRetard(false);
      });

    setLoadingAVenir(true);
    axios
      .get("/api/pending-payments/")
      .then((res) => {
        if (cancelled) return;
        const rows = (res.data || []).map((p) =>
          mapApiPayment(p, "date_paiement_attendue")
        );
        rows.sort((a, b) => (a.dateSort || 0) - (b.dateSort || 0));
        setPaiementsAVenir(rows);
      })
      .catch(() => {
        if (!cancelled) setPaiementsAVenir([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAVenir(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    let cancelled = false;

    setLoadingEncaissements(true);
    axios
      .get("/api/received-payments/", { params: { annee: selectedYear } })
      .then((res) => {
        if (cancelled) return;
        const rows = (res.data || []).map((p) =>
          mapApiPayment(p, "date_paiement")
        );
        rows.sort((a, b) => (a.dateSort || 0) - (b.dateSort || 0));
        setEncaissementsRecus(rows);
      })
      .catch(() => {
        if (!cancelled) setEncaissementsRecus([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEncaissements(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  return {
    encaissementsRecus,
    paiementsAVenir,
    paiementsEnRetard,
    loading: loadingEncaissements || loadingAVenir || loadingRetard,
    loadingEncaissements,
    loadingAVenir,
    loadingRetard,
  };
}
