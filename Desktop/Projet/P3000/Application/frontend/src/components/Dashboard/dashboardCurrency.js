/** Montants EUR du dashboard : toujours 2 décimales (aligné affichage métier). */
export const formatDashboardCurrency = (amount) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
