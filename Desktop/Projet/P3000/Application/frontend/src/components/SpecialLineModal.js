import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import React, { useState } from "react";

const SpecialLineModal = ({ open, onClose, onSave }) => {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [valueType, setValueType] = useState("percentage"); // 'percentage' ou 'fixed'
  const [type, setType] = useState("reduction"); // 'reduction' ou 'addition'

  // Nouvelle fonction pour valider l'entrée
  const handleValueChange = (e) => {
    const input = e.target.value;
    // Autoriser uniquement les chiffres, le point décimal et le champ vide
    if (input === "" || /^\d*\.?\d*$/.test(input)) {
      setValue(input);
    }
  };

  const handleSave = () => {
    // Vérifier si la valeur est valide avant de sauvegarder
    if (!value || isNaN(parseFloat(value))) {
      alert("Veuillez entrer une valeur numérique valide");
      return;
    }

    onSave({
      description,
      value: parseFloat(value),
      isHighlighted,
      valueType,
      type,
    });
    // Réinitialiser les champs
    setDescription("");
    setValue("");
    setIsHighlighted(false);
    setValueType("percentage");
    setType("reduction");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Ajouter une ligne spéciale</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Description"
          fullWidth
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <FormControl component="fieldset" sx={{ mt: 2 }}>
          <FormLabel component="legend">Type de valeur</FormLabel>
          <RadioGroup
            row
            value={valueType}
            onChange={(e) => setValueType(e.target.value)}
          >
            <FormControlLabel
              value="percentage"
              control={<Radio />}
              label="Pourcentage (%)"
            />
            <FormControlLabel
              value="fixed"
              control={<Radio />}
              label="Montant fixe (€)"
            />
          </RadioGroup>
        </FormControl>

        <FormControl component="fieldset" sx={{ mt: 2 }}>
          <FormLabel component="legend">Type d'opération</FormLabel>
          <RadioGroup
            row
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <FormControlLabel
              value="reduction"
              control={<Radio />}
              label="Réduction"
            />
            <FormControlLabel
              value="addition"
              control={<Radio />}
              label="Addition"
            />
          </RadioGroup>
        </FormControl>

        <TextField
          type="text" // Changé de "number" à "text" pour un meilleur contrôle
          label={valueType === "percentage" ? "Valeur (%)" : "Montant (€)"}
          value={value}
          onChange={handleValueChange}
          fullWidth
          margin="dense"
          inputProps={{
            inputMode: "decimal",
            pattern: "[0-9]*\\.?[0-9]*",
          }}
          error={value !== "" && isNaN(parseFloat(value))}
          helperText={
            value !== "" && isNaN(parseFloat(value))
              ? "Veuillez entrer un nombre valide"
              : ""
          }
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={isHighlighted}
              onChange={(e) => setIsHighlighted(e.target.checked)}
            />
          }
          label="Mettre en évidence"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSave}
          color="primary"
          disabled={!value || isNaN(parseFloat(value))}
        >
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SpecialLineModal;
