import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Box,
} from "@mui/material";
import React from "react";

const StatusChangeModal = ({
  open,
  onClose,
  currentStatus,
  onStatusChange,
  statusOptions,
  title,
  type = "devis",
  currentDatePaiement,
}) => {
  const [selectedStatus, setSelectedStatus] = React.useState(currentStatus);
  const [datePaiement, setDatePaiement] = React.useState(
    currentDatePaiement || ""
  );

  const getStatusOptions = () => {
    if (type === "facture") {
      return ["En cours", "Attente paiement", "Payée"];
    }
    return ["En attente", "Validé", "Refusé"];
  };

  const handleSubmit = () => {
    // Si le statut est "Payée" et qu'il s'agit d'une facture, envoyer aussi la date de paiement
    if (type === "facture" && selectedStatus === "Payée") {
      onStatusChange(selectedStatus, datePaiement);
    } else {
      onStatusChange(selectedStatus);
    }
    onClose();
  };

  // Fonction pour obtenir la date du jour au format YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  React.useEffect(() => {
    setSelectedStatus(currentStatus);
    // Si une date de paiement existe, l'utiliser, sinon pré-remplir avec la date du jour
    setDatePaiement(currentDatePaiement || getTodayDate());
  }, [currentStatus, currentDatePaiement, open]);

  // Lorsque "Payée" est sélectionné et qu'il n'y a pas de date, pré-remplir avec la date du jour
  React.useEffect(() => {
    if (type === "facture" && selectedStatus === "Payée" && !datePaiement) {
      setDatePaiement(getTodayDate());
    }
  }, [selectedStatus, type]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {title ||
          (type === "facture"
            ? "Modifier l'état de la facture"
            : type === "situation"
            ? "Modifier le statut de la situation"
            : "Modifier l'état du devis")}
      </DialogTitle>
      <DialogContent>
        <RadioGroup
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {(statusOptions || getStatusOptions()).map((status) => {
            // Support pour les objets {value, label} ou les strings simples
            const value = typeof status === 'object' ? status.value : status;
            const label = typeof status === 'object' ? status.label : status;
            return (
              <FormControlLabel
                key={value}
                value={value}
                control={<Radio />}
                label={label}
              />
            );
          })}
        </RadioGroup>
        {type === "facture" && selectedStatus === "Payée" && (
          <Box sx={{ mt: 3 }}>
            <TextField
              label="Date de paiement"
              type="date"
              value={datePaiement}
              onChange={(e) => setDatePaiement(e.target.value)}
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ mt: 1 }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={type === "facture" && selectedStatus === "Payée" && !datePaiement}
        >
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatusChangeModal;
