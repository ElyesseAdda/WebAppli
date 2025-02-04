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
import { FaEyeSlash } from "react-icons/fa";
import { FiPlusCircle } from "react-icons/fi";
import { RiPencilFill } from "react-icons/ri";
import { useLocation, useParams } from "react-router-dom";
import ChantierForm from "./ChantierForm";
import ClientInfoModal from "./ClientInfoModal";
import ClientTypeModal from "./ClientTypeModal";
import CreatePartieModal from "./CreatePartieModal";
import DevisModal from "./DevisModal";
import EditModal from "./EditModal";
import SelectSocieteModal from "./SelectSocieteModal";
import SocieteInfoModal from "./SocieteInfoModal";
import SpecialLineModal from "./SpecialLineModal";
import SpecialLinesOverview from "./SpecialLinesOverview";

const ModificationDevis = () => {
  const { devisId } = useParams();
  const location = useLocation();
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
    lignes: {}, // {ligneId: [{type: 'supplement', value: 15, isHighlighted: true}, ...]}
    global: [], // [{type: 'prorata', value: 2, isHighlighted: true}, ...]
  });
  const [openSpecialLineModal, setOpenSpecialLineModal] = useState(false);
  const [currentSpecialLineTarget, setCurrentSpecialLineTarget] = useState({
    type: "",
    id: null,
  });

  // Ajouter cet état pour gérer les termes de recherche par sous-partie
  const [searchTerms, setSearchTerms] = useState({});

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
      // Récupérer les sous-parties sélectionnées avec leurs lignes de détail
      axios
        .get("/api/sous-parties/", {
          params: {
            id__in: selectedSousParties.join(","),
          },
        })
        .then((response) => {
          // Extraire toutes les lignes de détail des sous-parties
          const allLignes = response.data.reduce((acc, sousPartie) => {
            const lignesWithSousPartie = sousPartie.lignes_details.map(
              (ligne) => ({
                ...ligne,
                sous_partie: sousPartie.id,
              })
            );
            return [...acc, ...lignesWithSousPartie];
          }, []);

          setAllLignesDetails(allLignes);
          setFilteredLignesDetails(allLignes);
        })
        .catch((error) => {
          console.error(
            "Erreur lors du chargement des lignes de détail",
            error
          );
        });
    } else {
      setAllLignesDetails([]);
      setFilteredLignesDetails([]);
    }
  }, [selectedSousParties]);

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
      price_ht: calculateGrandTotal(specialLines).totalHT,
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
  const handleDeleteSpecialLineFromOverview = (groupId, index) => {
    setSpecialLines((prev) => {
      const newSpecialLines = { ...prev };

      if (groupId === "global") {
        newSpecialLines.global = prev.global.filter((_, i) => i !== index);
      } else {
        const [type, id] = groupId.split("-");
        newSpecialLines[type][id] = prev[type][id].filter(
          (_, i) => i !== index
        );
      }

      return newSpecialLines;
    });
  };
  const getFilteredLignes = (sousPartieId, lignes) => {
    const searchTerm = searchTerms[sousPartieId]?.toLowerCase() || "";
    if (!searchTerm) return lignes;

    return lignes.filter((ligne) =>
      ligne.description.toLowerCase().includes(searchTerm)
    );
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

  // Ajouter ces fonctions de vérification
  const checkClientExists = async (clientData) => {
    try {
      const response = await axios.get("/api/check-client/", {
        params: {
          email: clientData.client_mail,
          phone: clientData.phone_Number,
        },
      });
      return response.data.client || null;
    } catch (error) {
      console.error("Erreur lors de la vérification du client:", error);
      return null;
    }
  };

  const checkSocieteExists = async (societeData) => {
    try {
      const response = await axios.get("/api/check-societe/", {
        params: {
          nom_societe: societeData.nom_societe,
          codepostal_societe: societeData.codepostal_societe,
        },
      });
      return response.data.societe || null;
    } catch (error) {
      console.error("Erreur lors de la vérification de la société:", error);
      return null;
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

      setDevisModalData((prev) => ({
        ...prev,
        numero: devisModalData.numero || "",
        client: clientName,
        price_ht: calculateGrandTotal(specialLines).totalHT,
        description: devisModalData.description || "",
      }));
      setOpenDevisModal(true);
    } catch (error) {
      console.error("Erreur lors de la préparation du devis:", error);
      alert("Une erreur est survenue lors de la préparation du devis");
    }
  };

  const handleDevisModalSubmit = async () => {
    try {
      const totals = calculateGrandTotal(specialLines);
      const totalHT = totals.totalHT;
      const totalTTC = totals.totalTTC;

      // Préparation des données du devis
      const devisData = {
        numero: devisModalData.numero,
        chantier: selectedChantierId,
        price_ht: parseFloat(totalHT.toFixed(2)),
        price_ttc: parseFloat(totalTTC.toFixed(2)),
        tva_rate: parseFloat(tvaRate),
        description: devisModalData.description,
        nature_travaux: natureTravaux,
        lignes: selectedLignes.map((ligneId) => ({
          ligne_detail: parseInt(ligneId), // Conversion explicite en nombre
          quantite: parseFloat(quantities[ligneId] || 0).toFixed(2),
          prix_unitaire: parseFloat(
            customPrices[ligneId] ||
              filteredLignesDetails.find((l) => l.id === ligneId)?.prix ||
              0
          ).toFixed(2),
        })),
        lignes_speciales: specialLines,
      };

      console.log("Données envoyées:", devisData); // Pour le débogage

      // Appel API pour mettre à jour le devis
      const response = await axios.put(`/api/devisa/${devisId}/`, devisData);

      if (response.data) {
        alert("Devis modifié avec succès!");
        window.location.href = "/ListeDevis";
      }
    } catch (error) {
      console.error("Erreur détaillée lors de la modification du devis:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        data: error.response?.config?.data, // Afficher les données envoyées
      });
      alert("Une erreur est survenue lors de la modification du devis");
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
    if (!ligne) return 0;

    const quantity = quantities[ligne.id] || 0;
    const price = customPrices[ligne.id] || ligne.prix || 0;

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

      // Afficher le signe négatif pour les réductions
      if (line.type === "reduction") {
        montant = -Math.abs(montant); // Force la valeur à être négative
      }

      total += montant; // On ajoute toujours le montant (qui sera négatif pour les réductions)
    });
    return total;
  };

  const handleAddGlobalSpecialLine = () => {
    setOpenSpecialLineModal(true);
    setCurrentSpecialLineTarget({
      type: "global",
      id: null,
    });
  };

  const calculateGrandTotal = (specialLines) => {
    console.group("Calcul du Total du Devis");

    // 1. Calcul initial du total HT des lignes de détail et par sous-partie
    let totalHT = 0;
    const sousPartieTotals = {};

    selectedLignes.forEach((ligneId) => {
      const ligne = filteredLignesDetails.find((l) => l.id === ligneId);
      if (ligne) {
        const quantity = quantities[ligneId] || 0;
        const price = customPrices[ligneId] || ligne.prix;
        const ligneTotalHT = quantity * price;
        totalHT += ligneTotalHT;

        const sousPartieId = ligne.sous_partie;
        if (!sousPartieTotals[sousPartieId]) {
          sousPartieTotals[sousPartieId] = 0;
        }
        sousPartieTotals[sousPartieId] += ligneTotalHT;
      }
    });

    // 2. Appliquer les lignes spéciales par niveau
    if (specialLines) {
      // Appliquer d'abord les lignes spéciales des sous-parties
      if (specialLines.sousParties) {
        Object.entries(specialLines.sousParties).forEach(
          ([sousPartieId, lines]) => {
            const sousPartieTotal = sousPartieTotals[sousPartieId] || 0;
            lines.forEach((line) => {
              let montant = 0;
              if (line.valueType === "percentage") {
                montant = (sousPartieTotal * parseFloat(line.value)) / 100;
              } else {
                montant = parseFloat(line.value);
              }

              if (line.type === "reduction") {
                totalHT -= montant;
              } else {
                totalHT += montant;
              }
            });
          }
        );
      }

      // Puis les lignes spéciales des parties
      if (specialLines.parties) {
        Object.entries(specialLines.parties).forEach(([partieId, lines]) => {
          lines.forEach((line) => {
            let montant = 0;
            if (line.valueType === "percentage") {
              montant = (totalHT * parseFloat(line.value)) / 100;
            } else {
              montant = parseFloat(line.value);
            }

            if (line.type === "reduction") {
              totalHT -= montant;
            } else {
              totalHT += montant;
            }
          });
        });
      }

      // Enfin, appliquer les lignes spéciales globales
      if (specialLines.global && specialLines.global.length > 0) {
        console.group("Lignes spéciales globales:");
        specialLines.global.forEach((line) => {
          let montant = 0;
          if (line.valueType === "percentage") {
            montant = (totalHT * parseFloat(line.value)) / 100;
          } else {
            montant = parseFloat(line.value);
          }

          if (line.type === "reduction") {
            totalHT -= montant;
          } else {
            totalHT += montant;
          }
        });
        console.groupEnd();
      }
    }

    // 3. Calcul final avec TVA
    const tva = (totalHT * parseFloat(tvaRate)) / 100;
    const totalTTC = totalHT + tva;

    console.groupEnd();

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
    // Assurons-nous que le type est correctement défini
    const targetType = type === "parties" ? "parties" : "sousParties";
    setOpenSpecialLineModal(true);
    setCurrentSpecialLineTarget({
      type: targetType, // Utiliser le type correct
      id: id.toString(), // Assurez-vous que l'ID est une chaîne
    });
  };

  const handleSpecialLineSave = (lineData) => {
    setSpecialLines((prev) => {
      const target = currentSpecialLineTarget;
      const newLine = {
        description: lineData.description,
        value: parseFloat(lineData.value),
        valueType: lineData.valueType,
        type: lineData.type,
        isHighlighted: lineData.isHighlighted || false,
      };

      // Si c'est une ligne globale
      if (target.type === "global") {
        return {
          ...prev,
          global: [...(prev.global || []), newLine],
        };
      }

      // Pour les parties et sous-parties
      const targetKey = target.type; // Utiliser directement le type correct
      return {
        ...prev,
        [targetKey]: {
          ...prev[targetKey],
          [target.id]: [...(prev[targetKey]?.[target.id] || []), newLine],
        },
      };
    });
    setOpenSpecialLineModal(false);
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
      setSelectedLignes(selectedLignes.filter((id) => id !== ligneId));
    } else {
      setSelectedLignes((prev) => [...prev, ligneId]);
    }
  };

  useEffect(() => {
    const fetchDevisData = async () => {
      if (!devisId) {
        console.error("Aucun ID de devis fourni");
        return;
      }

      try {
        console.log("Récupération des données pour le devis ID:", devisId);
        const response = await axios.get(`/api/devisa/${devisId}/`);
        const devisData = response.data;

        console.log("Données du devis récupérées:", devisData);

        // Pré-remplir les états avec les données du devis
        setSelectedChantierId(devisData.chantier);

        // Gérer les lignes et leurs sélections
        if (devisData.lignes && Array.isArray(devisData.lignes)) {
          const newQuantities = {};
          const newCustomPrices = {};
          const selectedLigneIds = [];
          const selectedSousPartieIds = new Set();
          const selectedPartieIds = new Set();

          // Récupérer d'abord toutes les lignes de détail
          for (const ligne of devisData.lignes) {
            if (ligne && ligne.ligne_detail) {
              newQuantities[ligne.ligne_detail] = ligne.quantite || 0;
              newCustomPrices[ligne.ligne_detail] = ligne.prix_unitaire || 0;
              selectedLigneIds.push(ligne.ligne_detail);

              // Récupérer la sous-partie correspondante
              try {
                const ligneDetailResponse = await axios.get(
                  `/api/ligne-details/${ligne.ligne_detail}/`
                );
                const sousPartieId = ligneDetailResponse.data.sous_partie;
                selectedSousPartieIds.add(sousPartieId);

                // Récupérer la partie correspondante
                const sousPartieResponse = await axios.get(
                  `/api/sous-parties/${sousPartieId}/`
                );
                const partieId = sousPartieResponse.data.partie;
                selectedPartieIds.add(partieId);
              } catch (error) {
                console.error(
                  "Erreur lors de la récupération des relations:",
                  error
                );
              }
            }
          }

          // Mettre à jour tous les états
          setQuantities(newQuantities);
          setCustomPrices(newCustomPrices);
          setSelectedLignes(selectedLigneIds);
          setSelectedSousParties(Array.from(selectedSousPartieIds));
          setSelectedParties(Array.from(selectedPartieIds));
        }

        // Gérer les lignes spéciales
        if (devisData.lignes_speciales) {
          setSpecialLines(devisData.lignes_speciales);
        }
        console.log("Données du devis récupérées:", devisData);

        setTvaRate(devisData.tva_rate || 20);
        setNatureTravaux(devisData.nature_travaux || "");
        setDevisModalData((prev) => ({
          ...prev,
          numero: devisData.numero || "",
          description: devisData.description || "",
          montant_ttc: devisData.price_ttc || "",
        }));
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        alert("Erreur lors du chargement des données du devis");
      }
    };

    fetchDevisData();
  }, [devisId]);

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
                          startIcon={
                            <FiPlusCircle
                              size={16}
                              style={{ strokeWidth: 2 }}
                            />
                          }
                          sx={{
                            borderRadius: "20px",
                            textTransform: "none",
                            fontSize: "0.65rem",
                            padding: "4px 10px",
                            marginLeft: "10px",
                            borderColor: "primary.main",
                            color: "primary.main",
                            backgroundColor: "white",
                            "&:hover": {
                              backgroundColor: "primary.main",
                              color: "white",
                              borderColor: "primary.main",
                              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                            },
                            transition: "all 0.3s ease",
                            minWidth: "130px",
                            height: "32px",
                            fontWeight: 500,
                          }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHidePartie(partie.id);
                          }}
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
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Typography variant="subtitle1">
                      {sousPartie.description}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        handleAddSpecialLine("sousParties", sousPartie.id)
                      }
                      startIcon={
                        <FiPlusCircle size={16} style={{ strokeWidth: 2 }} />
                      }
                      sx={{
                        borderRadius: "20px",
                        textTransform: "none",
                        fontSize: "0.85rem",
                        padding: "4px 12px",
                        borderColor: "primary.main",
                        color: "primary.main",
                        backgroundColor: "white",
                        "&:hover": {
                          backgroundColor: "primary.main",
                          color: "white",
                          borderColor: "primary.main",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                        },
                        transition: "all 0.3s ease",
                        minWidth: "130px",
                        height: "32px",
                        fontWeight: 500,
                      }}
                    >
                      Ligne spéciale
                    </Button>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Rechercher une ligne..."
                    sx={{ mb: 2 }}
                    onChange={(e) =>
                      setSearchTerms((prev) => ({
                        ...prev,
                        [sousPartie.id]: e.target.value,
                      }))
                    }
                    value={searchTerms[sousPartie.id] || ""}
                  />
                  {sortedLignesDetails(
                    getFilteredLignes(
                      sousPartie.id,
                      visibleLignesDetails.filter((ligne) => {
                        return ligne.sous_partie === sousPartie.id;
                      })
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
                        backgroundColor: "rgba(179, 179, 179, 0.6)",
                        "& .MuiTypography-root": {
                          color: "white",
                        },
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
                                      handleLignesChange(ligne.id)
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
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                alignItems: "center",
                              }}
                            >
                              <Typography>{ligne.description}</Typography>
                            </Box>
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
                            {ligne && calculateTotalPrice(ligne)} €
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
          <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleAddGlobalSpecialLine}
              startIcon={<FiPlusCircle />}
              sx={{
                borderRadius: "20px",
                textTransform: "none",
                fontSize: "0.85rem",
                padding: "8px 16px",
              }}
            >
              Ajouter une ligne spéciale globale
            </Button>
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
              Total TTC: {calculateGrandTotal(specialLines).totalTTC} €
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
        currentSpecialLines={
          currentSpecialLineTarget.type === "global"
            ? specialLines.global
            : specialLines[currentSpecialLineTarget.type]?.[
                currentSpecialLineTarget.id
              ] || []
        }
        onDelete={(index) =>
          handleDeleteSpecialLineFromOverview(
            currentSpecialLineTarget.type,
            index
          )
        }
      />
      <Box sx={{ my: 3 }}>
        <SpecialLinesOverview
          specialLines={specialLines}
          onDelete={handleDeleteSpecialLineFromOverview}
        />
      </Box>
    </Container>
  );
};

export default ModificationDevis;
