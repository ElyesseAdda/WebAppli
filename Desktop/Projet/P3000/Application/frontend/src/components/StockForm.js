import { Box, Button } from "@mui/material";
import React, { useState } from "react";
import { FiPlusCircle } from "react-icons/fi";
import NewFournisseurForm from "./Founisseur/NewFournisseurForm";
import ListeStock from "./ListeStock";
import NewProductForm from "./NewProductForm";

// Dans votre composant parent
function StockForm() {
  const [openModal, setOpenModal] = useState(false);
  const [openFournisseurModal, setOpenFournisseurModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleOpenFournisseurModal = () => setOpenFournisseurModal(true);
  const handleCloseFournisseurModal = () => setOpenFournisseurModal(false);

  const handleAddProduct = () => {
    setRefreshKey((oldKey) => oldKey + 1);
    handleCloseModal();
  };

  const handleAddFournisseur = () => {
    setRefreshKey((oldKey) => oldKey + 1);
    handleCloseFournisseurModal();
  };

  return (
    <Box
      sx={{
        maxWidth: "1430px",
        margin: "0 auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <ListeStock key={refreshKey} />

      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          onClick={handleOpenFournisseurModal}
          startIcon={<FiPlusCircle />}
          sx={{ backgroundColor: "#1976d2" }}
        >
          Nouveau Fournisseur
        </Button>
        <Button
          variant="contained"
          onClick={handleOpenModal}
          startIcon={<FiPlusCircle />}
          sx={{ backgroundColor: "rgba(27, 120, 188, 1)" }}
        >
          Nouveau Produit
        </Button>
      </Box>

      <NewFournisseurForm
        open={openFournisseurModal}
        handleClose={handleCloseFournisseurModal}
        onAddFournisseur={handleAddFournisseur}
      />

      <NewProductForm
        open={openModal}
        handleClose={handleCloseModal}
        onAddProduct={handleAddProduct}
        refreshKey={refreshKey}
      />
    </Box>
  );
}

export default StockForm;
