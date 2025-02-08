import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import axios from "axios";
import fr from "date-fns/locale/fr";
import React, { useEffect, useState } from "react";

const StatueBcChangeModal = ({
  open,
  onClose,
  onConfirm,
  selectedBC,
  newStatus,
}) => {
  const [date, setDate] = useState(null);
  const [magasin, setMagasin] = useState("");
  const [magasins, setMagasins] = useState([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (selectedBC && newStatus === "retrait_magasin") {
      axios
        .get(`/api/fournisseur-magasins/?fournisseur=${selectedBC.fournisseur}`)
        .then((response) => {
          setMagasins(response.data.map((m) => m.magasin));
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des magasins:", error);
        });
    }
  }, [selectedBC, newStatus]);

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleConfirm = async () => {
    try {
      if (newStatus === "retrait_magasin" && magasin) {
        if (!magasins.includes(magasin)) {
          await axios.post("/api/fournisseur-magasins/", {
            fournisseur: selectedBC.fournisseur,
            magasin: magasin,
          });
        }
      }

      const formattedDate = date ? formatDateToYYYYMMDD(date) : null;

      const data = {
        statut: newStatus,
        date_livraison: formattedDate,
        magasin_retrait: newStatus === "retrait_magasin" ? magasin : "",
      };

      console.log("Data à envoyer:", data);

      onConfirm(data);
    } catch (error) {
      console.error("Erreur lors de la confirmation:", error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {newStatus === "en_attente"
          ? "En attente Livraison"
          : newStatus === "livre_chantier"
          ? "Livré Chantier"
          : "Retrait Magasin"}
      </DialogTitle>
      <DialogContent>
        {newStatus !== "en_attente" && (
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <DatePicker
              label="Date de livraison"
              value={date}
              onChange={(newDate) => setDate(newDate)}
              renderInput={(params) => (
                <TextField {...params} fullWidth sx={{ mt: 2 }} />
              )}
            />
          </LocalizationProvider>
        )}

        {newStatus === "retrait_magasin" && (
          <Autocomplete
            freeSolo
            value={magasin}
            onChange={(event, newValue) => {
              setMagasin(newValue);
            }}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
              setInputValue(newInputValue);
            }}
            options={magasins}
            renderInput={(params) => (
              <TextField {...params} label="Magasin" fullWidth sx={{ mt: 2 }} />
            )}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleConfirm} variant="contained">
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatueBcChangeModal;
