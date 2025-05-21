import {
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Typography,
} from "@mui/material";

import React from "react";

const ChantierInfoTab = ({ chantierData }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(montant || 0);
  };

  // Données factices pour l'exemple, à remplacer par les vraies données du backend
  const tauxFacturation = chantierData?.taux_facturation || 50; // en %
  const nombreDevis = chantierData?.stats_devis?.envoyes || 11;
  const statsDevis = chantierData?.stats_devis || {
    termines: 6,
    en_cours: 2,
    attente_signature: 3,
    refuses: 1,
  };

  return (
    <Box>
      {/* Nouvelle section d'informations principales */}
      <Card sx={{ mb: 3, borderRadius: "10px", backgroundColor: "white" }}>
        <CardContent>
          <Grid container spacing={4}>
            {/* Nom du chantier */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Nom du chantier :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {chantierData?.nom || "Non défini"}
              </Typography>
            </Grid>

            {/* Nom client */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Nom client :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {chantierData?.societe?.client?.nom || "Non défini"}
              </Typography>
            </Grid>

            {/* Société */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Société :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {chantierData?.societe?.nom || "Non défini"}
              </Typography>
            </Grid>

            {/* Date de création */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Date de création :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {formatDate(chantierData?.dates?.debut)}
              </Typography>
            </Grid>

            {/* Statut */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Statut :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                  display: "inline-block",
                }}
              >
                <span
                  style={{
                    backgroundColor:
                      chantierData?.statut === "En Cours"
                        ? "rgba(46, 125, 50, 0.1)"
                        : chantierData?.statut === "Terminé"
                        ? "rgba(211, 47, 47, 0.1)"
                        : "#e0e0e0",
                    color:
                      chantierData?.statut === "En Cours"
                        ? "#2e7d32"
                        : chantierData?.statut === "Terminé"
                        ? "#d32f2f"
                        : "#757575",
                    borderRadius: 8,
                    padding: "2px 12px",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                  }}
                >
                  {chantierData?.statut || "Non défini"}
                </span>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Blocs Réel/Prévisionnel à gauche, Taux de facturation à droite */}
      <Grid container spacing={3}>
        {/* Colonne gauche : Réel & Prévisionnel */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={3}>
            {/* Bloc Prévisionnel */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Titre Prévisionnel */}
                <Card sx={{ borderRadius: "10px", backgroundColor: "white" }}>
                  <CardContent sx={{ pt: 0.5, pb: 0 + " !important" }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        fontSize: "1rem",
                        mb: 0,
                        fontFamily: "Roboto Slab, serif",
                      }}
                    >
                      Prévisionnel
                    </Typography>
                  </CardContent>
                </Card>
                {/* Détails Prévisionnel */}
                <Card sx={{ borderRadius: "10px", backgroundColor: "white" }}>
                  <CardContent sx={{ py: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        alignItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color: "#388e3c",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Main d'œuvre
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_estime_main_oeuvre)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#d32f2f",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Matériel
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_estime_materiel)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                {/* Total Prévisionnel */}
                <Card sx={{ borderRadius: "10px", backgroundColor: "white" }}>
                  <CardContent>
                    <Typography
                      align="center"
                      sx={{
                        fontWeight: 700,
                        color: "#1976d2",
                        fontFamily: "Roboto, Arial, sans-serif",
                      }}
                    >
                      Total:{" "}
                      {formatMontant(
                        (chantierData?.cout_estime_main_oeuvre || 0) +
                          (chantierData?.cout_estime_materiel || 0)
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
            {/* Bloc Réel */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Titre Réel */}
                <Card sx={{ borderRadius: "10px", backgroundColor: "white" }}>
                  <CardContent sx={{ pt: 0.5, pb: 0 + " !important" }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        fontSize: "1rem",
                        mb: 0,
                        fontFamily: "Roboto Slab, serif",
                      }}
                    >
                      Réel
                    </Typography>
                  </CardContent>
                </Card>
                {/* Détails Réel */}
                <Card sx={{ borderRadius: "10px", backgroundColor: "white" }}>
                  <CardContent sx={{ py: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        alignItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color: "#388e3c",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Main d'œuvre
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_main_oeuvre)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#d32f2f",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Matériel
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_materiel)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                {/* Total Réel */}
                <Card sx={{ borderRadius: "10px", backgroundColor: "white" }}>
                  <CardContent>
                    <Typography
                      align="center"
                      sx={{
                        fontWeight: 700,
                        color: "#1976d2",
                        fontFamily: "Roboto, Arial, sans-serif",
                      }}
                    >
                      Total:{" "}
                      {formatMontant(
                        (chantierData?.cout_main_oeuvre || 0) +
                          (chantierData?.cout_materiel || 0)
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
            {/* Carte de marge unique */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: "10px", backgroundColor: "white" }}>
                <CardContent>
                  <Typography
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontFamily: "Roboto, Arial, sans-serif",
                      color:
                        (chantierData?.cout_estime_main_oeuvre || 0) +
                          (chantierData?.cout_estime_materiel || 0) -
                          ((chantierData?.cout_main_oeuvre || 0) +
                            (chantierData?.cout_materiel || 0)) >=
                        0
                          ? "#2e7d32"
                          : "#d32f2f",
                    }}
                  >
                    Marge:{" "}
                    {formatMontant(
                      (chantierData?.cout_estime_main_oeuvre || 0) +
                        (chantierData?.cout_estime_materiel || 0) -
                        ((chantierData?.cout_main_oeuvre || 0) +
                          (chantierData?.cout_materiel || 0))
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        {/* Colonne droite : Taux de facturation */}
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              borderRadius: "10px",
              backgroundColor: "white",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <CardContent sx={{ pt: 0.5, pb: 0.5 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Taux facturation :
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={tauxFacturation}
                  sx={{
                    flex: 1,
                    height: 10,
                    borderRadius: 5,
                    mr: 2,
                    backgroundColor: "#e0e0e0",
                    "& .MuiLinearProgress-bar": { backgroundColor: "#1976d2" },
                  }}
                />
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    minWidth: 48,
                    ml: 1,
                    fontFamily: "Roboto, Arial, sans-serif",
                  }}
                >
                  {tauxFacturation} %
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ mr: 1, fontFamily: "Roboto, Arial, sans-serif" }}
                >
                  Nombre Devis envoyés :
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "#1976d2",
                    ml: 1,
                    fontFamily: "Roboto, Arial, sans-serif",
                  }}
                >
                  {nombreDevis}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                  mt: 2,
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#2e7d32",
                      fontFamily: "Roboto, Arial, sans-serif",
                    }}
                  >
                    {statsDevis.termines}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#2e7d32",
                      fontFamily: "Roboto, Arial, sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    Terminer
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#1976d2",
                      fontFamily: "Roboto, Arial, sans-serif",
                    }}
                  >
                    {statsDevis.en_cours}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#1976d2",
                      fontFamily: "Roboto, Arial, sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    En cours
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#ff9800",
                      fontFamily: "Roboto, Arial, sans-serif",
                    }}
                  >
                    {statsDevis.attente_signature}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#ff9800",
                      fontFamily: "Roboto, Arial, sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    En attente signature
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#d32f2f",
                      fontFamily: "Roboto, Arial, sans-serif",
                    }}
                  >
                    {statsDevis.refuses}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#d32f2f",
                      fontFamily: "Roboto, Arial, sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    Refusé
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChantierInfoTab;
