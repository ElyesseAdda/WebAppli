import {
  Box,
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Modal,
  Paper,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { green } from "@mui/material/colors";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { AiFillFilePdf } from "react-icons/ai";
import { FaClipboardList } from "react-icons/fa";
import { TfiMore } from "react-icons/tfi";
import { useNavigate } from "react-router-dom";
import {
  AlignedCell,
  CenteredTableCell,
  CenteredTextField,
  ChantierCell,
  DevisNumber,
  FilterCell,
  PriceTextField,
  StatusCell,
  StyledBox,
  StyledSelect,
  StyledTableContainer,
  StyledTextField,
} from "../styles/tableStyles";
import { generatePDFDrive } from "../utils/universalDriveGenerator";
import CreationFacture from "./CreationFacture";
import CreationSituation from "./CreationSituation";
import StatusChangeModal from "./StatusChangeModal";
import TransformationCIEModal from "./TransformationCIEModal";
import TransformationTSModal from "./TransformationTSModal";
import { generateDevisMarchePDFDrive } from "./pdf_drive_functions";

const formatNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const ListeDevis = () => {
  const [devis, setDevis] = useState([]);
  const [filteredDevis, setFilteredDevis] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [filters, setFilters] = useState({
    numero: "",
    chantier_name: "",
    client_name: "",
    date_creation: "",
    price_ttc: "",
    status: "Tous",
  });
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [devisToUpdate, setDevisToUpdate] = useState(null);
  const [factureModalOpen, setFactureModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteFacturesModalOpen, setDeleteFacturesModalOpen] = useState(false);
  const [facturesToDelete, setFacturesToDelete] = useState([]);
  const [newStatus, setNewStatus] = useState(null);
  const [tsModalOpen, setTsModalOpen] = useState(false);
  const [selectedDevisForTS, setSelectedDevisForTS] = useState(null);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [cieModalOpen, setCieModalOpen] = useState(false);
  const [selectedDevisForCIE, setSelectedDevisForCIE] = useState(null);
  const [situationModalOpen, setSituationModalOpen] = useState(false);
  const [selectedDevisForSituation, setSelectedDevisForSituation] =
    useState(null);

  const statusOptions = ["En attente", "Validé", "Refusé"];
  const navigate = useNavigate();

  useEffect(() => {
    fetchDevis();

    // Récupère les paramètres de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const numeroFilter = urlParams.get("numero");

    // Si un numéro de devis est spécifié dans l'URL, met à jour le filtre
    if (numeroFilter) {
      setFilters((prev) => ({
        ...prev,
        numero: numeroFilter,
      }));

      // Appliquer le filtre immédiatement sur les devis existants
      const filtered = devis.filter((devis) =>
        devis.numero?.toLowerCase().includes(numeroFilter.toLowerCase())
      );
      setFilteredDevis(filtered);
    }

    // Vérifier s'il y a une génération PDF en attente
    checkPendingPDFGeneration();

    // Vérifier s'il y a un téléchargement automatique demandé via URL
    checkAutoDownloadFromURL();
  }, []);

  // Fonction pour vérifier et lancer la génération PDF en attente
  const checkPendingPDFGeneration = async () => {
    try {
      const pendingData = sessionStorage.getItem("pendingPDFGeneration");
      if (pendingData) {
        const { type, appelOffresId, appelOffresName, societeName, timestamp } =
          JSON.parse(pendingData);

        // Vérifier que la demande n'est pas trop ancienne (max 5 minutes)
        const now = Date.now();
        if (now - timestamp > 5 * 60 * 1000) {
          console.log(
            "⚠️ Génération PDF en attente trop ancienne, suppression"
          );
          sessionStorage.removeItem("pendingPDFGeneration");
          return;
        }

        if (type === "devis_marche") {
          console.log(
            "🚀 Lancement de la génération PDF automatique pour l'appel d'offre"
          );

          // Pour la génération automatique, on n'a pas l'ID du devis
          // On va récupérer le devis depuis l'appel d'offres
          try {
            const devisResponse = await axios.get(
              `/api/devisa/?appel_offres=${appelOffresId}`
            );
            const devisList = devisResponse.data;
            if (devisList && devisList.length > 0) {
              const devis = devisList[0]; // Prendre le premier devis
              await generateDevisMarchePDFDrive(
                devis.id, // ID du devis
                appelOffresId,
                appelOffresName,
                societeName,
                (response) => {
                  console.log("✅ PDF généré avec succès pour l'appel d'offre");
                  sessionStorage.removeItem("pendingPDFGeneration");
                },
                (error) => {
                  console.error(
                    "❌ Erreur lors de la génération du PDF:",
                    error
                  );
                  sessionStorage.removeItem("pendingPDFGeneration");
                }
              );
            } else {
              console.error("❌ Aucun devis trouvé pour l'appel d'offres");
              sessionStorage.removeItem("pendingPDFGeneration");
            }
          } catch (error) {
            console.error("❌ Erreur lors de la récupération du devis:", error);
            sessionStorage.removeItem("pendingPDFGeneration");
          }
        }
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors de la vérification de la génération PDF en attente:",
        error
      );
      // Nettoyer le sessionStorage en cas d'erreur
      sessionStorage.removeItem("pendingPDFGeneration");
    }
  };

  // Fonction pour vérifier et lancer le téléchargement automatique depuis l'URL
  const checkAutoDownloadFromURL = async () => {
    try {
      console.log(
        "🔍 NOUVEAU: Vérification du téléchargement automatique depuis l'URL"
      );
      console.log("🔍 URL actuelle:", window.location.href);

      const urlParams = new URLSearchParams(window.location.search);
      const autoDownload = urlParams.get("autoDownload");

      if (autoDownload === "true") {
        const devisId = urlParams.get("devisId");
        const appelOffresId = urlParams.get("appelOffresId");
        const appelOffresName = urlParams.get("appelOffresName");
        const societeName = urlParams.get("societeName");
        const numero = urlParams.get("numero");

        console.log("🚀 NOUVEAU: Téléchargement automatique détecté:", {
          devisId,
          appelOffresId,
          appelOffresName,
          societeName,
          numero,
        });

        // Vérifier que tous les paramètres requis sont présents
        if (devisId && appelOffresId && appelOffresName && societeName) {
          // Attendre que les devis soient chargés
          setTimeout(async () => {
            try {
              console.log(
                "🎯 NOUVEAU: Lancement du téléchargement automatique avec le système universel"
              );

              // Utiliser le nouveau système universel
              await generatePDFDrive(
                "devis_chantier",
                {
                  devisId: parseInt(devisId),
                  appelOffresId: parseInt(appelOffresId),
                  appelOffresName: appelOffresName,
                  societeName: societeName,
                  numero: numero || `DEV-${devisId}`,
                },
                {
                  onSuccess: (response) => {
                    console.log(
                      "✅ NOUVEAU: Téléchargement automatique réussi:",
                      response
                    );
                    // Nettoyer l'URL après succès
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, newUrl);
                  },
                  onError: (error) => {
                    console.error(
                      "❌ NOUVEAU: Erreur lors du téléchargement automatique:",
                      error
                    );
                    // Afficher une notification d'erreur
                    alert(
                      `❌ Erreur lors du téléchargement automatique: ${error.message}`
                    );
                    // Nettoyer l'URL même en cas d'erreur
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, newUrl);
                  },
                }
              );
            } catch (error) {
              console.error(
                "❌ NOUVEAU: Erreur lors du téléchargement automatique:",
                error
              );
              alert(
                `❌ Erreur lors du téléchargement automatique: ${error.message}`
              );
              // Nettoyer l'URL en cas d'erreur
              const newUrl = window.location.pathname;
              window.history.replaceState({}, document.title, newUrl);
            }
          }, 2000); // Attendre 2 secondes pour que les devis soient chargés
        } else {
          console.warn(
            "⚠️ NOUVEAU: Paramètres manquants pour le téléchargement automatique"
          );
          alert("⚠️ Paramètres manquants pour le téléchargement automatique");
          // Nettoyer l'URL si les paramètres sont incomplets
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }
    } catch (error) {
      console.error(
        "❌ NOUVEAU: Erreur lors de la vérification du téléchargement automatique:",
        error
      );
      alert(
        `❌ Erreur lors de la vérification du téléchargement automatique: ${error.message}`
      );
    }
  };

  // Fonction pour gérer le téléchargement automatique des nouveaux devis
  const handleAutoDownloadForNewDevis = async (devis) => {
    try {
      console.log(
        "🎯 Téléchargement automatique pour le nouveau devis:",
        devis
      );

      // Récupérer les données complètes du devis
      const response = await axios.get(`/api/devisa/${devis.id}/`);
      const devisComplet = response.data;

      console.log("📋 Données du devis complet:", devisComplet);

      // Vérifier que c'est bien un devis de chantier avec un appel d'offres
      if (devisComplet.devis_chantier === true && devisComplet.appel_offres) {
        // Récupérer les données de l'appel d'offres
        const appelOffresResponse = await axios.get(
          `/api/appels-offres/${devisComplet.appel_offres}/`
        );
        const appelOffres = appelOffresResponse.data;

        // Récupérer les données de la société
        let societe;
        if (typeof appelOffres.societe === "object" && appelOffres.societe.id) {
          societe = appelOffres.societe;
        } else {
          const societeResponse = await axios.get(
            `/api/societe/${appelOffres.societe}/`
          );
          societe = societeResponse.data;
        }

        console.log("🚀 Lancement du téléchargement automatique...");

        // Lancer la génération PDF
        await generateDevisMarchePDFDrive(
          devisComplet.id,
          appelOffres.id,
          appelOffres.chantier_name,
          societe.nom_societe,
          (response) => {
            console.log("✅ Téléchargement automatique réussi:", response);
            alert("✅ Devis téléchargé automatiquement dans le Drive !");
          },
          (error) => {
            console.error(
              "❌ Erreur lors du téléchargement automatique:",
              error
            );
            alert(
              "❌ Erreur lors du téléchargement automatique. Vous pouvez le faire manuellement."
            );
          }
        );
      } else {
        console.log(
          "ℹ️ Ce devis n'est pas un devis de chantier ou n'a pas d'appel d'offres associé"
        );
      }
    } catch (error) {
      console.error("❌ Erreur lors du téléchargement automatique:", error);
    }
  };

  // Ajouter un nouvel useEffect pour réagir aux changements de devis
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const numeroFilter = urlParams.get("numero");

    if (numeroFilter && devis.length > 0) {
      const filtered = devis.filter((devis) =>
        devis.numero?.toLowerCase().includes(numeroFilter.toLowerCase())
      );
      setFilteredDevis(filtered);
    }
  }, [devis]);

  const fetchDevis = async () => {
    try {
      const response = await axios.get("/api/devisa/");
      const newDevis = response.data;

      // Détecter les nouveaux devis (ceux qui n'étaient pas dans la liste précédente)
      const previousDevisIds = devis.map((d) => d.id);
      const newlyCreatedDevis = newDevis.filter(
        (d) => !previousDevisIds.includes(d.id)
      );

      console.log("🔍 DEBUG - État précédent:", previousDevisIds);
      console.log("🔍 DEBUG - Nouveaux devis détectés:", newlyCreatedDevis);

      setDevis(newDevis);
      setFilteredDevis(newDevis);

      // Seulement traiter les nouveaux devis si on avait déjà une liste précédente
      // ET si ce n'est pas le premier chargement de la page
      if (
        newlyCreatedDevis.length > 0 &&
        previousDevisIds.length > 0 &&
        isInitialized
      ) {
        const chantierDevis = newlyCreatedDevis.filter(
          (d) => d.devis_chantier === true
        );
        if (chantierDevis.length > 0) {
          console.log(
            `🚀 ${chantierDevis.length} nouveau(x) devis de chantier détecté(s), téléchargement automatique...`
          );
          // Attendre un peu pour que l'interface se stabilise
          setTimeout(() => {
            // Traiter tous les devis de chantier trouvés
            chantierDevis.forEach((devis, index) => {
              // Délai progressif pour éviter les conflits (1s, 2s, 3s, etc.)
              setTimeout(() => {
                console.log(
                  `📄 Traitement du devis ${index + 1}/${
                    chantierDevis.length
                  }: ${devis.numero}`
                );
                handleAutoDownloadForNewDevis(devis);
              }, index * 1000); // 1 seconde entre chaque devis
            });
          }, 1000);
        }
      } else if (!isInitialized) {
        console.log("ℹ️ Premier chargement - initialisation terminée");
        setIsInitialized(true);
      } else {
        console.log("ℹ️ Aucun nouveau devis détecté");
      }
    } catch (error) {
      console.error("Erreur lors du chargement des devis:", error);
    }
  };

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);

    let filtered = devis.filter((devis) => {
      return Object.keys(newFilters).every((key) => {
        if (!newFilters[key] || newFilters[key] === "Tous") return true;

        switch (key) {
          case "numero":
            return devis.numero
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());

          case "chantier_name":
            return devis.chantier_name
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());

          case "client_name":
            return devis.client_name
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());

          case "date_creation":
            if (!newFilters[key]) return true;
            // Convertir la date du devis au format YYYY-MM-DD pour la comparaison
            const devisDate = new Date(devis.date_creation)
              .toISOString()
              .split("T")[0];
            return devisDate === newFilters[key];

          case "price_ttc":
            const devisPrice = devis.price_ttc?.toString() || "";
            return devisPrice.includes(newFilters[key]);

          case "status":
            return devis.status === newFilters[key];

          default:
            return true;
        }
      });
    });

    setFilteredDevis(filtered);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sorted = [...filteredDevis].sort((a, b) => {
      if (property === "date_creation") {
        return (
          (isAsc ? 1 : -1) *
          (new Date(a[property]).getTime() - new Date(b[property]).getTime())
        );
      }
      if (property === "price_ttc") {
        return (
          (isAsc ? 1 : -1) * (parseFloat(a[property]) - parseFloat(b[property]))
        );
      }
      return (isAsc ? 1 : -1) * (a[property] < b[property] ? -1 : 1);
    });

    setFilteredDevis(sorted);
  };

  const handlePreviewDevis = (devisId) => {
    const previewUrl = `/api/preview-saved-devis/${devisId}/`;
    window.open(previewUrl, "_blank");
  };

  const handleMoreClick = (event, devis) => {
    setAnchorEl(event.currentTarget);
    setSelectedDevis(devis);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModifyDevis = () => {
    if (selectedDevis) {
      if (selectedDevis.status !== "En attente") {
        alert("Seuls les devis en attente peuvent être modifiés");
        handleClose();
        return;
      }
      window.location.href = `/ModificationDevis/${selectedDevis.id}`;
    }
    handleClose();
  };

  const handleConvertToInvoice = () => {
    // À implémenter
    handleClose();
  };

  const handleChangeStatus = () => {
    setDevisToUpdate(selectedDevis);
    setShowStatusModal(true);
    handleClose();
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      if (!devisToUpdate) return;

      // Si on change l'état depuis "Validé", vérifier les factures associées
      if (devisToUpdate.status === "Validé" && newStatus !== "Validé") {
        const response = await axios.get(
          `/api/list-devis/${devisToUpdate.id}/factures/`
        );
        const factures = response.data;

        if (factures.length > 0) {
          // Stocker l'ID du devis dans facturesToDelete
          setFacturesToDelete(
            factures.map((f) => ({
              ...f,
              devisId: devisToUpdate.id,
            }))
          );
          setNewStatus(newStatus);
          setDeleteFacturesModalOpen(true);
          setShowStatusModal(false);
          return;
        }
      }

      await updateDevisStatus(newStatus);
    } catch (error) {
      console.error("Erreur lors de la modification du statut:", error);
      alert("Erreur lors de la modification du statut");
    }
  };

  const updateDevisStatus = async (status) => {
    try {
      await axios.put(`/api/list-devis/${devisToUpdate.id}/update_status/`, {
        status: status,
      });

      setDevis(
        devis.map((d) =>
          d.id === devisToUpdate.id ? { ...d, status: status } : d
        )
      );
      setFilteredDevis(
        filteredDevis.map((d) =>
          d.id === devisToUpdate.id ? { ...d, status: status } : d
        )
      );

      setShowStatusModal(false);
      setDevisToUpdate(null);
      setNewStatus(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  const handleConfirmDeleteFactures = async () => {
    try {
      if (facturesToDelete.length === 0) return;

      // Récupérer l'ID du devis depuis la première facture
      const devisId = facturesToDelete[0].devisId;
      const statusToUpdate = newStatus;

      // Supprimer toutes les factures associées
      await Promise.all(
        facturesToDelete.map((facture) =>
          axios.delete(`/api/facture/${facture.id}/`)
        )
      );

      // Mettre à jour le statut du devis
      await axios.put(`/api/list-devis/${devisId}/update_status/`, {
        status: statusToUpdate,
      });

      // Mettre à jour l'état local
      setDevis(
        devis.map((d) =>
          d.id === devisId ? { ...d, status: statusToUpdate } : d
        )
      );
      setFilteredDevis(
        filteredDevis.map((d) =>
          d.id === devisId ? { ...d, status: statusToUpdate } : d
        )
      );

      // Message de succès
      const nombreFactures = facturesToDelete.length;
      const message =
        nombreFactures === 1
          ? `La facture ${facturesToDelete[0].numero} a été supprimée avec succès.`
          : `${nombreFactures} factures ont été supprimées avec succès.`;
      alert(message);

      // Réinitialiser les états
      setDeleteFacturesModalOpen(false);
      setFacturesToDelete([]);
      setDevisToUpdate(null);
      setNewStatus(null);
      setShowStatusModal(false);
    } catch (error) {
      console.error("Erreur lors de la suppression des factures:", error);
      alert("Erreur lors de la suppression des factures");
    }
  };

  const handleDeleteDevis = () => {
    setDeleteModalOpen(true);
    handleClose();
  };

  const handleConfirmDelete = async () => {
    try {
      if (!selectedDevis) {
        console.error("Aucun devis sélectionné");
        return;
      }

      // Vérifier que l'URL correspond à celle définie dans urls.py
      await axios.delete(`/api/devis/${selectedDevis.id}/`);

      // Mettre à jour l'état local
      setDevis((prevDevis) =>
        prevDevis.filter((d) => d.id !== selectedDevis.id)
      );
      setFilteredDevis((prevFiltered) =>
        prevFiltered.filter((d) => d.id !== selectedDevis.id)
      );

      setDeleteModalOpen(false);
      setSelectedDevis(null);
    } catch (error) {
      console.error("Erreur lors de la suppression du devis:", error);
      alert("Erreur lors de la suppression du devis");
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setSelectedDevis(null);
  };

  const handleTransformDevis = async (devis, type) => {
    try {
      if (type === "TS") {
        const devisResponse = await axios.get(`/api/devisa/${devis.id}/`);
        const devisComplet = devisResponse.data;
        console.log("Devis complet:", devisComplet);

        // Vérifier que ce n'est PAS un devis de chantier
        if (devisComplet.devis_chantier === true) {
          alert("Les devis de chantier ne peuvent pas être transformés en TS");
          return;
        }

        // Vérifier si une facture existe déjà
        if (devisComplet.factures && devisComplet.factures.length > 0) {
          alert(`Une facture existe déjà pour le devis ${devisComplet.numero}`);
          return;
        }

        const response = await axios.get(
          `/api/chantier/${devisComplet.chantier}/`
        );
        setSelectedChantier(response.data);
        setSelectedDevisForTS(devisComplet);
        setTsModalOpen(true);
      } else if (type === "CIE") {
        const devisResponse = await axios.get(`/api/devisa/${devis.id}/`);
        const devisComplet = devisResponse.data;

        // Vérifier si une facture existe déjà
        if (devisComplet.factures && devisComplet.factures.length > 0) {
          alert(`Une facture existe déjà pour le devis ${devisComplet.numero}`);
          return;
        }

        const response = await axios.get(
          `/api/chantier/${devisComplet.chantier}/`
        );
        setSelectedChantier(response.data);
        setSelectedDevisForCIE(devisComplet);
        setCieModalOpen(true);
      } else {
        // Pour la facture classique
        setSelectedDevis(devis);
        setFactureModalOpen(true);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);

      // Afficher un message d'erreur plus détaillé
      if (error.response?.data?.error) {
        alert(`Erreur : ${error.response.data.error}`);
      } else if (error.response?.status === 400) {
        alert(
          "Erreur : La facture ne peut pas être créée car elle existe déjà ou le numéro est déjà utilisé."
        );
      } else {
        alert(
          "Erreur lors de la préparation de la transformation. Veuillez réessayer."
        );
      }
    }
  };

  const handleTSModalClose = () => {
    setTsModalOpen(false);
    setSelectedDevisForTS(null);
    setSelectedChantier(null);
    // Rafraîchir la liste des devis après la création d'un TS
    fetchDevis();
  };

  const handleCIEModalClose = () => {
    setCieModalOpen(false);
    setSelectedDevisForCIE(null);
    setSelectedChantier(null);
    // Rafraîchir la liste des devis après la création d'une facture CIE
    fetchDevis();
  };

  const handleFactureModalClose = () => {
    setFactureModalOpen(false);
    setSelectedDevis(null);
  };

  const handleFactureSubmit = async (factureData) => {
    try {
      console.log("Données envoyées:", factureData);
      const response = await axios.post("/api/facture/", factureData);

      // Message de succès
      alert(`La facture ${response.data.numero} a été créée avec succès.`);

      // Ouvrir la prévisualisation dans un nouvel onglet
      const previewUrl = `/api/preview-facture/${response.data.id}/`;
      window.open(previewUrl, "_blank");

      handleFactureModalClose();
      fetchDevis();
    } catch (error) {
      console.error(
        "Erreur lors de la création de la facture:",
        error.response?.data || error
      );
      alert(
        "Erreur lors de la création de la facture. Veuillez vérifier les données."
      );
    }
  };

  const handleGeneratePDF = async (devis) => {
    try {
      console.log("Tentative de génération du PDF pour le devis:", devis.id);

      // Appel à l'API existante
      const response = await axios.post(
        "/api/generate-pdf-from-preview/",
        {
          devis_id: devis.id,
          // Ajoutons des logs pour déboguer
          preview_url: `/api/preview-saved-devis/${devis.id}/`,
        },
        {
          responseType: "blob",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Vérifier si la réponse est bien un PDF
      if (response.headers["content-type"] === "application/pdf") {
        // Créer un URL pour le blob
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);

        // Créer un lien temporaire pour télécharger le PDF
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `devis-${devis.numero}.pdf`;
        document.body.appendChild(link);
        link.click();

        // Nettoyer
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);
      } else {
        // Si ce n'est pas un PDF, c'est probablement une erreur
        const reader = new FileReader();
        reader.onload = function () {
          const errorMessage = JSON.parse(reader.result);
          console.error("Erreur serveur:", errorMessage);
          alert(`Erreur: ${errorMessage.error || "Erreur inconnue"}`);
        };
        reader.readAsText(response.data);
      }
    } catch (error) {
      console.error("Erreur détaillée:", error.response?.data);
      console.error("Status:", error.response?.status);
      console.error("Headers:", error.response?.headers);
      alert(
        "Erreur lors de la génération du PDF. Vérifiez la console pour plus de détails."
      );
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        width: "100%",
        maxWidth: "1400px",
        height: "auto",
        padding: "20px",
        paddingBottom: "70px",
        borderRadius: "10px",
        boxShadow: "6px 7px 20px -6px rgba(33, 33, 33, 1)",
        margin: "20px auto",
      }}
    >
      <StyledBox>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontFamily: "Merriweather, serif",
            position: "relative",
            marginBottom: "20px",
          }}
        >
          Liste des Devis
        </Typography>

        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow></TableRow>
              <TableRow>
                <FilterCell>
                  <StyledTextField
                    label="Numéro"
                    variant="standard"
                    value={filters.numero}
                    onChange={handleFilterChange("numero")}
                  />
                </FilterCell>
                <FilterCell>
                  <StyledTextField
                    label="Chantier"
                    variant="standard"
                    value={filters.chantier_name}
                    onChange={handleFilterChange("chantier_name")}
                  />
                </FilterCell>
                <FilterCell>
                  <StyledTextField
                    label="Client"
                    variant="standard"
                    value={filters.client_name}
                    onChange={handleFilterChange("client_name")}
                  />
                </FilterCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "date_creation"}
                    direction={orderBy === "date_creation" ? order : "asc"}
                    onClick={() => handleSort("date_creation")}
                    sx={{ textAlign: "center" }}
                  >
                    <CenteredTextField
                      variant="standard"
                      type="date"
                      value={filters.date_creation}
                      onChange={handleFilterChange("date_creation")}
                      InputLabelProps={{ shrink: true }}
                      sx={{ pt: "15px" }}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "price_ttc"}
                    direction={orderBy === "price_ttc" ? order : "asc"}
                    onClick={() => handleSort("price_ttc")}
                    sx={{ textAlign: "center" }}
                  >
                    <PriceTextField
                      label="Prix TTC"
                      variant="standard"
                      value={filters.price_ttc}
                      onChange={handleFilterChange("price_ttc")}
                      sx={{
                        maxWidth: "60px", // Limite la largeur maximale
                        minWidth: "40px", // Assure une largeur minimale
                        "& input": {
                          textAlign: "center",
                        },
                      }}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <FilterCell>
                  <StyledSelect
                    value={filters.status}
                    onChange={handleFilterChange("status")}
                    variant="standard"
                    sx={{ pt: "10px" }}
                  >
                    <MenuItem value="Tous">Tous</MenuItem>
                    {statusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </StyledSelect>
                </FilterCell>
                <FilterCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDevis.map((devis) => (
                <React.Fragment key={devis.id}>
                  <TableRow>
                    <DevisNumber
                      onClick={() => handlePreviewDevis(devis.id)}
                      style={{ cursor: "pointer", fontWeight: 700 }}
                    >
                      {devis.numero}
                    </DevisNumber>
                    <ChantierCell>{devis.chantier_name}</ChantierCell>
                    <CenteredTableCell>{devis.client_name}</CenteredTableCell>
                    <CenteredTableCell>
                      {new Date(devis.date_creation).toLocaleDateString()}
                    </CenteredTableCell>
                    <CenteredTableCell
                      style={{ fontWeight: 600, color: green[500] }}
                    >
                      {formatNumber(devis.price_ttc)} €
                    </CenteredTableCell>
                    <StatusCell status={devis.status}>
                      {devis.status}
                    </StatusCell>
                    <CenteredTableCell
                      sx={{
                        width: "60px",
                        padding: "0 8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ButtonGroup
                        variant="outlined"
                        size="small"
                        aria-label="actions button group"
                        sx={{
                          paddingTop: "10px",
                          "& .MuiButtonGroup-grouped": {
                            minWidth: "35px",
                            padding: "4px",
                            border: "none",
                            "&:hover": {
                              backgroundColor: "rgba(0, 0, 0, 0.04)",
                            },
                          },
                        }}
                      >
                        <Button
                          onClick={(e) => handleMoreClick(e, devis)}
                          sx={{
                            backgroundColor: "rgba(0, 0, 0, 0.04)",
                            "&:hover": {
                              backgroundColor: "rgba(0, 0, 0, 0.08)",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            },
                          }}
                        >
                          <TfiMore size={16} color="#666" />
                        </Button>
                        <Button
                          onClick={() => handleGeneratePDF(devis)}
                          sx={{
                            color: "primary.main",
                            "&:hover": {
                              backgroundColor: "rgba(25, 118, 210, 0.04)",
                            },
                          }}
                        >
                          <AiFillFilePdf style={{ fontSize: "24px" }} />
                        </Button>
                      </ButtonGroup>
                    </CenteredTableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      </StyledBox>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem
          onClick={() => {
            handleClose();
            navigate(`/ModificationDevis/${selectedDevis?.id}`);
          }}
        >
          Modifier le devis
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            handleTransformDevis(selectedDevis, "facture");
          }}
        >
          Éditer en facture
        </MenuItem>
        {selectedDevis && selectedDevis.devis_chantier !== true && (
          <MenuItem
            onClick={() => {
              handleClose();
              handleTransformDevis(selectedDevis, "TS");
            }}
          >
            Éditer en avenant
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            handleClose();
            handleTransformDevis(selectedDevis, "CIE");
          }}
        >
          Éditer en CIE
        </MenuItem>
        <MenuItem onClick={handleChangeStatus}>Modifier l'état</MenuItem>
        <MenuItem onClick={handleDeleteDevis} sx={{ color: "error.main" }}>
          Supprimer
        </MenuItem>
        <MenuItem
          onClick={async () => {
            handleClose();
            try {
              // Récupérer le devis complet avec tous ses champs
              const response = await axios.get(
                `/api/devisa/${selectedDevis.id}/`
              );
              const devisComplet = response.data;

              if (devisComplet.devis_chantier === true) {
                const chantierResponse = await axios.get(
                  `/api/chantier/${devisComplet.chantier}/`
                );
                setSelectedChantier(chantierResponse.data);
                setSelectedDevisForSituation(devisComplet);
                setSituationModalOpen(true);
              } else {
                alert(
                  "Seuls les devis de chantier peuvent avoir des situations"
                );
              }
            } catch (error) {
              console.error("Erreur lors du chargement des données:", error);
              alert("Erreur lors du chargement des données");
            }
          }}
        >
          <FaClipboardList style={{ marginRight: "8px" }} />
          Créer une situation
        </MenuItem>

        {/* Bouton de test pour la génération PDF Drive (ancien système) */}
        {selectedDevis && selectedDevis.devis_chantier === true && (
          <MenuItem
            onClick={async () => {
              handleClose();
              try {
                console.log(
                  "🧪 TEST: Génération PDF Drive pour devis de chantier (ancien système)"
                );

                // Récupérer les données complètes du devis
                const response = await axios.get(
                  `/api/devisa/${selectedDevis.id}/`
                );
                const devisComplet = response.data;

                console.log("📋 Données du devis complet:", devisComplet);
                console.log(
                  "📋 Champ appel_offres:",
                  devisComplet.appel_offres
                );
                console.log(
                  "📋 Type de appel_offres:",
                  typeof devisComplet.appel_offres
                );

                // Vérifier si appel_offres existe
                if (!devisComplet.appel_offres) {
                  console.error(
                    "❌ ERREUR: Le champ appel_offres est undefined ou null"
                  );
                  alert(
                    "❌ ERREUR: Ce devis n'est pas lié à un appel d'offres. Vérifiez que c'est bien un devis de chantier."
                  );
                  return;
                }

                // Récupérer les données de l'appel d'offres
                console.log(
                  `🔍 Récupération de l'appel d'offres: /api/appels-offres/${devisComplet.appel_offres}/`
                );

                const appelOffresResponse = await axios.get(
                  `/api/appels-offres/${devisComplet.appel_offres}/`
                );
                const appelOffres = appelOffresResponse.data;
                console.log("📋 Données de l'appel d'offres:", appelOffres);

                // Récupérer les données de la société
                let societe;
                if (
                  typeof appelOffres.societe === "object" &&
                  appelOffres.societe.id
                ) {
                  // La société est déjà un objet complet
                  societe = appelOffres.societe;
                  console.log(
                    "📋 Données de la société (déjà récupérées):",
                    societe
                  );
                } else {
                  // La société est juste un ID, on doit la récupérer
                  const societeResponse = await axios.get(
                    `/api/societe/${appelOffres.societe}/`
                  );
                  societe = societeResponse.data;
                  console.log(
                    "📋 Données de la société (récupérées via API):",
                    societe
                  );
                }

                // Lancer la génération PDF avec les notifications
                await generateDevisMarchePDFDrive(
                  devisComplet.id, // ID du devis
                  appelOffres.id, // ID de l'appel d'offres
                  appelOffres.chantier_name,
                  societe.nom_societe,
                  (response) => {
                    console.log("✅ TEST: PDF généré avec succès", response);
                    alert("✅ TEST: PDF généré avec succès dans le Drive !");
                  },
                  (error) => {
                    console.error(
                      "❌ TEST: Erreur lors de la génération du PDF:",
                      error
                    );
                    alert(
                      `❌ TEST: Erreur lors de la génération du PDF: ${error.message}`
                    );
                  }
                );
              } catch (error) {
                console.error(
                  "❌ TEST: Erreur lors de la récupération des données:",
                  error
                );
                alert(
                  `❌ TEST: Erreur lors de la récupération des données: ${error.message}`
                );
              }
            }}
          >
            📁 Télécharger Drive (ANCIEN)
          </MenuItem>
        )}

        {/* Bouton de test pour le nouveau système universel */}
        {selectedDevis && selectedDevis.devis_chantier === true && (
          <MenuItem
            onClick={async () => {
              handleClose();
              try {
                console.log(
                  "🚀 NOUVEAU: Génération PDF Drive avec le système universel"
                );

                // Récupérer les données complètes du devis
                const response = await axios.get(
                  `/api/devisa/${selectedDevis.id}/`
                );
                const devisComplet = response.data;

                console.log("📋 Données du devis complet:", devisComplet);

                // Vérifier si appel_offres existe
                if (!devisComplet.appel_offres) {
                  console.error(
                    "❌ ERREUR: Le champ appel_offres est undefined ou null"
                  );
                  alert(
                    "❌ ERREUR: Ce devis n'est pas lié à un appel d'offres. Vérifiez que c'est bien un devis de chantier."
                  );
                  return;
                }

                // Récupérer les données de l'appel d'offres
                const appelOffresResponse = await axios.get(
                  `/api/appels-offres/${devisComplet.appel_offres}/`
                );
                const appelOffres = appelOffresResponse.data;

                // Récupérer les données de la société
                let societe;
                if (
                  typeof appelOffres.societe === "object" &&
                  appelOffres.societe.id
                ) {
                  societe = appelOffres.societe;
                } else {
                  const societeResponse = await axios.get(
                    `/api/societe/${appelOffres.societe}/`
                  );
                  societe = societeResponse.data;
                }

                // Utiliser le nouveau système universel
                await generatePDFDrive(
                  "devis_chantier",
                  {
                    devisId: devisComplet.id,
                    appelOffresId: appelOffres.id,
                    appelOffresName: appelOffres.chantier_name,
                    societeName: societe.nom_societe,
                    numero: devisComplet.numero,
                  },
                  {
                    onSuccess: (response) => {
                      console.log(
                        "✅ NOUVEAU: PDF généré avec succès",
                        response
                      );
                      alert(
                        "✅ NOUVEAU: PDF généré avec succès dans le Drive !"
                      );
                    },
                    onError: (error) => {
                      console.error(
                        "❌ NOUVEAU: Erreur lors de la génération du PDF:",
                        error
                      );
                      alert(
                        `❌ NOUVEAU: Erreur lors de la génération du PDF: ${error.message}`
                      );
                    },
                  }
                );
              } catch (error) {
                console.error(
                  "❌ NOUVEAU: Erreur lors de la récupération des données:",
                  error
                );
                alert(
                  `❌ NOUVEAU: Erreur lors de la récupération des données: ${error.message}`
                );
              }
            }}
          >
            🚀 Télécharger Drive (NOUVEAU)
          </MenuItem>
        )}
      </Menu>

      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setDevisToUpdate(null);
        }}
        currentStatus={devisToUpdate?.status}
        onStatusChange={handleStatusUpdate}
        type="devis"
        title="Modifier l'état du devis"
      />

      <TransformationTSModal
        open={tsModalOpen}
        onClose={handleTSModalClose}
        devis={selectedDevisForTS}
        chantier={selectedChantier}
      />

      <TransformationCIEModal
        open={cieModalOpen}
        onClose={handleCIEModalClose}
        devis={selectedDevisForCIE}
        chantier={selectedChantier}
      />

      <Modal
        open={factureModalOpen}
        onClose={handleFactureModalClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 1,
          }}
        >
          <CreationFacture
            devis={selectedDevis}
            onClose={handleFactureModalClose}
            onSubmit={handleFactureSubmit}
          />
        </Box>
      </Modal>

      <Modal
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        aria-labelledby="delete-modal-title"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography
            id="delete-modal-title"
            variant="h6"
            component="h2"
            gutterBottom
          >
            Confirmer la suppression
          </Typography>
          <Typography variant="body1" gutterBottom>
            Êtes-vous sûr de vouloir supprimer le devis {selectedDevis?.numero}{" "}
            ?
          </Typography>
          <Box
            sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}
          >
            <Button variant="outlined" onClick={handleCloseDeleteModal}>
              Annuler
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDelete}
            >
              Supprimer
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal
        open={deleteFacturesModalOpen}
        onClose={() => {
          setDeleteFacturesModalOpen(false);
          setFacturesToDelete([]);
          setNewStatus(null);
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" component="h2" gutterBottom>
            Attention !
          </Typography>
          <Typography sx={{ mt: 2 }}>
            Le changement d'état de ce devis entraînera la suppression des
            factures suivantes :
          </Typography>
          <Box sx={{ mt: 2, mb: 2 }}>
            {facturesToDelete.map((facture) => (
              <Typography key={facture.id} sx={{ color: "error.main" }}>
                • {facture.numero}
              </Typography>
            ))}
          </Box>
          <Typography sx={{ mt: 2, mb: 3 }}>Voulez-vous continuer ?</Typography>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              onClick={() => {
                setDeleteFacturesModalOpen(false);
                setFacturesToDelete([]);
                setNewStatus(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDeleteFactures}
            >
              Confirmer
            </Button>
          </Box>
        </Box>
      </Modal>

      <CreationSituation
        open={situationModalOpen}
        onClose={() => {
          setSituationModalOpen(false);
          setSelectedDevisForSituation(null);
        }}
        devis={selectedDevisForSituation}
        chantier={selectedChantier}
      />
    </div>
  );
};

export default ListeDevis;
