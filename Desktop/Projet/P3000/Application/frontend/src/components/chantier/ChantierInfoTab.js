import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import axios from "axios";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import {
  FaChartBar,
  FaCheckCircle,
  FaChevronDown,
  FaClipboardList,
  FaCloud,
  FaExclamationCircle,
  FaFileInvoice,
  FaHandshake,
  FaHourglassHalf,
  FaTable,
  FaTrash,
} from "react-icons/fa";
import { useSituationsManager } from "../../hooks/useSituationsManager";
import universalDriveGenerator from "../../utils/universalDriveGenerator";
import SituationCreationModal from "../CreationDocument/SituationCreationModal";
import SousTraitanceModal from "../SousTraitance/SousTraitanceModal";

const ChantierInfoTab = ({ chantierData, onUpdate, state, setState }) => {
  const {
    openSousTraitance = false,
    openSituationModal = false,
    filters = {},
    openAccordions = {},
    showDecomposition = false,
  } = state;
  const setOpenSousTraitance = (val) =>
    setState({ ...state, openSousTraitance: val });
  const setOpenSituationModal = (val) =>
    setState({ ...state, openSituationModal: val });
  const setFilters = (newFilters) =>
    setState({ ...state, filters: newFilters });
  const setOpenAccordions = (newOpen) =>
    setState({ ...state, openAccordions: newOpen });

  // Utiliser le hook pour gérer les situations
  const { situations, updateDateEnvoi, updatePaiement, loadSituations } =
    useSituationsManager(chantierData?.id);

  // État pour stocker les informations complètes du chantier
  const [fullChantierData, setFullChantierData] = useState(null);
  
  // État pour gérer le rechargement des coûts estimés
  const [lastCoutsUpdate, setLastCoutsUpdate] = useState(null);
  
  // État pour la décomposition des coûts
  const [decompositionData, setDecompositionData] = useState(null);
  const [loadingDecomposition, setLoadingDecomposition] = useState(false);

  // Récupérer les informations complètes du chantier
  useEffect(() => {
    if (chantierData?.id) {
      console.log(
        "🔍 DEBUG ChantierInfoTab - Récupération des détails du chantier ID:",
        chantierData.id
      );
      axios
        .get(`/api/chantier/${chantierData.id}/details/`)
        .then((response) => {
          console.log(
            "✅ DEBUG ChantierInfoTab - Détails du chantier récupérés:",
            response.data
          );
          setFullChantierData(response.data);
        })
        .catch((error) => {
          console.error(
            "❌ DEBUG ChantierInfoTab - Erreur lors de la récupération des informations du chantier:",
            error
          );
          console.log(
            "❌ DEBUG ChantierInfoTab - ID utilisé:",
            chantierData.id
          );
          console.log(
            "❌ DEBUG ChantierInfoTab - URL appelée:",
            `/api/chantier/${chantierData.id}/details/`
          );
        });
    }
  }, [chantierData?.id]);

  // Détecter les changements dans les coûts estimés et recharger les données
  useEffect(() => {
    if (chantierData?.id && chantierData?.cout_estime_main_oeuvre !== undefined) {
      const currentCouts = {
        main_oeuvre: chantierData.cout_estime_main_oeuvre,
        materiel: chantierData.cout_estime_materiel,
        marge: chantierData.marge_estimee
      };
      
      // Vérifier si les coûts ont changé
      if (lastCoutsUpdate && 
          (lastCoutsUpdate.main_oeuvre !== currentCouts.main_oeuvre ||
           lastCoutsUpdate.materiel !== currentCouts.materiel ||
           lastCoutsUpdate.marge !== currentCouts.marge)) {
        
        console.log("🔄 ChantierInfoTab - Détection de changement dans les coûts estimés");
        console.log("Ancien:", lastCoutsUpdate);
        console.log("Nouveau:", currentCouts);
        
        // Recharger les données du chantier
        if (onUpdate) {
          console.log("🔄 ChantierInfoTab - Déclenchement du rechargement via onUpdate");
          onUpdate();
        }
      }
      
      setLastCoutsUpdate(currentCouts);
    }
  }, [chantierData?.cout_estime_main_oeuvre, chantierData?.cout_estime_materiel, chantierData?.marge_estimee, onUpdate]);

  // Fonction pour récupérer la décomposition des coûts
  const fetchDecomposition = async () => {
    if (!chantierData?.id) return;
    
    setLoadingDecomposition(true);
    try {
      const response = await axios.get(`/api/chantier/${chantierData.id}/decomposition-couts/`);
      setDecompositionData(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération de la décomposition:", error);
    } finally {
      setLoadingDecomposition(false);
    }
  };

  // Effet pour récupérer la décomposition quand showDecomposition devient true
  useEffect(() => {
    if (showDecomposition && !decompositionData) {
      fetchDecomposition();
    }
  }, [showDecomposition, chantierData?.id]);

  // State local pour tout ce qui n'a pas besoin d'être global
  const [tauxFacturationData, setTauxFacturationData] = React.useState(null);
  const [loadingTaux, setLoadingTaux] = React.useState(false);
  const [openModal, setOpenModal] = React.useState(false);
  const [selectedSituation, setSelectedSituation] = React.useState(null);
  const [dateEnvoi, setDateEnvoi] = React.useState(null);
  const [delaiPaiement, setDelaiPaiement] = React.useState("");
  const [devisChantier, setDevisChantier] = React.useState(null);
  const [loadingDevis, setLoadingDevis] = React.useState(false);
  const [openPaiementModal, setOpenPaiementModal] = React.useState(false);
  const [selectedSituationPaiement, setSelectedSituationPaiement] =
    React.useState(null);
  const [montantRecu, setMontantRecu] = React.useState("");
  const [datePaiementReel, setDatePaiementReel] = React.useState("");
  const [mainOeuvreReelle, setMainOeuvreReelle] = React.useState(0);
  const [loadingMainOeuvre, setLoadingMainOeuvre] = React.useState(false);
  const [completeChantierData, setCompleteChantierData] = React.useState(null);
  const [loadingCompleteData, setLoadingCompleteData] = React.useState(false);

  // États pour la modification du chantier
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  // Données de modification
  const [editData, setEditData] = useState({
    chantier: {
      nom: "",
      statut: "",
    },
    societe: {
      nom: "",
      ville: "",
      rue: "",
      code_postal: "",
    },
    chantier_adresse: {
      ville: "",
      rue: "",
      code_postal: "",
    },
      client: {
        civilite: "",
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
      },
  });

  const hasLoadedTaux = useRef(false);
  useEffect(() => {
    if (!chantierData?.id) return;
    if (!hasLoadedTaux.current) {
      setLoadingTaux(true);
      axios
        .get(`/api/chantier/${chantierData.id}/taux-facturation/`)
        .then((res) => setTauxFacturationData(res.data))
        .finally(() => setLoadingTaux(false));
      hasLoadedTaux.current = true;
    }
  }, [chantierData?.id]);

  useEffect(() => {
    if (chantierData?.id) {
      setLoadingDevis(true);
      axios
        .get("/api/devisa/", {
          params: {
            chantier: chantierData.id,
            devis_chantier: true,
          },
        })
        .then((res) => {
          setDevisChantier(
            res.data && res.data.length > 0 ? res.data[0] : null
          );
        })
        .catch(() => setDevisChantier(null))
        .finally(() => setLoadingDevis(false));
    }
  }, [chantierData?.id]);

  // Récupérer la main d'œuvre réelle depuis l'API recap-financier
  useEffect(() => {
    const fetchMainOeuvreReelle = async () => {
      if (!chantierData?.id) {
        setMainOeuvreReelle(0);
        return;
      }

      setLoadingMainOeuvre(true);
      try {
        // Récupérer les données depuis l'API recap-financier (global)
        const res = await axios.get(
          `/api/chantier/${chantierData.id}/recap-financier/`
        );

        // Extraire la main d'œuvre des données recap-financier
        const mainOeuvre = res.data.sorties?.paye?.main_oeuvre || { total: 0 };
        setMainOeuvreReelle(mainOeuvre.total || 0);
      } catch (error) {
        console.error(
          "Erreur lors du chargement de la main d'œuvre réelle:",
          error
        );
        setMainOeuvreReelle(0);
      } finally {
        setLoadingMainOeuvre(false);
      }
    };

    fetchMainOeuvreReelle();
  }, [chantierData?.id]);

  const handleSousTraitanceUpdate = () => {
    if (onUpdate) {
      onUpdate();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(montant || 0);
  };

  // Données factices pour l'exemple, à remplacer par les vraies données du backend
  const tauxFacturation = chantierData?.taux_facturation || 50; // en %
  const nombreDevis = chantierData?.stats_devis?.envoyes || 11;
  const statsDevis = chantierData?.stats_devis || {
    termines: 6,
    en_cours: 2,
    attente_signature: 3,
    refuses: 1,
  };

  const MultiColorProgressBar = ({ pourcentages, montants }) => (
    <Box
      sx={{
        display: "flex",
        height: 16,
        borderRadius: 8,
        overflow: "hidden",
        mb: 1,
      }}
    >
      {/* Non envoyées */}
      {pourcentages?.non_envoye > 0 && (
        <Tooltip
          title={`Non envoyées : ${montants.non_envoye.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          })}`}
        >
          <Box
            sx={{ width: `${pourcentages.non_envoye}%`, background: "#ff9800" }}
          />
        </Tooltip>
      )}
      {/* En attente paiement */}
      {pourcentages?.en_attente > 0 && (
        <Tooltip
          title={`En attente paiement : ${montants.en_attente.toLocaleString(
            "fr-FR",
            { style: "currency", currency: "EUR" }
          )}`}
        >
          <Box
            sx={{ width: `${pourcentages.en_attente}%`, background: "#1976d2" }}
          />
        </Tooltip>
      )}
      {/* Retard de paiement */}
      {pourcentages?.retard > 0 && (
        <Tooltip
          title={`Retard de paiement : ${montants.retard.toLocaleString(
            "fr-FR",
            { style: "currency", currency: "EUR" }
          )}`}
        >
          <Box
            sx={{ width: `${pourcentages.retard}%`, background: "#d32f2f" }}
          />
        </Tooltip>
      )}
      {/* Payées */}
      {pourcentages?.paye > 0 && (
        <Tooltip
          title={`Payées : ${montants.paye.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          })}`}
        >
          <Box sx={{ width: `${pourcentages.paye}%`, background: "#2e7d32" }} />
        </Tooltip>
      )}
    </Box>
  );

  const handleOpenModal = (situation) => {
    setSelectedSituation(situation);
    setDateEnvoi(situation.date_envoi ? dayjs(situation.date_envoi) : null);
    setDelaiPaiement(situation.delai_paiement || "");
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedSituation(null);
    setDateEnvoi(null);
    setDelaiPaiement("");
  };

  const handleSaveDates = async () => {
    if (!dateEnvoi || !delaiPaiement) return;
    try {
      await updateDateEnvoi(
        selectedSituation.id,
        dateEnvoi,
        Number(delaiPaiement)
      );
      setOpenModal(false);
      setSelectedSituation(null);
      setDateEnvoi(null);
      setDelaiPaiement("");
      // Recharge les données
      axios
        .get(`/api/chantier/${chantierData.id}/taux-facturation/`)
        .then((res) => setTauxFacturationData(res.data));
    } catch (error) {
      alert("Erreur lors de la mise à jour des dates.");
    }
  };

  const isRetardPaiement = (situation) => {
    if (
      situation.date_envoi &&
      !situation.date_paiement_reel &&
      situation.delai_paiement
    ) {
      const dateLimite = new Date(
        new Date(situation.date_envoi).getTime() +
          situation.delai_paiement * 24 * 60 * 60 * 1000
      );
      return new Date() > dateLimite;
    }
    return false;
  };

  const { montants, pourcentages } = tauxFacturationData || {};

  const getCategorieColor = (categorie) => {
    switch (categorie) {
      case "non_envoye":
        return "#ff9800"; // orange
      case "en_attente":
        return "#1976d2"; // bleu
      case "retard":
        return "#d32f2f"; // rouge
      case "paye":
        return "#2e7d32"; // vert
      default:
        return "inherit";
    }
  };

  // Fonction pour déterminer la catégorie d'une situation
  const getSituationCategorie = (situation) => {
    if (situation.date_paiement_reel) {
      return "paye"; // Payée
    } else if (!situation.date_envoi) {
      return "non_envoye"; // Non envoyée
    } else if (isRetardPaiement(situation)) {
      return "retard"; // Retard de paiement
    } else {
      return "en_attente"; // En attente de paiement
    }
  };

  const handleOpenPaiementModal = (situation) => {
    setSelectedSituationPaiement(situation);
    setMontantRecu(situation.montant_recu || "");
    setDatePaiementReel(situation.date_paiement_reel || "");
    setOpenPaiementModal(true);
  };

  // Fonction pour récupérer les données complètes du chantier
  const fetchCompleteChantierData = async () => {
    if (!chantierData?.id) return null;

    setLoadingCompleteData(true);
    try {
      // Essayer d'abord l'endpoint détaillé
      let response;
      try {
        response = await axios.get(`/api/chantier/${chantierData.id}/details/`);
      } catch {
        // Fallback vers l'endpoint standard
        response = await axios.get(`/api/chantier/${chantierData.id}/`);
      }

      const completeData = response.data;

      // Si les données de société ne sont pas complètes, récupérer la société séparément
      if (completeData.societe?.id) {
        try {
          const societeResponse = await axios.get(
            `/api/societe/${completeData.societe.id}/`
          );
          completeData.societe_complete = societeResponse.data;

          // Récupérer les données du client si nécessaire
          if (societeResponse.data.client_name) {
            try {
              const clientResponse = await axios.get(
                `/api/client/${societeResponse.data.client_name}/`
              );
              completeData.societe_complete.client_data = clientResponse.data;
            } catch (clientError) {
              console.warn(
                "Erreur lors de la récupération du client:",
                clientError
              );
            }
          }
        } catch (societeError) {
          console.warn(
            "Erreur lors de la récupération de la société:",
            societeError
          );
        }
      }

      setCompleteChantierData(completeData);
      return completeData;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des données complètes:",
        error
      );
      return null;
    } finally {
      setLoadingCompleteData(false);
    }
  };

  // Fonction pour ouvrir le modal d'édition
  const handleOpenEditModal = async () => {
    // Debug: afficher la structure des données
    console.log("Structure chantierData:", chantierData);
    console.log("Société:", chantierData?.societe);
    console.log("Client:", chantierData?.societe?.client);

    // Récupérer les données complètes
    const completeData = await fetchCompleteChantierData();
    const dataToUse = completeData || chantierData;

    console.log("Données complètes récupérées:", completeData);

    // Récupérer les données du client depuis les données complètes
    const societeData = dataToUse?.societe_complete || dataToUse?.societe || {};
    const clientData =
      societeData?.client_data ||
      societeData?.client_name ||
      societeData?.client ||
      {};
    const clientCivilite = clientData.civilite || "";
    const clientNom = clientData.name || "";
    const clientPrenom = clientData.surname || "";

    // Charger les données actuelles dans le formulaire
    setEditData({
      chantier: {
        nom: dataToUse?.nom || dataToUse?.chantier_name || "",
        statut: dataToUse?.statut || dataToUse?.state_chantier || "",
      },
      societe: {
        nom: societeData?.nom_societe || "",
        ville: societeData?.ville_societe || "",
        rue: societeData?.rue_societe || "",
        code_postal: societeData?.codepostal_societe || "",
      },
      chantier_adresse: {
        ville: dataToUse?.adresse?.ville || dataToUse?.ville || "",
        rue: dataToUse?.adresse?.rue || dataToUse?.rue || "",
        code_postal:
          dataToUse?.adresse?.code_postal || dataToUse?.code_postal || "",
      },
      client: {
        civilite: clientCivilite,
        nom: clientNom,
        prenom: clientPrenom,
        email: clientData.client_mail || "",
        telephone: clientData.phone_Number?.toString() || "",
      },
    });
    setOpenEditModal(true);
  };

  // Fonction pour sauvegarder les modifications
  const handleSaveEdit = async () => {
    setLoadingEdit(true);
    try {
      // Mettre à jour le client - seulement si les valeurs ont changé
      const dataForSave = completeChantierData || chantierData;
      const societeForSave =
        dataForSave?.societe_complete || dataForSave?.societe || {};
      const clientId =
        societeForSave?.client_data?.id ||
        societeForSave?.client_name?.id ||
        societeForSave?.client?.id;
      if (clientId) {
        const currentClient =
          societeForSave.client_data ||
          societeForSave.client_name ||
          societeForSave.client;
        const clientData = {};

        // Récupérer les données actuelles du client
        const currentCivilite = currentClient.civilite || "";
        const currentNom = currentClient.name || "";
        const currentPrenom = currentClient.surname || "";
        const currentEmail = currentClient.client_mail || "";
        const currentTelephone = currentClient.phone_Number?.toString() || "";

        console.log("=== COMPARAISON CLIENT ===");
        console.log("Actuel:", {
          civilite: currentCivilite,
          nom: currentNom,
          prenom: currentPrenom,
          email: currentEmail,
          telephone: currentTelephone,
        });
        console.log("Nouveau:", {
          civilite: editData.client.civilite,
          nom: editData.client.nom,
          prenom: editData.client.prenom,
          email: editData.client.email,
          telephone: editData.client.telephone,
        });

        // Vérifier les changements et construire les données à envoyer
        if (editData.client.civilite !== currentCivilite) {
          console.log("Civilité client modifiée:", editData.client.civilite);
          clientData.civilite = editData.client.civilite || "";
        }

        if (editData.client.nom && editData.client.nom.trim() !== currentNom) {
          console.log("Nom client modifié:", editData.client.nom);
          clientData.name = editData.client.nom;
        }

        if (
          editData.client.prenom &&
          editData.client.prenom.trim() !== currentPrenom
        ) {
          console.log("Prénom client modifié:", editData.client.prenom);
          clientData.surname = editData.client.prenom;
        }

        if (
          editData.client.email &&
          editData.client.email.trim() !== currentEmail
        ) {
          console.log("Email client modifié:", editData.client.email);
          clientData.client_mail = editData.client.email;
        }

        if (
          editData.client.telephone &&
          editData.client.telephone.trim() !== currentTelephone
        ) {
          console.log("Téléphone client modifié:", editData.client.telephone);
          clientData.phone_Number = parseInt(editData.client.telephone) || 0;
        }

        // Envoyer la requête seulement s'il y a des changements
        if (Object.keys(clientData).length > 0) {
          console.log("Envoi des données client:", clientData);
          await axios.patch(`/api/client/${clientId}/`, clientData);
        }
      }

      // Mettre à jour la société - seulement si les valeurs ont changé
      if (societeForSave?.id) {
        const currentSociete = societeForSave;
        const societeData = {};

        // Comparer avec les valeurs actuelles (adresse de la société)
        const currentNom = currentSociete.nom_societe || "";
        const currentVille = currentSociete.ville_societe || "";
        const currentRue = currentSociete.rue_societe || "";
        const currentCodePostal = currentSociete.codepostal_societe || "";

        console.log("=== COMPARAISON SOCIÉTÉ ===");
        console.log("Actuel:", {
          nom: currentNom,
          ville: currentVille,
          rue: currentRue,
          code_postal: currentCodePostal,
        });
        console.log("Nouveau:", {
          nom: editData.societe.nom,
          ville: editData.societe.ville,
          rue: editData.societe.rue,
          code_postal: editData.societe.code_postal,
        });

        if (
          editData.societe.nom &&
          editData.societe.nom.trim() !== currentNom
        ) {
          console.log("Nom société modifié:", editData.societe.nom);
          societeData.nom_societe = editData.societe.nom;
        }
        if (
          editData.societe.ville &&
          editData.societe.ville.trim() !== currentVille
        ) {
          console.log("Ville société modifiée:", editData.societe.ville);
          societeData.ville_societe = editData.societe.ville;
        }
        if (
          editData.societe.rue &&
          editData.societe.rue.trim() !== currentRue
        ) {
          console.log("Rue société modifiée:", editData.societe.rue);
          societeData.rue_societe = editData.societe.rue;
        }
        if (
          editData.societe.code_postal &&
          editData.societe.code_postal.trim() !== currentCodePostal
        ) {
          console.log(
            "Code postal société modifié:",
            editData.societe.code_postal
          );
          societeData.codepostal_societe = editData.societe.code_postal;
        }

        // Envoyer la requête seulement s'il y a des changements
        if (Object.keys(societeData).length > 0) {
          console.log("Envoi des données société:", societeData);
          await axios.patch(`/api/societe/${societeForSave.id}/`, societeData);
        } else {
          console.log("Aucune modification détectée pour la société");
        }
      }

      // Mettre à jour le chantier - seulement si les valeurs ont changé
      if (chantierData?.id) {
        const chantierDataToUpdate = {};

        // Debug: afficher les valeurs pour comparaison
        console.log("Valeurs actuelles:", {
          nom: chantierData.nom,
          statut: chantierData.state_chantier,
        });
        console.log("Nouvelles valeurs:", {
          nom: editData.chantier.nom,
          statut: editData.chantier.statut,
        });

        // Comparer avec les valeurs actuelles
        if (
          editData.chantier.nom &&
          editData.chantier.nom.trim() !== (chantierData.nom || "")
        ) {
          console.log("Nom du chantier modifié:", editData.chantier.nom);
          chantierDataToUpdate.chantier_name = editData.chantier.nom;
        }
        if (
          editData.chantier.statut &&
          editData.chantier.statut.trim() !==
            (chantierData.state_chantier || "")
        ) {
          console.log("Statut du chantier modifié:", editData.chantier.statut);
          chantierDataToUpdate.state_chantier = editData.chantier.statut;
        }

        // Gérer l'adresse du chantier
        if (
          editData.chantier_adresse.ville &&
          editData.chantier_adresse.ville.trim() !==
            (chantierData.adresse?.ville || "")
        ) {
          console.log(
            "Ville chantier modifiée:",
            editData.chantier_adresse.ville
          );
          chantierDataToUpdate.ville = editData.chantier_adresse.ville;
        }
        if (
          editData.chantier_adresse.rue &&
          editData.chantier_adresse.rue.trim() !==
            (chantierData.adresse?.rue || "")
        ) {
          console.log("Rue chantier modifiée:", editData.chantier_adresse.rue);
          chantierDataToUpdate.rue = editData.chantier_adresse.rue;
        }
        if (
          editData.chantier_adresse.code_postal &&
          editData.chantier_adresse.code_postal.trim() !==
            (chantierData.adresse?.code_postal || "")
        ) {
          console.log(
            "Code postal chantier modifié:",
            editData.chantier_adresse.code_postal
          );
          chantierDataToUpdate.code_postal =
            editData.chantier_adresse.code_postal;
        }

        console.log("Données à mettre à jour:", chantierDataToUpdate);

        // Envoyer la requête seulement s'il y a des changements
        if (Object.keys(chantierDataToUpdate).length > 0) {
          console.log("Envoi de la requête de mise à jour du chantier");
          await axios.patch(
            `/api/chantier/${chantierData.id}/`,
            chantierDataToUpdate
          );
        } else {
          console.log("Aucune modification détectée pour le chantier");
        }
      }

      setOpenEditModal(false);
      // Recharger les données du chantier
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      if (error.response?.data) {
        // Afficher les erreurs spécifiques de validation
        const errorMessages = Object.values(error.response.data)
          .flat()
          .join("\n");
        alert(`Erreur de validation:\n${errorMessages}`);
      } else {
        alert("Erreur lors de la modification des données");
      }
    } finally {
      setLoadingEdit(false);
    }
  };

  // Fonction pour supprimer le chantier
  const handleDeleteChantier = async () => {
    setLoadingDelete(true);
    try {
      await axios.delete(`/api/chantier/${chantierData.id}/`);
      setOpenDeleteModal(false);
      // Rediriger vers la liste des chantiers
      window.location.href = "/chantiers";
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression du chantier");
    } finally {
      setLoadingDelete(false);
    }
  };

  // Fonction pour modifier le statut
  const handleStatusChange = async (newStatus) => {
    setLoadingStatus(true);
    try {
      await axios.put(`/api/chantier/${chantierData.id}/`, {
        state_chantier: newStatus,
      });
      setOpenStatusModal(false);
      // Recharger les données du chantier
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Erreur lors de la modification du statut:", error);
      if (error.response?.data) {
        const errorMessages = Object.values(error.response.data)
          .flat()
          .join("\n");
        alert(`Erreur de validation:\n${errorMessages}`);
      } else {
        alert("Erreur lors de la modification du statut");
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  // Fonction pour ouvrir le Drive du chantier
  const handleOpenDrive = () => {
    // Utiliser les données complètes du chantier si disponibles, sinon les données de base
    const chantierInfo = fullChantierData || chantierData;

    console.log("🔍 DEBUG handleOpenDrive - chantierInfo:", chantierInfo);
    console.log("🔍 DEBUG handleOpenDrive - societe:", chantierInfo?.societe);
    console.log("🔍 DEBUG handleOpenDrive - nom:", chantierInfo?.nom);

    if (!chantierInfo?.societe?.nom || !chantierInfo?.nom) {
      console.error("❌ DEBUG handleOpenDrive - Données manquantes:");
      console.error("  - societe?.nom:", chantierInfo?.societe?.nom);
      console.error("  - nom:", chantierInfo?.nom);
      alert(
        "Impossible d'ouvrir le Drive : informations du chantier manquantes"
      );
      return;
    }

    // Construire le chemin du Drive en utilisant customSlugify
    const societeSlug = universalDriveGenerator.customSlugify(
      chantierInfo.societe.nom
    );
    const chantierSlug = universalDriveGenerator.customSlugify(
      chantierInfo.nom
    );

    const drivePath = `Chantiers/${societeSlug}/${chantierSlug}`;

    console.log("🔍 DEBUG handleOpenDrive - drivePath:", drivePath);

    // Ouvrir le Drive dans une nouvelle fenêtre
    const driveUrl = `/drive?path=${encodeURIComponent(
      drivePath
    )}&sidebar=closed`;
    console.log("🔍 DEBUG handleOpenDrive - driveUrl:", driveUrl);
    window.open(driveUrl, "_blank", "width=1200,height=800");
  };

  return (
    <Box>
      {/* Nouvelle section d'informations principales */}
      <Card
        sx={{
          mb: 3,
          borderRadius: "10px",
          backgroundColor: "white",
          boxShadow: 4,
        }}
      >
        <CardContent
          onDoubleClick={handleOpenEditModal}
          sx={{
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.02)",
            },
          }}
        >
          <Grid container spacing={4}>
            {/* Nom du chantier */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Nom du chantier :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {chantierData?.nom || "Non défini"}
              </Typography>
            </Grid>

            {/* Nom client */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Nom client :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {chantierData?.societe?.client?.nom || "Non défini"}
              </Typography>
            </Grid>

            {/* Société */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Société :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {chantierData?.societe?.nom ||
                  chantierData?.societe?.nom_societe ||
                  "Non défini"}
              </Typography>
            </Grid>

            {/* Date de création */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Date de création :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {formatDate(chantierData?.dates?.debut)}
              </Typography>
            </Grid>

            {/* Statut */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Statut :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                  display: "inline-block",
                }}
              >
                <Box
                  onClick={() => setOpenStatusModal(true)}
                  sx={{
                    backgroundColor:
                      chantierData?.statut === "En Cours"
                        ? "rgba(46, 125, 50, 0.1)"
                        : chantierData?.statut === "Terminé"
                        ? "rgba(211, 47, 47, 0.1)"
                        : "#e0e0e0",
                    color:
                      chantierData?.statut === "En Cours"
                        ? "#2e7d32"
                        : chantierData?.statut === "Terminé"
                        ? "#d32f2f"
                        : "#757575",
                    borderRadius: 8,
                    padding: "2px 12px",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      opacity: 0.8,
                      transform: "scale(1.02)",
                    },
                    display: "inline-block",
                  }}
                >
                  {chantierData?.statut || "Non défini"}
                </Box>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Bouton Sous-traitance */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<FaHandshake />}
          onClick={() => setOpenSousTraitance(true)}
          sx={{
            backgroundColor: "#1976d2",
            boxShadow: 3,
            "&:hover": {
              backgroundColor: "#1565c0",
              boxShadow: 5,
            },
          }}
        >
          Gérer les sous-traitants
        </Button>
        <Button
          variant="contained"
          startIcon={<FaClipboardList />}
          color="success"
          onClick={() => setOpenSituationModal(true)}
          sx={{
            backgroundColor: "#388e3c",
            boxShadow: 3,
            "&:hover": {
              backgroundColor: "#2e7d32",
              boxShadow: 5,
            },
          }}
        >
          Gérer les situations
        </Button>
        <Button
          variant="contained"
          startIcon={<FaFileInvoice />}
          onClick={() => {
            window.open(
              `/CreationDevis?chantier_id=${chantierData?.id}`,
              "_blank"
            );
          }}
          sx={{
            backgroundColor: "#ff9800",
            color: "white",
            boxShadow: 3,
            "&:hover": {
              backgroundColor: "#fb8c00",
              boxShadow: 5,
            },
          }}
        >
          Créer un nouveau devis
        </Button>
        <Button
          variant="contained"
          startIcon={<FaTable />}
          onClick={() => {
            window.open(
              `/TableauSuivi?chantier_id=${chantierData?.id}`,
              "_blank"
            );
          }}
          sx={{
            backgroundColor: "#424242",
            color: "white",
            boxShadow: 3,
            "&:hover": {
              backgroundColor: "#212121",
              boxShadow: 5,
            },
          }}
        >
          Afficher tableau suivi
        </Button>
        <Button
          variant="contained"
          startIcon={<FaChartBar />}
          onClick={() => {
            window.open(`/TableauFacturation`, "_blank");
          }}
          sx={{
            backgroundColor: "#9c27b0",
            color: "white",
            boxShadow: 3,
            "&:hover": {
              backgroundColor: "#7b1fa2",
              boxShadow: 5,
            },
          }}
        >
          Tableau facturation
        </Button>
        <Button
          variant="contained"
          startIcon={<FaCloud />}
          onClick={handleOpenDrive}
          sx={{
            backgroundColor: "#00bcd4",
            color: "white",
            boxShadow: 3,
            "&:hover": {
              backgroundColor: "#00acc1",
              boxShadow: 5,
            },
          }}
        >
          Accéder au Drive
        </Button>
      </Box>

      {/* Modal de sous-traitance */}
      <SousTraitanceModal
        open={openSousTraitance}
        onClose={() => setOpenSousTraitance(false)}
        chantierId={chantierData?.id}
        onUpdate={handleSousTraitanceUpdate}
      />

      {/* Situation Creation Modal */}
      <SituationCreationModal
        open={openSituationModal}
        onClose={() => setOpenSituationModal(false)}
        devis={devisChantier}
        chantier={chantierData}
        onCreated={() => {
          // Recharger les données de taux de facturation
          axios
            .get(`/api/chantier/${chantierData.id}/taux-facturation/`)
            .then((res) => setTauxFacturationData(res.data));

          // Recharger la liste des situations (synchronisé avec ChantierDocumentsTab)
          loadSituations();
        }}
      />

      {/* Blocs Réel/Prévisionnel à gauche, Taux de facturation à droite */}
      <Grid container spacing={3}>
        {/* Colonne gauche : Réel & Prévisionnel */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={3}>
            {/* Bloc Prévisionnel */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Titre Prévisionnel */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent sx={{ pt: 0.5, pb: 0 + " !important" }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        fontSize: "1rem",
                        mb: 0,
                        fontFamily: "Roboto Slab, serif",
                      }}
                    >
                      Prévisionnel
                    </Typography>
                  </CardContent>
                </Card>

                {/* Main d'œuvre prévisionnelle */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent sx={{ py: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        alignItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color: "#388e3c",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Main d'œuvre
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_estime_main_oeuvre)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#d32f2f",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Matériel
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_estime_materiel)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#1976d2",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Sous-traitance
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_sous_traitance)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                {/* Total Prévisionnel */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent>
                    <Typography
                      align="center"
                      sx={{
                        fontWeight: 700,
                        color: "#1976d2",
                        fontFamily: "Roboto, Arial, sans-serif",
                      }}
                    >
                      Total:{" "}
                      {formatMontant(
                        (chantierData?.cout_estime_main_oeuvre || 0) +
                          (chantierData?.cout_estime_materiel || 0) +
                          (chantierData?.cout_sous_traitance || 0)
                      )}
                    </Typography>
                    {/* Icône discrète pour la décomposition */}
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                      <Tooltip title={state.showDecomposition ? "Masquer décomposition" : "Voir décomposition"}>
                        <Box
                          onClick={() => setState({ ...state, showDecomposition: !state.showDecomposition })}
                          sx={{
                            cursor: "pointer",
                            color: "#999",
                            fontSize: "1.2rem",
                            padding: "4px",
                            borderRadius: "50%",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              color: "#1976d2",
                              backgroundColor: "rgba(25, 118, 210, 0.1)",
                            },
                          }}
                        >
                          {state.showDecomposition ? "🔍" : "ℹ️"}
                        </Box>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
                
                {/* Composant de décomposition des coûts */}
                {showDecomposition && (
                  <Card
                    sx={{
                      borderRadius: "10px",
                      backgroundColor: "#f8f9fa",
                      boxShadow: 2,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: "#1976d2",
                          fontFamily: "Roboto, Arial, sans-serif",
                          mb: 2,
                        }}
                      >
                        Décomposition des Coûts Prévisionnels
                      </Typography>
                      
                      {loadingDecomposition ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                          <LinearProgress sx={{ width: "100%" }} />
                        </Box>
                      ) : decompositionData ? (
                        <Box>
                          {/* Devis principal */}
                          {decompositionData.devis && (
                            <Box sx={{ mb: 2 }}>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: 600,
                                  color: "#388e3c",
                                  mb: 1,
                                }}
                              >
                                📋 Devis Principal
                              </Typography>
                              <Box sx={{ pl: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Main d'œuvre: {formatMontant(decompositionData.devis.cout_main_oeuvre)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Matériel: {formatMontant(decompositionData.devis.cout_materiel)}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          
                          {/* Factures */}
                          {decompositionData.factures && decompositionData.factures.detail && decompositionData.factures.detail.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: 600,
                                  color: "#d32f2f",
                                  mb: 1,
                                }}
                              >
                                🧾 Factures ({decompositionData.factures.nombre_factures})
                              </Typography>
                              {decompositionData.factures.detail.map((facture, index) => (
                                <Box key={index} sx={{ pl: 2, mb: 1 }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 500, 
                                      color: "#1976d2",
                                      mb: 0.5 
                                    }}
                                  >
                                    {facture.numero}
                                  </Typography>
                                  <Box sx={{ pl: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      Main d'œuvre: {formatMontant(facture.cout_main_oeuvre)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Matériel: {formatMontant(facture.cout_materiel)}
                                    </Typography>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          )}
                          
                          {/* Résumé des factures */}
                          {decompositionData.factures && decompositionData.factures.nombre_factures > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: 600,
                                  color: "#ff9800",
                                  mb: 1,
                                }}
                              >
                                📊 Résumé Factures
                              </Typography>
                              <Box sx={{ pl: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Main d'œuvre: {formatMontant(decompositionData.factures.cout_main_oeuvre)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Matériel: {formatMontant(decompositionData.factures.cout_materiel)}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          
                          {/* Totaux */}
                          <Box
                            sx={{
                              borderTop: "1px solid #e0e0e0",
                              pt: 2,
                              backgroundColor: "#fff",
                              borderRadius: 1,
                              p: 2,
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 600,
                                color: "#1976d2",
                                mb: 1,
                              }}
                            >
                              📊 Totaux
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Main d'œuvre totale: {formatMontant(decompositionData.total.cout_main_oeuvre)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Matériel total: {formatMontant(decompositionData.total.cout_materiel)}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: "#1976d2",
                                mt: 1,
                              }}
                            >
                              Total: {formatMontant(decompositionData.total.cout_total)}
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Aucune donnée disponible
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Box>
            </Grid>
            {/* Bloc Réel */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Titre Réel */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent sx={{ pt: 0.5, pb: 0 + " !important" }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        fontSize: "1rem",
                        mb: 0,
                        fontFamily: "Roboto Slab, serif",
                      }}
                    >
                      Réel
                    </Typography>
                  </CardContent>
                </Card>

                {/* Main d'œuvre réelle */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent sx={{ py: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        alignItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color: "#388e3c",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Main d'œuvre
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {loadingMainOeuvre ? (
                            <span style={{ color: "#1976d2" }}>
                              Chargement...
                            </span>
                          ) : (
                            formatMontant(mainOeuvreReelle)
                          )}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#d32f2f",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Matériel
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_materiel)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#1976d2",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Sous-traitance
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_sous_traitance)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                {/* Total Réel */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent>
                    <Typography
                      align="center"
                      sx={{
                        fontWeight: 700,
                        color: "#1976d2",
                        fontFamily: "Roboto, Arial, sans-serif",
                      }}
                    >
                      Total:{" "}
                      {formatMontant(
                        (mainOeuvreReelle || 0) +
                          (chantierData?.cout_materiel || 0) +
                          (chantierData?.cout_sous_traitance || 0)
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
            {/* Carte de marge unique */}
            <Grid item xs={12}>
              <Card
                sx={{
                  borderRadius: "10px",
                  backgroundColor: "white",
                  boxShadow: 4,
                }}
              >
                <CardContent>
                  <Typography
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontFamily: "Roboto, Arial, sans-serif",
                      color:
                        (chantierData?.cout_estime_main_oeuvre || 0) +
                          (chantierData?.cout_estime_materiel || 0) +
                          (chantierData?.cout_sous_traitance || 0) -
                          ((chantierData?.cout_main_oeuvre || 0) +
                            (chantierData?.cout_materiel || 0) +
                            (chantierData?.cout_sous_traitance || 0)) >=
                        0
                          ? "#2e7d32"
                          : "#d32f2f",
                    }}
                  >
                    Marge:{" "}
                    {formatMontant(
                      (chantierData?.cout_estime_main_oeuvre || 0) +
                        (chantierData?.cout_estime_materiel || 0) +
                        (chantierData?.cout_sous_traitance || 0) -
                        ((mainOeuvreReelle || 0) +
                          (chantierData?.cout_materiel || 0) +
                          (chantierData?.cout_sous_traitance || 0))
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        {/* Colonne droite : Taux de facturation */}
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              borderRadius: "10px",
              backgroundColor: "white",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              mt: 3,
              boxShadow: 4,
            }}
          >
            <CardContent sx={{ pt: 0.5, pb: 0.5 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    fontFamily: "Roboto Slab, serif",
                  }}
                >
                  Taux de facturation :
                </Typography>
                <Box sx={{ textAlign: "right" }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      color: "#1976d2",
                      fontFamily: "Roboto, Arial, sans-serif",
                    }}
                  >
                    Total facturé :{" "}
                    {formatMontant(tauxFacturationData?.montant_total)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: "#6e6e6e",
                      fontFamily: "Roboto, Arial, sans-serif",
                    }}
                  >
                    Marché : {formatMontant(chantierData?.montant_ht)}
                  </Typography>
                </Box>
              </Box>
              {loadingTaux ? (
                <LinearProgress />
              ) : tauxFacturationData ? (
                <>
                  <MultiColorProgressBar
                    pourcentages={pourcentages}
                    montants={montants}
                  />
                  {/* Légende */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      mb: 2,
                      fontWeight: 400,
                      fontSize: "0.65rem",
                    }}
                  >
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: "#ff9800",
                        borderRadius: "50%",
                      }}
                    />{" "}
                    <Typography component="span" sx={{ fontSize: "0.85rem" }}>
                      Non envoyées
                    </Typography>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: "#1976d2",
                        borderRadius: "50%",
                      }}
                    />{" "}
                    <Typography component="span" sx={{ fontSize: "0.85rem" }}>
                      En attente paiement
                    </Typography>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: "#2e7d32",
                        borderRadius: "50%",
                      }}
                    />{" "}
                    <Typography component="span" sx={{ fontSize: "0.85rem" }}>
                      Payées
                    </Typography>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: "#d32f2f",
                        borderRadius: "50%",
                      }}
                    />{" "}
                    <Typography component="span" sx={{ fontSize: "0.85rem" }}>
                      Retard de paiement
                    </Typography>
                  </Box>
                  {/* Accordéon des situations */}
                  {situations.map((situation) => (
                    <Accordion key={situation.id}>
                      <AccordionSummary expandIcon={<FaChevronDown />}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {situation.numero_situation} – {situation.mois}/
                          {situation.annee}
                        </Typography>
                        <Typography
                          sx={{
                            ml: 2,
                            fontWeight: 700,
                            color: getCategorieColor(
                              getSituationCategorie(situation)
                            ),
                          }}
                        >
                          {formatMontant(situation.montant_apres_retenues)}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {!situation.date_envoi ? (
                          <>
                            <Typography color="warning.main">
                              Date d'envoi et délai de paiement non définis
                            </Typography>
                            <Button
                              variant="outlined"
                              onClick={() => handleOpenModal(situation)}
                            >
                              Définir les dates
                            </Button>
                          </>
                        ) : (
                          <>
                            <Typography>
                              Date d'envoi :{" "}
                              {new Date(
                                situation.date_envoi
                              ).toLocaleDateString("fr-FR")}
                            </Typography>
                            <Typography>
                              Délai de paiement : {situation.delai_paiement}{" "}
                              jours
                            </Typography>
                            <Typography>
                              Date limite de paiement :{" "}
                              {situation.date_envoi && situation.delai_paiement
                                ? new Date(
                                    new Date(situation.date_envoi).getTime() +
                                      situation.delai_paiement *
                                        24 *
                                        60 *
                                        60 *
                                        1000
                                  ).toLocaleDateString("fr-FR")
                                : "-"}
                            </Typography>
                            <Typography>
                              Statut de paiement :{" "}
                              {situation.date_paiement_reel ? (
                                <>
                                  <FaCheckCircle
                                    color="#2e7d32"
                                    style={{ verticalAlign: "middle" }}
                                  />{" "}
                                  Payée
                                </>
                              ) : isRetardPaiement(situation) ? (
                                <>
                                  <FaExclamationCircle
                                    color="#d32f2f"
                                    style={{ verticalAlign: "middle" }}
                                  />{" "}
                                  Retard de paiement
                                </>
                              ) : situation.date_envoi ? (
                                <>
                                  <FaHourglassHalf
                                    color="#1976d2"
                                    style={{ verticalAlign: "middle" }}
                                  />{" "}
                                  En attente
                                </>
                              ) : (
                                <>
                                  <FaExclamationCircle
                                    color="#ff9800"
                                    style={{ verticalAlign: "middle" }}
                                  />{" "}
                                  Non envoyée
                                </>
                              )}
                            </Typography>
                            {!situation.date_paiement_reel && (
                              <Button
                                variant="outlined"
                                color="success"
                                sx={{ mt: 1, mb: 1 }}
                                onClick={() =>
                                  handleOpenPaiementModal(situation)
                                }
                              >
                                Définir paiement
                              </Button>
                            )}
                          </>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </>
              ) : (
                <Typography color="error">
                  Aucune donnée de facturation disponible.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openModal} onClose={handleCloseModal}>
        <DialogTitle>Date d'envoi et délai de paiement</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <TextField
              type="date"
              label="Date d'envoi"
              value={
                dateEnvoi
                  ? typeof dateEnvoi === "string"
                    ? dateEnvoi
                    : dayjs(dateEnvoi).format("YYYY-MM-DD")
                  : ""
              }
              onChange={(e) => setDateEnvoi(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />
            <Select
              value={delaiPaiement}
              onChange={(e) => setDelaiPaiement(e.target.value)}
              fullWidth
              displayEmpty
              sx={{ mb: 2 }}
            >
              <MenuItem value="">
                <em>Choisir un délai</em>
              </MenuItem>
              <MenuItem value={45}>45 jours</MenuItem>
              <MenuItem value={60}>60 jours</MenuItem>
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Annuler</Button>
          <Button
            onClick={handleSaveDates}
            disabled={!dateEnvoi || !delaiPaiement}
            variant="contained"
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openPaiementModal}
        onClose={() => setOpenPaiementModal(false)}
      >
        <DialogTitle>Montant reçu et date de paiement</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <TextField
              type="number"
              label="Montant reçu HT"
              value={montantRecu}
              onChange={(e) => setMontantRecu(e.target.value)}
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
          <Button onClick={() => setOpenPaiementModal(false)}>Annuler</Button>
          <Button
            onClick={async () => {
              try {
                await updatePaiement(
                  selectedSituationPaiement.id,
                  montantRecu,
                  datePaiementReel
                );
                setOpenPaiementModal(false);
                setSelectedSituationPaiement(null);
                setMontantRecu("");
                setDatePaiementReel("");
                // Rafraîchir les données
                axios
                  .get(`/api/chantier/${chantierData.id}/taux-facturation/`)
                  .then((res) => setTauxFacturationData(res.data));
              } catch (error) {
                alert("Erreur lors de la mise à jour du paiement.");
              }
            }}
            variant="contained"
            disabled={!montantRecu || !datePaiementReel}
          >
            Valider
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal d'édition des informations */}
      <Dialog
        open={openEditModal}
        onClose={() => setOpenEditModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Modifier les informations du chantier</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#1976d2" }}>
              Informations du chantier
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom du chantier"
                  value={editData.chantier.nom}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      chantier: { ...editData.chantier, nom: e.target.value },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={editData.chantier.statut}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        chantier: {
                          ...editData.chantier,
                          statut: e.target.value,
                        },
                      })
                    }
                    label="Statut"
                  >
                    <MenuItem value="En Cours">En Cours</MenuItem>
                    <MenuItem value="Terminé">Terminé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mb: 2, color: "#1976d2" }}>
              Informations de la société
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom de la société"
                  value={editData.societe.nom}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      societe: { ...editData.societe, nom: e.target.value },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ville de la société"
                  value={editData.societe.ville}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      societe: { ...editData.societe, ville: e.target.value },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Rue de la société"
                  value={editData.societe.rue}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      societe: { ...editData.societe, rue: e.target.value },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Code postal de la société"
                  value={editData.societe.code_postal}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      societe: {
                        ...editData.societe,
                        code_postal: e.target.value,
                      },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mb: 2, color: "#1976d2" }}>
              Adresse du chantier
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ville du chantier"
                  value={editData.chantier_adresse.ville}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      chantier_adresse: {
                        ...editData.chantier_adresse,
                        ville: e.target.value,
                      },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Rue du chantier"
                  value={editData.chantier_adresse.rue}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      chantier_adresse: {
                        ...editData.chantier_adresse,
                        rue: e.target.value,
                      },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Code postal du chantier"
                  value={editData.chantier_adresse.code_postal}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      chantier_adresse: {
                        ...editData.chantier_adresse,
                        code_postal: e.target.value,
                      },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mb: 2, color: "#1976d2" }}>
              Informations du client
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Civilité</InputLabel>
                  <Select
                    value={editData.client.civilite}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        client: { ...editData.client, civilite: e.target.value },
                      })
                    }
                    label="Civilité"
                  >
                    <MenuItem value="">Aucune</MenuItem>
                    <MenuItem value="M.">Monsieur</MenuItem>
                    <MenuItem value="Mme">Madame</MenuItem>
                    <MenuItem value="Mlle">Mademoiselle</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom"
                  value={editData.client.nom}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      client: { ...editData.client, nom: e.target.value },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Prénom"
                  value={editData.client.prenom}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      client: { ...editData.client, prenom: e.target.value },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={editData.client.email}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      client: { ...editData.client, email: e.target.value },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Téléphone"
                  type="tel"
                  value={editData.client.telephone}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      client: { ...editData.client, telephone: e.target.value },
                    })
                  }
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Button
            onClick={() => setOpenDeleteModal(true)}
            variant="outlined"
            color="error"
            startIcon={<FaTrash />}
          >
            Supprimer le chantier
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={() => setOpenEditModal(false)}>Annuler</Button>
            <Button
              onClick={handleSaveEdit}
              variant="contained"
              disabled={loadingEdit}
            >
              {loadingEdit ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmation de suppression */}
      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Attention ! Cette action est irréversible.
            </Typography>
            <Typography variant="body2">
              Vous êtes sur le point de supprimer définitivement le chantier "
              {chantierData?.nom}" ainsi que toutes les données associées
              (situations, devis, etc.).
            </Typography>
          </Alert>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Pour confirmer la suppression, veuillez taper le nom du chantier :{" "}
            <strong>{chantierData?.nom}</strong>
          </Typography>
          <TextField
            fullWidth
            label="Nom du chantier"
            placeholder={chantierData?.nom}
            sx={{ mt: 2 }}
            onChange={(e) => {
              // La suppression ne sera activée que si le nom correspond exactement
              const canDelete = e.target.value === chantierData?.nom;
              setCanDelete(canDelete);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteModal(false)}>Annuler</Button>
          <Button
            onClick={handleDeleteChantier}
            variant="contained"
            color="error"
            disabled={loadingDelete || !canDelete}
          >
            {loadingDelete ? "Suppression..." : "Supprimer définitivement"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de modification du statut */}
      <Dialog open={openStatusModal} onClose={() => setOpenStatusModal(false)}>
        <DialogTitle>Modifier le statut du chantier</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Statut actuel : <strong>{chantierData?.statut}</strong>
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Nouveau statut</InputLabel>
              <Select
                value={editData.chantier.statut}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    chantier: { ...editData.chantier, statut: e.target.value },
                  })
                }
                label="Nouveau statut"
              >
                <MenuItem value="En Cours">En Cours</MenuItem>
                <MenuItem value="Terminé">Terminé</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatusModal(false)}>Annuler</Button>
          <Button
            onClick={() => handleStatusChange(editData.chantier.statut)}
            variant="contained"
            disabled={
              loadingStatus || editData.chantier.statut === chantierData?.statut
            }
          >
            {loadingStatus ? "Modification..." : "Modifier le statut"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChantierInfoTab;
