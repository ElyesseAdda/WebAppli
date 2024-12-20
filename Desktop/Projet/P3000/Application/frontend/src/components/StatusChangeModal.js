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
}) => {
  const [selectedStatus, setSelectedStatus] = React.useState(currentStatus);
  const statusOptions = ["En attente", "Validé", "Refusé"];

  const handleSubmit = () => {
    onStatusChange(selectedStatus);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Modifier l'état du devis</DialogTitle>
      <DialogContent>
        <RadioGroup
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {statusOptions.map((status) => (
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
