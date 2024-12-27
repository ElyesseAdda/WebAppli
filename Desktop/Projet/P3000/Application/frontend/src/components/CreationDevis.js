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
  InputAdornment,
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
import { FaEyeSlash, FaPlus } from "react-icons/fa";
import { RiPencilFill } from "react-icons/ri";
import ChantierForm from "./ChantierForm";
import ClientInfoModal from "./ClientInfoModal";
import ClientTypeModal from "./ClientTypeModal";
import CreatePartieModal from "./CreatePartieModal";
import DevisModal from "./DevisModal";
import EditModal from "./EditModal";
import SelectSocieteModal from "./SelectSocieteModal";
import SocieteInfoModal from "./SocieteInfoModal";
import SpecialLineModal from "./SpecialeLineModal";

const CreationDevis = () => {
  const [pendingChantierData, setPendingChantierData] = useState({
    client: {
      name: "",
      surname: "",
      client_mail: "",
      phone_Number: "",
    },
    societe: {
      nom_societe: "",
      ville_societe: "",
      rue_societe: "",
      codepostal_societe: "",
    },
    chantier: {
      id: -1,
      chantier_name: "",
      ville: "",
      rue: "",
      code_postal: "",
    },
    devis: null,
  });
  const [hiddenParties, setHiddenParties] = useState([]);
  const [hiddenSousParties, setHiddenSousParties] = useState([]);
  const [hiddenLignes, setHiddenLignes] = useState([]);

  const [chantiers, setChantiers] = useState([]);
  const [selectedChantierId, setSelectedChantierId] = useState(null);
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
  const [showChantierForm, setShowChantierForm] = useState(false);
  const [tvaRate, setTvaRate] = useState(20);
  const [natureTravaux, setNatureTravaux] = useState("");
  const [specialLines, setSpecialLines] = useState({
    parties: {}, // {partieId: [{type: 'prorata', value: 10, isHighlighted: true}, ...]}
    sousParties: {}, // {sousPartieId: [{type: 'remise', value: 5, isHighlighted: false}, ...]}
    global: [], // [{type: 'prorata', value: 2, isHighlighted: true}, ...]
  });
  const [openSpecialLineModal, setOpenSpecialLineModal] = useState(false);
  const [currentSpecialLineTarget, setCurrentSpecialLineTarget] = useState({
    type: "",
    id: null,
  });

  // Charger les chantiers
  useEffect(() => {
    fetchChantiers();
  }, []);

  const fetchChantiers = async () => {
    try {
      const response = await axios.get("/api/chantier/");
      setChantiers(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des chantiers:", error);
    }
  };

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
    console.log("Sélection partie:", partieId);
    setIsPreviewed(false);
    const isSelected = selectedParties.includes(partieId);
    if (isSelected) {
      setSelectedParties((prev) => prev.filter((id) => id !== partieId));
    } else {
      setSelectedParties((prev) => [...prev, partieId]);
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
      numero: devisModalData.numero,
      chantier: selectedChantierId,
      client: [selectedSocieteId],
      price_ht: calculateGrandTotal().totalHT,
      description: devisModalData.description,
      tva_rate: tvaRate,
      nature_travaux: natureTravaux,
      parties: selectedParties,
      sous_parties: selectedSousParties,
      lignes_details: filteredLignesDetails
        .filter((ligne) => selectedSousParties.includes(ligne.sous_partie))
        .map((ligne) => ({
          id: ligne.id,
          quantity: quantities[ligne.id] || 0,
          custom_price: customPrices[ligne.id] || ligne.prix,
        })),
      specialLines: specialLines,
    };

    if (selectedChantierId === -1) {
      devisData.tempData = {
        client: pendingChantierData.client || {},
        societe: pendingChantierData.societe || {},
        chantier: pendingChantierData.chantier || {},
      };
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
        client: {
          name: "",
          surname: "",
          client_mail: "",
          phone_Number: "",
        },
        societe: {
          nom_societe: "",
          ville_societe: "",
          rue_societe: "",
          codepostal_societe: "",
        },
        chantier: {
          id: -1,
          chantier_name: "",
          ville: "",
          rue: "",
          code_postal: "",
        },
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

  // Fonction pour générer le numéro de devis
  const generateDevisNumber = async () => {
    try {
      const response = await axios.get("/api/get-next-devis-number/");
      return `DEV-${response.data.next_number}-${new Date()
        .getFullYear()
        .toString()
        .slice(-2)}`;
    } catch (error) {
      console.error("Erreur lors de la génération du numéro de devis:", error);
      return `DEV-ERR-${new Date().getFullYear().toString().slice(-2)}`;
    }
  };

  // Modifier le handleSaveDevis
  const handleSaveDevis = async () => {
    try {
      if (!selectedChantierId) {
        alert("Veuillez sélectionner un chantier");
        return;
      }

      // Récupérer les informations du chantier sélectionné
      let clientName;
      if (selectedChantierId !== -1) {
        const chantierResponse = await axios.get(
          `/api/chantier/${selectedChantierId}/`
        );
        const chantier = chantierResponse.data;
        if (chantier.societe && chantier.societe.client_name) {
          clientName = `${chantier.societe.client_name.name} ${chantier.societe.client_name.surname}`;
        }
      } else if (pendingChantierData.client) {
        // Pour un nouveau client
        clientName = `${pendingChantierData.client.name} ${pendingChantierData.client.surname}`;
      }

      // Si aucun nom de client n'est trouvé, utiliser les données de la société
      if (!clientName && selectedSocieteId) {
        const societeResponse = await axios.get(
          `/api/societe/${selectedSocieteId}/`
        );
        const societeData = societeResponse.data;
        if (societeData.client_name) {
          clientName = `${societeData.client_name.name} ${societeData.client_name.surname}`;
        }
      }

      // Si toujours pas de nom, utiliser une valeur par défaut
      if (!clientName) {
        clientName = "Client non spécifié";
      }

      const nextDevisNumber = await generateDevisNumber();

      setDevisModalData({
        numero: nextDevisNumber,
        client: clientName,
        price_ht: calculateGrandTotal().totalHT,
        description: "",
      });
      setOpenDevisModal(true);
    } catch (error) {
      console.error("Erreur lors de la préparation du devis:", error);
      alert("Une erreur est survenue lors de la préparation du devis");
    }
  };

  const handleDevisModalSubmit = async () => {
    try {
      const totals = calculateGrandTotal();
      const totalHT = totals.totalHT;
      const totalTTC = totals.totalTTC;
      let clientId, societeId, chantierIdToUse;

      // Vérification des données requises
      if (selectedChantierId === -1) {
        if (
          !pendingChantierData.client ||
          !pendingChantierData.societe ||
          !pendingChantierData.chantier
        ) {
          console.error("Données manquantes:", {
            client: pendingChantierData.client,
            societe: pendingChantierData.societe,
            chantier: pendingChantierData.chantier,
          });
          alert("Données client ou société manquantes");
          return;
        }
      }

      // Avant la création du client
      console.log("Données client:", pendingChantierData.client);

      // Avant la création de la société
      console.log("Données société:", pendingChantierData.societe);

      // Avant la création du chantier
      console.log("Données chantier:", pendingChantierData.chantier);

      // Création du client/société/chantier uniquement si nouveau chantier
      if (selectedChantierId === -1) {
        // 1. Créer le client
        if (pendingChantierData.client) {
          const clientResponse = await axios.post(
            "/api/client/",
            pendingChantierData.client
          );
          clientId = clientResponse.data.id;
        }

        // 2. Créer la société
        if (pendingChantierData.societe) {
          const societeResponse = await axios.post("/api/societe/", {
            ...pendingChantierData.societe,
            client_name: clientId,
          });
          societeId = societeResponse.data.id;
        }

        // 3. Créer le chantier
        const updatedChantierData = {
          ...pendingChantierData.chantier,
          montant_ht: totalHT,
          montant_ttc: totalTTC,
        };

        const chantierResponse = await axios.post("/api/chantier/", {
          ...updatedChantierData,
          societe: societeId,
        });
        chantierIdToUse = chantierResponse.data.id;
      } else {
        chantierIdToUse = selectedChantierId;
        // Récupérer la société associée au chantier existant
        const chantierResponse = await axios.get(
          `/api/chantier/${selectedChantierId}/`
        );
        societeId = chantierResponse.data.societe.id;
      }

      // Créer le devis avec uniquement les lignes sélectionnées
      const devisData = {
        numero: devisModalData.numero,
        chantier: chantierIdToUse,
        client: [societeId],
        price_ht: totalHT,
        price_ttc: totalTTC,
        tva_rate: tvaRate,
        nature_travaux: natureTravaux,
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
                .filter(
                  (ligne) =>
                    ligne.sous_partie === spId &&
                    selectedLignes.includes(ligne.id)
                )
                .map((ligne) => ({
                  id: ligne.id,
                  quantity: quantities[ligne.id] || 1,
                  custom_price: customPrices[ligne.id] || ligne.prix,
                })),
            })),
        })),
        specialLines: specialLines,
      };

      const response = await axios.post("/api/create-devis/", devisData);
      if (response.data) {
        alert("Devis créé avec succès!");

        // Réinitialiser tous les états
        setPendingChantierData({
          client: {
            name: "",
            surname: "",
            client_mail: "",
            phone_Number: "",
          },
          societe: {
            nom_societe: "",
            ville_societe: "",
            rue_societe: "",
            codepostal_societe: "",
          },
          chantier: {
            id: -1,
            chantier_name: "",
            ville: "",
            rue: "",
            code_postal: "",
          },
          devis: null,
        });

        // Réinitialiser les sélections
        setSelectedParties([]);
        setSelectedSousParties([]);
        setSelectedLignes([]);
        setSelectedChantierId(null);
        setSelectedSocieteId(null);

        // Réinitialiser les quantités et prix personnalisés
        setQuantities({});
        setCustomPrices({});

        // Réinitialiser les états des modales
        setOpenDevisModal(false);
        setShowClientTypeModal(false);
        setShowClientInfoModal(false);
        setShowSocieteInfoModal(false);
        setShowChantierForm(false);
        setShowSelectSocieteModal(false);

        // Réinitialiser les données du devis
        setDevisModalData({
          numero: "",
          client: "",
          chantier_name: "",
          montant_ttc: "",
          description: "",
        });

        // Réinitialiser l'état de prévisualisation
        setIsPreviewed(false);

        // Réinitialiser le type de devis
        setDevisType("normal");

        // Réinitialiser les filtres
        setFilteredSousParties([]);
        setFilteredLignesDetails([]);
      }
    } catch (error) {
      console.error("Erreur lors de la création du devis:", error);
      alert(`Erreur lors de la création du devis: ${error.message}`);
    }
  };

  // Ajouter cette fonction de réinitialisation
  const resetForm = () => {
    setPendingChantierData({
      client: {
        name: "",
        surname: "",
        client_mail: "",
        phone_Number: "",
      },
      societe: {
        nom_societe: "",
        ville_societe: "",
        rue_societe: "",
        codepostal_societe: "",
      },
      chantier: {
        id: -1,
        chantier_name: "",
        ville: "",
        rue: "",
        code_postal: "",
      },
      devis: null,
    });
    setSelectedSocieteId(null);
    setSelectedChantierId(null);
    setShowClientForm(false);
    setShowChantierForm(false);
    setShowClientTypeModal(false);
    setShowSelectSocieteModal(false);
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
          phone_Number: parseInt(clientData.phone_Number) || 0,
          client_mail: clientData.client_mail || "",
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

  const calculateTotalWithSpecialLines = (baseTotal, specialLines) => {
    let total = baseTotal;
    specialLines.forEach((line) => {
      const value = parseFloat(line.value);
      let montant;

      if (line.valueType === "percentage") {
        montant = (baseTotal * value) / 100;
      } else {
        montant = value;
      }

      if (line.type === "reduction") {
        total -= montant;
      } else {
        total += montant;
      }
    });
    return total;
  };

  const calculateGrandTotal = () => {
    // Calculer d'abord le total HT des lignes de détail
    let totalHT = visibleLignesDetails.reduce((total, ligne) => {
      if (selectedLignes.includes(ligne.id)) {
        return total + parseFloat(calculateTotalPrice(ligne));
      }
      return total;
    }, 0);

    // Appliquer les lignes spéciales par partie
    selectedParties.forEach((partieId) => {
      const partieSpecialLines = specialLines.parties[partieId] || [];
      partieSpecialLines.forEach((specialLine) => {
        let montant =
          specialLine.valueType === "percentage"
            ? (totalHT * specialLine.value) / 100
            : parseFloat(specialLine.value);

        if (specialLine.type === "reduction") {
          totalHT -= montant;
        } else {
          totalHT += montant;
        }
      });
    });

    // Appliquer les lignes spéciales globales
    const globalSpecialLines = specialLines.global || [];
    globalSpecialLines.forEach((specialLine) => {
      let montant =
        specialLine.valueType === "percentage"
          ? (totalHT * specialLine.value) / 100
          : parseFloat(specialLine.value);

      if (specialLine.type === "reduction") {
        totalHT -= montant;
      } else {
        totalHT += montant;
      }
    });

    // Calculer la TVA et le total TTC
    const tva = (totalHT * tvaRate) / 100;
    const totalTTC = totalHT + tva;

    return {
      totalHT: parseFloat(totalHT.toFixed(2)),
      totalTTC: parseFloat(totalTTC.toFixed(2)),
    };
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

  const handleAddSpecialLine = (type, id) => {
    setOpenSpecialLineModal(true);
    setCurrentSpecialLineTarget({ type, id });
  };

  const handleSpecialLineSave = (lineData) => {
    setSpecialLines((prev) => {
      const target = currentSpecialLineTarget;
      if (target.type === "global") {
        return {
          ...prev,
          global: [...prev.global, lineData],
        };
      }
      return {
        ...prev,
        [target.type]: {
          ...prev[target.type],
          [target.id]: [...(prev[target.type][target.id] || []), lineData],
        },
      };
    });
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

  const handleClientInfoSubmit = async (clientData) => {
    if (!clientData.name || !clientData.surname || !clientData.phone_Number) {
      alert("Tous les champs sont obligatoires");
      return;
    }
    console.log("Données client reçues:", clientData);
    if (!clientData) {
      console.error("clientData est undefined");
      return;
    }
    try {
      setPendingChantierData((prev) => ({
        ...prev,
        client: {
          name: clientData.name || "",
          surname: clientData.surname || "",
          phone_Number: parseInt(clientData.phone_Number) || 0,
          client_mail: clientData.client_mail || "",
        },
      }));
      setShowClientInfoModal(false);
      setShowSocieteInfoModal(true);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleSocieteInfoSubmit = async (societeData) => {
    console.log("Données société reçues:", societeData);
    setPendingChantierData((prev) => ({
      ...prev,
      societe: {
        nom_societe: societeData.nom_societe,
        ville_societe: societeData.ville_societe,
        rue_societe: societeData.rue_societe,
        codepostal_societe: societeData.codepostal_societe,
      },
    }));
    setShowSocieteInfoModal(false);
    setShowChantierForm(true);
  };

  const handleChange = (e, type) => {
    const { name, value } = e.target;
    if (type === "client") {
      setPendingChantierData((prev) => ({
        ...prev,
        client: {
          ...prev.client,
          [name]: value,
        },
      }));
    } else if (type === "societe") {
      setPendingChantierData((prev) => ({
        ...prev,
        societe: {
          ...prev.societe,
          [name]: value,
        },
      }));
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

  const handleLignesChange = (ligneId) => {
    setIsPreviewed(false);
    const isSelected = selectedLignes.includes(ligneId);
    if (isSelected) {
      setSelectedLignes((prev) => prev.filter((id) => id !== ligneId));
    } else {
      setSelectedLignes((prev) => [...prev, ligneId]);
    }
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
          <Box sx={{ mt: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Nature des travaux"
              value={natureTravaux}
              onChange={(e) => setNatureTravaux(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              type="number"
              label="Taux de TVA (%)"
              value={tvaRate}
              onChange={(e) => setTvaRate(parseFloat(e.target.value))}
              inputProps={{
                step: "0.01",
                min: "0",
                max: "100",
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />
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
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Checkbox
                            checked={selectedParties.includes(partie.id)}
                            onChange={() => handlePartiesChange(partie.id)}
                            sx={{
                              "& .MuiSvgIcon-root": {
                                width: "30px",
                                height: "30px",
                              },
                            }}
                          />
                          <Typography variant="h6">{partie.titre}</Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            handleAddSpecialLine("parties", partie.id)
                          }
                          startIcon={<FaPlus size={16} />}
                        >
                          Ligne spéciale
                        </Button>
                      </Box>
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

          <Button
            variant="contained"
            color="primary"
            onClick={isPreviewed ? handleSaveDevis : handlePreviewDevis}
          >
            {isPreviewed ? "Enregistrer le devis" : "Voir le devis"}
          </Button>

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
              Total TTC: {calculateGrandTotal().totalTTC} €
            </Typography>
          </Box>

          <DevisModal
            open={openDevisModal}
            handleClose={() => setOpenDevisModal(false)}
            devisData={devisModalData}
            handleChange={(e) =>
              setDevisModalData({
                ...devisModalData,
                [e.target.name]: e.target.value,
              })
            }
            handleSubmit={handleDevisModalSubmit}
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
        onClose={() => setShowClientInfoModal(false)}
        onSubmit={handleClientInfoSubmit}
      />

      <SocieteInfoModal
        open={showSocieteInfoModal}
        onClose={() => setShowSocieteInfoModal(false)}
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
        chantierData={pendingChantierData.chantier}
      />
      <SpecialLineModal
        open={openSpecialLineModal}
        onClose={() => setOpenSpecialLineModal(false)}
        onSave={handleSpecialLineSave}
      />
    </Container>
  );
};

export default CreationDevis;
