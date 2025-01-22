import {
  Box,
  IconButton,
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
import React, { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { RiPencilFill } from "react-icons/ri";
import EditLigneSpecialeModal from "./EditLigneSpecialeModal";

const LignesSpeciales = ({ devisId, specialLines, onSpecialLineChange }) => {
  const [lignesSpeciales, setLignesSpeciales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLigne, setSelectedLigne] = useState(null);

  useEffect(() => {
    if (devisId && devisId !== -1) {
      // Cas d'un devis existant
      loadLignesSpeciales();
    } else {
      // Cas d'un nouveau devis
      setLignesSpeciales(convertSpecialLinesToArray(specialLines));
      setLoading(false);
    }
  }, [devisId, specialLines]);

  const convertSpecialLinesToArray = (specialLines) => {
    const result = [];
    // Conversion des lignes globales
    specialLines.global?.forEach((line) => {
      result.push({
        ...line,
        niveau: "global",
      });
    });

    // Conversion des lignes par partie
    Object.entries(specialLines.parties || {}).forEach(([partieId, lines]) => {
      lines.forEach((line) => {
        result.push({
          ...line,
          niveau: "partie",
          partie: parseInt(partieId),
        });
      });
    });

    // Conversion des lignes par sous-partie
    Object.entries(specialLines.sousParties || {}).forEach(
      ([sousPartieId, lines]) => {
        lines.forEach((line) => {
          result.push({
            ...line,
            niveau: "sous_partie",
            sous_partie: parseInt(sousPartieId),
          });
        });
      }
    );

    return result;
  };

  const loadLignesSpeciales = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/ligne-speciale/", {
        params: { devis: devisId },
      });
      // Filtrer les lignes spéciales pour ne garder que celles du devis en cours
      const filteredLignes = response.data.filter(
        (ligne) => ligne.devis === parseInt(devisId)
      );
      setLignesSpeciales(filteredLignes);
      setError(null);
    } catch (err) {
      setError("Erreur lors du chargement des lignes spéciales");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (devisId && devisId !== -1) {
      // Suppression pour un devis existant
      try {
        await axios.delete(`/api/ligne-speciale/${id}/`);
        setLignesSpeciales((prev) => prev.filter((ligne) => ligne.id !== id));
      } catch (err) {
        console.error("Erreur lors de la suppression:", err);
      }
    } else {
      // Suppression pour un nouveau devis
      const updatedLines = lignesSpeciales.filter((ligne) => ligne.id !== id);
      setLignesSpeciales(updatedLines);
      onSpecialLineChange(convertArrayToSpecialLines(updatedLines));
    }
  };

  const convertArrayToSpecialLines = (lignesArray) => {
    const result = {
      global: [],
      parties: {},
      sousParties: {},
    };

    lignesArray.forEach((ligne) => {
      if (ligne.niveau === "global") {
        result.global.push(ligne);
      } else if (ligne.niveau === "partie") {
        if (!result.parties[ligne.partie]) {
          result.parties[ligne.partie] = [];
        }
        result.parties[ligne.partie].push(ligne);
      } else if (ligne.niveau === "sous_partie") {
        if (!result.sousParties[ligne.sous_partie]) {
          result.sousParties[ligne.sous_partie] = [];
        }
        result.sousParties[ligne.sous_partie].push(ligne);
      }
    });

    return result;
  };

  const handleEdit = async (ligne) => {
    try {
      setSelectedLigne(ligne);
      setEditModalOpen(true);
    } catch (error) {
      console.error("Erreur lors de l'édition:", error);
      alert("Une erreur est survenue lors de l'édition");
    }
  };

  const handleSaveEdit = async (updatedLigne) => {
    // Ajouter la validation avant la sauvegarde
    if (!updatedLigne.description || !updatedLigne.value) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (
      updatedLigne.value_type === "percentage" &&
      (updatedLigne.value < 0 || updatedLigne.value > 100)
    ) {
      alert("Le pourcentage doit être compris entre 0 et 100");
      return;
    }

    if (devisId && devisId !== -1) {
      try {
        const response = await axios.put(
          `/api/ligne-speciale/${updatedLigne.id}/`,
          updatedLigne
        );
        setLignesSpeciales((prev) =>
          prev.map((l) => (l.id === updatedLigne.id ? response.data : l))
        );
      } catch (err) {
        console.error("Erreur lors de la modification:", err);
      }
    } else {
      const updatedLines = lignesSpeciales.map((l) =>
        l.id === updatedLigne.id ? updatedLigne : l
      );
      setLignesSpeciales(updatedLines);
      onSpecialLineChange(convertArrayToSpecialLines(updatedLines));
    }
    setEditModalOpen(false);
  };

  if (loading) return <Box>Chargement des lignes spéciales...</Box>;
  if (error) return <Box color="error.main">{error}</Box>;

  return (
    <Box sx={{ mt: 2, marginBottom: "40px" }}>
      <Typography variant="h6" gutterBottom>
        Remise ou Ajout 
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: "primary.main", color: "white" }}>
            <TableRow>
              <TableCell sx={{ color: "white" }}>Description</TableCell>
              <TableCell sx={{ color: "white" }}>Valeur</TableCell>
              <TableCell sx={{ color: "white" }}>Type</TableCell>
              <TableCell sx={{ color: "white" }}>Niveau</TableCell>
              <TableCell sx={{ color: "white" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lignesSpeciales.map((ligne) => (
              <TableRow key={ligne.id}>
                <TableCell>{ligne.description}</TableCell>
                <TableCell>
                  {ligne.value} {ligne.value_type === "percentage" ? "%" : "€"}
                </TableCell>
                <TableCell>
                  {ligne.type === "reduction" ? "Réduction" : "Addition"}
                </TableCell>
                <TableCell>
                  {ligne.niveau === "partie"
                    ? `Partie ${ligne.partie}`
                    : ligne.niveau === "sous_partie"
                    ? `Sous-partie ${ligne.sous_partie}`
                    : "Global"}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(ligne)} sx={{ mr: 1 }}>
                    <RiPencilFill
                      style={{
                        color: "#4CAF50",
                        fontSize: "1.4rem",
                        border: "2px solid #4CAF50",
                        borderRadius: "4px",
                      }}
                    />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(ligne.id)}>
                    <FaTrash style={{ color: "red", fontSize: "1.2rem" }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <EditLigneSpecialeModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        ligne={selectedLigne}
        onSave={handleSaveEdit}
      />
    </Box>
  );
};

export default LignesSpeciales;
