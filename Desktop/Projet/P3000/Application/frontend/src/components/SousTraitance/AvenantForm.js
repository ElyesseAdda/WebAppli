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
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import frLocale from "date-fns/locale/fr";
import React, { useEffect, useState } from "react";
import { generatePDFDrive } from "../../utils/universalDriveGenerator";

const parseDateValue = (value) => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const AvenantForm = ({
  open,
  onClose,
  contrat,
  chantier,
  onSave,
  mode = "create",
  avenant = null,
}) => {
  const isEdit = mode === "edit" && avenant?.id;
  const [formData, setFormData] = useState({
    description: "",
    montant: "",
    type_travaux: "LOT PEINTURE",
    date_creation: new Date(),
  });

  const [avenants, setAvenants] = useState([]);

  useEffect(() => {
    if (contrat?.id && open && !isEdit) {
      fetchAvenants();
    }
  }, [contrat, open, isEdit]);

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      setFormData({
        description: avenant.description || "",
        montant: avenant.montant != null ? String(avenant.montant) : "",
        type_travaux: avenant.type_travaux || "LOT PEINTURE",
        date_creation: parseDateValue(avenant.date_creation),
      });
      return;
    }

    setFormData({
      description: "",
      montant: "",
      type_travaux: "LOT PEINTURE",
      date_creation: new Date(),
    });
  }, [open, isEdit, avenant]);

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

  const handleDateCreationChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      date_creation: date,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        const response = await fetch(
          `/api/avenants-sous-traitance/${avenant.id}/`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              description: formData.description,
              montant: formData.montant,
              type_travaux: formData.type_travaux,
              date_creation: formData.date_creation
                .toISOString()
                .split("T")[0],
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Erreur lors de la modification de l'avenant:", errorText);
          alert(
            "Erreur lors de la modification de l'avenant. Vérifiez la console pour plus de détails."
          );
          return;
        }

        const data = await response.json();
        const previousMontant = parseFloat(avenant.montant) || 0;
        const newMontant = parseFloat(data.montant) || 0;
        const montantChanged = Math.abs(previousMontant - newMontant) > 0.001;
        const knownAvenants = contrat?.avenants?.length
          ? contrat.avenants
          : avenants;
        const hasLaterAvenants = knownAvenants.some(
          (a) => a.numero > avenant.numero
        );

        onSave(data, {
          isEdit: true,
          montantChanged,
          hasLaterAvenants,
        });
        onClose();
        return;
      }

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
            date_creation: formData.date_creation.toISOString().split("T")[0],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (!contrat.sans_contrat) {
          try {
            const driveData = {
              avenantId: data.id,
              contratId: contrat.id,
              chantierId: contrat.chantier,
              chantierName:
                chantier?.chantier_name ||
                chantier?.nom ||
                contrat.nom_operation ||
                "Chantier",
              societeName:
                chantier?.societe?.nom_societe ||
                chantier?.societe?.nom ||
                "Société",
              sousTraitantName:
                contrat.sous_traitant_details?.entreprise || "Sous-traitant",
              numeroAvenant: data.numero,
            };

            await generatePDFDrive("avenant_sous_traitance", driveData);
          } catch (driveError) {
            console.error(
              "Erreur lors du téléchargement vers le Drive:",
              driveError
            );
          }
        }

        onSave(data, { isEdit: false });
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
      alert(
        `Une erreur est survenue lors de la ${
          isEdit ? "modification" : "création"
        } de l'avenant.`
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? `Modifier l'avenant n°${avenant.numero}` : "Nouvel avenant"}
      </DialogTitle>
      <DialogContent>
        {!isEdit && avenants.length > 0 && (
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
                    <TableCell>Type de Travaux</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {avenants.map((av) => (
                    <TableRow key={av.id}>
                      <TableCell>{av.numero}</TableCell>
                      <TableCell>
                        {new Date(av.date_creation).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{av.description}</TableCell>
                      <TableCell>{av.montant} €</TableCell>
                      <TableCell>{av.type_travaux}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {isEdit && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Numéro d&apos;avenant : {avenant.numero} (non modifiable)
          </Typography>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Type de Travaux"
                name="type_travaux"
                value={formData.type_travaux}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider
                dateAdapter={AdapterDateFns}
                adapterLocale={frLocale}
              >
                <DatePicker
                  label="Date de création de l'avenant"
                  value={formData.date_creation}
                  onChange={handleDateCreationChange}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth required />
                  )}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {isEdit ? "Enregistrer" : "Créer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AvenantForm;
