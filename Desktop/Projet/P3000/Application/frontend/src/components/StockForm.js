import { Box, Button } from "@mui/material";
import React, { useState } from "react";
import { FiPlusCircle } from "react-icons/fi";
import ListeStock from "./ListeStock";
import NewProductForm from "./NewProductForm";

// Dans votre composant parent
function StockForm() {
  const [openModal, setOpenModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleAddProduct = (newProduct) => {
    setRefreshKey((oldKey) => oldKey + 1);
    handleCloseModal();
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

      <Button
        variant="contained"
        onClick={handleOpenModal}
        startIcon={<FiPlusCircle />}
        sx={{
          backgroundColor: "rgba(27, 120, 188, 1)",
          alignSelf: "flex-end",
          "&:hover": {
            backgroundColor: "rgba(27, 120, 188, 0.8)",
          },
        }}
      >
        Nouveau Produit
      </Button>

      <NewProductForm
        open={openModal}
        handleClose={handleCloseModal}
        onAddProduct={handleAddProduct}
      />
    </Box>
  );
}

export default StockForm;
