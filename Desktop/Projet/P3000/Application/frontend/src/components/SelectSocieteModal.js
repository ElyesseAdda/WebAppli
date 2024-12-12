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
} from "@mui/material";
import React, { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";

const SelectSocieteModal = ({ open, onClose, onSocieteSelect }) => {
  const [societes, setSocietes] = useState([]);
  const [selectedSociete, setSelectedSociete] = useState("");

  useEffect(() => {
    const fetchSocietes = async () => {
      try {
        const response = await axios.get("/api/societe/");
        setSocietes(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des sociétés:", error);
      }
    };

    if (open) {
      fetchSocietes();
    }
  }, [open]);

  const handleSubmit = () => {
    onSocieteSelect(selectedSociete);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Sélectionner une Société</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Société</InputLabel>
            <Select
              value={selectedSociete}
              onChange={(e) => setSelectedSociete(e.target.value)}
              label="Société"
            >
              {societes.map((societe) => (
                <MenuItem key={societe.id} value={societe.id}>
                  {societe.nom_societe}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
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
