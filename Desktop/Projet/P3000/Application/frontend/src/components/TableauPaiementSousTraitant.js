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
  const [openDateModal, setOpenDateModal] = useState(false);
  const [openPaiementModal, setOpenPaiementModal] = useState(false);
  const [openMontantFactureModal, setOpenMontantFactureModal] = useState(false);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [moisGrille, setMoisGrille] = useState([]);
  const [openAjouterPaiementModal, setOpenAjouterPaiementModal] =
    useState(false);
  const [moisAnneeAjouter, setMoisAnneeAjouter] = useState({});
  const [chantierNom, setChantierNom] = useState("");

  // Chargement contrats et paiements (Promise.all)
  useEffect(() => {
    if (chantierId && sousTraitantId) {
      setLoading(true);
      Promise.all([
        axios.get(
          `/api/contrats-sous-traitance/?chantier_id=${chantierId}&sous_traitant=${sousTraitantId}`
        ),
        axios.get(
          `/api/paiements-sous-traitant/?chantier=${chantierId}&sous_traitant=${sousTraitantId}`
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

  // Générer la grille des mois unique (de la date de début la plus ancienne à aujourd'hui)
  useEffect(() => {
    if (contrats.length > 0) {
      const contratsFiltres = contrats.filter(
        (c) =>
          String(c.chantier) === String(chantierId) &&
          String(c.sous_traitant) === String(sousTraitantId)
      );

      if (contratsFiltres.length > 0) {
        const contrat = contratsFiltres[0];
        let moisTotal = [];

        // Ajouter le contrat initial
        const dateContrat = new Date(contrat.date_debut);
        moisTotal.push({
          mois: dateContrat.getMonth() + 1,
          annee: dateContrat.getFullYear(),
          contratId: contrat.id,
          type: "CONTRAT",
          montant: contrat.montant_operation,
        });

        // Ajouter les avenants s'ils existent
        if (contrat.avenants && contrat.avenants.length > 0) {
          contrat.avenants.forEach((avenant) => {
            const dateAvenant = new Date(avenant.date_creation);
            moisTotal.push({
              mois: dateAvenant.getMonth() + 1,
              annee: dateAvenant.getFullYear(),
              contratId: contrat.id,
              avenantId: avenant.id,
              type: `AVENANT ${String(avenant.numero).padStart(2, "0")}`,
              montant: avenant.montant,
            });
          });
        }

        // Trier par date (mois/année)
        moisTotal.sort((a, b) => {
          if (a.annee !== b.annee) return a.annee - b.annee;
          return a.mois - b.mois;
        });

        setMoisGrille(moisTotal);
      } else {
        setMoisGrille([]);
      }
    } else {
      setMoisGrille([]);
    }
  }, [contrats, chantierId, sousTraitantId]);

  // Fusion grille et paiements existants
  const grilleComplete = moisGrille.map((ligne) => {
    const paiement = paiements.find(
      (p) =>
        Number(p.mois) === Number(ligne.mois) &&
        Number(p.annee) === Number(ligne.annee) &&
        // Ajouter la vérification pour l'avenant
        (ligne.avenantId ? p.avenant === ligne.avenantId : !p.avenant)
    );
    return { ...ligne, paiement };
  });

  // Handler création paiement (POST)
  const handleAjouterPaiement = async (data) => {
    console.log("Payload envoyé pour création paiement :", data);
    try {
      // Ajouter l'avenantId si c'est un avenant
      const payload = {
        ...data,
        contrat: data.contratId,
        avenant: data.avenantId || null,
      };

      const res = await axios.post(`/api/paiements-sous-traitant/`, payload);
      setPaiements((prev) => [...prev, res.data]);
    } catch (error) {
      alert("Erreur lors de la création du paiement.");
      if (error.response) {
        console.error("Erreur backend:", error.response.data);
      }
    }
  };

  // Handlers pour les modals (à compléter)
  const handleDateModalSubmit = async (
    paiementId,
    { dateEnvoi, delaiPaiement }
  ) => {
    try {
      const res = await axios.patch(
        `/api/paiements-sous-traitant/${paiementId}/`,
        {
          date_envoi_facture: dateEnvoi,
          delai_paiement: delaiPaiement,
        }
      );
      setPaiements((prev) =>
        prev.map((p) =>
          p.id === paiementId
            ? {
                ...p,
                date_envoi_facture: dateEnvoi,
                delai_paiement: delaiPaiement,
              }
            : p
        )
      );
    } catch (error) {
      alert("Erreur lors de la mise à jour de la date d'envoi/délai.");
    }
  };

  const handlePaiementModalSubmit = async (
    paiementId,
    { montantPaye, datePaiementReel }
  ) => {
    try {
      const res = await axios.patch(
        `/api/paiements-sous-traitant/${paiementId}/`,
        {
          montant_paye_ht: montantPaye,
          date_paiement_reel: datePaiementReel,
        }
      );
      setPaiements((prev) =>
        prev.map((p) =>
          p.id === paiementId
            ? {
                ...p,
                montant_paye_ht: montantPaye,
                date_paiement_reel: datePaiementReel,
              }
            : p
        )
      );
    } catch (error) {
      alert("Erreur lors de la mise à jour du paiement.");
    }
  };

  const handleMontantFactureModalSubmit = async (
    paiementId,
    { montantFacture }
  ) => {
    try {
      await axios.patch(`/api/paiements-sous-traitant/${paiementId}/`, {
        montant_facture_ht: montantFacture,
      });
      setPaiements((prev) =>
        prev.map((p) =>
          p.id === paiementId ? { ...p, montant_facture_ht: montantFacture } : p
        )
      );
    } catch (error) {
      alert("Erreur lors de la mise à jour du montant facturé.");
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
  const montantDejaFacture = paiements.reduce(
    (sum, p) => sum + (parseFloat(p.montant_facture_ht) || 0),
    0
  );
  const montantRestant = montantTotalMarche - montantDejaFacture;

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
      <Typography variant="h6" sx={{ mb: 2 }}>
        Tableau Paiement Sous-Traitant
      </Typography>
      {/* Tableau récapitulatif contrat/avenants */}
      <TableauRecapContratAvenants
        contrats={contrats}
        chantierId={chantierId}
        sousTraitantId={sousTraitantId}
      />
      {/* Tableau de paiement */}
      {loading ? (
        <Typography>Chargement...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "rgba(27, 120, 188, 1)" }}>
                <TableCell sx={{ color: "white" }}>Mois</TableCell>
                <TableCell sx={{ color: "white" }}>Type</TableCell>
                <TableCell sx={{ color: "white" }}>
                  Montant facture du mois
                </TableCell>
                <TableCell sx={{ color: "white" }}>
                  Date d'envoi facture
                </TableCell>
                <TableCell sx={{ color: "white" }}>
                  Date de paiement prévue
                </TableCell>
                <TableCell sx={{ color: "white" }}>Montant payé HT</TableCell>
                <TableCell sx={{ color: "white" }}>
                  Date paiement réelle
                </TableCell>
                <TableCell sx={{ color: "white" }}>Jours de retard</TableCell>
                <TableCell sx={{ color: "white" }}>Écart du mois</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grilleComplete.map((ligne, idx) => (
                <TableRow
                  key={`${ligne.annee}-${ligne.mois}-${
                    ligne.type || "contrat"
                  }`}
                >
                  <TableCell>{`${String(ligne.mois).padStart(2, "0")}/${
                    ligne.annee
                  }`}</TableCell>
                  <TableCell>
                    <Typography
                      sx={{
                        color:
                          ligne.type === "CONTRAT"
                            ? "rgba(27, 120, 188, 1)"
                            : "rgb(0, 168, 42)",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                      }}
                    >
                      {ligne.type || "CONTRAT"}
                    </Typography>
                  </TableCell>
                  {ligne.paiement ? (
                    <>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedPaiement(ligne.paiement);
                            setOpenMontantFactureModal(true);
                          }}
                        >
                          {ligne.paiement.montant_facture_ht !== undefined &&
                          ligne.paiement.montant_facture_ht !== null &&
                          ligne.paiement.montant_facture_ht !== "" ? (
                            <Typography
                              sx={{
                                color: "rgb(0, 168, 42)",
                                fontWeight: 600,
                              }}
                            >
                              {parseFloat(
                                ligne.paiement.montant_facture_ht
                              ).toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                              })}{" "}
                              €
                            </Typography>
                          ) : (
                            "Définir"
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedPaiement(ligne.paiement);
                            setOpenDateModal(true);
                          }}
                        >
                          {ligne.paiement.date_envoi_facture
                            ? formatDateFR2(ligne.paiement.date_envoi_facture)
                            : "Définir"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {ligne.paiement.date_envoi_facture &&
                        ligne.paiement.delai_paiement
                          ? formatDateFR2(
                              (() => {
                                const d = new Date(
                                  ligne.paiement.date_envoi_facture
                                );
                                d.setDate(
                                  d.getDate() +
                                    parseInt(ligne.paiement.delai_paiement)
                                );
                                return d;
                              })()
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedPaiement(ligne.paiement);
                            setOpenPaiementModal(true);
                          }}
                        >
                          {ligne.paiement.montant_paye_ht !== undefined &&
                          ligne.paiement.montant_paye_ht !== null &&
                          ligne.paiement.montant_paye_ht !== "" ? (
                            <Typography
                              sx={{
                                color:
                                  parseFloat(ligne.paiement.montant_paye_ht) >=
                                  0
                                    ? "rgb(0, 168, 42)"
                                    : "error.main",
                                fontWeight: 600,
                              }}
                            >
                              {parseFloat(
                                ligne.paiement.montant_paye_ht
                              ).toLocaleString("fr-FR", {
                                minimumFractionDigits: 2,
                              })}{" "}
                              €
                            </Typography>
                          ) : (
                            "Définir"
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {ligne.paiement.date_paiement_reel
                          ? formatDateFR2(ligne.paiement.date_paiement_reel)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {calculerJoursRetard(
                          calculerDatePrevue(
                            ligne.paiement.date_envoi_facture,
                            ligne.paiement.delai_paiement
                          ),
                          ligne.paiement.date_paiement_reel
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const paye =
                            parseFloat(ligne.paiement.montant_paye_ht) || 0;
                          const facture =
                            parseFloat(ligne.paiement.montant_facture_ht) || 0;
                          if (
                            ligne.paiement.montant_paye_ht === undefined &&
                            ligne.paiement.montant_facture_ht === undefined
                          )
                            return "-";
                          const ecart = paye - facture;
                          return (
                            <Typography
                              sx={{
                                color:
                                  ecart < 0 ? "error.main" : "rgb(0, 168, 42)",
                                fontWeight: 600,
                              }}
                            >
                              {ecart >= 0 ? "+" : ""}
                              {ecart.toFixed(2)} €
                            </Typography>
                          );
                        })()}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell colSpan={8} align="center">
                        <Button
                          variant="outlined"
                          size="small"
                          color="primary"
                          onClick={() => {
                            setMoisAnneeAjouter({
                              mois: ligne.mois,
                              annee: ligne.annee,
                              contratId: ligne.contratId,
                              avenantId: ligne.avenantId || null,
                              type: ligne.type,
                            });
                            setOpenAjouterPaiementModal(true);
                          }}
                        >
                          Ajouter paiement
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {/* Ligne de total des écarts du mois */}
              <TableRow>
                <TableCell
                  colSpan={8}
                  align="right"
                  sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)" }}
                >
                  Total écarts du mois :
                </TableCell>
                <TableCell>
                  {(() => {
                    const totalEcart = grilleComplete.reduce((sum, ligne) => {
                      if (!ligne.paiement) return sum;
                      const paye =
                        parseFloat(ligne.paiement.montant_paye_ht) || 0;
                      const facture =
                        parseFloat(ligne.paiement.montant_facture_ht) || 0;
                      return sum + (paye - facture);
                    }, 0);
                    return (
                      <Typography
                        sx={{
                          fontWeight: 700,
                          color:
                            totalEcart < 0 ? "error.main" : "rgb(0, 168, 42)",
                        }}
                      >
                        {totalEcart >= 0 ? "+" : ""}
                        {totalEcart.toFixed(2)} €
                      </Typography>
                    );
                  })()}
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
            Montant déjà facturé :{" "}
            {montantDejaFacture.toLocaleString("fr-FR", {
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
                montantRestant < 0 ? "error.main" : "rgba(27, 120, 188, 1)",
            }}
          >
            Montant restant du marché :{" "}
            {montantRestant.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
            })}{" "}
            €
          </Typography>
        </Box>
      </Box>
      <AjouterPaiementModal
        open={openAjouterPaiementModal}
        onClose={() => setOpenAjouterPaiementModal(false)}
        mois={moisAnneeAjouter.mois}
        annee={moisAnneeAjouter.annee}
        contratId={moisAnneeAjouter.contratId}
        chantierId={chantierId}
        sousTraitantId={sousTraitantId}
        avenantId={moisAnneeAjouter.avenantId}
        type={moisAnneeAjouter.type}
        onSubmit={handleAjouterPaiement}
      />
      <DateEnvoiModal
        open={openDateModal}
        onClose={() => setOpenDateModal(false)}
        paiement={selectedPaiement}
        onSubmit={handleDateModalSubmit}
      />
      <PaiementModal
        open={openPaiementModal}
        onClose={() => setOpenPaiementModal(false)}
        paiement={selectedPaiement}
        onSubmit={handlePaiementModalSubmit}
      />
      <MontantFactureModal
        open={openMontantFactureModal}
        onClose={() => setOpenMontantFactureModal(false)}
        paiement={selectedPaiement}
        onSubmit={handleMontantFactureModalSubmit}
      />
    </Box>
  );
};

export default TableauPaiementSousTraitant;
