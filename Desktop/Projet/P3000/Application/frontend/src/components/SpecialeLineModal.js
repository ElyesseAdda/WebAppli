import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
} from '@mui/material';

const SpecialLineModal = ({ open, onClose, onSave }) => {
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [valueType, setValueType] = useState('percentage'); // 'percentage' ou 'fixed'
  const [type, setType] = useState('reduction'); // 'reduction' ou 'addition'

  const handleSave = () => {
    onSave({
      description,
      value: parseFloat(value),
      isHighlighted,
      valueType,
      type,
    });
    // Réinitialiser les champs
    setDescription('');
    setValue('');
    setIsHighlighted(false);
    setValueType('percentage');
    setType('reduction');
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
          type="number"
          label={valueType === 'percentage' ? 'Valeur (%)' : 'Montant (€)'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          fullWidth
          margin="dense"
          step="0.01"
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
        <Button onClick={handleSave} color="primary">
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SpecialLineModal;