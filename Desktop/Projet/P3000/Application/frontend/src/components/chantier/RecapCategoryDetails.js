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
import axios from "axios";
import React from "react";
import { FaTimes } from "react-icons/fa";

const RecapCategoryDetails = ({
  open,
  documents,
  title,
  onClose,
  category,
  chantierId,
  periode,
  refreshRecap,
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

  // Ajout pour édition des paiements matériel
  const [fournisseurs, setFournisseurs] = React.useState([]);
  const [paiements, setPaiements] = React.useState({}); // { fournisseur: montant }
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  React.useEffect(() => {
    if (category === "materiel" && open) {
      // Récupérer tous les fournisseurs depuis le modèle Fournisseur
      axios.get("/api/fournisseurs/").then((res) => {
        // On suppose que chaque fournisseur a un champ name_fournisseur
        const fournisseursList = res.data.map((f) => f.name);
        setFournisseurs(fournisseursList);
        // Pré-remplir avec les montants existants
        const paiementsInit = {};
        documents.forEach((doc) => {
          if (doc.fournisseur) {
            paiementsInit[doc.fournisseur] = doc.montant;
          }
        });
        setPaiements(paiementsInit);
      });
    }
    // eslint-disable-next-line
  }, [category, open, documents]);

  const handleChangeMontant = (fournisseur, value) => {
    setPaiements((prev) => ({ ...prev, [fournisseur]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload = fournisseurs
        .filter((f) => paiements[f] && !isNaN(Number(paiements[f])))
        .map((f) => ({
          fournisseur: f,
          montant: Number(paiements[f]),
          mois: periode.mois,
          annee: periode.annee,
        }));
      await axios.post(
        `/api/chantier/${chantierId}/paiements-materiel/`,
        payload
      );
      setSaveSuccess(true);
      if (refreshRecap) refreshRecap();
    } catch (e) {
      setSaveError("Erreur lors de la sauvegarde des paiements matériel.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

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
        {/* Tableau édition matériel */}
        {category === "materiel" && (
          <Box mb={2}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Paiements matériel par fournisseur (mois/année)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fournisseur</TableCell>
                    <TableCell>Montant (€)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fournisseurs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        Aucun fournisseur
                      </TableCell>
                    </TableRow>
                  ) : (
                    fournisseurs.map((f) => (
                      <TableRow key={f}>
                        <TableCell>{f}</TableCell>
                        <TableCell>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={paiements[f] || ""}
                            onChange={(e) =>
                              handleChangeMontant(f, e.target.value)
                            }
                            style={{ width: 100 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box mt={1} display="flex" alignItems="center" gap={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
              >
                Sauvegarder
              </Button>
              {saveSuccess && (
                <Typography color="success.main">Sauvegardé !</Typography>
              )}
              {saveError && (
                <Typography color="error.main">{saveError}</Typography>
              )}
            </Box>
          </Box>
        )}
        {/* Tableau classique pour les autres catégories */}
        {category !== "materiel" && (
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
                                const year = d
                                  .getFullYear()
                                  .toString()
                                  .slice(-2);
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
        )}
      </Paper>
    </Collapse>
  );
};

export default RecapCategoryDetails;
