import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";

import { FaEyeSlash } from "react-icons/fa";
import { RiPencilFill } from "react-icons/ri";
import ChantierForm from "./ChantierForm";
import ClientInfoModal from "./ClientInfoModal";
import ClientTypeModal from "./ClientTypeModal";
import CreatePartieModal from "./CreatePartieModal";
import DevisModal from "./DevisModal";
import EditModal from "./EditModal";
import SelectSocieteModal from "./SelectSocieteModal";
import SocieteInfoModal from "./SocieteInfoModal";

const CreationDevis = () => {
  const [hiddenParties, setHiddenParties] = useState([]);
  const [hiddenSousParties, setHiddenSousParties] = useState([]);
  const [hiddenLignes, setHiddenLignes] = useState([]);

  const [chantiers, setChantiers] = useState([]);
  const [selectedChantierId, setSelectedChantierId] = useState("");
  const [parties, setParties] = useState([]);
  const [selectedParties, setSelectedParties] = useState([]);
  const [sousParties, setSousParties] = useState([]);
  const [filteredSousParties, setFilteredSousParties] = useState([]);
  const [selectedSousParties, setSelectedSousParties] = useState([]);
  const [allLignesDetails, setAllLignesDetails] = useState([]);
  const [filteredLignesDetails, setFilteredLignesDetails] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [customPrices, setCustomPrices] = useState({});
  const [showCreationPartie, setShowCreationPartie] = useState(false); // État pour afficher ou masquer CreationPartie.js
  const [isPreviewed, setIsPreviewed] = useState(false); // Nouvel état pour savoir si le devis a été prévisualisé
  const [devisType, setDevisType] = useState("normal"); // 'normal' ou 'chantier'
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientData, setClientData] = useState({
    id: null,
    name: "",
    surname: "",
    client_mail: "",
    phone_Number: "",
    societe: {
      nom_societe: "",
      ville_societe: "",
      rue_societe: "",
      codepostal_societe: "",
    },
  });
  const [societeId, setSocieteId] = useState(null);
  const [showClientTypeModal, setShowClientTypeModal] = useState(false);

  const [showExistingClientForm, setShowExistingClientForm] = useState(false);
  const [showSelectSocieteModal, setShowSelectSocieteModal] = useState(false);
  const [selectedSocieteId, setSelectedSocieteId] = useState(null);
  const [selectedLignes, setSelectedLignes] = useState([]);
  const [slidingLines, setSlidingLines] = useState([]);
  const [openDevisModal, setOpenDevisModal] = useState(false);
  const [devisModalData, setDevisModalData] = useState({
    numero: "",
    client: "",
    chantier_name: "",
    montant_ttc: "",
    description: "",
  });
  const [openCreatePartieModal, setOpenCreatePartieModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [slidingParties, setSlidingParties] = useState([]);
  const [slidingSousParties, setSlidingSousParties] = useState([]);
  const [slidingLignes, setSlidingLignes] = useState([]);
  const [showClientInfoModal, setShowClientInfoModal] = useState(false);
  const [showSocieteInfoModal, setShowSocieteInfoModal] = useState(false);
  const [pendingChantierData, setPendingChantierData] = useState({
    client: null,
    societe: null,
    chantier: {
      id: -1, // ID temporaire
      chantier_name: "",
      ville: "",
      rue: "",
      code_postal: "",
    },
    devis: null,
  });
  const [showChantierForm, setShowChantierForm] = useState(false);

  // Charger les chantiers
  useEffect(() => {
    axios
      .get("/api/chantier/")
      .then((response) => {
        setChantiers(response.data);
      })
      .catch((error) => {
        console.error("Erreur lors du chargement des chantiers", error);
      });
  }, []);

  // Charger les parties liées au chantier sélectionné
  useEffect(() => {
    if (selectedChantierId) {
      axios
        .get("/api/parties/", { params: { chantier: selectedChantierId } })
        .then((response) => {
          setParties(response.data);
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des parties", error);
        });
    }
  }, [selectedChantierId]);

  // Charger toutes les sous-parties
  useEffect(() => {
    axios
      .get("/api/sous-parties/")
      .then((response) => {
        setSousParties(response.data);
      })
      .catch((error) => {
        console.error("Erreur lors du chargement des sous-parties", error);
      });
  }, []);

  // Filtrer les sous-parties en fonction des parties sélectionnées
  useEffect(() => {
    if (selectedParties.length > 0) {
      const filtered = sousParties.filter((sousPartie) =>
        selectedParties.includes(sousPartie.partie)
      );
      setFilteredSousParties(filtered);
    } else {
      setFilteredSousParties([]);
    }
  }, [selectedParties, sousParties]);

  const handlePartiesChange = (partieId) => {
    setIsPreviewed(false); // Annuler l'état de prévisualisation si des modifications sont faites
    const isSelected = selectedParties.includes(partieId);
    if (isSelected) {
      setSelectedParties(selectedParties.filter((id) => id !== partieId));
    } else {
      setSelectedParties([...selectedParties, partieId]);
    }
  };

  const handleSousPartiesChange = (sousPartieId) => {
    setIsPreviewed(false); // Annuler l'état de prévisualisation si des modifications sont faites
    const isSelected = selectedSousParties.includes(sousPartieId);
    if (isSelected) {
      setSelectedSousParties(
        selectedSousParties.filter((id) => id !== sousPartieId)
      );
    } else {
      setSelectedSousParties([...selectedSousParties, sousPartieId]);
    }
  };

  // Charger les lignes de détail basées sur les sous-parties sélectionnées
  useEffect(() => {
    if (selectedSousParties.length > 0) {
      axios
        .get("/api/ligne-details/")
        .then((response) => {
          setAllLignesDetails(response.data);
        })
        .catch((error) => {
          console.error(
            "Erreur lors du chargement des lignes de détail",
            error
          );
        });
    } else {
      setAllLignesDetails([]);
    }
  }, [selectedSousParties]);

  useEffect(() => {
    const filtered = allLignesDetails.filter((ligne) =>
      selectedSousParties.includes(ligne.sous_partie)
    );
    setFilteredLignesDetails(filtered);
  }, [allLignesDetails, selectedSousParties]);

  const handleQuantityChange = (ligneId, quantity) => {
    setIsPreviewed(false); // Annuler l'état de prévisualisation si des modifications sont faites
    setQuantities({ ...quantities, [ligneId]: quantity });
  };

  const handlePriceChange = (ligneId, price) => {
    setIsPreviewed(false); // Annuler l'état de prévisualisation si des modifications sont faites
    setCustomPrices({ ...customPrices, [ligneId]: price });
  };

  // Fonction pour prévisualiser le devis
  const handlePreviewDevis = () => {
    const devisData = {
      chantier: selectedChantierId,
      parties: selectedParties,
      sous_parties: selectedSousParties,
      lignes_details: filteredLignesDetails.map((ligne) => ({
        id: ligne.id,
        description: ligne.description,
        unite: ligne.unite,
        quantity: quantities[ligne.id] || 0,
        custom_price: customPrices[ligne.id] || ligne.prix,
      })),
    };

    if (selectedChantierId === -1) {
      console.log("=== Données temporaires avant envoi ===");
      console.log("Client:", pendingChantierData.client);
      console.log("Société:", pendingChantierData.societe);
      console.log("Chantier:", pendingChantierData.chantier);
      console.log("pendingChantierData complet:", pendingChantierData);
      console.log("================================");

      devisData.tempData = {
        client: {
          name: pendingChantierData.client?.name || "Non renseigné",
          surname: pendingChantierData.client?.surname || "",
          phone_Number:
            pendingChantierData.client?.phone_Number || "Non renseigné",
          client_mail:
            pendingChantierData.client?.client_mail || "Non renseigné",
        },
        societe: {
          nom_societe:
            pendingChantierData.societe?.nom_societe || "Non renseigné",
          ville_societe:
            pendingChantierData.societe?.ville_societe || "Non renseigné",
          rue_societe:
            pendingChantierData.societe?.rue_societe || "Non renseigné",
          codepostal_societe:
            pendingChantierData.societe?.codepostal_societe || "Non renseigné",
        },
        chantier: {
          id: -1,
          chantier_name:
            pendingChantierData.chantier?.chantier_name || "Non renseigné",
          ville: pendingChantierData.chantier?.ville || "Non renseigné",
          rue: pendingChantierData.chantier?.rue || "Non renseigné",
          code_postal:
            pendingChantierData.chantier?.code_postal || "Non renseigné",
        },
      };

      console.log("=== Données envoyées au serveur ===");
      console.log("devisData.tempData:", devisData.tempData);
      console.log("================================");
    }

    const queryString = encodeURIComponent(JSON.stringify(devisData));
    const previewUrl = `/api/preview-devis/?devis=${queryString}`;
    window.open(previewUrl, "_blank");
    setIsPreviewed(true);
  };

  // Ajouter un effet pour nettoyer les données temporaires
  useEffect(() => {
    const cleanupTempData = () => {
      setPendingChantierData({
        client: null,
        societe: null,
        chantier: null,
        devis: null,
      });
    };

    // Nettoyer lors du démontage du composant
    return () => cleanupTempData();
  }, []);

  // Modifier le gestionnaire onSubmit du ClientSocieteForm
  const handleClientFormSubmit = (newSocieteId) => {
    setSocieteId(newSocieteId);
    setShowClientForm(false);
  };

  // Modifier handleSaveDevis
  const handleSaveDevis = async () => {
    try {
      if (!selectedChantierId) {
        alert("Veuillez sélectionner un chantier");
        return;
      }

      if (devisType === "chantier") {
        // Code existant pour le devis chantier
        let clientId, societeId;
        const clientResponse = await axios.get("/api/client/", {
          params: { client_mail: pendingChantierData.client.client_mail },
        });
        // ... reste du code existant pour le devis chantier
      } else {
        // Nouveau code pour le devis normal
        const devisResponse = await axios.post("/api/create-devis/", {
          numero: `DEV-${Date.now()}`,
          chantier: selectedChantierId,
          price_ht: calculateGrandTotal(),
          description: "Devis normal",
          parties: selectedParties.map((partieId) => ({
            id: partieId,
            sous_parties: selectedSousParties
              .filter(
                (spId) =>
                  sousParties.find((sp) => sp.id === spId).partie === partieId
              )
              .map((spId) => ({
                id: spId,
                lignes_details: filteredLignesDetails
                  .filter((ligne) => ligne.sous_partie === spId)
                  .map((ligne) => ({
                    id: ligne.id,
                    quantity: quantities[ligne.id] || 0,
                    custom_price: customPrices[ligne.id] || ligne.prix,
                  })),
              })),
          })),
        });

        console.log("Devis créé avec succès:", devisResponse.data);
        alert("Devis enregistré avec succès!");
        resetForm();
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert("Une erreur est survenue lors de la sauvegarde");
    }
  };

  const handleDevisModalSubmit = async () => {
    try {
      const devisData = {
        numero: devisModalData.numero,
        chantier: selectedChantierId,
        client: [selectedSocieteId], // Selon votre modèle
        price_ht: calculateGrandTotal(),
        description: devisModalData.description,
        parties: selectedParties.map((partieId) => ({
          id: partieId,
          sous_parties: selectedSousParties
            .filter(
              (spId) =>
                sousParties.find((sp) => sp.id === spId).partie === partieId
            )
            .map((spId) => ({
              id: spId,
              lignes_details: filteredLignesDetails
                .filter((ligne) => ligne.sous_partie === spId)
                .map((ligne) => ({
                  id: ligne.id,
                  quantity: quantities[ligne.id] || 0,
                  custom_price: customPrices[ligne.id] || ligne.prix,
                })),
            })),
        })),
      };

      const response = await axios.post("/api/create-devis/", devisData);

      setOpenDevisModal(false);
      resetForm();

      // Générer le PDF après la sauvegarde
      const queryString = encodeURIComponent(JSON.stringify(devisData));
      window.open(
        `/api/generate-pdf-from-preview/?devis=${queryString}`,
        "_blank"
      );
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert("Une erreur est survenue lors de la sauvegarde du devis");
    }
  };

  // Ajouter cette fonction de réinitialisation
  const resetForm = () => {
    setClientData({
      id: null,
      name: "",
      surname: "",
      client_mail: "",
      phone_Number: "",
      societe: {
        nom_societe: "",
        ville_societe: "",
        rue_societe: "",
        codepostal_societe: "",
      },
    });
    setSelectedSocieteId(null);
    setSelectedChantierId(null);
    setShowClientForm(false);
    setShowChantierForm(false);
    setShowClientTypeModal(false);
    setShowSelectSocieteModal(false);
    setShowChantierForm(false);
  };

  const handleNewClient = () => {
    setShowClientTypeModal(false);
    setShowClientInfoModal(true);
  };

  const handleExistingClient = () => {
    setShowClientTypeModal(false);
    setShowSelectSocieteModal(true);
  };

  const handleSocieteSelect = async (societeId) => {
    try {
      // Récupérer les données de la société
      const societeResponse = await axios.get(`/api/societe/${societeId}/`);
      const societeData = societeResponse.data;

      // Récupérer les données du client
      const clientResponse = await axios.get(
        `/api/client/${societeData.client_name}/`
      );
      const clientData = clientResponse.data;

      // Mettre à jour pendingChantierData avec les données récupérées
      setPendingChantierData((prev) => ({
        ...prev,
        client: {
          name: clientData.name,
          surname: clientData.surname,
          phone_Number: clientData.phone_Number,
          client_mail: clientData.client_mail,
        },
        societe: {
          nom_societe: societeData.nom_societe,
          ville_societe: societeData.ville_societe,
          rue_societe: societeData.rue_societe,
          codepostal_societe: societeData.codepostal_societe,
        },
      }));

      setSelectedSocieteId(societeId);
      setShowSelectSocieteModal(false);
      setShowChantierForm(true);
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      alert(
        "Erreur lors de la récupération des données du client et de la société"
      );
    }
  };

  const handleLigneSelection = (ligneId) => {
    setSelectedLignes((prev) => {
      const newSelection = prev.includes(ligneId)
        ? prev.filter((id) => id !== ligneId)
        : [...prev, ligneId];

      // Si la ligne vient d'être sélectionnée, on met le focus sur le champ quantité
      if (!prev.includes(ligneId)) {
        // On utilise setTimeout pour s'assurer que le champ existe dans le DOM
        setTimeout(() => {
          const quantityInput = document.querySelector(`#quantity-${ligneId}`);
          if (quantityInput) {
            quantityInput.focus();
          }
        }, 0);
      }

      return newSelection;
    });
  };

  const handleRemoveLigne = (ligneId) => {
    setSlidingLines([...slidingLines, ligneId]);

    // Attendre que l'animation soit terminée avant de cacher la ligne
    setTimeout(() => {
      setHiddenLignes([...hiddenLignes, ligneId]);
      setSlidingLines(slidingLines.filter((id) => id !== ligneId));

      // Si la ligne était sélectionnée, on la désélectionne
      if (selectedLignes.includes(ligneId)) {
        setSelectedLignes(selectedLignes.filter((id) => id !== ligneId));
      }
    }, 300); // Durée de l'animation
  };

  // Ajoutez cette fonction de calcul du prix total
  const calculateTotalPrice = (ligne) => {
    const quantity = quantities[ligne.id] || 0;
    const price = customPrices[ligne.id] || ligne.prix;
    return (quantity * price).toFixed(2);
  };

  const calculateGrandTotal = () => {
    return visibleLignesDetails
      .reduce((total, ligne) => {
        return total + parseFloat(calculateTotalPrice(ligne));
      }, 0)
      .toFixed(2);
  };

  const handlePartieCreated = (createdData) => {
    if (!createdData) return;

    switch (createdData.type) {
      case "partie":
        setParties((prevParties) => [...prevParties, createdData.data]);
        setSousParties((prevSousParties) => [
          ...prevSousParties,
          ...createdData.data.sous_parties,
        ]);

        // Mettre à jour les lignes de détail
        const allNewLignes = createdData.data.sous_parties.flatMap(
          (sp) => sp.lignes_details || []
        );
        setAllLignesDetails((prev) => [...prev, ...allNewLignes]);

        // Mettre à jour les filtres si nécessaire
        if (selectedParties.includes(createdData.data.id)) {
          setFilteredSousParties((prev) => [
            ...prev,
            ...createdData.data.sous_parties,
          ]);
          setFilteredLignesDetails((prev) => [...prev, ...allNewLignes]);
        }
        break;

      case "sousPartie":
        setSousParties((prevSousParties) => [
          ...prevSousParties,
          createdData.data,
        ]);
        if (selectedParties.includes(createdData.data.partie)) {
          setFilteredSousParties((prev) => [...prev, createdData.data]);
        }
        // Ajouter les nouvelles lignes de détail
        if (createdData.data.lignes_details) {
          setAllLignesDetails((prev) => [
            ...prev,
            ...createdData.data.lignes_details,
          ]);
          if (selectedSousParties.includes(createdData.data.id)) {
            setFilteredLignesDetails((prev) => [
              ...prev,
              ...createdData.data.lignes_details,
            ]);
          }
        }
        break;

      case "ligne":
        setAllLignesDetails((prev) => [...prev, createdData.data]);
        if (selectedSousParties.includes(createdData.data.sous_partie)) {
          setFilteredLignesDetails((prev) => [...prev, createdData.data]);
        }
        break;
    }
  };

  const handleEditPartie = (partie) => {
    setItemToEdit({
      ...partie,
      type: "partie",
    });
    setEditModalOpen(true);
  };

  const handleEditSousPartie = (sousPartie) => {
    setItemToEdit({
      ...sousPartie,
      type: "sousPartie",
    });
    setEditModalOpen(true);
  };

  const handleEditLigne = (ligne) => {
    setItemToEdit({
      ...ligne,
      type: "ligne",
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (editedData) => {
    try {
      let endpoint = "";
      let dataToSend = {};

      if (editedData.type === "partie") {
        endpoint = `/api/parties/${editedData.id}/`;
        dataToSend = {
          titre: editedData.titre,
        };
      } else if (editedData.type === "sousPartie") {
        endpoint = `/api/sous-parties/${editedData.id}/`;
        dataToSend = {
          description: editedData.description,
          partie: editedData.partie,
        };
      } else if (editedData.type === "ligne") {
        endpoint = `/api/ligne-details/${editedData.id}/`;
        dataToSend = {
          description: editedData.description,
          unite: editedData.unite,
          prix: editedData.prix,
          sous_partie: editedData.sous_partie,
        };
      }

      const response = await axios.put(endpoint, dataToSend);

      // Mettre à jour les données locales
      if (editedData.type === "partie") {
        setParties(
          parties.map((p) => (p.id === editedData.id ? response.data : p))
        );
      } else if (editedData.type === "sousPartie") {
        setSousParties(
          sousParties.map((sp) =>
            sp.id === editedData.id ? response.data : sp
          )
        );
      } else {
        setAllLignesDetails(
          allLignesDetails.map((l) =>
            l.id === editedData.id ? response.data : l
          )
        );
      }
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      alert("Une erreur est survenue lors de la modification");
    }
  };

  const visibleParties = parties.filter(
    (partie) => !hiddenParties.includes(partie.id)
  );

  const visibleSousParties = filteredSousParties.filter(
    (sousPartie) => !hiddenSousParties.includes(sousPartie.id)
  );

  const visibleLignesDetails = filteredLignesDetails.filter(
    (ligne) => !hiddenLignes.includes(ligne.id)
  );

  // Tri des parties
  const sortedParties = useMemo(() => {
    return [...visibleParties].sort((a, b) => {
      const numA = parseInt(a.titre.match(/^(\d+)-/)?.[1] || "0");
      const numB = parseInt(b.titre.match(/^(\d+)-/)?.[1] || "0");
      if (numA && numB) {
        return numA - numB;
      }
      return a.titre.localeCompare(b.titre, "fr", { sensitivity: "base" });
    });
  }, [visibleParties]);

  // Tri des sous-parties
  const sortedSousParties = useMemo(() => {
    return [...visibleSousParties].sort((a, b) => {
      // Extraire les numéros du début des descriptions s'ils existent
      const numA = parseInt(a.description.match(/^(\d+)-/)?.[1] || "0");
      const numB = parseInt(b.description.match(/^(\d+)-/)?.[1] || "0");

      // Si les deux descriptions commencent par des numéros, trier par numéro
      if (numA && numB) {
        return numA - numB;
      }

      // Sinon, trier alphabétiquement
      return a.description.localeCompare(b.description, "fr", {
        sensitivity: "base",
      });
    });
  }, [visibleSousParties]);

  // Tri des lignes de détail
  const sortedLignesDetails = useMemo(() => {
    return (lignes) => {
      return [...lignes].sort((a, b) => {
        // Extraire les numéros du début des descriptions s'ils existent
        const numA = parseInt(a.description.match(/^(\d+)-/)?.[1] || "0");
        const numB = parseInt(b.description.match(/^(\d+)-/)?.[1] || "0");

        // Si les deux descriptions commencent par des numéros, trier par numéro
        if (numA && numB) {
          return numA - numB;
        }

        // Sinon, trier alphabétiquement
        return a.description.localeCompare(b.description, "fr", {
          sensitivity: "base",
        });
      });
    };
  }, []);

  const handleHidePartie = (partieId) => {
    setSlidingParties([...slidingParties, partieId]);
    setTimeout(() => {
      setHiddenParties([...hiddenParties, partieId]);
      setSelectedParties(selectedParties.filter((id) => id !== partieId));
      setSlidingParties(slidingParties.filter((id) => id !== partieId));
    }, 300);
  };

  const handleHideSousPartie = (sousPartieId) => {
    setSlidingSousParties([...slidingSousParties, sousPartieId]);
    setTimeout(() => {
      setHiddenSousParties([...hiddenSousParties, sousPartieId]);
      setSelectedSousParties(
        selectedSousParties.filter((id) => id !== sousPartieId)
      );
      setSlidingSousParties(
        slidingSousParties.filter((id) => id !== sousPartieId)
      );
    }, 300);
  };

  const handleHideLigne = (ligneId) => {
    setSlidingLignes([...slidingLignes, ligneId]);
    setTimeout(() => {
      setHiddenLignes([...hiddenLignes, ligneId]);
      setSelectedLignes(selectedLignes.filter((id) => id !== ligneId));
      setSlidingLignes(slidingLignes.filter((id) => id !== ligneId));
    }, 300);
  };

  const handleClientInfoSubmit = async () => {
    try {
      // Vérifier si le client existe déjà (par email)
      const clientResponse = await axios.get("/api/client/", {
        params: { client_mail: clientData.client_mail },
      });

      let clientId;
      if (clientResponse.data.length > 0) {
        // Client existe déjà
        clientId = clientResponse.data[0].id;
        alert(
          "Ce client existe déjà, nous allons utiliser ses informations existantes."
        );
      } else {
        // Créer le nouveau client
        const newClientResponse = await axios.post("/api/client/", {
          name: clientData.name,
          surname: clientData.surname,
          client_mail: clientData.client_mail,
          phone_Number: parseInt(clientData.phone_Number),
        });
        clientId = newClientResponse.data.id;
      }

      // Stocker l'ID du client pour l'utiliser dans handleSocieteInfoSubmit
      setClientData((prev) => ({ ...prev, id: clientId }));
      setShowClientInfoModal(false);
      setShowSocieteInfoModal(true);
    } catch (error) {
      console.error(
        "Erreur lors de la vérification/création du client:",
        error
      );
      alert("Erreur lors de la création du client");
    }
  };

  const handleSocieteInfoSubmit = async () => {
    try {
      // Vérifier si la société existe déjà (par nom)
      const societeResponse = await axios.get("/api/societe/", {
        params: { nom_societe: clientData.societe.nom_societe },
      });

      let societeId;
      if (societeResponse.data.length > 0) {
        societeId = societeResponse.data[0].id;
        alert(
          "Cette société existe déjà, nous allons utiliser ses informations existantes."
        );
      }

      // Stocker les données de la société dans tous les cas
      setPendingChantierData((prev) => ({
        ...prev,
        client: clientData,
        societe: clientData.societe,
      }));

      setSelectedSocieteId(societeId);
      setShowSocieteInfoModal(false);
      setShowChantierForm(true); // Ouvrir le modal du chantier
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue");
    }
  };

  const handleChange = (e, type) => {
    const { name, value } = e.target;
    if (type === "client") {
      setClientData({ ...clientData, [name]: value });
    } else if (type === "societe") {
      setClientData({
        ...clientData,
        societe: { ...clientData.societe, [name]: value },
      });
    }
  };

  // Modifiez le gestionnaire de changement de type de devis
  const handleDevisTypeChange = (e) => {
    const newValue = e.target.value;
    setDevisType(newValue);

    if (newValue === "chantier") {
      setShowClientTypeModal(true);
    }
  };

  const handleChantierInfoSubmit = (chantierInfo) => {
    setPendingChantierData((prev) => ({
      ...prev,
      chantier: {
        ...prev.chantier,
        ...chantierInfo,
      },
    }));
    setShowChantierForm(false);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sélectionner le Chantier
            </Typography>
            <Select
              value={selectedChantierId}
              onChange={(e) => setSelectedChantierId(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">
                <em>-- Sélectionner un Chantier --</em>
              </MenuItem>
              {pendingChantierData.chantier &&
                pendingChantierData.chantier.id === -1 && (
                  <MenuItem value={-1}>
                    {pendingChantierData.chantier.chantier_name} (En cours de
                    création)
                  </MenuItem>
                )}
              {chantiers.map((chantier) => (
                <MenuItem key={chantier.id} value={chantier.id}>
                  {chantier.chantier_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <FormControl component="fieldset">
              <FormLabel component="legend">Type de devis</FormLabel>
              <RadioGroup
                row
                aria-label="devis-type"
                name="devis-type"
                value={devisType}
                onChange={handleDevisTypeChange}
              >
                <FormControlLabel
                  value="normal"
                  control={<Radio />}
                  label="Devis normal"
                />
                <FormControlLabel
                  value="chantier"
                  control={<Radio />}
                  label="Devis chantier"
                />
              </RadioGroup>
            </FormControl>

            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenCreatePartieModal(true)}
              sx={{
                fontFamily: "'Work Sans', sans-serif",
                textTransform: "none",
                fontSize: "1rem",
              }}
            >
              Créer une nouvelle partie
            </Button>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Parties
            </Typography>
            <Accordion>
              <AccordionSummary
                expandIcon={<span style={{ fontSize: "1.5rem" }}>+</span>}
              >
                <Typography>
                  Sélectionner les parties ({selectedParties.length}{" "}
                  sélectionnées)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {sortedParties.map((partie) => (
                    <Box
                      key={partie.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingY: "2px",
                        transition:
                          "transform 0.3s ease-out, opacity 0.3s ease-out",
                        transform: slidingParties.includes(partie.id)
                          ? "translateX(100%)"
                          : "translateX(0)",
                        opacity: slidingParties.includes(partie.id) ? 0 : 1,
                      }}
                    >
                      <FormControlLabel
                        sx={{
                          margin: 0,
                          "& .MuiFormControlLabel-label": {
                            fontFamily: "'Merriweather', serif",
                            fontSize: "1rem",
                            fontWeight: 500,
                          },
                        }}
                        control={
                          <Checkbox
                            checked={selectedParties.includes(partie.id)}
                            onChange={() => handlePartiesChange(partie.id)}
                            sx={{
                              padding: "4px",
                              "& .MuiSvgIcon-root": {
                                width: "24px",
                                height: "24px",
                              },
                            }}
                          />
                        }
                        label={partie.titre}
                      />
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "center",
                          height: "100%",
                        }}
                      >
                        <button
                          style={{
                            backgroundColor: "transparent",
                            color: "#4CAF50",
                            border: "2px solid #4CAF50",
                            borderRadius: "4px",
                            padding: "2px",
                            cursor: "pointer",
                            height: "24px",
                            width: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onClick={() => handleEditPartie(partie)}
                        >
                          <RiPencilFill size={16} />
                        </button>
                        <button
                          style={{
                            backgroundColor: "transparent",
                            color: "#f44336",
                            border: "2px solid #f44336",
                            borderRadius: "4px",
                            padding: "2px",
                            cursor: "pointer",
                            height: "24px",
                            width: "24px",
                            marginRight: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onClick={() => handleHidePartie(partie.id)}
                        >
                          <FaEyeSlash size={16} />
                        </button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sous-Parties et Lignes de Détail
            </Typography>
            {sortedSousParties.map((sousPartie) => (
              <Accordion
                key={sousPartie.id}
                sx={{
                  mb: 1,
                  transition: "transform 0.3s ease-out, opacity 0.3s ease-out",
                  transform: slidingSousParties.includes(sousPartie.id)
                    ? "translateX(100%)"
                    : "translateX(0)",
                  opacity: slidingSousParties.includes(sousPartie.id) ? 0 : 1,
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <span
                      style={{
                        fontSize: "1.5rem",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      +
                    </span>
                  }
                  onClick={(e) => {
                    // Empêcher la sélection/désélection si on clique sur les contrôles
                    if (
                      e.target.closest("button") ||
                      e.target.closest(".MuiCheckbox-root")
                    ) {
                      e.stopPropagation();
                      return;
                    }
                    // Si on clique sur le titre ou la zone générale, gérer la sélection
                    if (
                      !e.target.closest(
                        ".MuiAccordionSummary-expandIconWrapper"
                      )
                    ) {
                      handleSousPartiesChange(sousPartie.id);
                    }
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      width: "auto",
                    }}
                  >
                    <FormControlLabel
                      sx={{
                        "& .MuiFormControlLabel-label": {
                          marginLeft: "-4px",
                          fontFamily: "'Merriweather', serif",
                          fontSize: "1rem",
                          fontWeight: 500,
                          color: "black",
                          cursor: "pointer",
                        },
                      }}
                      control={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <button
                            style={{
                              backgroundColor: "transparent",
                              color: "#4CAF50",
                              border: "2px solid #4CAF50",
                              borderRadius: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              padding: "2px",
                              marginRight: "4px",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSousPartie(sousPartie);
                            }}
                          >
                            <RiPencilFill size={16} />
                          </button>
                          <button
                            style={{
                              backgroundColor: "transparent",
                              color: "#f44336",
                              border: "2px solid #f44336",
                              borderRadius: "4px",
                              padding: "2px",
                              cursor: "pointer",
                              height: "24px",
                              width: "24px",
                              marginRight: "4px",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHideSousPartie(sousPartie.id);
                            }}
                          >
                            <FaEyeSlash size={16} />
                          </button>
                          <Checkbox
                            checked={selectedSousParties.includes(
                              sousPartie.id
                            )}
                            onChange={() =>
                              handleSousPartiesChange(sousPartie.id)
                            }
                            onClick={(e) => e.stopPropagation()}
                            sx={{
                              marginLeft: "-12px",
                              "& .MuiSvgIcon-root": {
                                width: "30px",
                                height: "30px",
                              },
                            }}
                          />
                        </Box>
                      }
                    />
                  </Box>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontFamily: "'Work Sans', sans-serif",
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      paddingTop: "10px",
                    }}
                  >
                    {" "}
                    {sousPartie.description}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {sortedLignesDetails(
                    visibleLignesDetails.filter(
                      (ligne) => ligne.sous_partie === sousPartie.id
                    )
                  ).map((ligne) => (
                    <Card
                      key={ligne.id}
                      sx={{
                        mb: 1,
                        transition:
                          "transform 0.3s ease-out, opacity 0.3s ease-out",
                        transform: slidingLignes.includes(ligne.id)
                          ? "translateX(100%)"
                          : "translateX(0)",
                        opacity: slidingLignes.includes(ligne.id) ? 0 : 1,
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 1,
                            gap: 2,
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    alignItems: "center",
                                  }}
                                >
                                  <button
                                    style={{
                                      backgroundColor: "transparent",
                                      color: "#4CAF50",
                                      border: "2px solid #4CAF50",
                                      borderRadius: "4px",
                                      padding: "2px",
                                      cursor: "pointer",
                                      height: "24px",
                                      width: "24px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                    onClick={() => handleEditLigne(ligne)}
                                  >
                                    <RiPencilFill size={16} />
                                  </button>
                                  <button
                                    style={{
                                      backgroundColor: "transparent",
                                      color: "#f44336",
                                      border: "2px solid #f44336",
                                      borderRadius: "4px",
                                      padding: "2px",
                                      cursor: "pointer",
                                      height: "24px",
                                      width: "24px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                    onClick={() => handleHideLigne(ligne.id)}
                                  >
                                    <FaEyeSlash size={16} />
                                  </button>
                                  <Checkbox
                                    checked={selectedLignes.includes(ligne.id)}
                                    onChange={() =>
                                      handleLigneSelection(ligne.id)
                                    }
                                    sx={{
                                      marginLeft: "-12px",
                                      "& .MuiSvgIcon-root": {
                                        width: "30px",
                                        height: "30px",
                                      },
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontFamily: "'Work Sans', sans-serif",
                                fontSize: "0.95rem",
                                fontWeight: 400,
                              }}
                            >
                              {ligne.description}
                            </Typography>
                          </Box>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              minWidth: "80px",
                              textAlign: "right",
                              fontWeight: "bold",
                              color: "primary.main",
                            }}
                          >
                            {calculateTotalPrice(ligne)} €
                          </Typography>
                        </Box>
                        {selectedLignes.includes(ligne.id) && (
                          <Box sx={{ display: "flex", gap: 2, ml: 4 }}>
                            <TextField
                              id={`quantity-${ligne.id}`}
                              label="Quantité"
                              type="number"
                              value={quantities[ligne.id] || ""}
                              onChange={(e) =>
                                handleQuantityChange(ligne.id, e.target.value)
                              }
                              size="small"
                            />
                            <TextField
                              label="Prix Unitaire"
                              type="number"
                              step="0.01"
                              value={customPrices[ligne.id] || ligne.prix}
                              onChange={(e) =>
                                handlePriceChange(ligne.id, e.target.value)
                              }
                              size="small"
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>

          <button
            className="Devisbutton"
            onClick={isPreviewed ? handleSaveDevis : handlePreviewDevis}
          >
            {isPreviewed ? "Enregistrer le devis" : "Voir le devis"}
          </button>

          <ClientTypeModal
            open={showClientTypeModal}
            onClose={() => {
              setShowClientTypeModal(false);
              setDevisType("normal"); // Réinitialiser le type si l'utilisateur annule
            }}
            onNewClient={handleNewClient}
            onExistingClient={handleExistingClient}
          />

          <SelectSocieteModal
            open={showSelectSocieteModal}
            onClose={() => setShowSelectSocieteModal(false)}
            onSocieteSelect={handleSocieteSelect}
          />

          <Box
            sx={{
              position: "fixed",
              bottom: 20,
              right: 20,
              backgroundColor: "white",
              padding: "15px",
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              zIndex: 1000,
              border: "2px solid",
              borderColor: "primary.main",
            }}
          >
            <Typography variant="h6" sx={{ color: "primary.main" }}>
              Total HT: {calculateGrandTotal()} €
            </Typography>
          </Box>

          <DevisModal
            open={openDevisModal}
            handleClose={() => setOpenDevisModal(false)}
            devisData={devisModalData}
            handleSubmit={handleDevisModalSubmit}
            handleChange={(e) =>
              setDevisModalData({
                ...devisModalData,
                [e.target.name]: e.target.value,
              })
            }
          />

          <CreatePartieModal
            open={openCreatePartieModal}
            handleClose={() => {
              setOpenCreatePartieModal(false);
              setEditData(null);
            }}
            onPartieCreated={handlePartieCreated}
            editData={editData}
          />
        </Paper>
      </Box>

      <EditModal
        open={editModalOpen}
        handleClose={() => setEditModalOpen(false)}
        data={itemToEdit}
        onSave={handleSaveEdit}
      />
      <ClientInfoModal
        open={showClientInfoModal}
        onClose={() => {
          setShowClientInfoModal(false);
          setDevisType("normal");
        }}
        clientData={clientData}
        onChange={handleChange}
        onSubmit={handleClientInfoSubmit}
      />
      <SocieteInfoModal
        open={showSocieteInfoModal}
        onClose={() => {
          setShowSocieteInfoModal(false);
          setShowClientInfoModal(true);
        }}
        societeData={clientData.societe}
        onChange={handleChange}
        onSubmit={handleSocieteInfoSubmit}
      />
      <ChantierForm
        open={showChantierForm}
        onClose={() => setShowChantierForm(false)}
        onSubmit={(chantierData) => {
          setPendingChantierData((prev) => ({
            ...prev,
            chantier: {
              ...prev.chantier,
              ...chantierData,
            },
          }));
          setSelectedChantierId(-1);
          setShowChantierForm(false);
        }}
        societeId={selectedSocieteId}
      />
      <ChantierForm
        open={showChantierForm}
        onClose={() => setShowChantierForm(false)}
        onSubmit={handleChantierInfoSubmit}
        chantierData={pendingChantierData.chantier}
      />
    </Container>
  );
};

export default CreationDevis;
