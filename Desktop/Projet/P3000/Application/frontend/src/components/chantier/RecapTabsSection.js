import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveIcon from "@mui/icons-material/Remove";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab
} from "@mui/material";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import IconButton from "@mui/material/IconButton";
import { ResponsivePie } from "@nivo/pie";
import React, { useEffect, useState } from "react";
import RecapCategoryDetails from "./RecapCategoryDetails";
import RecapDepenseDocumentsPanel from "./RecapDepenseDocumentsPanel";

// Sous-composant pour un affichage moderne des catégories
const CategoryCard = ({
  title,
  amount,
  color,
  isHidden,
  onToggleVisibility,
  onMouseEnter,
  onMouseLeave,
  categoryKey,
  showDocumentsPane,
  isSelected,
  onSelectCategory,
}) => (
  <Card
    elevation={0}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onClick={() => {
      if (showDocumentsPane && onSelectCategory) {
        onSelectCategory(categoryKey);
      } else {
        onToggleVisibility?.();
      }
    }}
    sx={{
      height: "100%",
      borderRadius: 3,
      border: "2px solid",
      borderColor: showDocumentsPane && isSelected ? color : "divider",
      position: "relative",
      overflow: "hidden",
      transition: "all 0.2s",
      opacity: isHidden ? 0.5 : 1,
      cursor: "pointer",
      boxShadow:
        showDocumentsPane && isSelected
          ? `0 4px 20px 0 ${color}33`
          : "none",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
      },
    }}
  >
    {showDocumentsPane ? (
      <IconButton
        size="small"
        aria-label={isHidden ? "Afficher dans le graphique" : "Masquer du graphique"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility?.();
        }}
        sx={{
          position: "absolute",
          top: 4,
          right: 4,
          zIndex: 1,
          bgcolor: "background.paper",
          boxShadow: 1,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {isHidden ? (
          <VisibilityOffIcon fontSize="small" />
        ) : (
          <VisibilityIcon fontSize="small" />
        )}
      </IconButton>
    ) : null}
    {/* Ligne de couleur d'accentuation sur la gauche */}
    <Box
      sx={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "4px",
        bgcolor: isHidden ? "#ccc" : color,
      }}
    />
    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Typography
          variant="body2"
          color="text.secondary"
          fontWeight={600}
          sx={{
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontSize: "0.7rem",
            textDecoration: isHidden ? "line-through" : "none",
            pr: showDocumentsPane ? 4 : 0,
          }}
        >
          {title}
        </Typography>
      </Box>
      
      <Typography 
        variant="h6" 
        style={{ color: isHidden ? '#9e9e9e' : color }}
        sx={{ 
          fontWeight: 700, 
          display: 'flex', 
          alignItems: 'baseline', 
          gap: 0.5,
          textDecoration: isHidden ? 'line-through' : 'none'
        }}
      >
        {amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
        <Typography component="span" variant="body2" fontWeight={600} style={{ color: isHidden ? '#9e9e9e' : color }}>€</Typography>
      </Typography>
    </CardContent>
  </Card>
);

