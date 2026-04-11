import { Box, Grid, Paper, Typography, Card, CardContent } from "@mui/material";
import { ResponsivePie } from "@nivo/pie";
import React from "react";

// Sous-composant pour un affichage moderne des indicateurs
const StatCard = ({ title, amount, color, isNegative = false }) => (
  <Card 
    elevation={0} 
    sx={{ 
      height: '100%',
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'divider',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
      }
    }}
  >
    {/* Ligne de couleur d'accentuation sur la gauche */}
    <Box 
      sx={{ 
        position: 'absolute', 
        left: 0, 
        top: 0, 
        bottom: 0, 
        width: '4px', 
        bgcolor: color 
      }} 
    />
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        fontWeight={600} 
        gutterBottom 
        sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}
      >
        {title}
      </Typography>
      <Typography 
        variant="h6" 
        style={{ color: color }}
        sx={{ fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 0.5 }}
      >
        {isNegative ? "- " : ""}
        {amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
        <Typography component="span" variant="body2" fontWeight={600} style={{ color: color }}>€</Typography>
      </Typography>
    </CardContent>
  </Card>
);

const RecapSyntheseSection = ({ data, depensesPaye, tauxFacturation }) => {
  if (!data) return null;
  const paye = depensesPaye || data.sorties?.paye || {};
  const montant_ht = Number(data.montant_ht || 0);
  const montant_factures = Number(tauxFacturation?.montant_factures ?? 0);
  const montant_avenants = Number(tauxFacturation?.montant_avenants ?? 0);
  const montant_avenants_et_factures = montant_factures + montant_avenants;
  const total_materiel = Number(paye.materiel?.total || 0);
  const total_main_oeuvre = Number(paye.main_oeuvre?.total || 0);
  const total_sous_traitant = Number(paye.sous_traitant?.total || 0);
  // Coût chantier (période / filtre courant) — cartes et alignement avec les tableaux du récap
  const cout_chantier =
    total_main_oeuvre + total_sous_traitant + total_materiel;

  // En mode mois : l’API fournit les coûts cumulés jusqu’à fin du mois (bénéfice « tel qu’à cette date »). En mode global : même base que la carte coût.
  const cumulCout = data.cout_chantier_cumul_jusqua_fin_mois;
  const cout_chantier_pour_benefice =
    cumulCout != null &&
    cumulCout.total != null &&
    !Number.isNaN(Number(cumulCout.total))
      ? Number(cumulCout.total)
      : cout_chantier;

  // Calcul du total des paiements reçus
  const total_paiements_recus =
    data.entrees && data.entrees.paye
      ? Object.values(data.entrees.paye).reduce(
          (acc, cat) => acc + (cat.total || 0),
          0
        )
      : 0;

  // Bénéfice = marché (HT) + avenants + factures (TTC, comme l’onglet Info) − coût chantier — pas les paiements reçus
  const total_marche_avenants_factures =
    montant_ht + montant_avenants_et_factures;
  const benefice =
    total_marche_avenants_factures - cout_chantier_pour_benefice;

  // Camembert : coûts cumulés (global) vs bénéfice
  let pieData;
  if (benefice >= 0) {
    pieData = [
      {
        id: "Coût chantier",
        label: "Coût chantier",
        value: cout_chantier_pour_benefice,
        color: "#FF7043",
      },
      {
        id: "Bénéfice",
        label: "Bénéfice",
        value: benefice,
        color: "#43A047",
      },
    ];
  } else if (total_marche_avenants_factures > 0) {
    pieData = [
      {
        id: "ca",
        label: "Marché + av. + fact.",
        value: total_marche_avenants_factures,
        color: "#1976d2",
      },
      {
        id: "depassement",
        label: "Dépassement",
        value: -benefice,
        color: "#d32f2f",
      },
    ];
  } else {
    pieData = [
      {
        id: "Coût chantier",
        label: "Coût chantier",
        value: Math.max(cout_chantier_pour_benefice, 0.0001),
        color: "#FF7043",
      },
    ];
  }

  // Déterminer dynamiquement la taille de police
  const getFontSize = (value) => {
    const length = String(Math.floor(Math.abs(value))).length;
    if (length <= 2) return 32;
    if (length === 3) return 28;
    if (length === 4) return 24;
    if (length === 5) return 20;
    if (length === 6) return 18;
    return 16;
  };

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 4, 
        boxShadow: '0 4px 24px 0 rgba(0,0,0,0.06)' 
      }} 
      elevation={0}
    >
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>
        Synthèse Financière du Chantier
      </Typography>
      
      <Grid container spacing={4} alignItems="center">
        {/* Section Gauche : Textes dans des cartes */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard title="Marché" amount={montant_ht} color="#1976d2" />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <StatCard title="Avenants + Factures" amount={montant_avenants_et_factures} color="#1976d2" />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Total"
                amount={total_marche_avenants_factures}
                color="#1565c0"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <StatCard title="Paiements reçus" amount={total_paiements_recus} color="#43A047" />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <StatCard title="Coût chantier" amount={cout_chantier} color="#d32f2f" isNegative={true} />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <StatCard 
                title="Bénéfice" 
                amount={benefice} 
                color={benefice >= 0 ? "#43A047" : "#d32f2f"} 
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Section Droite : PieChart */}
        <Grid item xs={12} md={4}>
          <Box sx={{ width: '100%', maxWidth: 260, height: 260, position: "relative", mx: "auto" }}>
            <ResponsivePie
              data={pieData}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              innerRadius={0.75}
              padAngle={2}
              cornerRadius={4}
              colors={{ datum: "data.color" }}
              borderWidth={0}
              enableArcLabels={false}
              enableArcLinkLabels={false}
              activeOuterRadiusOffset={8}
            />
            {/* Afficher le bénéfice au centre */}
            <Box
              sx={{
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none", flexDirection: "column",
              }}
            >
              <Typography
                variant="h4"
                fontWeight={800}
                sx={{
                  fontSize: getFontSize(benefice),
                  color: benefice >= 0 ? "#43A047" : "#d32f2f",
                }}
              >
                {Number(benefice).toLocaleString("fr-FR", { minimumFractionDigits: 0 })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem' }}>
                Bénéfice
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RecapSyntheseSection;
