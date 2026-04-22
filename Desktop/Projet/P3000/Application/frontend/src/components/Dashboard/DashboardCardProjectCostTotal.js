import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const DashboardCardProjectCostTotal = ({
  value = 0,
  coutMateriel = 0,
  coutMainOeuvre = 0,
  coutSousTraitance = 0,
  loading = false,
}) => (
  <DashboardMetricCardShell
    title="Cout chantier global"
    value={loading ? "Chargement..." : formatCurrency(value)}
    valueColor="#dc2626"
    subtitle=""
    accent="#7c3aed"
    variant={7}
    footerItems={[
      {
        key: "materiel",
        label: "Materiel",
        icon: <Inventory2OutlinedIcon sx={{ fontSize: 14 }} />,
        color: "#ff9800",
        value: loading ? "..." : formatCurrency(coutMateriel),
      },
      {
        key: "mo",
        label: "Main d'oeuvre",
        icon: <EngineeringOutlinedIcon sx={{ fontSize: 14 }} />,
        color: "#2196f3",
        value: loading ? "..." : formatCurrency(coutMainOeuvre),
      },
      {
        key: "st",
        label: "Sous-traitance",
        icon: <HandshakeOutlinedIcon sx={{ fontSize: 14 }} />,
        color: "#0d9488",
        value: loading ? "..." : formatCurrency(coutSousTraitance),
      },
    ]}
  />
);

export default DashboardCardProjectCostTotal;
