import {
  Box,
  Button,
  Collapse,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React from "react";
import { FaTimes } from "react-icons/fa";

const RecapCategoryDetails = ({
  open,
  documents,
  title,
  onClose,
  category,
}) => {
  // Fonction pour définir dynamiquement les colonnes selon la catégorie
  function getColumnsForCategory(cat) {
    switch (cat) {
      case "main_oeuvre":
        return [
          { label: "Agent", key: "agent" },
          { label: "Mois", key: "mois" },
          { label: "Heures", key: "heures" },
          { label: "Montant", key: "montant" },
        ];
      case "materiel":
        return [
          { label: "N°", key: "numero" },
          { label: "Date", key: "date" },
          { label: "Montant", key: "montant" },
          { label: "Statut", key: "statut" },
          { label: "Fournisseur", key: "fournisseur" },
        ];
      case "sous_traitant":
        return [
          { label: "N°", key: "numero" },
          { label: "Date", key: "date" },
          { label: "Montant", key: "montant" },
          { label: "Sous-traitant", key: "sous_traitant" },
        ];
      default:
        return [
          { label: "N°", key: "numero" },
          { label: "Date", key: "date" },
          { label: "Montant", key: "montant" },
          { label: "Statut", key: "statut" },
        ];
    }
  }

  const columns = getColumnsForCategory(category);

  // Pour main_oeuvre : regrouper par agent et mois
  let displayDocuments = documents;
  if (category === "main_oeuvre" && documents && documents.length > 0) {
    // Regrouper par agent/mois
    const grouped = {};
    documents.forEach((doc) => {
      if (!doc.agent) return;
      // Extraire le mois/année à partir de la date
      let mois = "-";
      if (doc.date) {
        const d = new Date(doc.date);
        mois = ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
      }
      const key = doc.agent + "_" + mois;
      if (!grouped[key]) {
        grouped[key] = {
          agent: doc.agent,
          mois,
          heures: 0,
          montant: 0,
        };
      }
      grouped[key].heures += doc.heures || 0;
      grouped[key].montant += doc.montant || 0;
    });
    displayDocuments = Object.values(grouped);
  }

  return (
    <Collapse in={open} timeout="auto" unmountOnExit>
      <Paper elevation={3} sx={{ mt: 2, p: 2 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Détails {title}</Typography>
          <Button
            onClick={onClose}
            startIcon={<FaTimes />}
            color="error"
            size="small"
          >
            Fermer
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.key}>{col.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {documents && documents.length > 0 ? (
                displayDocuments.map((doc, idx) => (
                  <TableRow key={doc.id || idx}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {col.key === "montant" && doc.montant !== undefined
                          ? Number(doc.montant).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                            }) + " €"
                          : col.key === "heures" && doc.heures !== undefined
                          ? Number(doc.heures).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                            })
                          : col.key === "date" && doc.date
                          ? (() => {
                              const d = new Date(doc.date);
                              const day = ("0" + d.getDate()).slice(-2);
                              const month = ("0" + (d.getMonth() + 1)).slice(
                                -2
                              );
                              const year = d.getFullYear().toString().slice(-2);
                              return `${day}/${month}/${year}`;
                            })()
                          : doc[col.key] || "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    Aucun document
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Collapse>
  );
};

export default RecapCategoryDetails;
