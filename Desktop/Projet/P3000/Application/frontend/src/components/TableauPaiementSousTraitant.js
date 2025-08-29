import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import axios from "axios";
import React, { useEffect, useState } from "react";

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

const PaiementGlobalModal = ({
  open,
  onClose,
  chantierId,
  sousTraitantId,
  onSubmit,
  montantRestant,
}) => {
  const [datePaiement, setDatePaiement] = useState("");
  const [montantPaye, setMontantPaye] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const handleSubmit = () => {
    onSubmit({ datePaiement, montantPaye, commentaire });
    onClose();
    setDatePaiement("");
    setMontantPaye("");
    setCommentaire("");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nouveau paiement global</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, color: "warning.main" }}>
            Montant restant à payer :{" "}
            {montantRestant.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
            })}{" "}
            €
          </Typography>
          <TextField
            type="date"
            label="Date de paiement"
            value={datePaiement}
            onChange={(e) => setDatePaiement(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
          />
          <TextField
            type="number"
            label="Montant payé HT"
            value={montantPaye}
            onChange={(e) => setMontantPaye(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
            inputProps={{ step: "0.01", min: "0" }}
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
          disabled={!datePaiement || !montantPaye}
        >
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ModifierPaiementGlobalModal = ({ open, onClose, paiement, onSubmit }) => {
  const [datePaiement, setDatePaiement] = useState("");
  const [montantPaye, setMontantPaye] = useState("");
  const [commentaire, setCommentaire] = useState("");

  useEffect(() => {
    if (paiement) {
      setDatePaiement(paiement.date_paiement || "");
      setMontantPaye(paiement.montant_paye_ht || "");
      setCommentaire(paiement.commentaire || "");
    }
  }, [paiement]);

  const handleSubmit = () => {
    onSubmit(paiement.id, { datePaiement, montantPaye, commentaire });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifier le paiement</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <TextField
            type="date"
            label="Date de paiement"
            value={datePaiement}
            onChange={(e) => setDatePaiement(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
          />
          <TextField
            type="number"
            label="Montant payé HT"
            value={montantPaye}
            onChange={(e) => setMontantPaye(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
            inputProps={{ step: "0.01", min: "0" }}
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
          disabled={!datePaiement || !montantPaye}
        >
          Valider
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
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [chantierNom, setChantierNom] = useState("");
  const [openPaiementGlobalModal, setOpenPaiementGlobalModal] = useState(false);
  const [openModifierPaiementModal, setOpenModifierPaiementModal] =
    useState(false);
  const [montantRestant, setMontantRestant] = useState(0);

  // Chargement contrats et paiements globaux (Promise.all)
  useEffect(() => {
    if (chantierId && sousTraitantId) {
      setLoading(true);
      Promise.all([
        axios.get(
          `/api/contrats-sous-traitance/?chantier_id=${chantierId}&sous_traitant=${sousTraitantId}`
        ),
        axios.get(
          `/api/paiements-globaux-sous-traitant/?chantier=${chantierId}&sous_traitant=${sousTraitantId}`
        ),
      ])
        .then(([contratsRes, paiementsRes]) => {
          setContrats(contratsRes.data);
          setPaiements(paiementsRes.data);
          setLoading(false);
        })
        .catch(() => {
          setContrats([]);
          setPaiements([]);
          setLoading(false);
        });
    }
  }, [chantierId, sousTraitantId]);

  // Trier les paiements par date (du plus récent au plus ancien)
  const paiementsTries = paiements.sort((a, b) => {
    const dateA = new Date(a.date_paiement);
    const dateB = new Date(b.date_paiement);
    return dateB - dateA;
  });

  // Handler création paiement global (POST)
  const handleAjouterPaiementGlobal = async (data) => {
    try {
      const payload = {
        chantier: chantierId,
        sous_traitant: sousTraitantId,
        date_paiement: data.datePaiement,
        montant_paye_ht: data.montantPaye,
        commentaire: data.commentaire,
      };

      const res = await axios.post(
        `/api/paiements-globaux-sous-traitant/`,
        payload
      );
      setPaiements((prev) => [...prev, res.data]);
    } catch (error) {
      alert("Erreur lors de la création du paiement.");
      if (error.response) {
        console.error("Erreur backend:", error.response.data);
      }
    }
  };

  // Handlers pour les modals de paiements globaux
  const handleModifierPaiementGlobal = async (
    paiementId,
    { datePaiement, montantPaye, commentaire }
  ) => {
    try {
      const res = await axios.patch(
        `/api/paiements-globaux-sous-traitant/${paiementId}/`,
        {
          date_paiement: datePaiement,
          montant_paye_ht: montantPaye,
          commentaire: commentaire,
        }
      );
      setPaiements((prev) =>
        prev.map((p) =>
          p.id === paiementId
            ? {
                ...p,
                date_paiement: datePaiement,
                montant_paye_ht: montantPaye,
                commentaire: commentaire,
              }
            : p
        )
      );
    } catch (error) {
      alert("Erreur lors de la modification du paiement.");
    }
  };

  const handleSupprimerPaiementGlobal = async (paiementId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce paiement ?")) {
      try {
        await axios.delete(
          `/api/paiements-globaux-sous-traitant/${paiementId}/`
        );
        setPaiements((prev) => prev.filter((p) => p.id !== paiementId));
      } catch (error) {
        alert("Erreur lors de la suppression du paiement.");
      }
    }
  };

  // Calculs utilitaires
  const calculerDatePrevue = (dateEnvoi, delai) => {
    if (!dateEnvoi || !delai) return "-";
    try {
      const date = new Date(dateEnvoi);
      date.setDate(date.getDate() + parseInt(delai));
      return date.toLocaleDateString("fr-FR");
    } catch {
      return "-";
    }
  };

  const calculerJoursRetard = (datePrevue, dateReelle) => {
    if (!datePrevue || !dateReelle || datePrevue === "-") return "-";
    try {
      const [jourP, moisP, anneeP] = datePrevue.split("/").map(Number);
      const [anneeR, moisR, jourR] = dateReelle.split("-").map(Number);
      const dPrevue = new Date(
        anneeP < 100 ? 2000 + anneeP : anneeP,
        (moisP || 1) - 1,
        jourP || 1
      );
      const dReelle = new Date(anneeR, (moisR || 1) - 1, jourR || 1);
      const diff = Math.round((dReelle - dPrevue) / (1000 * 60 * 60 * 24));
      if (isNaN(diff)) return "-";
      if (diff > 0) return `${diff} jours de retard`;
      if (diff < 0) return `${Math.abs(diff)} jours d'avance`;
      return "0 jour";
    } catch {
      return "-";
    }
  };

  const calculerEcartMois = (montantPaye, montantFacture) => {
    const paye = parseFloat(montantPaye) || 0;
    const facture = parseFloat(montantFacture) || 0;
    if (!montantPaye && !montantFacture) return "-";
    const ecart = paye - facture;
    return `${ecart >= 0 ? "+" : ""}${ecart.toFixed(2)} €`;
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
  const montantTotalPaye = paiements.reduce(
    (sum, p) => sum + (parseFloat(p.montant_paye_ht) || 0),
    0
  );
  const montantRestantCalcul = montantTotalMarche - montantTotalPaye;

  // Handler pour le paiement global avec validation
  const handlePaiementGlobalSubmit = async (data) => {
    const montantPaye = parseFloat(data.montantPaye);

    // Vérifier si le paiement dépasse le montant restant
    if (montantPaye > montantRestantCalcul) {
      const surplus = montantPaye - montantRestantCalcul;
      const confirmation = window.confirm(
        `Attention : Ce paiement dépasse le montant restant de ${surplus.toFixed(
          2
        )}€.\n\n` +
          `Montant restant : ${montantRestantCalcul.toFixed(2)}€\n` +
          `Montant à payer : ${montantPaye.toFixed(2)}€\n\n` +
          `Voulez-vous continuer malgré le surplus ?`
      );

      if (!confirmation) {
        return;
      }
    }

    try {
      const payload = {
        chantier: chantierId,
        sous_traitant: sousTraitantId,
        date_paiement: data.datePaiement,
        montant_paye_ht: data.montantPaye,
        commentaire: data.commentaire,
      };
      const res = await axios.post(
        `/api/paiements-globaux-sous-traitant/`,
        payload
      );
      setPaiements((prev) => [...prev, res.data]);
      setOpenPaiementGlobalModal(false);
    } catch (error) {
      alert("Erreur lors de la création du paiement global.");
      if (error.response) {
        console.error("Erreur backend:", error.response.data);
      }
    }
  };

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
      {/* Tableau de paiements globaux */}
      {loading ? (
        <Typography>Chargement...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "rgba(27, 120, 188, 1)" }}>
                <TableCell sx={{ color: "white" }}>Date de paiement</TableCell>
                <TableCell sx={{ color: "white" }}>Montant payé HT</TableCell>
                <TableCell sx={{ color: "white" }}>
                  Date de paiement réelle
                </TableCell>
                <TableCell sx={{ color: "white" }}>Commentaire</TableCell>
                <TableCell sx={{ color: "white" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paiementsTries.map((paiement) => (
                <TableRow key={paiement.id}>
                  <TableCell>{formatDateFR2(paiement.date_paiement)}</TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        color: "rgb(0, 168, 42)",
                        fontWeight: 600,
                      }}
                    >
                      {parseFloat(paiement.montant_paye_ht).toLocaleString(
                        "fr-FR",
                        {
                          minimumFractionDigits: 2,
                        }
                      )}{" "}
                      €
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {paiement.date_paiement_reel
                      ? formatDateFR2(paiement.date_paiement_reel)
                      : "-"}
                  </TableCell>
                  <TableCell>{paiement.commentaire || "-"}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setSelectedPaiement(paiement);
                          setOpenModifierPaiementModal(true);
                        }}
                      >
                        Modifier
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() =>
                          handleSupprimerPaiementGlobal(paiement.id)
                        }
                      >
                        Supprimer
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {/* Ligne pour ajouter un nouveau paiement */}
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setOpenPaiementGlobalModal(true)}
                    sx={{ mt: 1, mb: 1 }}
                  >
                    + Ajouter un paiement
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
      <PaiementGlobalModal
        open={openPaiementGlobalModal}
        onClose={() => setOpenPaiementGlobalModal(false)}
        chantierId={chantierId}
        sousTraitantId={sousTraitantId}
        onSubmit={handlePaiementGlobalSubmit}
        montantRestant={montantRestantCalcul}
      />
      <ModifierPaiementGlobalModal
        open={openModifierPaiementModal}
        onClose={() => setOpenModifierPaiementModal(false)}
        paiement={selectedPaiement}
        onSubmit={handleModifierPaiementGlobal}
      />
    </Box>
  );
};

export default TableauPaiementSousTraitant;
