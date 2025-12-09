import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Divider,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import axios from "../utils/axiosConfig";

const SelectSocieteModal = ({ open, onClose, onSocieteSelect, filteredSocietes, onCreateNew }) => {
  const [societes, setSocietes] = useState([]);
  const [selectedSociete, setSelectedSociete] = useState("");

  useEffect(() => {
    const fetchSocietes = async () => {
      try {
        // Si des sociétés filtrées sont fournies, les utiliser, sinon charger toutes les sociétés
        if (filteredSocietes && filteredSocietes.length > 0) {
          setSocietes(filteredSocietes);
        } else {
          const response = await axios.get("/api/societe/");
          setSocietes(response.data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des sociétés:", error);
      }
    };

    if (open) {
      // ✅ Réinitialiser la sélection quand le modal s'ouvre
      setSelectedSociete("");
      fetchSocietes();
    } else {
      // ✅ Réinitialiser aussi quand le modal se ferme
      setSelectedSociete("");
    }
  }, [open, filteredSocietes]);

  const handleSubmit = () => {
    if (!selectedSociete) {
      return;
    }
    onSocieteSelect(selectedSociete);
    // ✅ Réinitialiser après la soumission
    setSelectedSociete("");
    onClose();
  };
  
  const handleClose = () => {
    // ✅ Réinitialiser lors de la fermeture
    setSelectedSociete("");
    onClose();
  };

  const handleCreateNew = () => {
    handleClose();
    if (onCreateNew) {
      onCreateNew();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Sélectionner une Société</DialogTitle>
      <DialogContent>
        {onCreateNew && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FiPlus />}
              fullWidth
              onClick={handleCreateNew}
              sx={{ mb: 2 }}
            >
              Créer une nouvelle société
            </Button>
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                ou sélectionner une société existante
              </Typography>
            </Divider>
          </Box>
        )}
        <Box sx={{ mt: onCreateNew ? 0 : 2 }}>
          <FormControl fullWidth>
            <InputLabel>Société</InputLabel>
            <Select
              value={selectedSociete}
              onChange={(e) => setSelectedSociete(e.target.value)}
              label="Société"
              displayEmpty
            >
              {societes.length === 0 ? (
                <MenuItem disabled value="">
                  <em>Aucune société disponible</em>
                </MenuItem>
              ) : (
                societes.map((societe) => (
                  <MenuItem key={societe.id} value={societe.id}>
                    {societe.nom_societe}
                    {societe.ville_societe && ` - ${societe.ville_societe}`}
                    {societe.codepostal_societe && ` (${societe.codepostal_societe})`}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!selectedSociete}
        >
          Sélectionner
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SelectSocieteModal;
