/** Logique partagée : sélection d'agences pour la carte « Dépenses d'agence » et agrégations associées. */

export const defaultIncludedIdsFromBreakdown = (breakdown) => {
  if (!breakdown || !breakdown.length) return [];
  const withId = breakdown.filter((r) => r.agence_id != null);
  if (!withId.length) return [];
  const minId = Math.min(...withId.map((r) => r.agence_id));
  return [minId];
};

export const getEffectiveIncludedAgenceIds = (depensesAgenceIncludedAgenceIds, defaultIds) => {
  if (depensesAgenceIncludedAgenceIds === null) {
    return defaultIds;
  }
  return depensesAgenceIncludedAgenceIds;
};

export const sumBreakdownFieldForIds = (breakdown, effectiveIncludedIds, field) => {
  if (!breakdown?.length || !effectiveIncludedIds?.length) return 0;
  return breakdown
    .filter((row) => effectiveIncludedIds.includes(row.agence_id))
    .reduce((sum, row) => sum + Number(row[field] || 0), 0);
};
