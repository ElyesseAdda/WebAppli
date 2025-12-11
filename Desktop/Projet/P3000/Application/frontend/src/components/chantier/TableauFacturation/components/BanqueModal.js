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

const BanqueModal = ({
  open,
  onClose,
  banques,
  selectedSituation,
  onSelectBanque,
  onCreateBanque,
}) => {
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [newBanqueName, setNewBanqueName] = useState("");

  const handleCreateBanque = () => {
    if (!newBanqueName.trim()) {
      alert("Le nom de la banque ne peut pas être vide");
      return;
    }
    onCreateBanque(newBanqueName.trim());
    setOpenCreateModal(false);
    setNewBanqueName("");
  };

  return (
    <>
      <Dialog open={open && !openCreateModal} onClose={onClose}>
        <DialogTitle>Sélectionner une banque</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, minWidth: 300 }}>
            {banques.map((banque) => (
              <Button
                key={banque.id}
                fullWidth
                variant="text"
                onClick={() => onSelectBanque(selectedSituation?.id, banque.id)}
                sx={{
                  justifyContent: "flex-start",
                  textAlign: "left",
                  mb: 1,
                  p: 2,
                  border: "1px solid #e0e0e0",
                  "&:hover": {
                    backgroundColor: "rgba(27, 120, 188, 0.1)",
                    borderColor: "rgba(27, 120, 188, 1)",
                  },
                }}
              >
                {banque.nom_banque}
              </Button>
            ))}

            <Button
              variant="contained"
              onClick={() => setOpenCreateModal(true)}
              sx={{
                mt: 2,
                p: 1,
                backgroundColor: "rgba(27, 120, 188, 1)",
                color: "white",
                fontSize: "0.8rem",
                minWidth: "auto",
                "&:hover": {
                  backgroundColor: "rgba(27, 120, 188, 0.8)",
                },
              }}
            >
              + Ajouter une nouvelle banque
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openCreateModal}
        onClose={() => {
          setOpenCreateModal(false);
          setNewBanqueName("");
        }}
      >
        <DialogTitle>Créer une nouvelle banque</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, minWidth: 300 }}>
            <TextField
              fullWidth
              label="Nom de la banque"
              value={newBanqueName}
              onChange={(e) => setNewBanqueName(e.target.value)}
              sx={{ mb: 2 }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleCreateBanque();
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenCreateModal(false);
              setNewBanqueName("");
            }}
          >
            Annuler
          </Button>
          <Button onClick={handleCreateBanque} variant="contained">
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BanqueModal;

