import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PaymentIcon from "@mui/icons-material/Payment";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Alert,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { generatePDFDrive } from "../utils/universalDriveGenerator";

const DateEnvoiModal = ({ open, onClose, paiement, onSubmit }) => {
  const [dateEnvoi, setDateEnvoi] = useState("");
  const [delaiPaiement, setDelaiPaiement] = useState(45);

  useEffect(() => {
    if (paiement) {
      setDateEnvoi(paiement.date_envoi_facture || "");
      setDelaiPaiement(paiement.delai_paiement || 45);
    }
  }, [paiement]);

  const handleSubmit = () => {
    onSubmit(paiement.id, { dateEnvoi, delaiPaiement });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Date d'envoi et délai de paiement</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <TextField
            type="date"
            label="Date d'envoi"
            value={dateEnvoi}
            onChange={(e) => setDateEnvoi(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            select
            label="Délai de paiement"
            value={delaiPaiement}
            onChange={(e) => setDelaiPaiement(e.target.value)}
            fullWidth
            SelectProps={{ native: true }}
          >
            <option value={45}>45 jours</option>
            <option value={60}>60 jours</option>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const PaiementModal = ({ open, onClose, paiement, onSubmit }) => {
  const [montantPaye, setMontantPaye] = useState("");
  const [datePaiementReel, setDatePaiementReel] = useState("");

  useEffect(() => {
    if (paiement) {
      setMontantPaye(paiement.montant_paye_ht || "");
      setDatePaiementReel(paiement.date_paiement_reel || "");
    }
  }, [paiement]);

  const handleSubmit = () => {
    onSubmit(paiement.id, { montantPaye, datePaiementReel });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Montant payé et date de paiement</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <TextField
            type="number"
            label="Montant payé HT"
            value={montantPaye}
            onChange={(e) => setMontantPaye(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            type="date"
            label="Date de paiement réelle"
            value={datePaiementReel}
            onChange={(e) => setDatePaiementReel(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const MontantFactureModal = ({ open, onClose, paiement, onSubmit }) => {
  const [montantFacture, setMontantFacture] = useState("");

  useEffect(() => {
    if (paiement) {
      setMontantFacture(paiement.montant_facture_ht || "");
    }
  }, [paiement]);

  const handleSubmit = () => {
    onSubmit(paiement.id, { montantFacture });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Montant facturé du mois</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <TextField
            type="number"
            label="Montant facturé HT"
            value={montantFacture}
            onChange={(e) => setMontantFacture(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RetenueModal = ({ open, onClose, facture, onSubmit }) => {
  const [montantRetenue, setMontantRetenue] = useState("");

  useEffect(() => {
    if (facture) {
      setMontantRetenue(facture.montant_retenue || "");
    }
  }, [facture]);

  const handleSubmit = () => {
    onSubmit(facture.id, { montantRetenue: parseFloat(montantRetenue) || 0 });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Montant de retenue - Facture {facture?.numero_facture}</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          {facture && (
            <Box sx={{ mb: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Facture n° {facture.numero_facture}</strong> -{" "}
                {facture.mois_annee}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Montant facturé :{" "}
                {parseFloat(facture.montant_facture_ht).toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}{" "}
                €
              </Typography>
              <Typography variant="body2">
                Montant de retenue actuel :{" "}
                {(parseFloat(facture.montant_retenue) || 0).toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}{" "}
                €
              </Typography>
            </Box>
          )}

          <TextField
            type="number"
            label="Montant de retenue (€)"
            value={montantRetenue}
            onChange={(e) => setMontantRetenue(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
            inputProps={{ step: "0.01", min: "0" }}
            helperText="Montant de retenue à déduire du montant facturé"
          />

          <Typography variant="body2" color="text.secondary">
            💡 <strong>Note :</strong> La retenue sera déduite du montant facturé pour le calcul de l'écart.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={montantRetenue === ""}
        >
          Enregistrer la retenue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AjouterPaiementModal = ({
  open,
  onClose,
  mois,
  annee,
  contratId,
  chantierId,
  sousTraitantId,
  avenantId,
  type,
  onSubmit,
}) => {
  const [montantFacture, setMontantFacture] = useState("");
  const [dateEnvoi, setDateEnvoi] = useState("");
  const [delaiPaiement, setDelaiPaiement] = useState(45);

  const handleSubmit = () => {
    onSubmit({
      mois,
      annee,
      contrat: contratId,
      chantier: chantierId,
      sous_traitant: sousTraitantId,
      avenantId: avenantId,
      montant_facture_ht: montantFacture,
      date_envoi_facture: dateEnvoi,
      delai_paiement: delaiPaiement,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        Ajouter paiement pour {type || "CONTRAT"} -{" "}
        {String(mois).padStart(2, "0")}/{annee}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <TextField
            type="number"
            label="Montant facturé HT"
            value={montantFacture}
            onChange={(e) => setMontantFacture(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            type="date"
            label="Date d'envoi"
            value={dateEnvoi}
            onChange={(e) => setDateEnvoi(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            select
            label="Délai de paiement"
            value={delaiPaiement}
            onChange={(e) => setDelaiPaiement(e.target.value)}
            fullWidth
            SelectProps={{ native: true }}
          >
            <option value={45}>45 jours</option>
            <option value={60}>60 jours</option>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const FactureModal = ({
  open,
  onClose,
  onSubmit,
  chantierId,
  sousTraitantId,
  factures = [],
  contrat = null,
  chantierNom = "",
}) => {
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [numeroFacture, setNumeroFacture] = useState("");
  const [montantFacture, setMontantFacture] = useState("");
  const [dateReception, setDateReception] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [delaiPaiement, setDelaiPaiement] = useState(45);
  const [creerCertificat, setCreerCertificat] = useState(false);

  // Calculer le prochain numéro de facture et réinitialiser la date
  useEffect(() => {
    if (open) {
      // Réinitialiser la date de réception à la date du jour
      setDateReception(new Date().toISOString().split("T")[0]);

      if (factures.length > 0) {
        const facturesDuMois = factures.filter(
          (f) => f.mois === mois && f.annee === annee
        );
        const prochainNumero = facturesDuMois.length + 1;
        setNumeroFacture(prochainNumero.toString());
      } else {
        setNumeroFacture("1");
      }
    }
  }, [open, mois, annee, factures]);

  const handleSubmit = () => {
    onSubmit({
      mois,
      annee,
      numeroFacture: numeroFacture || "1",
      montantFacture,
      dateReception,
      delaiPaiement,
      creerCertificat,
    });
    onClose();
    // Reset form
    setNumeroFacture("");
    setMontantFacture("");
    setDateReception("");
    setCreerCertificat(false);
  };

  const moisOptions = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nouvelle facture sous-traitant</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              select
              label="Mois"
              value={mois}
              onChange={(e) => setMois(parseInt(e.target.value))}
              SelectProps={{ native: true }}
              sx={{ flex: 1 }}
            >
              {moisOptions.map((nom, index) => (
                <option key={index + 1} value={index + 1}>
                  {nom}
                </option>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Année"
              value={annee}
              onChange={(e) => setAnnee(parseInt(e.target.value))}
              sx={{ flex: 1 }}
              inputProps={{ min: 2020, max: 2030 }}
            />
          </Box>

          <TextField
            label="Numéro de facture"
            value={numeroFacture}
            onChange={(e) => setNumeroFacture(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            placeholder="Laissez vide pour auto-génération"
          />

          <TextField
            type="number"
            label="Montant facturé HT"
            value={montantFacture}
            onChange={(e) => setMontantFacture(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
            inputProps={{ step: "0.01", min: "0" }}
          />

          <TextField
            type="date"
            label="Date de réception"
            value={dateReception}
            onChange={(e) => setDateReception(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            label="Délai de paiement"
            value={delaiPaiement}
            onChange={(e) => setDelaiPaiement(parseInt(e.target.value))}
            fullWidth
            SelectProps={{ native: true }}
          >
            <option value={45}>45 jours</option>
            <option value={60}>60 jours</option>
          </TextField>

          <FormControlLabel
            control={
              <Checkbox
                checked={creerCertificat}
                onChange={(e) => setCreerCertificat(e.target.checked)}
                color="primary"
              />
            }
            label="Créer certificat de paiement"
            sx={{ mt: 2 }}
          />

          {/* Bouton preview certificat (ouvre dans un nouvel onglet) */}
          {creerCertificat && contrat && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewIcon />}
              sx={{ mt: 1, ml: 0.5 }}
              onClick={() => {
                const params = new URLSearchParams();
                params.set("montant_preview", montantFacture || "0");
                params.set("mois_preview", String(mois));
                params.set("annee_preview", String(annee));
                params.set(
                  "numero_certificat",
                  String(factures.length + 1)
                );
                const url = `/api/preview-certificat-paiement/${contrat.id}/?${params.toString()}`;
                window.open(url, "_blank");
              }}
              disabled={!montantFacture}
            >
              Aperçu du certificat
            </Button>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!montantFacture || !dateReception}
        >
          {creerCertificat ? "Créer la facture + Certificat" : "Créer la facture"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const PaiementFactureModal = ({ open, onClose, facture, onSubmit }) => {
  const [montantPaye, setMontantPaye] = useState("");
  const [datePaiementReel, setDatePaiementReel] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [commentaire, setCommentaire] = useState("");

  // Calculer l'écart (montant restant à payer)
  const calculerEcartFacture = (facture) => {
    if (!facture) return 0;
    const montantFacture = parseFloat(facture.montant_facture_ht) || 0;
    const montantTotalPaye =
      facture.paiements?.reduce(
        (sum, p) => sum + (parseFloat(p.montant_paye) || 0),
        0
      ) || 0;
    return montantFacture - montantTotalPaye; // Montant restant à payer
  };

  const ecartFacture = calculerEcartFacture(facture);
  const isPremierPaiement =
    !facture?.paiements || facture.paiements.length === 0;

  // Réinitialiser la date de paiement et préremplir le montant à chaque ouverture du modal
  useEffect(() => {
    if (open && facture) {
      setDatePaiementReel(new Date().toISOString().split("T")[0]);

      // Préremplir le montant payé avec le montant restant à payer
      const montantRestant = Math.abs(ecartFacture);
      if (montantRestant > 0) {
        setMontantPaye(montantRestant.toString());
      }
    }
  }, [open, facture, ecartFacture]);

  const handleSubmit = () => {
    if (facture) {
      onSubmit({
        factureId: facture.id,
        montantPaye,
        datePaiementReel,
        commentaire,
      });
      onClose();
      // Reset form
      setMontantPaye("");
      setCommentaire("");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Nouveau paiement - Facture {facture?.numero_facture}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          {facture && (
            <Box sx={{ mb: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Facture n° {facture.numero_facture}</strong> -{" "}
                {facture.mois_annee}
              </Typography>

              {isPremierPaiement ? (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Montant facturé :{" "}
                  {parseFloat(facture.montant_facture_ht).toLocaleString(
                    "fr-FR",
                    {
                      minimumFractionDigits: 2,
                    }
                  )}{" "}
                  €
                </Typography>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ mb: 1, color: "warning.main", fontWeight: 600 }}
                >
                  Montant restant à payer :{" "}
                  {Math.abs(ecartFacture).toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </Typography>
              )}

              <Typography variant="body2">
                Date de paiement prévue :{" "}
                {formatDateFR2(facture.date_paiement_prevue)}
              </Typography>
            </Box>
          )}

          <TextField
            type="number"
            label="Montant payé HT"
            value={montantPaye}
            onChange={(e) => setMontantPaye(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
            inputProps={{ step: "0.01", min: "0" }}
            placeholder={
              ecartFacture > 0
                ? `Montant restant: ${Math.abs(ecartFacture).toLocaleString(
                    "fr-FR",
                    { minimumFractionDigits: 2 }
                  )} €`
                : ""
            }
            helperText={
              ecartFacture > 0
                ? "Montant prérempli avec le montant restant à payer"
                : ""
            }
          />

          <TextField
            type="date"
            label="Date de paiement réelle"
            value={datePaiementReel}
            onChange={(e) => setDatePaiementReel(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Commentaire (optionnel)"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!montantPaye || !datePaiementReel}
        >
          Enregistrer le paiement
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const TableauRecapContratAvenants = ({
  contrats,
  chantierId,
  sousTraitantId,
}) => {
  // Filtrer les contrats pour ne garder que ceux du bon chantier et sous-traitant
  const contratsFiltres = contrats.filter(
    (c) =>
      String(c.chantier) === String(chantierId) &&
      String(c.sous_traitant) === String(sousTraitantId)
  );

  let types = [
    "CONTRAT",
    ...Array.from(
      { length: 15 },
      (_, i) => `AVENANT ${String(i + 1).padStart(2, "0")}`
    ),
  ];
  let montants = Array(16).fill(0);
  if (contratsFiltres.length > 0) {
    // Contrat initial
    montants[0] = Number(contratsFiltres[0].montant_operation);

    // Avenants
    if (contratsFiltres[0].avenants && contratsFiltres[0].avenants.length > 0) {
      contratsFiltres[0].avenants.forEach((avenant) => {
        if (avenant.numero && Number(avenant.numero) <= 15) {
          montants[Number(avenant.numero)] = Number(avenant.montant);
        }
      });
    }
  }
  const blocs = [
    types.slice(0, 6).map((type, i) => ({ type, montant: montants[i] })),
    types.slice(6, 12).map((type, i) => ({ type, montant: montants[i + 6] })),
    types.slice(12, 18).map((type, i) => ({ type, montant: montants[i + 12] })),
  ];
  return (
    <Box sx={{ display: "flex", gap: 0, mb: 4 }}>
      {blocs.map((bloc, idx) => (
        <TableContainer
          component={Paper}
          key={idx}
          sx={{
            flex: 1,
            boxShadow: "none",
            borderRadius: 0,
            borderLeft: idx === 0 ? "none" : "1px solid rgba(224, 224, 224, 1)",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "rgba(27, 120, 188, 1)" }}>
                <TableCell
                  sx={{ color: "white", width: "0px", whiteSpace: "nowrap" }}
                >
                  N°
                </TableCell>
                <TableCell
                  sx={{
                    color: "white",
                    width: "0px",
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  MONTANT HT
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bloc.map((ligne, i) => (
                <TableRow key={i}>
                  <TableCell
                    sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}
                  >
                    {ligne.type}
                  </TableCell>
                  <TableCell
                    sx={{
                      borderRight: "2px solid rgba(224, 224, 224, 1)",
                      textAlign: "right",
                      color:
                        ligne.montant !== 0
                          ? "rgba(27, 120, 188, 1)"
                          : "inherit",
                      fontWeight: ligne.montant !== 0 ? 700 : 400,
                    }}
                  >
                    {ligne.montant.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    €
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ))}
    </Box>
  );
};

// Fonction utilitaire pour formater une date en JJ/MM/AA
const formatDateFR2 = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const jour = String(d.getDate()).padStart(2, "0");
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const annee = String(d.getFullYear()).slice(-2);
  return `${jour}/${mois}/${annee}`;
};

const TableauPaiementSousTraitant = ({ chantierId, sousTraitantId }) => {
  const [contrats, setContrats] = useState([]);
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [chantierNom, setChantierNom] = useState("");
  const [openFactureModal, setOpenFactureModal] = useState(false);
  const [openPaiementModal, setOpenPaiementModal] = useState(false);
  const [openModifierPaiementModal, setOpenModifierPaiementModal] =
    useState(false);
  const [openRetenueModal, setOpenRetenueModal] = useState(false);
  const [selectedFactureRetenue, setSelectedFactureRetenue] = useState(null);
  const [montantRestant, setMontantRestant] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // Chargement contrats et factures (Promise.all)
  useEffect(() => {
    if (chantierId && sousTraitantId) {
      setLoading(true);
      Promise.all([
        axios.get(
          `/api/contrats-sous-traitance/?chantier_id=${chantierId}&sous_traitant=${sousTraitantId}`
        ),
        axios.get(
          `/api/factures-sous-traitant/?chantier=${chantierId}&sous_traitant=${sousTraitantId}`
        ),
      ])
        .then(([contratsRes, facturesRes]) => {
          setContrats(contratsRes.data);
          setFactures(facturesRes.data);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des données:", error);
          setContrats([]);
          setFactures([]);
          setLoading(false);
        });
    }
  }, [chantierId, sousTraitantId]);

  // Trier les factures par année, mois, puis numéro de facture
  const facturesTries = factures.sort((a, b) => {
    if (a.annee !== b.annee) return b.annee - a.annee;
    if (a.mois !== b.mois) return b.mois - a.mois;
    return parseInt(a.numero_facture) - parseInt(b.numero_facture);
  });

  // Handler création facture (POST)
  const handleAjouterFacture = async (data) => {
    try {
      const payload = {
        chantier: chantierId,
        sous_traitant: sousTraitantId,
        mois: data.mois,
        annee: data.annee,
        numero_facture: data.numeroFacture,
        montant_facture_ht: data.montantFacture,
        date_reception: data.dateReception,
        delai_paiement: data.delaiPaiement,
      };

      const res = await axios.post(`/api/factures-sous-traitant/`, payload);
      setFactures((prev) => [...prev, res.data]);

      // Si la checkbox "Créer certificat de paiement" est cochée
      if (data.creerCertificat && contratsFiltres.length > 0) {
        const contrat = contratsFiltres[0];
        const sousTraitantName = contrat.sous_traitant_details?.entreprise || '';
        const chantierName = contrat.chantier_details?.chantier_name || chantierNom || '';
        const societeName = contrat.chantier_details?.societe_name || contrat.societe_name || 'PEINTURE 3000';
        const numeroCertificat = String(factures.length + 1);

        try {
          await generatePDFDrive('certificat_paiement', {
            contratId: contrat.id,
            chantierId: chantierId,
            chantierName: chantierName,
            societeName: societeName,
            sousTraitantName: sousTraitantName,
            numeroCertificat: numeroCertificat,
            factureId: res.data.id,
          });
        } catch (pdfError) {
          console.error("Erreur lors de la génération du certificat:", pdfError);
        }
      }
    } catch (error) {
      alert("Erreur lors de la création de la facture.");
      if (error.response) {
        console.error("Erreur backend:", error.response.data);
      }
    }
  };

  // Handler ajout paiement pour une facture
  const handleAjouterPaiement = async (data) => {
    try {
      const payload = {
        facture: data.factureId,
        montant_paye: data.montantPaye,
        date_paiement_reel: data.datePaiementReel,
        commentaire: data.commentaire,
      };

      const res = await axios.post(
        `/api/paiements-facture-sous-traitant/`,
        payload
      );

      // Mettre à jour la facture avec le nouveau paiement
      setFactures((prev) =>
        prev.map((f) =>
          f.id === data.factureId
            ? { ...f, paiements: [...(f.paiements || []), res.data] }
            : f
        )
      );
    } catch (error) {
      alert("Erreur lors de l'ajout du paiement.");
      if (error.response) {
        console.error("Erreur backend:", error.response.data);
      }
    }
  };

  // Handler suppression facture
  const handleSupprimerFacture = async (factureId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) {
      try {
        await axios.delete(`/api/factures-sous-traitant/${factureId}/`);
        setFactures((prev) => prev.filter((f) => f.id !== factureId));
      } catch (error) {
        alert("Erreur lors de la suppression de la facture.");
      }
    }
  };

  // Handler suppression paiement
  const handleSupprimerPaiement = async (paiementId, factureId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce paiement ?")) {
      try {
        await axios.delete(
          `/api/paiements-facture-sous-traitant/${paiementId}/`
        );

        // Mettre à jour la facture en retirant le paiement
        setFactures((prev) =>
          prev.map((f) => {
            if (f.id === factureId) {
              // Filtrer les paiements pour retirer celui supprimé
              const paiementsRestants = f.paiements.filter((p) => p.id !== paiementId);
              
              // ✅ Recalculer la date de paiement réelle : prendre la date la plus récente parmi les paiements restants
              let datePaiementReelle = null;
              if (paiementsRestants.length > 0) {
                // Trier par date_paiement_reel décroissante et prendre la plus récente
                const paiementsTries = paiementsRestants
                  .filter(p => p.date_paiement_reel)
                  .sort((a, b) => {
                    const dateA = new Date(a.date_paiement_reel);
                    const dateB = new Date(b.date_paiement_reel);
                    return dateB - dateA; // Décroissant
                  });
                
                if (paiementsTries.length > 0) {
                  datePaiementReelle = paiementsTries[0].date_paiement_reel;
                }
              }
              
              return {
                ...f,
                paiements: paiementsRestants,
                // Mettre à jour la date de paiement réelle si elle existe dans les données de la facture
                date_paiement_reel: datePaiementReelle || f.date_paiement_reel || null
              };
            }
            return f;
          })
        );
      } catch (error) {
        alert("Erreur lors de la suppression du paiement.");
      }
    }
  };

  // Handler mise à jour retenue
  const handleMettreAJourRetenue = async (factureId, { montantRetenue }) => {
    try {
      await axios.patch(`/api/factures-sous-traitant/${factureId}/`, {
        montant_retenue: montantRetenue,
      });

      // Mettre à jour la facture avec la nouvelle retenue
      setFactures((prev) =>
        prev.map((f) =>
          f.id === factureId
            ? { ...f, montant_retenue: montantRetenue }
            : f
        )
      );
    } catch (error) {
      alert("Erreur lors de la mise à jour de la retenue.");
      if (error.response) {
        console.error("Erreur backend:", error.response.data);
      }
    }
  };

  // Fonctions utilitaires pour les calculs
  const calculerEcartFacture = (facture) => {
    const montantFacture = parseFloat(facture.montant_facture_ht) || 0;
    const montantRetenue = parseFloat(facture.montant_retenue) || 0;
    const montantTotalPaye =
      facture.paiements?.reduce(
        (sum, p) => sum + (parseFloat(p.montant_paye) || 0),
        0
      ) || 0;
    
    // L'écart est calculé comme : montant payé - (montant facturé - retenue)
    const montantNetFacture = montantFacture - montantRetenue;
    return montantTotalPaye - montantNetFacture;
  };

  const calculerJoursRetard = (datePrevue, dateReelle) => {
    if (!datePrevue || !dateReelle) return 0;
    try {
      const dPrevue = new Date(datePrevue);
      const dReelle = new Date(dateReelle);
      const diff = Math.round((dReelle - dPrevue) / (1000 * 60 * 60 * 24));
      return isNaN(diff) ? 0 : diff;
    } catch {
      return 0;
    }
  };

  const formaterJoursRetard = (jours) => {
    if (jours === 0) return "0 jour";
    if (jours > 0) return `${jours} jour${jours > 1 ? "s" : ""} de retard`;
    return `${Math.abs(jours)} jour${Math.abs(jours) > 1 ? "s" : ""} d'avance`;
  };

  const formaterEcart = (ecart) => {
    if (Math.abs(ecart) < 0.01) return "0,00 €";
    return `${ecart >= 0 ? "+" : ""}${ecart.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  };

  const getNomMois = (mois) => {
    const moisNoms = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ];
    return moisNoms[mois - 1] || mois;
  };

  // Filtrage des contrats pour le chantier et sous-traitant courant
  const contratsFiltres = contrats.filter(
    (c) =>
      String(c.chantier) === String(chantierId) &&
      String(c.sous_traitant) === String(sousTraitantId)
  );

  // Récupérer le nom du chantier si besoin
  useEffect(() => {
    if (!chantierId) return;
    // Si on a déjà le nom, ne refais pas la requête
    if (chantierNom) return;
    // Cherche dans les contrats filtrés si on a déjà le nom
    const contrat = contratsFiltres[0];
    if (contrat) {
      const chantierObj = contrat.chantier;
      if (typeof chantierObj === "object" && chantierObj.chantier_name) {
        setChantierNom(chantierObj.chantier_name);
        return;
      }
      if (contrat.chantier_details?.chantier_name) {
        setChantierNom(contrat.chantier_details.chantier_name);
        return;
      }
      if (contrat.chantier) {
        axios
          .get(`/api/chantier/${contrat.chantier}/`)
          .then((res) => {
            setChantierNom(res.data.chantier_name);
          })
          .catch(() => setChantierNom(contrat.chantier));
      }
    }
  }, [chantierId, chantierNom, contratsFiltres]);

  // Calculs pour le récapitulatif
  const montantContrat =
    contratsFiltres.length > 0
      ? parseFloat(contratsFiltres[0].montant_operation) || 0
      : 0;
  const montantAvenants =
    contratsFiltres.length > 0 && contratsFiltres[0].avenants
      ? contratsFiltres[0].avenants.reduce(
          (sum, av) => sum + (parseFloat(av.montant) || 0),
          0
        )
      : 0;
  const montantTotalMarche = montantContrat + montantAvenants;

  // Calculer le montant total payé à partir des factures
  const montantTotalPaye = factures.reduce((sum, facture) => {
    const montantFacturePaye =
      facture.paiements?.reduce(
        (sumPaiements, paiement) =>
          sumPaiements + (parseFloat(paiement.montant_paye) || 0),
        0
      ) || 0;
    return sum + montantFacturePaye;
  }, 0);

  // Calculer le total des montants facturés
  const totalMontantFacture = factures.reduce((sum, facture) => {
    return sum + (parseFloat(facture.montant_facture_ht) || 0);
  }, 0);

  // Calculer le total des retenues
  const totalRetenues = factures.reduce((sum, facture) => {
    return sum + (parseFloat(facture.montant_retenue) || 0);
  }, 0);

  // Calculer le montant net (facturé - retenues)
  const montantNetFacture = totalMontantFacture - totalRetenues;

  // Le montant restant doit tenir compte des retenues
  // Montant restant = Montant du marché - Montant payé - Total des retenues
  const montantRestantCalcul = montantTotalMarche - montantTotalPaye - totalRetenues;

  // Calculer le numéro de certificat chronologique pour chaque facture
  // (tri ascendant : la plus ancienne = CP n°1)
  const facturesChronologiques = [...factures].sort((a, b) => {
    if (a.annee !== b.annee) return a.annee - b.annee;
    if (a.mois !== b.mois) return a.mois - b.mois;
    return parseInt(a.numero_facture) - parseInt(b.numero_facture);
  });
  const numeroCertificatMap = {};
  facturesChronologiques.forEach((f, idx) => {
    numeroCertificatMap[f.id] = idx + 1;
  });

  // Créer les lignes à afficher dans le tableau (factures + paiements)
  const lignesTableau = [];

  facturesTries.forEach((facture) => {
    const ecart = calculerEcartFacture(facture);
    const paiements = facture.paiements || [];

    if (paiements.length === 0) {
      // Facture sans paiement
      lignesTableau.push({
        type: "facture",
        facture: facture,
        paiement: null,
        ecart: ecart,
        joursRetard: null,
        isFirstForFacture: true,
        isLastForFacture: true,
      });
    } else {
      // Facture avec paiements
      paiements.forEach((paiement, index) => {
        const jours = calculerJoursRetard(
          facture.date_paiement_prevue,
          paiement.date_paiement_reel
        );
        lignesTableau.push({
          type: "facture",
          facture: facture,
          paiement: paiement,
          ecart: index === paiements.length - 1 ? ecart : null, // Afficher l'écart seulement sur la dernière ligne
          joursRetard: jours,
          isFirstForFacture: index === 0,
          isLastForFacture: index === paiements.length - 1,
        });
      });
    }
  });

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      {contratsFiltres.length > 0 && (
        <Box sx={{ mb: 1 }}>
          {chantierNom && (
            <Typography
              variant="subtitle1"
              sx={{ color: "white", fontWeight: 700, fontSize: "1.1rem" }}
            >
              {chantierNom}
            </Typography>
          )}
          <Typography
            variant="subtitle1"
            sx={{ color: "white", fontWeight: 700, fontSize: "1.1rem" }}
          >
            {" "}
            {contratsFiltres[0].sous_traitant_details?.entreprise ||
              contratsFiltres[0].sous_traitant}
          </Typography>
        </Box>
      )}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Tableau Paiement Sous-Traitant</Typography>
      </Box>
      {/* Tableau récapitulatif contrat/avenants */}
      <TableauRecapContratAvenants
        contrats={contrats}
        chantierId={chantierId}
        sousTraitantId={sousTraitantId}
      />
      {/* Tableau des factures */}
      {loading ? (
        <Typography>Chargement...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "rgba(27, 120, 188, 1)" }}>
                <TableCell sx={{ color: "white" }}>Mois</TableCell>
                <TableCell sx={{ color: "white" }} align="center">
                  Facture n°
                </TableCell>
                <TableCell sx={{ color: "white" }}>Montant facturé</TableCell>
                <TableCell sx={{ color: "white" }}>Retenue</TableCell>
                <TableCell sx={{ color: "white" }}>Date de réception</TableCell>
                <TableCell sx={{ color: "white" }}>Date de paiement</TableCell>
                <TableCell sx={{ color: "white" }}>Montant payé</TableCell>
                <TableCell sx={{ color: "white" }}>
                  Date paiement réel
                </TableCell>
                <TableCell sx={{ color: "white" }}>Écart mois</TableCell>
                <TableCell sx={{ color: "white" }}>Jours de retard</TableCell>
                <TableCell sx={{ color: "white" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lignesTableau.map((ligne, index) => (
                <TableRow
                  key={`${ligne.facture.id}-${
                    ligne.paiement?.id || "no-payment"
                  }`}
                >
                  {/* Mois - affiché seulement sur la première ligne de la facture */}
                  <TableCell>
                    {ligne.isFirstForFacture
                      ? `${getNomMois(ligne.facture.mois)} ${
                          ligne.facture.annee
                        }`
                      : ""}
                  </TableCell>

                  {/* Facture n° - affiché seulement sur la première ligne de la facture */}
                  <TableCell align="center">
                    {ligne.isFirstForFacture
                      ? ligne.facture.numero_facture
                      : ""}
                  </TableCell>

                  {/* Montant facturé - affiché seulement sur la première ligne de la facture */}
                  <TableCell>
                    {ligne.isFirstForFacture ? (
                      <Typography
                        sx={{ color: "rgba(27, 120, 188, 1)", fontWeight: 600 }}
                      >
                        {parseFloat(
                          ligne.facture.montant_facture_ht
                        ).toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        €
                      </Typography>
                    ) : (
                      ""
                    )}
                  </TableCell>

                  {/* Retenue - affiché seulement sur la première ligne de la facture */}
                  <TableCell>
                    {ligne.isFirstForFacture ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          sx={{ 
                            color: "rgb(255, 152, 0)", 
                            fontWeight: 600,
                            cursor: "pointer",
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                          onClick={() => {
                            setSelectedFactureRetenue(ligne.facture);
                            setOpenRetenueModal(true);
                          }}
                        >
                          {(parseFloat(ligne.facture.montant_retenue) || 0).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          €
                        </Typography>
                        <Tooltip title="Modifier la retenue">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => {
                              setSelectedFactureRetenue(ligne.facture);
                              setOpenRetenueModal(true);
                            }}
                          >
                            <PaymentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      ""
                    )}
                  </TableCell>

                  {/* Date de réception - affiché seulement sur la première ligne de la facture */}
                  <TableCell>
                    {ligne.isFirstForFacture
                      ? formatDateFR2(ligne.facture.date_reception)
                      : ""}
                  </TableCell>

                  {/* Date de paiement prévue - affiché seulement sur la première ligne de la facture */}
                  <TableCell>
                    {ligne.isFirstForFacture
                      ? formatDateFR2(ligne.facture.date_paiement_prevue)
                      : ""}
                  </TableCell>

                  {/* Montant payé */}
                  <TableCell>
                    {ligne.paiement ? (
                      <Typography
                        sx={{ color: "rgb(0, 168, 42)", fontWeight: 600 }}
                      >
                        {parseFloat(ligne.paiement.montant_paye).toLocaleString(
                          "fr-FR",
                          {
                            minimumFractionDigits: 2,
                          }
                        )}{" "}
                        €
                      </Typography>
                    ) : (
                      <Tooltip title="Ajouter un paiement">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedFacture(ligne.facture);
                            setOpenPaiementModal(true);
                          }}
                        >
                          <PaymentIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>

                  {/* Date paiement réel */}
                  <TableCell>
                    {ligne.paiement
                      ? formatDateFR2(ligne.paiement.date_paiement_reel)
                      : "-"}
                  </TableCell>

                  {/* Écart mois - affiché seulement sur la dernière ligne de la facture */}
                  <TableCell>
                    {ligne.ecart !== null ? (
                      Math.abs(ligne.ecart) > 0.01 ? (
                        <Tooltip title="Cliquer pour ajouter un paiement">
                          <Typography
                            sx={{
                              color:
                                ligne.ecart > 0
                                  ? "rgb(0, 168, 42)"
                                  : "error.main",
                              fontWeight: 600,
                              cursor: "pointer",
                              "&:hover": {
                                textDecoration: "underline",
                              },
                            }}
                            onClick={() => {
                              setSelectedFacture(ligne.facture);
                              setOpenPaiementModal(true);
                            }}
                          >
                            {formaterEcart(ligne.ecart)}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography
                          sx={{
                            color: "inherit",
                            fontWeight: 400,
                          }}
                        >
                          {formaterEcart(ligne.ecart)}
                        </Typography>
                      )
                    ) : (
                      ""
                    )}
                  </TableCell>

                  {/* Jours de retard */}
                  <TableCell>
                    {ligne.joursRetard !== null ? (
                      <Typography
                        sx={{
                          color:
                            ligne.joursRetard === 0
                              ? "inherit"
                              : ligne.joursRetard > 0
                              ? "error.main"
                              : "rgb(0, 168, 42)",
                          fontWeight: ligne.joursRetard !== 0 ? 600 : 400,
                        }}
                      >
                        {formaterJoursRetard(ligne.joursRetard)}
                      </Typography>
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <Box
                      sx={{ display: "flex", gap: 0.5, alignItems: "center" }}
                    >
                      {ligne.isFirstForFacture && contratsFiltres.length > 0 && (
                        <Tooltip title={`Télécharger certificat de paiement n°${numeroCertificatMap[ligne.facture.id] || ""}`}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={async () => {
                              const contrat = contratsFiltres[0];
                              const numCP = String(numeroCertificatMap[ligne.facture.id] || 1).padStart(2, "0");
                              const sousTraitantNom = contrat.sous_traitant_details?.entreprise || "Sous-traitant";
                              const chantierName = contrat.chantier_details?.chantier_name || chantierNom || "Chantier";
                              const moisStr = String(ligne.facture.mois).padStart(2, "0");
                              const anneeStr = String(ligne.facture.annee).slice(-2);
                              const fileName = `Certificat de paiement n°${numCP} - ${sousTraitantNom} - ${chantierName} ${moisStr}-${anneeStr}.pdf`;

                              const params = new URLSearchParams();
                              params.set("facture_id", String(ligne.facture.id));
                              params.set("numero_certificat", numCP);
                              const previewUrl = `/api/preview-certificat-paiement/${contrat.id}/?${params.toString()}`;

                              setSnackbar({ open: true, message: "Téléchargement en cours...", severity: "info" });
                              try {
                                const response = await axios.post(
                                  "/api/generate-pdf-from-preview/",
                                  { preview_url: previewUrl, filename: fileName },
                                  {
                                    responseType: "blob",
                                    headers: { "Content-Type": "application/json" },
                                  }
                                );

                                if (response.headers["content-type"] === "application/pdf") {
                                  const pdfBlob = new Blob([response.data], { type: "application/pdf" });
                                  const pdfUrl = window.URL.createObjectURL(pdfBlob);
                                  const link = document.createElement("a");
                                  link.href = pdfUrl;
                                  link.download = fileName;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(pdfUrl);
                                  setSnackbar({ open: true, message: "Téléchargement terminé avec succès", severity: "success" });
                                } else {
                                  setSnackbar({ open: true, message: "Erreur : le fichier reçu n'est pas un PDF", severity: "error" });
                                }
                              } catch (err) {
                                console.error("Erreur téléchargement CP:", err);
                                setSnackbar({ open: true, message: "Erreur lors du téléchargement du certificat", severity: "error" });
                              }
                            }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {ligne.isFirstForFacture && (
                        <Tooltip title="Supprimer la facture">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              handleSupprimerFacture(ligne.facture.id)
                            }
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {ligne.paiement && (
                        <Tooltip title="Supprimer ce paiement">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() =>
                              handleSupprimerPaiement(
                                ligne.paiement.id,
                                ligne.facture.id
                              )
                            }
                          >
                            <RemoveCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {/* Ligne de total des montants facturés */}
              <TableRow
                sx={{
                  backgroundColor: "rgba(27, 120, 188, 0.1)",
                  fontWeight: "bold",
                  "& td": {
                    fontWeight: "bold",
                    color: "rgba(27, 120, 188, 1)",
                  },
                }}
              >
                <TableCell
                  sx={{
                    textAlign: "center",
                    color: "black",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                  }}
                >
                  Total Facturé
                </TableCell>
                <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>
                  -
                </TableCell>
                <TableCell sx={{ textAlign: "right", fontWeight: "bold" }}>
                  <Typography
                    sx={{
                      color: "rgba(27, 120, 188, 1)",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                    }}
                  >
                    {totalMontantFacture.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    €
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "right", fontWeight: "bold" }}>
                  <Typography
                    sx={{
                      color: "rgb(255, 152, 0)",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                    }}
                  >
                    {factures.reduce((sum, f) => sum + (parseFloat(f.montant_retenue) || 0), 0).toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    €
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>
                  -
                </TableCell>
                <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>
                  -
                </TableCell>
                <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>
                  -
                </TableCell>
                <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>
                  -
                </TableCell>
                <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>
                  -
                </TableCell>
                <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>
                  -
                </TableCell>
                <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>
                  -
                </TableCell>
              </TableRow>

              {/* Ligne pour ajouter une nouvelle facture */}
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setOpenFactureModal(true)}
                    startIcon={<AddIcon />}
                    sx={{ mt: 1, mb: 1 }}
                  >
                    Ajouter une facture
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "rgba(27, 120, 188, 0.08)",
          borderRadius: 1,
          p: 2,
          mb: 2,
          mt: "20px",
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)" }}>
            Montant total du marché :{" "}
            {montantTotalMarche.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
            })}{" "}
            €
          </Typography>
          <Typography sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)" }}>
            Montant total facturé :{" "}
            {totalMontantFacture.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
            })}{" "}
            €
          </Typography>
          <Typography sx={{ fontWeight: 700, color: "rgb(255, 152, 0)" }}>
            Total des retenues :{" "}
            {totalRetenues.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
            })}{" "}
            €
          </Typography>
          <Typography sx={{ fontWeight: 700, color: "rgb(156, 39, 176)" }}>
            Montant net facturé :{" "}
            {montantNetFacture.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
            })}{" "}
            €
          </Typography>
          <Typography sx={{ fontWeight: 700, color: "rgb(0, 168, 42)" }}>
            Montant total payé :{" "}
            {montantTotalPaye.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
            })}{" "}
            €
          </Typography>
        </Box>
        <Box>
          <Typography
            sx={{
              fontWeight: 700,
              color:
                montantRestantCalcul < 0
                  ? "error.main"
                  : "rgba(27, 120, 188, 1)",
            }}
          >
            Montant restant du marché :{" "}
            {montantRestantCalcul.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
            })}{" "}
            €
          </Typography>
          <Typography
            sx={{
              fontWeight: 700,
              color: "rgb(0, 168, 42)",
              mt: 1,
            }}
          >
            Pourcentage d'avancement :{" "}
            {montantTotalMarche > 0
              ? ((montantTotalPaye / montantTotalMarche) * 100).toFixed(2)
              : 0}
            %
          </Typography>
        </Box>
      </Box>
      <FactureModal
        open={openFactureModal}
        onClose={() => setOpenFactureModal(false)}
        onSubmit={handleAjouterFacture}
        chantierId={chantierId}
        sousTraitantId={sousTraitantId}
        factures={factures}
        contrat={contratsFiltres.length > 0 ? contratsFiltres[0] : null}
        chantierNom={chantierNom}
      />
      <PaiementFactureModal
        open={openPaiementModal}
        onClose={() => setOpenPaiementModal(false)}
        facture={selectedFacture}
        onSubmit={handleAjouterPaiement}
      />
      <RetenueModal
        open={openRetenueModal}
        onClose={() => setOpenRetenueModal(false)}
        facture={selectedFactureRetenue}
        onSubmit={handleMettreAJourRetenue}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === "info" ? null : 3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TableauPaiementSousTraitant;
