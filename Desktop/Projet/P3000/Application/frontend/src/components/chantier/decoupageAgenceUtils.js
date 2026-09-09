const AGENCY_SOURCE_TYPES = new Set([
  "agency_expense",
  "agency_expense_fournisseur",
]);

export const buildAgenceIndex = (agences) => {
  const chantierIds = new Set();
  const names = new Set(["agence"]);
  (agences || []).forEach((ag) => {
    if (ag?.chantier != null && ag.chantier !== "") {
      chantierIds.add(Number(ag.chantier));
    }
    if (ag?.nom) names.add(String(ag.nom).trim().toLowerCase());
    if (ag?.chantier_name) names.add(String(ag.chantier_name).trim().toLowerCase());
  });
  return { chantierIds, names };
};

export const isAgenceLigne = (item, agenceIndex) => {
  if (!item) return false;
  if (AGENCY_SOURCE_TYPES.has(item.source_type)) return true;
  const cid = Number(item.chantier_id);
  if (!Number.isNaN(cid) && agenceIndex?.chantierIds?.has(cid)) return true;
  const name = String(item.chantier_name || "").trim().toLowerCase();
  if (name && agenceIndex?.names?.has(name)) return true;
  if (name.startsWith("agence")) return true;
  return false;
};

const emptyBucket = () => ({
  a_payer: 0,
  paye: 0,
  ecart: 0,
  lignes: [],
});

const addLigne = (bucket, ligne) => {
  const aPayer = Number(ligne.a_payer || 0);
  const paye = Number(ligne.paye || 0);
  const ecart = Number(ligne.ecart ?? aPayer - paye);
  bucket.a_payer += aPayer;
  bucket.paye += paye;
  bucket.ecart += ecart;
  bucket.lignes.push({
    label: ligne.label || "—",
    a_payer: aPayer,
    paye,
    ecart,
  });
};

const splitAgentJournalier = (item, agence, chantiers, agenceIndex) => {
  const details = item.chantiersDetails || [];
  details.forEach((ch) => {
    addLigne(isAgenceLigne(ch, agenceIndex) ? agence : chantiers, {
      label: ch.chantier_name || (ch.chantier_id ? `Chantier ${ch.chantier_id}` : "Chantier"),
      a_payer: ch.a_payer,
      paye: 0,
      ecart: ch.a_payer || 0,
    });
  });
  (item.primes || []).forEach((prime) => {
    const isAg = prime.type_affectation === "agence" || !!prime.agence_nom;
    const labelBits = [prime.description || "Prime"];
    if (prime.agence_nom) labelBits.push(prime.agence_nom);
    else if (prime.chantier_name) labelBits.push(prime.chantier_name);
    addLigne(isAg ? agence : chantiers, {
      label: `Prime — ${labelBits.join(" · ")}`,
      a_payer: prime.montant,
      paye: 0,
      ecart: prime.montant,
    });
  });
  if (item.ajustement_montant) {
    addLigne(chantiers, {
      label: `Ajustement${item.ajustement_description ? ` — ${item.ajustement_description}` : ""}`,
      a_payer: item.ajustement_montant,
      paye: 0,
      ecart: item.ajustement_montant,
    });
  }

  const payeTotal = Number(item.paye || 0);
  const apTotal = agence.a_payer + chantiers.a_payer;
  if (Math.abs(payeTotal) < 0.001) return;
  if (Math.abs(apTotal) < 0.001) {
    chantiers.paye += payeTotal;
    chantiers.ecart = chantiers.a_payer - chantiers.paye;
    return;
  }
  agence.paye = payeTotal * (agence.a_payer / apTotal);
  chantiers.paye = payeTotal * (chantiers.a_payer / apTotal);
  agence.ecart = agence.a_payer - agence.paye;
  chantiers.ecart = chantiers.a_payer - chantiers.paye;
};

const mergeLignesByChantier = (lignes) => {
  const map = new Map();
  (lignes || []).forEach((l) => {
    const key = String(l.label || "—").trim().toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...l, label: l.label || "—" });
      return;
    }
    existing.a_payer += Number(l.a_payer || 0);
    existing.paye += Number(l.paye || 0);
    existing.ecart += Number(l.ecart || 0);
  });
  return Array.from(map.values()).sort((a, b) => {
    const byAmount = Math.abs(b.a_payer) - Math.abs(a.a_payer);
    if (byAmount !== 0) return byAmount;
    return String(a.label).localeCompare(b.label, "fr");
  });
};

export const buildDecoupage = (items, agenceIndex, { groupByChantier = false } = {}) => {
  const agence = emptyBucket();
  const chantiers = emptyBucket();

  (items || []).forEach((item) => {
    if (item?.isAgentJournalier || item.source_type === "agent_journalier") {
      splitAgentJournalier(item, agence, chantiers, agenceIndex);
      return;
    }
    const label =
      item.chantier_name ||
      (item.chantier_id ? `Chantier ${item.chantier_id}` : "—");
    addLigne(isAgenceLigne(item, agenceIndex) ? agence : chantiers, {
      label,
      a_payer: item.a_payer,
      paye: item.paye,
      ecart: item.ecart,
    });
  });

  if (groupByChantier) {
    agence.lignes = mergeLignesByChantier(agence.lignes);
    chantiers.lignes = mergeLignesByChantier(chantiers.lignes);
  }

  return { agence, chantiers };
};

export const collectItems = (organized, entityNames, moisKeys) => {
  const items = [];
  const names = Array.isArray(entityNames) ? entityNames : [entityNames];
  const months = moisKeys || Object.keys(organized || {});
  months.forEach((mois) => {
    names.forEach((name) => {
      const list = organized?.[mois]?.[name];
      if (Array.isArray(list)) items.push(...list);
    });
  });
  return items;
};

export const collectAllItemsForMois = (organized, mois) => {
  const items = [];
  const byEntity = organized?.[mois] || {};
  Object.values(byEntity).forEach((list) => {
    if (Array.isArray(list)) items.push(...list);
  });
  return items;
};

export const formatMoisKeyLabel = (moisKey) => {
  if (!moisKey) return "";
  const moisNames = {
    1: "Janvier",
    2: "Février",
    3: "Mars",
    4: "Avril",
    5: "Mai",
    6: "Juin",
    7: "Juillet",
    8: "Août",
    9: "Septembre",
    10: "Octobre",
    11: "Novembre",
    12: "Décembre",
  };
  const [moisNum, annee2] = String(moisKey).split("/").map(Number);
  const annee = annee2 < 50 ? 2000 + annee2 : 1900 + annee2;
  return `${moisNames[moisNum] || moisNum} ${annee}`;
};

export const clickableAmountSx = {
  cursor: "pointer",
  borderRadius: "4px",
  transition: "background-color 0.15s ease",
  "&:hover": {
    backgroundColor: "rgba(27, 120, 188, 0.1)",
  },
};