const RecapTabsSection = ({
  title,
  tabs, // Array of { label: string, data: object }
  colors,
  chantierId,
  periode,
  refreshRecap,
  showDocumentsPane = false,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [openDetails, setOpenDetails] = useState({});
  const [detailsMode, setDetailsMode] = useState(false);
  const [generalAccordionOpen, setGeneralAccordionOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState(null);
  /** Onglet Tableau / Documents du panneau droit « Détails dépenses » (largeur colonne fixe 5/12 + 7/12) */
  const [depensePaneMode, setDepensePaneMode] = useState("tableau");

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // Optionnel : réinitialiser l'état lors du changement d'onglet
    setOpenDetails({});
    setDetailsMode(false);
    setGeneralAccordionOpen(false);
    setHoveredCategory(null);
    setHiddenCategories([]);
    const keys = Object.keys(tabs[newValue]?.data || {});
    setSelectedExpenseCategory(keys[0] || null);
    if (showDocumentsPane) setDepensePaneMode("tableau");
  };

  const data = tabs[currentTab].data;
  const categoryKeys = Object.keys(data || {});
  const effectiveExpenseCategory =
    selectedExpenseCategory && categoryKeys.includes(selectedExpenseCategory)
      ? selectedExpenseCategory
      : categoryKeys[0] || null;

  useEffect(() => {
    if (showDocumentsPane) setDepensePaneMode("tableau");
  }, [effectiveExpenseCategory, showDocumentsPane]);

  // Définir les couleurs fixes pour chaque catégorie
  const fixedColors = {
    materiel: "#FF9800", // orange
    main_oeuvre: "#2196F3", // bleu
    sous_traitant: "#4CAF50", // vert
  };

  // Fonction pour masquer/afficher une catégorie
  const handleToggleCategory = (cat) => {
    setHiddenCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Préparer les données pour Nivo Pie (en filtrant les catégories masquées)
  const pieData = Object.keys(data)
    .filter((cat) => !hiddenCategories.includes(cat))
    .map((cat) => ({
      id: cat.replace("_", " ").toUpperCase(),
      label: cat.replace("_", " ").toUpperCase(),
      value: data[cat].total || 0,
      color: fixedColors[cat] || colors[cat] || "#8884d8",
      key: cat,
    }));

  // Calculer la somme totale (uniquement sur les catégories actives)
  const totalSum = pieData.reduce((acc, curr) => acc + (curr.value || 0), 0);

  // Déterminer dynamiquement la taille de police en fonction de la longueur du chiffre
  const getFontSize = (value) => {
    const length = String(Math.floor(value)).length;
    if (length <= 2) return 32;
    if (length === 3) return 28;
    if (length === 4) return 24;
    if (length === 5) return 20;
    if (length === 6) return 18;
    return 16;
  };

  // Gestion de l'ouverture/fermeture des détails
  const handleToggleDetails = (cat) => {
    setOpenDetails((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleToggleDetailsMode = () => {
    setDetailsMode((prev) => {
      if (prev) setOpenDetails({});
      if (!generalAccordionOpen) setGeneralAccordionOpen(true);
      else setGeneralAccordionOpen(false);
      return !prev;
    });
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 4, 
        boxShadow: '0 4px 24px 0 rgba(0,0,0,0.06)' 
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {title}
        </Typography>
      </Box>

      <Tabs 
        value={currentTab} 
        onChange={handleTabChange} 
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
      >
        {tabs.map((tab, index) => (
          <Tab key={index} label={tab.label} sx={{ fontWeight: 600 }} />
        ))}
      </Tabs>

      <Grid container spacing={3} alignItems="stretch">
        <Grid item xs={12} md={showDocumentsPane ? 5 : 12}>
          <Grid container spacing={3} alignItems="center">
        {/* Section Gauche : Textes dans des cartes */}
        <Grid item xs={12} md={showDocumentsPane ? 12 : 7}>
          <Grid container spacing={2}>
            {Object.keys(data).map((cat) => (
              <Grid item xs={12} sm={6} key={cat}>
                <CategoryCard 
                  title={cat.replace("_", " ")}
                  amount={data[cat].total || 0}
                  color={fixedColors[cat] || colors[cat] || "primary.main"}
                  isHidden={hiddenCategories.includes(cat)}
                  onToggleVisibility={() => handleToggleCategory(cat)}
                  categoryKey={cat}
                  showDocumentsPane={showDocumentsPane}
                  isSelected={showDocumentsPane && effectiveExpenseCategory === cat}
                  onSelectCategory={setSelectedExpenseCategory}
                  onMouseEnter={() => setHoveredCategory(cat.replace("_", " ").toUpperCase())}
                  onMouseLeave={() => setHoveredCategory(null)}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Section Droite : PieChart */}
        <Grid item xs={12} md={showDocumentsPane ? 12 : 5}>
          <Box sx={{ width: '100%', maxWidth: 240, height: 240, position: "relative", mx: "auto" }}>
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
              activeId={hoveredCategory}
              tooltip={({ datum }) => (
                <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {datum.label}
                  </Typography>
                  <Typography variant="body2">
                    {Number(datum.value).toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    €
                  </Typography>
                </Box>
              )}
            />
            {/* Afficher la somme totale au centre du Pie Chart */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h4"
                fontWeight={800}
                sx={{ fontSize: getFontSize(totalSum), color: 'text.primary' }}
              >
                {Number(totalSum).toLocaleString("fr-FR", {
                  minimumFractionDigits: 0,
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem' }}>
                Total
              </Typography>
            </Box>
          </Box>
        </Grid>
          </Grid>
        </Grid>

        {showDocumentsPane && chantierId ? (
          <Grid item xs={12} md={7} sx={{ minWidth: 0, maxWidth: "100%" }}>
            <RecapDepenseDocumentsPanel
              chantierId={chantierId}
              category={effectiveExpenseCategory}
              documents={
                effectiveExpenseCategory && data[effectiveExpenseCategory]
                  ? data[effectiveExpenseCategory].documents || []
                  : []
              }
              periode={periode}
              refreshRecap={refreshRecap}
              paneMode={depensePaneMode}
              onPaneModeChange={setDepensePaneMode}
            />
          </Grid>
        ) : null}
      </Grid>

      {/* Bouton pour activer/désactiver l'accordéon général (déplacé en bas à droite) */}
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <IconButton
          onClick={handleToggleDetailsMode}
          sx={{
            backgroundColor: detailsMode ? "#f5f5f5" : "transparent",
            border: "1px solid",
            borderColor: detailsMode ? "transparent" : "divider",
            width: 36,
            height: 36,
            transition: "all 0.2s",
          }}
        >
          {detailsMode ? (
            <RemoveIcon fontSize="small" sx={{ color: "#d32f2f" }} />
          ) : (
            <AddIcon fontSize="small" sx={{ color: "#1976d2" }} />
          )}
        </IconButton>
      </Box>

      {/* Accordéons de détails */}
      {detailsMode && generalAccordionOpen && (
        <Accordion
          expanded={true}
          onChange={handleToggleDetailsMode}
          square
          elevation={0}
          sx={{ mt: 4, background: "transparent", borderTop: '1px solid', borderColor: 'divider', pt: 2, '&:before': { display: 'none' } }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="general-details-content"
            id="general-details-header"
            sx={{ minHeight: 0, p: 0, mb: 2 }}
          >
            <Typography variant="subtitle1" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem' }}>
              Détails des opérations
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {Object.keys(data).map((cat) => (
              <Accordion
                key={cat}
                expanded={!!openDetails[cat]}
                onChange={() => handleToggleDetails(cat)}
                elevation={0}
                sx={{
                  mb: 1.5,
                  background: "transparent",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: '8px !important',
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`panel-${cat}-content`}
                  id={`panel-${cat}-header`}
                  sx={{ minHeight: 0, p: 1.5 }}
                >
                  <Box display="flex" alignItems="center" width="100%">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: fixedColors[cat] || colors[cat] || "primary.main",
                        mr: 2,
                      }}
                    />
                    <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {cat.replace("_", " ")}
                    </Typography>
                    <Box flexGrow={1} />
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: fixedColors[cat] || colors[cat] || "primary.main",
                        mr: 2,
                      }}
                    >
                      {Number(data[cat].total).toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      €
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, borderTop: '1px solid', borderColor: 'divider' }}>
                  <RecapCategoryDetails
                    open={!!openDetails[cat]}
                    documents={data[cat].documents}
                    title={cat.replace("_", " ").toUpperCase()}
                    onClose={() => handleToggleDetails(cat)}
                    category={cat}
                    chantierId={chantierId}
                    periode={periode}
                    refreshRecap={refreshRecap}
                  />
                </AccordionDetails>
              </Accordion>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );
};

export default RecapTabsSection;
