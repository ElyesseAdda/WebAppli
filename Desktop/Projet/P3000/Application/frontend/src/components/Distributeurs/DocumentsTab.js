import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Alert,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  InputAdornment,
} from "@mui/material";
import {
  MdDescription,
  MdDownload,
  MdCalendarMonth,
  MdSearch,
  MdClose,
  MdVisibility,
  MdStore,
  MdEuro,
  MdInventory,
  MdFilterList,
  MdChevronRight 
} from "react-icons/md";
import { useIsMobile } from "../../hooks/useIsMobile";

const DocumentsTab = ({ isDesktop: propIsDesktop }) => {
  const isMobileHook = useIsMobile();
  const isMobile = propIsDesktop !== undefined ? !propIsDesktop : isMobileHook;
  const isDesktop = !isMobile;
  const [loading, setLoading] = useState(true);
  const [distributeurs, setDistributeurs] = useState([]);
  const [selectedDistributeur, setSelectedDistributeur] = useState("");
  const [availableMonths, setAvailableMonths] = useState([]);
  const [filteredMonths, setFilteredMonths] = useState([]);
  const [error, setError] = useState("");
  
  // Filtre
  const [filterYear, setFilterYear] = useState("");
  const [searchText, setSearchText] = useState("");
  
  // Preview Dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMonth, setPreviewMonth] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Charger la liste des distributeurs au montage
  useEffect(() => {
    fetchDistributeurs();
  }, []);

  // Charger les mois disponibles quand un distributeur est sélectionné
  useEffect(() => {
    if (selectedDistributeur) {
      fetchAvailableMonths(selectedDistributeur);
    } else {
      setAvailableMonths([]);
      setFilteredMonths([]);
      // Pas de distributeur sélectionné, arrêter le chargement si distributeurs déjà chargés
      if (distributeurs.length === 0) {
        setLoading(false);
      }
    }
  }, [selectedDistributeur, distributeurs.length]);

  // Appliquer les filtres
  useEffect(() => {
    let filtered = [...availableMonths];
    
    // Filtre par année
    if (filterYear) {
      filtered = filtered.filter(m => m.year === parseInt(filterYear));
    }
    
    // Filtre par recherche texte
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(m => 
        m.month_name.toLowerCase().includes(search) ||
        m.label.toLowerCase().includes(search)
      );
    }
    
    setFilteredMonths(filtered);
  }, [availableMonths, filterYear, searchText]);

  const fetchDistributeurs = async () => {
    try {
      const response = await axios.get("/api/distributeurs/");
      setDistributeurs(response.data || []);
      // Sélectionner automatiquement le premier distributeur si disponible
      if (response.data && response.data.length > 0) {
        setSelectedDistributeur(response.data[0].id);
      } else {
        // Aucun distributeur : arrêter le chargement
        setLoading(false);
      }
    } catch (error) {
      console.error("Erreur chargement distributeurs:", error);
      setError("Erreur lors du chargement des distributeurs");
      setLoading(false);
    }
  };

  const fetchAvailableMonths = async (distributeurId) => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(`/api/distributeur-available-months/${distributeurId}/`);
      setAvailableMonths(response.data.months || []);
    } catch (error) {
      console.error("Erreur chargement mois disponibles:", error);
      setError("Erreur lors du chargement des rapports mensuels");
      setAvailableMonths([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = (monthData) => {
    setPreviewMonth(monthData);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewMonth(null);
  };

  const handleDownloadPdf = async () => {
    if (!previewMonth || !selectedDistributeur) return;
    
    try {
      setDownloadLoading(true);
      const response = await axios.get(
        `/api/generate-distributeur-monthly-pdf/${selectedDistributeur}/`,
        {
          params: {
            month: previewMonth.month,
            year: previewMonth.year,
          },
          responseType: 'blob',
        }
      );
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${previewMonth.label.replace(' ', '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur téléchargement PDF:", error);
      setError("Erreur lors du téléchargement du PDF");
    } finally {
      setDownloadLoading(false);
    }
  };

  // Extraire les années uniques pour le filtre
  const uniqueYears = [...new Set(availableMonths.map(m => m.year))].sort((a, b) => b - a);

  const getPreviewUrl = useCallback(() => {
    if (!previewMonth || !selectedDistributeur) return "";
    return `/api/preview-distributeur-monthly-report/${selectedDistributeur}/?month=${previewMonth.month}&year=${previewMonth.year}`;
  }, [previewMonth, selectedDistributeur]);

  // Render month card
  const renderMonthCard = (monthData) => (
    <Paper
      key={`${monthData.year}-${monthData.month}`}
      elevation={0}
      onClick={() => handleOpenPreview(monthData)}
      sx={{
        p: isDesktop ? 2.5 : 2,
        borderRadius: isDesktop ? "16px" : "20px",
        border: "1px solid",
        borderColor: "divider",
        cursor: "pointer",
        transition: "all 0.2s ease",
        bgcolor: "background.paper",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: "100%",
        "&:active": isMobile ? {
          transform: "scale(0.98)",
          bgcolor: "grey.50"
        } : {},
        "&:hover": isDesktop ? {
          transform: "translateY(-4px)",
          boxShadow: "0 12px 24px rgba(0,0,0,0.1)",
          borderColor: "primary.main"
        } : {},
      }}
    >
      {/* Header avec icône calendrier */}
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: "16px",
          bgcolor: "primary.50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "primary.main",
          flexShrink: 0
        }}
      >
        <MdCalendarMonth size={28} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 900,
            color: "text.primary",
            lineHeight: 1.2,
            fontSize: "1.05rem",
          }}
        >
          {monthData.month_name} {monthData.year}
        </Typography>
        
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: "success.main", fontWeight: 800 }}>
              {monthData.ca?.toFixed(2)}€
            </Typography>
          </Box>
          <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "divider" }} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 800 }}>
              {monthData.unites} unités
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ 
        width: 36, 
        height: 36, 
        borderRadius: "50%", 
        bgcolor: "grey.50", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "text.disabled"
      }}>
        <MdChevronRight size={24} />
      </Box>
    </Paper>
  );

  if (loading && distributeurs.length === 0) {
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
    <Box sx={{ p: isDesktop ? 0 : 2, pb: isDesktop ? 4 : 10, bgcolor: isDesktop ? "transparent" : "grey.50", minHeight: "100%" }}>
      {/* Header - masqué sur desktop car géré par DesktopAppLayout */}
      {!isDesktop && (
        <Box sx={{ mb: 4, mt: 1 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              letterSpacing: "-1px",
              color: "text.primary",
              mb: 0.5
            }}
          >
            Rapports Mensuels
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
            Archives et documents
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "16px" }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Sélecteur de distributeur & Filtres - Groupés */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "24px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
            <Box sx={{ p: 1, borderRadius: "10px", bgcolor: "primary.50", color: "primary.main" }}>
              <MdStore size={22} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
              Distributeur
            </Typography>
          </Box>
          <TextField
            select
            fullWidth
            size="medium"
            value={selectedDistributeur}
            onChange={(e) => setSelectedDistributeur(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                bgcolor: "grey.50",
                fontWeight: 700,
                "& fieldset": { borderColor: "transparent" },
                "&:hover fieldset": { borderColor: "primary.light" },
                "&.Mui-focused fieldset": { borderColor: "primary.main" },
              },
            }}
          >
            {distributeurs.map((dist) => (
              <MenuItem key={dist.id} value={dist.id} sx={{ fontWeight: 600 }}>
                {dist.nom} {dist.emplacement ? `(${dist.emplacement})` : ""}
              </MenuItem>
            ))}
          </TextField>
        </Paper>

        {availableMonths.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "24px",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
              <Box sx={{ p: 1, borderRadius: "10px", bgcolor: "primary.50", color: "primary.main" }}>
                <MdFilterList size={22} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                Recherche
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={5}>
                <TextField
                  select
                  fullWidth
                  label="Année"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "14px",
                      bgcolor: "grey.50",
                      fontWeight: 700,
                      "& fieldset": { borderColor: "transparent" },
                    },
                  }}
                >
                  <MenuItem value="">Toutes</MenuItem>
                  {uniqueYears.map((year) => (
                    <MenuItem key={year} value={year} sx={{ fontWeight: 600 }}>
                      {year}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={7}>
                <TextField
                  fullWidth
                  placeholder="Mois..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MdSearch size={22} color="#999" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "14px",
                      bgcolor: "grey.50",
                      fontWeight: 700,
                      "& fieldset": { borderColor: "transparent" },
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Liste des mois */}
      {!loading && selectedDistributeur && (
        <Box sx={{ mt: 2 }}>
          {filteredMonths.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: "32px",
                border: "2px dashed",
                borderColor: "divider",
                bgcolor: "transparent",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: "50%", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <MdDescription size={48} color="#ccc" />
              </Box>
              <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
                {availableMonths.length === 0
                  ? "Aucun rapport disponible"
                  : "Aucun résultat pour ces filtres"}
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={isDesktop ? 3 : 2}>
              {filteredMonths.map((monthData) => (
                <Grid item xs={12} md={isDesktop ? 6 : 12} lg={isDesktop ? 4 : 12} key={`${monthData.year}-${monthData.month}`}>
                  {renderMonthCard(monthData)}
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Dialog Preview - Plein écran sur mobile ET desktop */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: "background.default",
            backgroundImage: "none",
          },
        }}
      >
        {/* Header moderne plein écran */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            py: 2,
            px: isDesktop ? 4 : 2.5,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton 
              onClick={handleClosePreview} 
              sx={{ 
                bgcolor: "grey.100", 
                borderRadius: "12px",
                width: 44,
                height: 44,
              }}
            >
              <MdClose size={22} />
            </IconButton>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "14px",
                bgcolor: "primary.50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "primary.main",
              }}
            >
              <MdDescription size={24} />
            </Box>
            <Box>
              <Typography variant={isDesktop ? "h6" : "subtitle1"} sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                {previewMonth?.month_name} {previewMonth?.year}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Rapport mensuel détaillé
              </Typography>
            </Box>
          </Box>
          
          {/* Boutons d'action à droite sur desktop */}
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="outlined"
              onClick={handleClosePreview}
              sx={{
                borderRadius: "12px",
                py: 1,
                px: 3,
                fontWeight: 700,
                textTransform: "none",
                borderColor: "divider",
                color: "text.primary",
                display: { xs: "none", md: "flex" }
              }}
            >
              Fermer
            </Button>
            <Button
              variant="contained"
              onClick={handleDownloadPdf}
              disabled={downloadLoading}
              startIcon={downloadLoading ? <CircularProgress size={18} color="inherit" /> : <MdDownload size={20} />}
              sx={{
                borderRadius: "12px",
                py: 1,
                px: 3,
                fontWeight: 700,
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(25, 118, 210, 0.25)",
              }}
            >
              {downloadLoading ? "Génération..." : "Télécharger PDF"}
            </Button>
          </Box>
        </Box>

        {/* Contenu - iframe pleine page */}
        <Box
          sx={{
            flex: 1,
            overflow: "hidden",
            bgcolor: "grey.100",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {previewMonth && (
            <iframe
              src={getPreviewUrl()}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                flex: 1,
              }}
              title="Preview du rapport"
            />
          )}
        </Box>

        {/* Footer mobile uniquement */}
        {isMobile && (
          <Box
            sx={{
              p: 2,
              bgcolor: "background.paper",
              borderTop: "1px solid",
              borderColor: "divider",
              display: "flex",
              gap: 2,
              flexDirection: "column",
            }}
          >
            <Button
              variant="contained"
              onClick={handleDownloadPdf}
              disabled={downloadLoading}
              fullWidth
              startIcon={downloadLoading ? <CircularProgress size={20} color="inherit" /> : <MdDownload size={22} />}
              sx={{
                borderRadius: "14px",
                py: 1.5,
                fontWeight: 800,
                textTransform: "none",
                fontSize: "1rem",
                boxShadow: "0 8px 20px rgba(25, 118, 210, 0.3)",
              }}
            >
              {downloadLoading ? "Génération..." : "Télécharger le PDF"}
            </Button>
          </Box>
        )}
      </Dialog>
    </Box>
  );
};

export default DocumentsTab;
