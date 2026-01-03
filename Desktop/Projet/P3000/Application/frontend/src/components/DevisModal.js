import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const DevisModal = ({
  open,
  handleClose,
  devisData,
  handleSubmit,
  handleChange,
  pendingChantierData,
  isModification = false, // Nouvelle prop pour détecter si c'est une modification
}) => {
  const [fullNumero, setFullNumero] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(null);
  const [chantierName, setChantierName] = useState("");

  useEffect(() => {
    // Si c'est une modification, utiliser le numéro existant
    if (isModification && open && devisData.numero) {
      setFullNumero(devisData.numero);
      return;
    }

    // Si c'est une création, générer un nouveau numéro
    const getFullNumero = async () => {
      try {
        // Récupérer le nom du chantier selon le contexte
        let currentChantierName = "";
        if (devisData.devis_chantier) {
          if (devisData.chantier === -1) {
            currentChantierName = pendingChantierData.chantier.chantier_name;
          } else {
            const chantierResponse = await axios.get(
              `/api/chantier/${devisData.chantier}/`
            );
            currentChantierName = chantierResponse.data.chantier_name;
          }
          setChantierName(currentChantierName);
        }

        // Utiliser la vue get_next_devis_number
        const response = await axios.get("/api/get-next-devis-number/", {
          params: {
            chantier_id: devisData.chantier || "",
            devis_chantier: devisData.devis_chantier || false,
            is_ts: !devisData.devis_chantier && devisData.chantier !== -1,
          },
        });

        // Le numéro est maintenant directement au bon format (sans suffixe)
        const newNumero = response.data.numero;

        setFullNumero(newNumero);
        setLastRequestTime(new Date().getTime());

        // Mettre à jour devisData avec le nouveau numéro
        handleChange({
          target: {
            name: "numero",
            value: newNumero,
          },
        });
      } catch (error) {
        console.error("Erreur lors de la récupération du numéro:", error);
        const currentYear = new Date().getFullYear();
        // Déterminer le format de fallback selon le type
        const isChantierExistant = devisData.chantier && devisData.chantier !== -1;
        let defaultNumero;
        if (devisData.devis_chantier || !isChantierExistant) {
          defaultNumero = `Devis de travaux n°001.${currentYear}`;
        } else {
          defaultNumero = `Devis de travaux n°001.${currentYear} - TS n°01`;
        }
        setFullNumero(defaultNumero);
        handleChange({
          target: {
            name: "numero",
            value: defaultNumero,
          },
        });
      }
    };

    if (open && (!devisData.numero || !lastRequestTime)) {
      getFullNumero();
    } else if (devisData.numero) {
      setFullNumero(devisData.numero);
    }
  }, [open, devisData.chantier, devisData.devis_chantier, pendingChantierData, isModification]);

  // Reset lastRequestTime when modal closes
  useEffect(() => {
    if (!open) {
      setLastRequestTime(null);
      setFullNumero("");
      setChantierName("");
    }
  }, [open]);

  const handleNumeroChange = (e) => {
    setFullNumero(e.target.value);
    handleChange({
      target: {
        name: "numero",
        value: e.target.value,
      },
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Résumé du devis</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Numéro du devis"
            name="numero"
            value={fullNumero}
            onChange={handleNumeroChange}
            disabled={!isEditing}
            InputProps={{
              endAdornment: (
                <Button size="small" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? "Verrouiller" : "Modifier"}
                </Button>
              ),
            }}
          />

          <TextField
            label="Montant HT"
            name="price_ht"
            value={devisData.price_ht || ""}
            disabled
          />
          <TextField
            label="Montant TTC"
            name="price_ttc"
            value={(parseFloat(devisData.price_ht || 0) * 1.2).toFixed(2) || ""}
            disabled
          />
          <TextField
            label="Description"
            name="description"
            value={devisData.description || ""}
            onChange={handleChange}
            multiline
            rows={4}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DevisModal;
