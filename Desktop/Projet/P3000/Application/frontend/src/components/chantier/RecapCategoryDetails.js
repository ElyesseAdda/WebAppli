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
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
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
  /** Affichage dans le panneau latéral récap : pas de Collapse, pas de bouton Fermer */
  embedded = false,
}) => {
  // Récupérer le contexte pour accéder au mode global
  const { global } = useRecapFinancier();
  const detailsActive = embedded || open;
  
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
    if (category === "main_oeuvre" && detailsActive && chantierId) {
      loadChantierPrimes();
    }
    // eslint-disable-next-line
  }, [category, detailsActive, chantierId, periode, global]);

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
  const [modalAttrFilter, setModalAttrFilter] = React.useState("all");
  const [modalSelected, setModalSelected] = React.useState(new Set());
  const [savingFournisseursFilter, setSavingFournisseursFilter] = React.useState(false);

  // Ouvrir le modal : initialiser la sélection (tous cochés si "tous visibles", sinon sélection actuelle)
  const handleOpenFournisseursModal = () => {
    setModalSearch("");
    setModalAttrFilter("all");
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
    setModalAttrFilter("all");
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

  // Fournisseurs ayant au moins un document matériel (BC) dans le récap courant
  const fournisseursAvecBcNormalized = React.useMemo(() => {
    const set = new Set();
    if (category !== "materiel" || !Array.isArray(documents)) return set;
    documents.forEach((d) => {
      const n = String(d.fournisseur || "").trim().toLowerCase();
      if (n) set.add(n);
    });
    return set;
  }, [category, documents]);

  const supplierHasBcChantier = React.useCallback(
    (f) => {
      const key = String(f || "").trim().toLowerCase();
      return Boolean(key && fournisseursAvecBcNormalized.has(key));
    },
    [fournisseursAvecBcNormalized]
  );

  /** Montant significatif (≠ 0) : la liste est initialisée à 0 pour tous les fournisseurs, donc 0 seul ne compte pas comme « renseigné ». */
  const supplierHasMontantRenseigne = React.useCallback((f) => {
    const v = paiements[f];
    if (v === undefined || v === null) return false;
    const s = String(v).trim();
    if (s === "") return false;
    const n = Number(String(s).replace(",", "."));
    if (Number.isNaN(n)) return false;
    return n !== 0;
  }, [paiements]);

  const fournisseursMatchModalSearch = React.useMemo(() => {
    const q = (modalSearch || "").toLowerCase().trim();
    return fournisseurs.filter((f) => f.toLowerCase().includes(q));
  }, [fournisseurs, modalSearch]);

  // Pour le modal : recherche + filtre attributs (BC / montant)
  const fournisseursFilteredForModal = React.useMemo(() => {
    if (modalAttrFilter === "all") return fournisseursMatchModalSearch;
    return fournisseursMatchModalSearch.filter((f) => {
      const bc = supplierHasBcChantier(f);
      const m = supplierHasMontantRenseigne(f);
      if (modalAttrFilter === "bc") return bc;
      if (modalAttrFilter === "montant") return m;
      if (modalAttrFilter === "either") return bc || m;
      if (modalAttrFilter === "both") return bc && m;
      return true;
    });
  }, [
    fournisseursMatchModalSearch,
    modalAttrFilter,
    supplierHasBcChantier,
    supplierHasMontantRenseigne,
  ]);

  // Fonction pour charger les paiements depuis l'API
  const loadPaiements = React.useCallback(async () => {
    if (category === "materiel" && detailsActive && chantierId) {
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
  }, [category, detailsActive, embedded, open, chantierId, periode, global, documents]);

  React.useEffect(() => {
    loadPaiements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, detailsActive, embedded, open, chantierId, periode?.mois, periode?.annee, global, loadPaiements]);

  /** Saisie montant : espaces retirés, virgule → point, états intermédiaires autorisés (ex. « 12, ») */
  const handleChangeMontant = (fournisseur, raw) => {
    if (global) return;
    if (raw === "" || raw === null) {
      setPaiements((prev) => ({ ...prev, [fournisseur]: "" }));
      return;
    }
    const cleaned = String(raw).replace(/\s/g, "").replace(",", ".");
    if (cleaned === "-" || cleaned === "." || cleaned === "-.") {
      setPaiements((prev) => ({ ...prev, [fournisseur]: cleaned }));
      return;
    }
    if (/^-?\d*\.?\d*$/.test(cleaned)) {
      setPaiements((prev) => ({ ...prev, [fournisseur]: cleaned }));
    }
  };

  const montantFieldValue = (fournisseur) => {
    const v = paiements[fournisseur];
    if (v === undefined || v === null || v === "") return "";
    return String(v);
  };

  const handleSave = async () => {
    if (global) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      // N'envoyer que les fournisseurs visibles (filtrés) pour éviter de créer des lignes à 0 pour tous les fournisseurs
      const fournisseursAEnvoyer = visibleFournisseurs === null ? fournisseurs : fournisseurs.filter((f) => visibleFournisseurs.has(f));
      const payload = fournisseursAEnvoyer
        .filter((f) => {
          const v = paiements[f];
          if (v === undefined || v === null || v === "") return false;
          const n = Number(String(v).replace(",", "."));
          return !Number.isNaN(n);
        })
        .map((f) => ({
          fournisseur: f,
          montant: 0, // Montant payé reste à 0 (non modifiable par l'utilisateur ici)
          montant_a_payer: Number(String(paiements[f]).replace(",", ".")), // Les montants saisis sont les montants à payer
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

  const innerPaper = (
      <Paper
        elevation={embedded ? 0 : 3}
        sx={{
          mt: embedded ? 0 : 2,
          p: embedded ? 1 : 2,
          ...(embedded && {
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.paper",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }),
        }}
      >
        {!embedded ? (
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
        ) : (
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.75rem" }}>
            {title}
          </Typography>
        )}
        {/* Tableau édition matériel */}
        {category === "materiel" && (
          <Box mb={2}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={1}
              sx={{ mb: 1.5 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, pr: 1 }}>
                Paiements matériel par fournisseur (mois/année)
              </Typography>
              <Box display="flex" alignItems="center" gap={0.75}>
                <Tooltip
                  title={
                    fournisseurs.length === 0
                      ? "Aucun fournisseur"
                      : visibleFournisseurs === null
                      ? `Tous les fournisseurs (${fournisseurs.length}) — cliquer pour en afficher une sélection`
                      : `${displayedFournisseurs.length} affiché(s) sur ${fournisseurs.length} — cliquer pour modifier`
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={handleOpenFournisseursModal}
                      disabled={fournisseurs.length === 0}
                      aria-label="Filtrer les fournisseurs affichés"
                      sx={{
                        border: "1px solid",
                        borderColor: "primary.main",
                        borderRadius: 1,
                      }}
                    >
                      <FaFilter />
                    </IconButton>
                  </span>
                </Tooltip>
                {fournisseurs.length > 0 ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, minWidth: "2.75rem", textAlign: "center" }}
                  >
                    {visibleFournisseurs === null
                      ? `${fournisseurs.length}/${fournisseurs.length}`
                      : `${displayedFournisseurs.length}/${fournisseurs.length}`}
                  </Typography>
                ) : null}
              </Box>
            </Box>
            {global ? (
              <Box
                sx={{
                  mb: 1,
                  py: 0.65,
                  px: 1,
                  borderRadius: 1,
                  borderLeft: (theme) => `3px solid ${theme.palette.primary.main}`,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(144, 202, 249, 0.08)" : "rgba(25, 118, 210, 0.06)",
                }}
              >
                <Typography variant="caption" color="text.primary" sx={{ display: "block", lineHeight: 1.4 }}>
                  Vue globale : montants affichés en lecture seule. Désactivez « Global » pour modifier par mois.
                </Typography>
              </Box>
            ) : null}
            <TableContainer
              sx={
                embedded
                  ? { overflowX: "auto", width: "100%", maxWidth: "100%" }
                  : undefined
              }
            >
              <Table
                size="small"
                sx={{
                  ...(embedded ? { minWidth: 320 } : {}),
                  "& .MuiTableCell-root": { verticalAlign: "middle" },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: "48%" }}>Fournisseur</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, minWidth: 140 }}>
                      Montant à payer
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedFournisseurs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        {fournisseurs.length === 0
                          ? "Aucun fournisseur"
                          : "Aucun fournisseur sélectionné. Utilisez l’icône filtre pour en choisir."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedFournisseurs.map((f) => (
                      <TableRow key={f} hover>
                        <TableCell
                          sx={{
                            wordBreak: "break-word",
                            maxWidth: embedded ? 220 : 360,
                          }}
                        >
                          {f}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1 }}>
                          <TextField
                            size="small"
                            placeholder="0,00"
                            value={montantFieldValue(f)}
                            onChange={(e) => handleChangeMontant(f, e.target.value)}
                            inputProps={{
                              inputMode: "decimal",
                              "aria-label": `Montant à payer ${f}`,
                            }}
                            sx={{
                              width: "100%",
                              minWidth: 120,
                              maxWidth: 180,
                              "& .MuiInputBase-input": {
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                                ...(global && {
                                  cursor: "default",
                                  color: "text.primary",
                                }),
                              },
                            }}
                            InputProps={{
                              readOnly: global,
                              endAdornment: (
                                <InputAdornment position="end">€</InputAdornment>
                              ),
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box mt={2} display="flex" alignItems="center" flexWrap="wrap" gap={2}>
              <Tooltip
                title={
                  global
                    ? "Passez en vue par mois (désactiver Global) pour enregistrer des montants."
                    : ""
                }
                disableHoverListener={!global}
              >
                <span>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={saving || global}
                  >
                    Sauvegarder
                  </Button>
                </span>
              </Tooltip>
              {saveSuccess && (
                <Typography color="success.main" fontWeight={600}>
                  Sauvegardé !
                </Typography>
              )}
              {saveError && (
                <Typography color="error.main" fontWeight={600}>
                  {saveError}
                </Typography>
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
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  Légende :{" "}
                  <DescriptionOutlinedIcon
                    fontSize="inherit"
                    color="primary"
                    sx={{ verticalAlign: "text-bottom", mx: 0.25 }}
                  />{" "}
                  BC dans le récap —{" "}
                  <PaymentsOutlinedIcon
                    fontSize="inherit"
                    color="success"
                    sx={{ verticalAlign: "text-bottom", mx: 0.25 }}
                  />{" "}
                  montant saisi
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={modalAttrFilter}
                  onChange={(_, v) => {
                    if (v != null) setModalAttrFilter(v);
                  }}
                  size="small"
                  sx={{ flexWrap: "wrap", gap: 0.5, mb: 1.5 }}
                >
                  <ToggleButton value="all">Tous</ToggleButton>
                  <ToggleButton value="bc">Avec BC</ToggleButton>
                  <ToggleButton value="montant">Montant saisi</ToggleButton>
                  <ToggleButton value="either">BC ou montant saisi</ToggleButton>
                  <ToggleButton value="both">Les deux</ToggleButton>
                </ToggleButtonGroup>
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
                  {fournisseursFilteredForModal.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                      {fournisseursMatchModalSearch.length === 0
                        ? "Aucun fournisseur ne correspond à la recherche."
                        : "Aucun fournisseur ne correspond aux filtres sélectionnés."}
                    </Typography>
                  ) : (
                    fournisseursFilteredForModal.map((f) => (
                      <FormControlLabel
                        key={f}
                        disableTypography
                        control={
                          <Checkbox
                            checked={modalSelected.has(f)}
                            onChange={() => handleToggleFournisseurModal(f)}
                            size="small"
                            sx={{ alignSelf: "center", py: 0 }}
                          />
                        }
                        label={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                              width: "100%",
                              minWidth: 0,
                              lineHeight: 1.5,
                            }}
                          >
                            <Typography
                              component="span"
                              variant="body2"
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                lineHeight: "inherit",
                              }}
                            >
                              {f}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.25,
                                flexShrink: 0,
                              }}
                            >
                              {supplierHasBcChantier(f) && (
                                <Tooltip title="Bon de commande présent dans le récap">
                                  <DescriptionOutlinedIcon
                                    fontSize="small"
                                    color="primary"
                                    aria-label="BC récap"
                                  />
                                </Tooltip>
                              )}
                              {supplierHasMontantRenseigne(f) && (
                                <Tooltip title="Montant saisi">
                                  <PaymentsOutlinedIcon
                                    fontSize="small"
                                    color="success"
                                    aria-label="Montant saisi"
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        }
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mr: 0,
                          ml: 0,
                          py: 0.25,
                          "& .MuiFormControlLabel-label": { minWidth: 0 },
                        }}
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
          <TableContainer
            sx={
              embedded
                ? { overflowX: "auto", width: "100%", maxWidth: "100%" }
                : undefined
            }
          >
            <Table
              size="small"
              sx={
                embedded
                  ? {
                      minWidth:
                        category === "main_oeuvre"
                          ? 520
                          : category === "sous_traitant"
                          ? 400
                          : 360,
                    }
                  : undefined
              }
            >
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
  );

  if (embedded) {
    return innerPaper;
  }

  return (
    <Collapse in={open} timeout="auto" unmountOnExit>
      {innerPaper}
    </Collapse>
  );
};

export default RecapCategoryDetails;
