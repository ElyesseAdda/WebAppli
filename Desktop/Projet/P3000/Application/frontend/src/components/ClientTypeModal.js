import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";
import React from "react";

const ClientTypeModal = ({ open, onClose, onNewClient, onExistingClient }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Type de Client</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={onNewClient}
            fullWidth
          >
            Nouveau Client
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={onExistingClient}
            fullWidth
          >
            Client Existant
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default ClientTypeModal;
