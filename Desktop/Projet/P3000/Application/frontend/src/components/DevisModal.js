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
}) => {
  const [fullNumero, setFullNumero] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(null);
  const [chantierName, setChantierName] = useState("");

  useEffect(() => {
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

        let newNumero = response.data.numero;

        // Si c'est un devis de chantier et qu'on a le nom du chantier
        if (devisData.devis_chantier && currentChantierName) {
          newNumero = `${newNumero} - ${currentChantierName}`;
        }
        // Si c'est un devis normal lié à un chantier existant (TS)
        else if (!devisData.devis_chantier && devisData.chantier !== -1) {
          newNumero = `${newNumero} - TS N°${response.data.next_ts || "001"}`;
        }

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
        const defaultNumero = `DEV-001-${new Date()
          .getFullYear()
          .toString()
          .slice(-2)}`;
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
  }, [open, devisData.chantier, devisData.devis_chantier, pendingChantierData]);

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
