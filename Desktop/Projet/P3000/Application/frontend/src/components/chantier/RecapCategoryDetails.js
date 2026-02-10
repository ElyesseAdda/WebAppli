import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
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
import React from "react";
import { FaFilter, FaTimes } from "react-icons/fa";
import { useRecapFinancier } from "./RecapFinancierContext";

const RecapCategoryDetails = ({
  open,
  documents,
  title,
  onClose,
  category,
  chantierId,
  periode,
  refreshRecap,
}) => {
  // Récupérer le contexte pour accéder au mode global
  const { global } = useRecapFinancier();
  
  // État pour stocker les primes du chantier
  const [primes, setPrimes] = React.useState([]);
  const [loadingPrimes, setLoadingPrimes] = React.useState(false);

  // Fonction pour définir dynamiquement les colonnes selon la catégorie
  function getColumnsForCategory(cat) {
    switch (cat) {
      case "main_oeuvre":
        return [
          { label: "Agent", key: "agent" },
          { label: "Mois", key: "mois" },
          { label: "Heures", key: "heures" },
          { label: "Prime", key: "prime" },
          { label: "Montant", key: "montant" },
        ];
      case "materiel":
        return [
          { label: "N°", key: "numero" },
          { label: "Date", key: "date" },
          { label: "Montant", key: "montant" },
          { label: "Statut", key: "statut" },
          { label: "Fournisseur", key: "fournisseur" },
        ];
      case "sous_traitant":
        return [
          { label: "Sous-traitant", key: "sous_traitant" },
          { label: "N°", key: "facture_numero" },
          { label: "Date", key: "date" },
          { label: "Montant", key: "montant" },
        ];
      default:
        return [
          { label: "N°", key: "numero" },
          { label: "Date", key: "date" },
          { label: "Montant", key: "montant" },
          { label: "Statut", key: "statut" },
        ];
    }
  }

  const columns = getColumnsForCategory(category);

  // Charger les primes du chantier pour la catégorie main_oeuvre
  React.useEffect(() => {
    if (category === "main_oeuvre" && open && chantierId) {
      loadChantierPrimes();
    }
    // eslint-disable-next-line
  }, [category, open, chantierId, periode, global]);

  const loadChantierPrimes = async () => {
    setLoadingPrimes(true);
    try {
      const params = {
        chantier_id: chantierId,
        type_affectation: "chantier",
      };
      
      // En mode période, filtrer par mois/année
      // En mode global, récupérer TOUTES les primes du chantier
      if (!global) {
        params.mois = periode.mois;
        params.annee = periode.annee;
      }
      
      const response = await axios.get("/api/agent-primes/", { params });
      setPrimes(response.data || []);
      } catch (error) {
        setPrimes([]);
    } finally {
      setLoadingPrimes(false);
    }
  };

  // Pour main_oeuvre : regrouper par agent et mois (ou par agent si global)
  let displayDocuments = documents;
  if (category === "main_oeuvre") {
    const grouped = {};
    
    // Regrouper les documents (heures travaillées)
    if (documents && documents.length > 0) {
      documents.forEach((doc) => {
        if (!doc.agent) return;
        
        let key;
        let mois = "-";
        let moisNum = null;
        let anneeNum = null;
        
        if (global) {
          // Mode global : TOUJOURS regrouper par agent uniquement (ignorer la date)
          key = doc.agent;
          mois = "-";
        } else {
          // Mode période : regrouper par agent + mois
          if (doc.date) {
            const d = new Date(doc.date);
            moisNum = d.getMonth() + 1;
            anneeNum = d.getFullYear();
            mois = ("0" + moisNum).slice(-2) + "/" + anneeNum;
            key = doc.agent + "_" + mois;
          } else {
            // Si pas de date en mode période, utiliser juste l'agent
            key = doc.agent + "_-";
            mois = "-";
          }
        }
        
        if (!grouped[key]) {
          grouped[key] = {
            agent: doc.agent,
            mois: mois,
            moisNum,
            anneeNum,
            heures: 0,
            montant: 0,
            primes: [],
            totalPrimes: 0,
          };
        }
        grouped[key].heures += doc.heures || 0;
        grouped[key].montant += doc.montant || 0;
      });
    }

    // Ajouter les primes dans les groupes correspondants
    primes.forEach((prime) => {
      const agentName = `${prime.agent_name} ${prime.agent_surname}`;
      
      let key;
      if (global) {
        // Mode global : regrouper par agent uniquement (TOUTES les primes de l'agent)
        key = agentName;
      } else {
        // Mode période : regrouper par agent + mois spécifique
        const mois = ("0" + prime.mois).slice(-2) + "/" + prime.annee;
        key = agentName + "_" + mois;
      }
      
      // Si le groupe n'existe pas (agent n'a pas travaillé ce mois mais a une prime)
      if (!grouped[key]) {
        grouped[key] = {
          agent: agentName,
          mois: global ? "-" : ("0" + prime.mois).slice(-2) + "/" + prime.annee,
          moisNum: prime.mois,
          anneeNum: prime.annee,
          heures: 0,
          montant: 0,
          primes: [],
          totalPrimes: 0,
        };
      }
      
      grouped[key].primes.push({
        description: prime.description,
        montant: parseFloat(prime.montant),
        mois: prime.mois,
        annee: prime.annee,
      });
      grouped[key].totalPrimes += parseFloat(prime.montant);
    });

    displayDocuments = Object.values(grouped);
  }

  // Pour sous_traitant : trier par sous-traitant puis par numéro de facture
  if (category === "sous_traitant" && documents && documents.length > 0) {
    displayDocuments = [...documents].sort((a, b) => {
      // D'abord trier par sous-traitant
      const sousTraitantA = (a.sous_traitant || "").toLowerCase();
      const sousTraitantB = (b.sous_traitant || "").toLowerCase();

      if (sousTraitantA !== sousTraitantB) {
        return sousTraitantA.localeCompare(sousTraitantB);
      }

      // Ensuite trier par numéro de facture
      const numeroA = a.facture_numero || a.numero || "";
      const numeroB = b.facture_numero || b.numero || "";

      // Essayer de comparer comme des nombres si possible
      const numA = parseInt(numeroA.toString().replace(/\D/g, ""), 10);
      const numB = parseInt(numeroB.toString().replace(/\D/g, ""), 10);

      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      // Sinon comparer comme des chaînes
      return numeroA.toString().localeCompare(numeroB.toString());
    });
  }

  // Ajout pour édition des paiements matériel
  const [fournisseurs, setFournisseurs] = React.useState([]);
  const [paiements, setPaiements] = React.useState({}); // { fournisseur: montant }
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Filtre fournisseurs affichés (null = tous, sinon Set des noms à afficher) — chargé depuis la DB
  const [visibleFournisseurs, setVisibleFournisseurs] = React.useState(null);
  const [modalFournisseursOpen, setModalFournisseursOpen] = React.useState(false);
  const [modalSearch, setModalSearch] = React.useState("");
  const [modalSelected, setModalSelected] = React.useState(new Set());
  const [savingFournisseursFilter, setSavingFournisseursFilter] = React.useState(false);

  // Ouvrir le modal : initialiser la sélection (tous cochés si "tous visibles", sinon sélection actuelle)
  const handleOpenFournisseursModal = () => {
    setModalSearch("");
    setModalSelected(
      visibleFournisseurs === null
        ? new Set(fournisseurs)
        : new Set(visibleFournisseurs)
    );
    setModalFournisseursOpen(true);
  };

  const handleCloseFournisseursModal = () => {
    setModalFournisseursOpen(false);
    setModalSearch("");
  };

  const handleApplyFournisseursFilter = async () => {
    setSavingFournisseursFilter(true);
    try {
      const payload =
        modalSelected.size === fournisseurs.length
          ? { fournisseurs_visibles: null }
          : { fournisseurs_visibles: Array.from(modalSelected) };
      await axios.put(
        `/api/chantier/${chantierId}/recap-fournisseurs-affichage/`,
        payload
      );
      if (modalSelected.size === fournisseurs.length) {
        setVisibleFournisseurs(null);
      } else {
        setVisibleFournisseurs(new Set(modalSelected));
      }
      handleCloseFournisseursModal();
    } catch (err) {
      console.error("Erreur sauvegarde préférence fournisseurs:", err);
    } finally {
      setSavingFournisseursFilter(false);
    }
  };

  const handleToggleFournisseurModal = (name) => {
    setModalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSelectAllFournisseurs = (checked) => {
    setModalSelected(checked ? new Set(fournisseurs) : new Set());
  };

  // Liste des fournisseurs à afficher dans le tableau (filtrée par sélection + recherche dans le modal)
  const displayedFournisseurs =
    visibleFournisseurs === null
      ? fournisseurs
      : fournisseurs.filter((f) => visibleFournisseurs.has(f));

  // Pour le modal : fournisseurs filtrés par la barre de recherche
  const fournisseursFilteredBySearch = fournisseurs.filter((f) =>
    f.toLowerCase().includes((modalSearch || "").toLowerCase().trim())
  );

  // Fonction pour charger les paiements depuis l'API
  const loadPaiements = React.useCallback(async () => {
    if (category === "materiel" && open && chantierId) {
      try {
        // Récupérer tous les fournisseurs depuis le modèle Fournisseur
        const fournisseursRes = await axios.get("/api/fournisseurs/");
        const fournisseursList = fournisseursRes.data.map((f) => f.name);
        setFournisseurs(fournisseursList);

        // Charger la préférence "fournisseurs à afficher" pour ce chantier (sauvegardée en DB)
        try {
          const prefRes = await axios.get(
            `/api/chantier/${chantierId}/recap-fournisseurs-affichage/`
          );
          const list = prefRes.data?.fournisseurs_visibles;
          if (list && Array.isArray(list) && list.length > 0) {
            const validNames = list.filter((name) =>
              fournisseursList.includes(name)
            );
            setVisibleFournisseurs(
              validNames.length === fournisseursList.length
                ? null
                : new Set(validNames)
            );
          } else {
            setVisibleFournisseurs(null);
          }
        } catch (_) {
          setVisibleFournisseurs(null);
        }

        // Initialiser tous les fournisseurs à 0 pour éviter les champs vides
        const paiementsInit = {};
        fournisseursList.forEach((f) => {
          paiementsInit[f] = 0;
        });

        // Récupérer les paiements sauvegardés depuis l'API pour la période courante
        let paiementsUrl = `/api/chantier/${chantierId}/paiements-materiel/`;
        if (!global && periode?.mois && periode?.annee) {
          paiementsUrl += `?mois=${periode.mois}&annee=${periode.annee}`;
        }
        
        const paiementsRes = await axios.get(paiementsUrl);
        const paiementsSauvegardes = paiementsRes.data || [];

        // Mettre à jour avec les montants À PAYER existants depuis l'API
        paiementsSauvegardes.forEach((paiement) => {
          if (paiement.fournisseur) {
            // Utiliser montant_a_payer s'il est renseigné (y compris 0 et négatif), sinon utiliser montant
            const montantAPayer = parseFloat(paiement.montant_a_payer);
            const montant = parseFloat(paiement.montant) || 0;
            const montantFinal = (paiement.montant_a_payer != null && paiement.montant_a_payer !== '' && !isNaN(montantAPayer)) ? montantAPayer : montant;
            // En mode global, additionner tous les montants pour chaque fournisseur
            // En mode période, remplacer (car un seul paiement par fournisseur/mois)
            if (global) {
              // Initialiser si pas encore présent dans paiementsInit
              if (!paiementsInit.hasOwnProperty(paiement.fournisseur)) {
                paiementsInit[paiement.fournisseur] = 0;
              }
              // Convertir en nombre avant l'addition pour éviter la concaténation de chaînes
              paiementsInit[paiement.fournisseur] = Number(paiementsInit[paiement.fournisseur]) + Number(montantFinal);
            } else {
              // En mode période, s'assurer que le fournisseur existe dans paiementsInit
              if (paiementsInit.hasOwnProperty(paiement.fournisseur)) {
                paiementsInit[paiement.fournisseur] = Number(montantFinal);
              }
            }
          }
        });

        setPaiements(paiementsInit);
      } catch (error) {
        // En cas d'erreur, initialiser tous les fournisseurs à 0
        const paiementsInit = {};
        // Utiliser l'état fournisseurs si disponible, sinon utiliser les documents pour extraire les fournisseurs
        const fournisseursToUse = fournisseurs.length > 0 ? fournisseurs : 
          (documents ? [...new Set(documents.map(d => d.fournisseur).filter(Boolean))] : []);
        
        fournisseursToUse.forEach((f) => {
          paiementsInit[f] = 0;
        });
        
        // Utiliser les documents passés en props si disponibles
        if (documents) {
          documents.forEach((doc) => {
            if (doc.fournisseur) {
              // Utiliser montant_a_payer s'il est renseigné (y compris 0 et négatif), sinon utiliser montant
              const montantAPayer = parseFloat(doc.montant_a_payer);
              const montant = parseFloat(doc.montant) || 0;
              const montantFinal = (doc.montant_a_payer != null && doc.montant_a_payer !== '' && !isNaN(montantAPayer)) ? montantAPayer : montant;
              if (global) {
                paiementsInit[doc.fournisseur] = Number(paiementsInit[doc.fournisseur] || 0) + Number(montantFinal);
              } else {
                paiementsInit[doc.fournisseur] = Number(montantFinal);
              }
            }
          });
        }
        setPaiements(paiementsInit);
      }
    }
  }, [category, open, chantierId, periode, global, documents]);

  React.useEffect(() => {
    loadPaiements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, open, chantierId, periode?.mois, periode?.annee, global, loadPaiements]);

  const handleChangeMontant = (fournisseur, value) => {
    setPaiements((prev) => ({ ...prev, [fournisseur]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload = fournisseurs
        .filter((f) => paiements[f] !== undefined && paiements[f] !== '' && paiements[f] !== null && !isNaN(Number(paiements[f])))
        .map((f) => ({
          fournisseur: f,
          montant: 0, // Montant payé reste à 0 (non modifiable par l'utilisateur ici)
          montant_a_payer: Number(paiements[f]), // Les montants saisis sont les montants à payer
          mois: periode.mois,
          annee: periode.annee,
        }));
      await axios.post(
        `/api/chantier/${chantierId}/paiements-materiel/`,
        payload
      );
      setSaveSuccess(true);
      
      // Recharger les paiements depuis l'API pour afficher les valeurs sauvegardées
      await loadPaiements();
      
      // Attendre un peu pour s'assurer que la base de données est à jour
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Rafraîchir le récapitulatif global (piechart et autres infos)
      if (refreshRecap) {
        await refreshRecap();
      }
    } catch (e) {
      setSaveError("Erreur lors de la sauvegarde des paiements matériel.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  return (
    <Collapse in={open} timeout="auto" unmountOnExit>
      <Paper elevation={3} sx={{ mt: 2, p: 2 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Détails {title}</Typography>
          <Button
            onClick={onClose}
            startIcon={<FaTimes />}
            color="error"
            size="small"
          >
            Fermer
          </Button>
        </Box>
        {/* Tableau édition matériel */}
        {category === "materiel" && (
          <Box mb={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle1">
                Paiements matériel par fournisseur (mois/année)
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FaFilter />}
                onClick={handleOpenFournisseursModal}
                disabled={fournisseurs.length === 0}
              >
                Choisir les fournisseurs à afficher
                {visibleFournisseurs !== null && (
                  <Typography component="span" sx={{ ml: 0.5, opacity: 0.8 }}>
                    ({displayedFournisseurs.length}/{fournisseurs.length})
                  </Typography>
                )}
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fournisseur</TableCell>
                    <TableCell>Montant (€)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedFournisseurs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        {fournisseurs.length === 0
                          ? "Aucun fournisseur"
                          : "Aucun fournisseur sélectionné. Cliquez sur « Choisir les fournisseurs à afficher »."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedFournisseurs.map((f) => (
                      <TableRow key={f}>
                        <TableCell>{f}</TableCell>
                        <TableCell>
                          <input
                            type="number"
                            step={0.01}
                            placeholder="0"
                            value={paiements[f] !== undefined && paiements[f] !== null && paiements[f] !== '' ? paiements[f] : ""}
                            onChange={(e) =>
                              handleChangeMontant(f, e.target.value)
                            }
                            style={{ width: 100 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box mt={1} display="flex" alignItems="center" gap={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
              >
                Sauvegarder
              </Button>
              {saveSuccess && (
                <Typography color="success.main">Sauvegardé !</Typography>
              )}
              {saveError && (
                <Typography color="error.main">{saveError}</Typography>
              )}
            </Box>

            {/* Modal : choisir les fournisseurs à afficher */}
            <Dialog
              open={modalFournisseursOpen}
              onClose={handleCloseFournisseursModal}
              maxWidth="sm"
              fullWidth
              PaperProps={{ sx: { borderRadius: 2 } }}
            >
              <DialogTitle>
                Fournisseurs à afficher pour ce chantier
              </DialogTitle>
              <DialogContent dividers>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Rechercher un fournisseur"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FaFilter style={{ opacity: 0.6 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleSelectAllFournisseurs(true)}
                  >
                    Tout cocher
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleSelectAllFournisseurs(false)}
                  >
                    Tout décocher
                  </Button>
                </Box>
                <Box
                  sx={{
                    maxHeight: 320,
                    overflowY: "auto",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 0.5,
                  }}
                >
                  {fournisseursFilteredBySearch.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                      Aucun fournisseur ne correspond à la recherche.
                    </Typography>
                  ) : (
                    fournisseursFilteredBySearch.map((f) => (
                      <FormControlLabel
                        key={f}
                        control={
                          <Checkbox
                            checked={modalSelected.has(f)}
                            onChange={() => handleToggleFournisseurModal(f)}
                            size="small"
                          />
                        }
                        label={f}
                        sx={{ display: "block", mr: 0 }}
                      />
                    ))
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {modalSelected.size} fournisseur(s) sélectionné(s)
                </Typography>
              </DialogContent>
              <DialogActions sx={{ px: 2, pb: 1 }}>
                <Button onClick={handleCloseFournisseursModal} disabled={savingFournisseursFilter}>
                  Annuler
                </Button>
                <Button
                  variant="contained"
                  onClick={handleApplyFournisseursFilter}
                  disabled={savingFournisseursFilter}
                >
                  {savingFournisseursFilter ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
        {/* Tableau classique pour les autres catégories */}
        {category !== "materiel" && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col.key}>{col.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(documents && documents.length > 0) || (category === "main_oeuvre" && displayDocuments.length > 0) ? (
                  displayDocuments.map((doc, idx) => (
                    <TableRow key={doc.id || idx}>
                      {columns.map((col) => (
                        <TableCell key={col.key}>
                          {col.key === "montant" && doc.montant !== undefined
                            ? (() => {
                                // Pour main_oeuvre, ajouter les primes au montant total
                                const montantBase = Number(doc.montant);
                                const montantTotal = category === "main_oeuvre" 
                                  ? montantBase + (doc.totalPrimes || 0)
                                  : montantBase;
                                
                                return (
                                  Number(montantTotal).toLocaleString("fr-FR", {
                                    minimumFractionDigits: 2,
                                  }) +
                                  " €" +
                                  (doc.retard && doc.retard > 0
                                    ? ` (${doc.retard}j retard)`
                                    : doc.retard && doc.retard < 0
                                    ? ` (${Math.abs(doc.retard)}j avance)`
                                    : "")
                                );
                              })()
                            : col.key === "prime"
                            ? (() => {
                                // Afficher les primes pour cet agent/mois
                                if (!doc.primes || doc.primes.length === 0) {
                                  return "-";
                                }
                                
                                if (doc.primes.length === 1) {
                                  // Une seule prime : afficher montant + description + mois en tooltip
                                  const tooltipText = global 
                                    ? `${doc.primes[0].description} (${doc.primes[0].mois}/${doc.primes[0].annee})`
                                    : doc.primes[0].description;
                                  
                                  return (
                                    <Box
                                      sx={{
                                        color: "#2e7d32",
                                        fontWeight: "bold",
                                        cursor: "pointer",
                                      }}
                                      title={tooltipText}
                                    >
                                      {doc.primes[0].montant.toFixed(2)} €
                                    </Box>
                                  );
                                }
                                
                                // Plusieurs primes : afficher le total + détails en tooltip
                                const details = doc.primes
                                  .map((p) => 
                                    global 
                                      ? `${p.description} (${p.mois}/${p.annee}): ${p.montant.toFixed(2)}€`
                                      : `${p.description}: ${p.montant.toFixed(2)}€`
                                  )
                                  .join("\n");
                                
                                return (
                                  <Box
                                    sx={{
                                      color: "#2e7d32",
                                      fontWeight: "bold",
                                      cursor: "pointer",
                                    }}
                                    title={details}
                                  >
                                    {doc.totalPrimes.toFixed(2)} €
                                    <Typography
                                      variant="caption"
                                      sx={{ display: "block", color: "#666" }}
                                    >
                                      ({doc.primes.length} primes)
                                    </Typography>
                                  </Box>
                                );
                              })()
                            : col.key === "heures" && doc.heures !== undefined
                            ? (() => {
                                // Pour les agents journaliers, convertir les heures en jours
                                // On détecte un agent journalier si les heures sont un multiple de 8 et >= 8
                                const heures = Number(doc.heures);
                                if (heures >= 8 && heures % 8 === 0) {
                                  const jours = heures / 8;
                                  return jours === 1 ? "1j" : `${jours}j`;
                                }
                                // Demi-journées (4h) pour agents journaliers
                                if (heures === 4) {
                                  return "0.5j";
                                }
                                // Pour les autres cas (agents horaires)
                                return heures.toLocaleString("fr-FR", {
                                  minimumFractionDigits: 2,
                                });
                              })()
                            : col.key === "date" && doc.date
                            ? (() => {
                                const d = new Date(doc.date);
                                const day = ("0" + d.getDate()).slice(-2);
                                const month = ("0" + (d.getMonth() + 1)).slice(
                                  -2
                                );
                                const year = d
                                  .getFullYear()
                                  .toString()
                                  .slice(-2);
                                return `${day}/${month}/${year}`;
                              })()
                            : col.key === "facture_numero"
                            ? doc.facture_numero ||
                              doc.numero?.split("-").pop() ||
                              "-"
                            : doc[col.key] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      Aucun document
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Collapse>
  );
};

export default RecapCategoryDetails;
