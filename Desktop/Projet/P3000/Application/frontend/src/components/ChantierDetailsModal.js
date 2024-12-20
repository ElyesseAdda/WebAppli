import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import React, { useState } from "react";

const ChantierDetailsModal = ({ open, onClose, onSubmit, initialData }) => {
  const [chantierDetails, setChantierDetails] = useState({
    date_debut: "",
    date_fin: "",
    montant_ttc: "",
    montant_ht: "",
    state_chantier: "En Cours",
    cout_materiel: "",
    cout_main_oeuvre: "",
    cout_sous_traitance: "",
    description: "",
    ...initialData,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setChantierDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    if (!chantierDetails.montant_ht || !chantierDetails.montant_ttc) {
      alert("Les montants HT et TTC sont obligatoires");
      return;
    }
    onSubmit(chantierDetails);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Détails du Chantier</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          margin="normal"
          name="date_debut"
          label="Date de début"
          type="date"
          value={chantierDetails.date_debut}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          fullWidth
          margin="normal"
          name="date_fin"
          label="Date de fin (optionnel)"
          type="date"
          value={chantierDetails.date_fin || ""}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>État du chantier</InputLabel>
          <Select
            name="state_chantier"
            value={chantierDetails.state_chantier}
            onChange={handleChange}
          >
            <MenuItem value="En Cours">En Cours</MenuItem>
            <MenuItem value="Terminé">Terminé</MenuItem>
            <MenuItem value="En Attente">En Attente</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          margin="normal"
          name="cout_materiel"
          label="Coût matériel"
          type="number"
          value={chantierDetails.cout_materiel || ""}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="normal"
          name="cout_main_oeuvre"
          label="Coût main d'œuvre"
          type="number"
          value={chantierDetails.cout_main_oeuvre || ""}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="normal"
          name="cout_sous_traitance"
          label="Coût sous-traitance"
          type="number"
          value={chantierDetails.cout_sous_traitance || ""}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="normal"
          name="description"
          label="Description"
          multiline
          rows={4}
          value={chantierDetails.description || ""}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          required
          margin="normal"
          name="montant_ht"
          label="Montant HT"
          type="number"
          value={chantierDetails.montant_ht}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          required
          margin="normal"
          name="montant_ttc"
          label="Montant TTC"
          type="number"
          value={chantierDetails.montant_ttc}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Finaliser la création
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChantierDetailsModal;
