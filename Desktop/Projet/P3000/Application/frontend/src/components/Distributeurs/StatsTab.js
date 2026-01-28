import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import {
  MdTrendingUp,
  MdTrendingDown,
  MdAttachMoney,
  MdShoppingCart,
  MdBarChart,
} from "react-icons/md";

const StatsTab = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCA: 0,
    totalEntrees: 0,
    totalSorties: 0,
    beneficeTotal: 0,
    nbDistributeurs: 0,
    nbMouvements: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Récupérer tous les distributeurs
      const distributeursResponse = await axios.get("/api/distributeurs/");
      const distributeurs = distributeursResponse.data;
      
      // Calculer les stats globales
      let totalEntrees = 0;
      let totalSorties = 0;
      let nbMouvements = 0;

      for (const dist of distributeurs) {
        try {
          const resumeResponse = await axios.get(
            `/api/distributeurs/${dist.id}/resume/`
          );
          totalEntrees += resumeResponse.data.total_entrees || 0;
          totalSorties += resumeResponse.data.total_sorties || 0;
        } catch (error) {
          console.error(`Erreur pour distributeur ${dist.id}:`, error);
        }
      }

      // Récupérer le nombre total de mouvements
      const mouvementsResponse = await axios.get("/api/distributeur-mouvements/");
      nbMouvements = mouvementsResponse.data.length || 0;

      setStats({
        totalCA: totalEntrees,
        totalEntrees,
        totalSorties,
        beneficeTotal: totalEntrees - totalSorties,
        nbDistributeurs: distributeurs.length,
        nbMouvements,
      });
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 3, 
          fontWeight: 800,
          letterSpacing: "-0.5px",
          color: "text.primary"
        }}
      >
        Statistiques
      </Typography>

      {/* Cartes de résumé - Design Modern Grid */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: "20px", 
              bgcolor: "primary.main", 
              color: "primary.contrastText",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 8px 24px rgba(25, 118, 210, 0.25)"
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                Chiffre d'Affaires Total
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, mt: 0.5 }}>
                {stats.totalCA.toFixed(2)} €
              </Typography>
            </Box>
            <Box 
              sx={{ 
                width: 60, 
                height: 60, 
                borderRadius: "18px", 
                bgcolor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <MdAttachMoney size={36} />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2.5, 
              borderRadius: "20px", 
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 2,
              bgcolor: "background.paper"
            }}
          >
            <Box 
              sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: "14px", 
                bgcolor: stats.beneficeTotal >= 0 ? "success.light" : "error.light",
                color: stats.beneficeTotal >= 0 ? "success.main" : "error.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <MdTrendingUp size={28} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Bénéfice Net
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 800,
                  color: stats.beneficeTotal >= 0 ? "success.main" : "error.main"
                }}
              >
                {stats.beneficeTotal.toFixed(2)} €
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={6}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              borderRadius: "20px", 
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              bgcolor: "background.paper"
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "warning.main" }}>
              <MdShoppingCart size={20} />
              <Typography variant="caption" sx={{ fontWeight: 800 }}>Distributeurs</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {stats.nbDistributeurs}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={6}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              borderRadius: "20px", 
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              bgcolor: "background.paper"
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "info.main" }}>
              <MdTrendingDown size={20} />
              <Typography variant="caption" sx={{ fontWeight: 800 }}>Mouvements</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              {stats.nbMouvements}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Graphiques (Placeholder with style) */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 2.5, 
            borderRadius: "24px", 
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 800 }}>
            Évolution des ventes
          </Typography>
          <Box
            sx={{
              height: 180,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "action.hover",
              borderRadius: "16px",
              border: "2px dashed",
              borderColor: "divider",
              color: "text.disabled",
              gap: 1
            }}
          >
            <MdBarChart size={40} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Graphiques en cours de préparation</Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default StatsTab;
