import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const AvenantForm = ({ open, onClose, contrat, onSave }) => {
  const [formData, setFormData] = useState({
    description: "",
    montant: "",
  });

  const [avenants, setAvenants] = useState([]);

  useEffect(() => {
    if (contrat) {
      fetchAvenants();
    }
  }, [contrat]);

  const fetchAvenants = async () => {
    try {
      const response = await fetch(
        `/api/contrats-sous-traitance/${contrat.id}/avenants/`
      );
      const data = await response.json();
      setAvenants(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des avenants:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("Création d'un avenant pour le contrat:", contrat);
      console.log("Données du formulaire:", formData);

      const response = await fetch(
        `/api/contrats-sous-traitance/${contrat.id}/avenants/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            numero: avenants.length + 1,
            contrat: contrat.id,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Avenant créé avec succès:", data);
        onSave(data);
        onClose();
      } else {
        const errorText = await response.text();
        console.error("Erreur lors de la création de l'avenant:", errorText);
        alert(
          "Erreur lors de la création de l'avenant. Vérifiez la console pour plus de détails."
        );
      }
    } catch (error) {
      console.error("Erreur complète:", error);
      alert("Une erreur est survenue lors de la création de l'avenant.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Nouvel avenant</DialogTitle>
      <DialogContent>
        {avenants.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              Historique des avenants
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Numéro</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Montant</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {avenants.map((avenant) => (
                    <TableRow key={avenant.id}>
                      <TableCell>{avenant.numero}</TableCell>
                      <TableCell>
                        {new Date(avenant.date_creation).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{avenant.description}</TableCell>
                      <TableCell>{avenant.montant} €</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                multiline
                rows={4}
                value={formData.description}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Montant"
                name="montant"
                type="number"
                value={formData.montant}
                onChange={handleChange}
                required
              />
            </Grid>
          </Grid>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Créer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AvenantForm;
