import { Box, Button, Modal, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";

const EditModal = ({
  open,
  handleClose,
  data,
  handleSave,
  parties,
  sousParties,
  allLignesDetails,
}) => {
  const [editedData, setEditedData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (data) {
      setEditedData({
        ...data,
        titre: data.titre || "",
        description: data.description || "",
        unite: data.unite || "",
        prix: data.prix || "",
        partie: data.partie,
        sous_partie: data.sous_partie,
      });
    }
  }, [data]);

  const validateEdit = () => {
    if (editedData.type === "partie") {
      const exists = parties?.some(
        (p) =>
          p.titre.toLowerCase() === editedData.titre.toLowerCase() &&
          p.id !== editedData.id
      );
      if (exists) {
        setError("Une partie avec ce titre existe déjà");
        return false;
      }
    } else if (editedData.type === "sousPartie") {
      const exists = sousParties?.some(
        (sp) =>
          sp.description.toLowerCase() ===
            editedData.description.toLowerCase() && sp.id !== editedData.id
      );
      if (exists) {
        setError("Une sous-partie avec cette description existe déjà");
        return false;
      }
    } else if (editedData.type === "ligne") {
      const exists = allLignesDetails?.some(
        (l) =>
          l.description.toLowerCase() ===
            editedData.description.toLowerCase() && l.id !== editedData.id
      );
      if (exists) {
        setError("Une ligne de détail avec cette description existe déjà");
        return false;
      }
    }
    setError("");
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateEdit()) {
      handleSave(editedData);
      handleClose();
    }
  };

  if (!editedData) {
    return null;
  }

  const getInputFields = () => {
    // Pour une partie
    if (editedData.type === "partie") {
      return (
        <TextField
          fullWidth
          label="Titre de la partie"
          value={editedData.titre || ""}
          onChange={(e) =>
            setEditedData({
              ...editedData,
              titre: e.target.value,
            })
          }
          sx={{ mb: 2 }}
        />
      );
    }

    // Pour une sous-partie
    if (editedData.type === "sousPartie") {
      return (
        <TextField
          fullWidth
          label="Description de la sous-partie"
          value={editedData.description || ""}
          onChange={(e) =>
            setEditedData({
              ...editedData,
              description: e.target.value,
            })
          }
          sx={{ mb: 2 }}
        />
      );
    }

    // Pour une ligne de détail
    if (editedData.type === "ligne") {
      return (
        <>
          <TextField
            fullWidth
            label="Description"
            value={editedData.description || ""}
            onChange={(e) =>
              setEditedData({
                ...editedData,
                description: e.target.value,
              })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Unité"
            value={editedData.unite || ""}
            onChange={(e) =>
              setEditedData({
                ...editedData,
                unite: e.target.value,
              })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Prix"
            type="number"
            step="0.01"
            value={editedData.prix || ""}
            onChange={(e) =>
              setEditedData({
                ...editedData,
                prix: parseFloat(e.target.value),
              })
            }
            sx={{ mb: 2 }}
          />
        </>
      );
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          minWidth: 300,
        }}
      >
        <form onSubmit={handleSubmit}>
          {error && <Box sx={{ color: "error.main", mb: 2 }}>{error}</Box>}
          {getInputFields()}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button onClick={handleClose}>Annuler</Button>
            <Button type="submit" variant="contained">
              Enregistrer
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};

export default EditModal;
