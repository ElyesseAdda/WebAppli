import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  borderRadius: "8px",
  boxShadow: 24,
  p: 4,
};

const inputStyle = {
  marginBottom: "1rem",
  width: "100%",
};

const NewProductForm = ({ open, handleClose, onAddProduct, fournisseur }) => {
  const [formData, setFormData] = useState({
    code_produit: "",
    designation: "",
    fournisseur: fournisseur || "",
    prix_unitaire: "",
    unite: "",
  });

  const [errors, setErrors] = useState({});
  const [fournisseurs, setFournisseurs] = useState([]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, fournisseur: fournisseur || "" }));
  }, [fournisseur, open]);

  useEffect(() => {
    if (!fournisseur && open) {
      const fetchFournisseurs = async () => {
        try {
          const response = await axios.get("/api/stockf/fournisseurs/");
          const uniqueFournisseurs = [
            ...new Set(
              response.data.filter(
                (fournisseur) => fournisseur && fournisseur.trim()
              )
            ),
          ];
          setFournisseurs(uniqueFournisseurs);
        } catch (error) {
          console.error("Erreur lors du chargement des fournisseurs:", error);
        }
      };
      fetchFournisseurs();
    }
  }, [open, fournisseur]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.code_produit)
      newErrors.code_produit = "Le code produit est requis";
    if (!formData.designation)
      newErrors.designation = "La désignation est requise";
    if (!formData.unite) newErrors.unite = "L'unité est requise";
    if (!formData.prix_unitaire || formData.prix_unitaire <= 0) {
      newErrors.prix_unitaire = "Le prix unitaire doit être supérieur à 0";
    }
    if (!fournisseur && !formData.fournisseur)
      newErrors.fournisseur = "Le fournisseur est requis";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    try {
      const response = await axios.post("/api/stock/", {
        ...formData,
        fournisseur: fournisseur || formData.fournisseur || null,
        prix_unitaire: parseFloat(formData.prix_unitaire),
      });
      onAddProduct(response.data);
      if (window.refreshStockList) {
        window.refreshStockList();
      }
      handleClose();
      setFormData({
        code_produit: "",
        designation: "",
        fournisseur: fournisseur || "",
        prix_unitaire: "",
        unite: "",
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout du produit:", error);
      setErrors({
        submit: "Une erreur est survenue lors de l'ajout du produit",
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-nouveau-produit"
    >
      <Box sx={style}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" component="h2">
            Nouveau Produit
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <FiX />
          </IconButton>
        </Box>
        <form onSubmit={handleSubmit}>
          <TextField
            name="code_produit"
            label="Code Produit"
            value={formData.code_produit}
            onChange={handleChange}
            error={!!errors.code_produit}
            helperText={errors.code_produit}
            sx={inputStyle}
          />
          <TextField
            name="designation"
            label="Désignation"
            value={formData.designation}
            onChange={handleChange}
            error={!!errors.designation}
            helperText={errors.designation}
            sx={inputStyle}
          />
          {!fournisseur && (
            <Autocomplete
              freeSolo
              options={fournisseurs}
              value={formData.fournisseur}
              onChange={(event, newValue) => {
                setFormData((prev) => ({
                  ...prev,
                  fournisseur: newValue || "",
                }));
              }}
              onInputChange={(event, newInputValue) => {
                setFormData((prev) => ({
                  ...prev,
                  fournisseur: newInputValue,
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  name="fournisseur"
                  label="Fournisseur"
                  error={!!errors.fournisseur}
                  helperText={errors.fournisseur}
                  sx={inputStyle}
                />
              )}
            />
          )}
          <TextField
            name="prix_unitaire"
            label="Prix Unitaire"
            type="number"
            value={formData.prix_unitaire}
            onChange={handleChange}
            error={!!errors.prix_unitaire}
            helperText={errors.prix_unitaire}
            InputProps={{
              inputProps: { min: 0, step: "0.01" },
            }}
            sx={inputStyle}
          />
          <TextField
            name="unite"
            label="Unité"
            value={formData.unite}
            onChange={handleChange}
            error={!!errors.unite}
            helperText={errors.unite}
            sx={inputStyle}
          />
          {errors.submit && (
            <Typography color="error" sx={{ mt: 1, mb: 1 }}>
              {errors.submit}
            </Typography>
          )}
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}
          >
            <Button variant="outlined" onClick={handleClose}>
              Annuler
            </Button>
            <Button
              variant="contained"
              type="submit"
              sx={{
                backgroundColor: "rgba(27, 120, 188, 1)",
                "&:hover": {
                  backgroundColor: "rgba(27, 120, 188, 0.8)",
                },
              }}
            >
              Ajouter
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};

export default NewProductForm;
