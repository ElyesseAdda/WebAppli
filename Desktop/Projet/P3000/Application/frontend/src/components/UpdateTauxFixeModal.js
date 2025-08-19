import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useState } from "react";

const UpdateTauxFixeModal = ({ open, handleClose, onTauxFixeUpdated }) => {
  const [nouveauTaux, setNouveauTaux] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  const handleSubmit = async () => {
    try {
      // Validation basique
      const tauxNumber = parseFloat(nouveauTaux);
      if (isNaN(tauxNumber) || tauxNumber <= 0) {
        setError("Veuillez entrer un taux valide (nombre positif)");
        return;
      }

      setLoading(true);
      setError("");

      // Appel API
      const response = await axios.post("/api/update-taux-fixe/", {
        taux_fixe: tauxNumber,
      });

      setSuccess(true);
      setUpdateInfo(response.data);

      // Callback pour informer le parent
      if (onTauxFixeUpdated) {
        onTauxFixeUpdated(tauxNumber, response.data.lignes_mises_a_jour);
      }

      // Fermer après 3 secondes pour laisser le temps de lire les infos
      setTimeout(() => {
        handleClose();
        setNouveauTaux("");
        setSuccess(false);
        setUpdateInfo(null);
        setLoading(false);
      }, 3000);
    } catch (error) {
      setError(
        error.response?.data?.error ||
          "Erreur lors de la mise à jour du taux fixe"
      );
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Mise à jour du taux fixe</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Taux fixe mis à jour avec succès !
          </Alert>
        )}

        {!success && (
          <TextField
            autoFocus
            margin="dense"
            label="Nouveau taux fixe (%)"
            type="number"
            fullWidth
            value={nouveauTaux}
            onChange={(e) => setNouveauTaux(e.target.value)}
            inputProps={{ step: "0.01" }}
            sx={{ mt: 2 }}
            disabled={loading}
          />
        )}

        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
            <CircularProgress size={20} />
            <Typography>Mise à jour en cours...</Typography>
          </Box>
        )}

        {updateInfo && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Résumé de la mise à jour
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              ✅ Taux fixe mis à jour : {updateInfo.valeur}%
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              📊 {updateInfo.nombre_lignes_mises_a_jour} lignes de détail ont
              été mises à jour
            </Typography>

            {updateInfo.lignes_mises_a_jour &&
              updateInfo.lignes_mises_a_jour.length > 0 && (
                <Box sx={{ mt: 2, maxHeight: 200, overflow: "auto" }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Exemples de lignes mises à jour :
                  </Typography>
                  {updateInfo.lignes_mises_a_jour
                    .slice(0, 5)
                    .map((ligne, index) => (
                      <Box
                        key={ligne.id}
                        sx={{
                          p: 1,
                          mb: 1,
                          border: "1px solid #e0e0e0",
                          borderRadius: 1,
                          backgroundColor: "#f9f9f9",
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {ligne.description}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          Nouveau prix : {ligne.prix.toFixed(2)}€ (taux fixe :{" "}
                          {ligne.taux_fixe}%)
                        </Typography>
                      </Box>
                    ))}
                  {updateInfo.lignes_mises_a_jour.length > 5 && (
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      ... et {updateInfo.lignes_mises_a_jour.length - 5} autres
                      lignes
                    </Typography>
                  )}
                </Box>
              )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || !nouveauTaux.trim()}
        >
          {loading ? "Mise à jour..." : "Mettre à jour"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdateTauxFixeModal;
