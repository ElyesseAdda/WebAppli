import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React, { useState } from "react";

const DateRangePicker = ({ onPeriodChange }) => {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [displayText, setDisplayText] = useState("Période personnalisée");

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onPeriodChange(startDate, endDate);

      // Formatter les dates pour l'affichage
      const formatDate = (dateString) => {
        const [year, month, day] = dateString.split("-");
        return `${day}/${month}/${year}`;
      };

      setDisplayText(`${formatDate(startDate)} - ${formatDate(endDate)}`);
    }
    handleClose();
  };

  const handleClear = () => {
    setStartDate("");
    setEndDate("");
    onPeriodChange(null, null);
    setDisplayText("Période personnalisée");
    handleClose();
  };

  return (
    <Box>
      <Button variant="outlined" onClick={handleOpen} sx={{ height: "56px" }}>
        {displayText}
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Sélectionner une période</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Date de début"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Date de fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              margin="normal"
              inputProps={{ min: startDate }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClear}>Effacer</Button>
          <Button onClick={handleClose}>Annuler</Button>
          <Button onClick={handleApply} disabled={!startDate || !endDate}>
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DateRangePicker;
