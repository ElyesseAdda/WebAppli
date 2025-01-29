import {
  Box,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";
import { MdDelete } from "react-icons/md";

const SpecialLinesOverview = ({ specialLines, onDelete }) => {
  const formatValue = (line) => {
    if (line.valueType === "percentage") {
      return `${line.value}%`;
    }
    return `${line.value}€`;
  };

  const renderSpecialLineGroup = (lines, title, groupId = null) => {
    if (!lines || (Array.isArray(lines) && lines.length === 0)) return null;

    return (
      <Card sx={{ mb: 2, backgroundColor: "#f5f5f5" }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
            {title}
          </Typography>
          {lines.map((line, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1,
                mb: 1,
                backgroundColor: line.isHighlighted ? "#fff3e0" : "white",
                borderRadius: 1,
                border: "1px solid",
                borderColor: line.isHighlighted ? "warning.main" : "grey.300",
              }}
            >
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {line.description || line.type}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Type: {line.type} | Valeur: {formatValue(line)}
                </Typography>
              </Box>
              <Tooltip title="Supprimer">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(groupId, index)}
                >
                  <MdDelete />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Ajout et retrait{" "}
      </Typography>

      {/* Lignes spéciales globales */}
      {renderSpecialLineGroup(
        specialLines.global,
        "Lignes spéciales globales",
        "global"
      )}

      {/* Lignes spéciales par partie */}
      {Object.entries(specialLines.parties || {}).map(([partieId, lines]) =>
        renderSpecialLineGroup(
          lines,
          `Lignes spéciales - Partie ${partieId}`,
          `parties-${partieId}`
        )
      )}

      {/* Lignes spéciales par sous-partie */}
      {Object.entries(specialLines.sousParties || {}).map(
        ([sousPartieId, lines]) =>
          renderSpecialLineGroup(
            lines,
            `Lignes spéciales - Sous-partie ${sousPartieId}`,
            `sousParties-${sousPartieId}`
          )
      )}
    </Box>
  );
};

export default SpecialLinesOverview;
