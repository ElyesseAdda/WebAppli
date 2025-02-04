import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
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
}) => {
  const [selectedStatus, setSelectedStatus] = React.useState(currentStatus);

  const getStatusOptions = () => {
    if (type === "facture") {
      return ["En cours", "Attente paiement", "Payée"];
    }
    return ["En attente", "Validé", "Refusé"];
  };

  const handleSubmit = () => {
    onStatusChange(selectedStatus);
    onClose();
  };

  React.useEffect(() => {
    setSelectedStatus(currentStatus);
  }, [currentStatus, open]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {title ||
          (type === "facture"
            ? "Modifier l'état de la facture"
            : "Modifier l'état du devis")}
      </DialogTitle>
      <DialogContent>
        <RadioGroup
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {(statusOptions || getStatusOptions()).map((status) => (
            <FormControlLabel
              key={status}
              value={status}
              control={<Radio />}
              label={status}
            />
          ))}
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatusChangeModal;
