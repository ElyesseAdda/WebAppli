import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import IconButton from "@mui/material/IconButton";
import { ResponsivePie } from "@nivo/pie";
import React, { useState } from "react";
import RecapCategoryDetails from "./RecapCategoryDetails";

const RecapSection = ({
  title,
  data,
  colors,
  chantierId,
  periode,
  refreshRecap,
}) => {
  const [openDetails, setOpenDetails] = useState({});
  const [detailsMode, setDetailsMode] = useState(false);
  const [generalAccordionOpen, setGeneralAccordionOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hiddenCategories, setHiddenCategories] = useState([]);

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
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        alignItems="flex-start"
        gap={4}
      >
        {/* PieChart Nivo */}
        <Box sx={{ width: 220, height: 220, position: "relative" }}>
          <ResponsivePie
            data={pieData}
            margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
            innerRadius={0.6}
            padAngle={1}
            cornerRadius={3}
            colors={{ datum: "data.color" }}
            borderWidth={1}
            borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
            enableArcLabels={false}
            enableArcLinkLabels={false}
            activeInnerRadiusOffset={8}
            activeOuterRadiusOffset={8}
            activeId={hoveredCategory}
            tooltip={({ datum }) => (
              <Box sx={{ p: 1 }}>
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
            <Box display="flex" alignItems="center">
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ fontSize: getFontSize(totalSum) }}
              >
                {Number(totalSum).toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ fontSize: getFontSize(totalSum) * 0.7, ml: 0.5 }}
              >
                €
              </Typography>
            </Box>
          </Box>
        </Box>
        {/* Totaux par catégorie (résumé à droite du cercle, cliquable pour masquer/afficher) */}
        <Box flex={1}>
          <List>
            {Object.keys(data).map((cat) => (
              <ListItem
                key={cat}
                disableGutters
                onClick={() => handleToggleCategory(cat)}
                onMouseEnter={() =>
                  setHoveredCategory(cat.replace("_", " ").toUpperCase())
                }
                onMouseLeave={() => setHoveredCategory(null)}
                sx={{
                  transition: "background 0.2s",
                  minHeight: 32,
                  py: 0.2,
                  cursor: "pointer",
                  opacity: hiddenCategories.includes(cat) ? 0.4 : 1,
                  textDecoration: hiddenCategories.includes(cat)
                    ? "line-through"
                    : "none",
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          backgroundColor:
                            fixedColors[cat] || colors[cat] || "primary.main",
                          mr: 1,
                          border: "1px solid #ccc",
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: 15,
                          fontWeight: 500,
                          textTransform: "capitalize",
                          color: "text.primary",
                          letterSpacing: 0.2,
                        }}
                      >
                        {cat.replace("_", " ")}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: 13,
                        color:
                          fixedColors[cat] || colors[cat] || "primary.main",
                      }}
                    >
                      {Number(data[cat].total).toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      €
                    </Typography>
                  }
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleDetails(cat);
                  }}
                  sx={{ ml: 1 }}
                ></IconButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>
      {/* Bouton pour activer/désactiver l'accordéon général */}
      <Box display="flex" justifyContent="flex-end" mt={2}>
        <IconButton
          onClick={handleToggleDetailsMode}
          sx={{
            backgroundColor: detailsMode ? "#eee" : "#fff",
            border: "1px solid #ccc",
            width: 40,
            height: 40,
            transition: "background 0.2s",
          }}
        >
          {detailsMode ? (
            <RemoveIcon fontSize="medium" sx={{ color: "#f44336" }} />
          ) : (
            <AddIcon fontSize="medium" sx={{ color: "#2196F3" }} />
          )}
        </IconButton>
      </Box>
      {/* Accordéons de détails et bouton en dehors du bloc principal */}
      {detailsMode && generalAccordionOpen && (
        <Accordion
          expanded
          square
          elevation={0}
          sx={{ mt: 3, background: "transparent", boxShadow: "none" }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="general-details-content"
            id="general-details-header"
            sx={{ cursor: "default", minHeight: 0, p: 0 }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Détails
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {Object.keys(data).map((cat) => (
              <Accordion
                key={cat}
                expanded={!!openDetails[cat]}
                onChange={() => handleToggleDetails(cat)}
                square
                sx={{
                  mb: 1,
                  background: "white",
                  borderRadius: 1,
                  boxShadow: "none",
                  border: "1px solid #eee",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`panel-${cat}-content`}
                  id={`panel-${cat}-header`}
                  sx={{ minHeight: 0, p: 1 }}
                >
                  <Box display="flex" alignItems="center">
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        backgroundColor:
                          fixedColors[cat] || colors[cat] || "primary.main",
                        mr: 1.5,
                        border: "1px solid #ccc",
                      }}
                    />
                    <Typography variant="body1" fontWeight={700}>
                      {cat.replace("_", " ").toUpperCase()}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color:
                          fixedColors[cat] || colors[cat] || "primary.main",
                        ml: 2,
                      }}
                    >
                      {Number(data[cat].total).toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      €
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
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

export default RecapSection;
