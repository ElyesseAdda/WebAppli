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
import React, { useEffect, useState } from "react";
import ChantierForm from "./ChantierForm";
import ClientSocieteForm from "./ClientSocieteForm";
import ClientTypeModal from "./ClientTypeModal";
import CreatePartieModal from "./CreatePartieModal";
import DevisModal from "./DevisModal";
import SelectSocieteModal from "./SelectSocieteModal";

const CreationDevis = () => {
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
  const [showChantierForm, setShowChantierForm] = useState(false);
  const [showExistingClientForm, setShowExistingClientForm] = useState(false);
  const [showSelectSocieteModal, setShowSelectSocieteModal] = useState(false);
  const [selectedSocieteId, setSelectedSocieteId] = useState(null);
  const [selectedLignes, setSelectedLignes] = useState([]);
  const [hiddenLignes, setHiddenLignes] = useState([]);
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

  const sortedLignesDetails = (lignes) => {
    return [...lignes].sort((a, b) =>
      a.description.localeCompare(b.description, "fr", { sensitivity: "base" })
    );
  };

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
    const queryString = encodeURIComponent(JSON.stringify(devisData));
    const previewUrl = `/api/preview-devis/?devis=${queryString}`;
    window.open(previewUrl, "_blank");
    setIsPreviewed(true);
  };

  // Modifier le gestionnaire onSubmit du ClientSocieteForm
  const handleClientFormSubmit = (newSocieteId) => {
    setSocieteId(newSocieteId);
    setShowClientForm(false);
  };

  // Modifier handleSaveDevis
  const handleSaveDevis = () => {
    const total_ht = calculateGrandTotal();
    const tva = total_ht * 0.2;
    const montant_ttc = (parseFloat(total_ht) + tva).toFixed(2);

    // Préparer les données pour le modal
    setDevisModalData({
      numero: `DEV-${new Date().getFullYear()}-${Math.floor(
        Math.random() * 10000
      )}`,
      client:
        chantiers.find((c) => c.id === selectedChantierId)?.societe
          ?.nom_societe || "",
      chantier_name:
        chantiers.find((c) => c.id === selectedChantierId)?.chantier_name || "",
      montant_ttc: montant_ttc,
      description: "",
    });

    setOpenDevisModal(true);
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
  };

  const handleNewClient = () => {
    setShowClientTypeModal(false);
    setShowClientForm(true);
  };

  const handleExistingClient = () => {
    setShowClientTypeModal(false);
    setShowSelectSocieteModal(true);
  };

  const handleSocieteSelect = (societeId) => {
    setSelectedSocieteId(societeId);
    setShowSelectSocieteModal(false);
    setShowChantierForm(true);
  };

  const handleChantierSubmit = async (chantierData) => {
    try {
      const chantierWithSociete = {
        ...chantierData,
        societe: selectedSocieteId,
      };

      const response = await axios.post("/api/chantier/", chantierWithSociete);
      setSelectedChantierId(response.data.id);
      setShowChantierForm(false);
    } catch (error) {
      console.error("Erreur lors de la création du chantier:", error);
      alert("Erreur lors de la création du chantier");
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

  const visibleLignesDetails = filteredLignesDetails.filter(
    (ligne) => !hiddenLignes.includes(ligne.id)
  );

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
              {chantiers.map((chantier) => (
                <MenuItem key={chantier.id} value={chantier.id}>
                  {chantier.chantier_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Parties
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={() => setOpenCreatePartieModal(true)}
              >
                Créer une partie
              </Button>
            </Box>

            {parties.map((partie) => (
              <FormControlLabel
                key={partie.id}
                control={
                  <Checkbox
                    checked={selectedParties.includes(partie.id)}
                    onChange={() => handlePartiesChange(partie.id)}
                  />
                }
                label={partie.titre}
              />
            ))}
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sous-Parties et Lignes de Détail
            </Typography>
            {filteredSousParties.map((sousPartie) => (
              <Accordion key={sousPartie.id}>
                <AccordionSummary
                  expandIcon={<span style={{ fontSize: "1.5rem" }}>+</span>}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedSousParties.includes(sousPartie.id)}
                        onChange={() => handleSousPartiesChange(sousPartie.id)}
                      />
                    }
                    label={sousPartie.description}
                  />
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
                        transform: slidingLines.includes(ligne.id)
                          ? "translateX(100%)"
                          : "translateX(0)",
                        opacity: slidingLines.includes(ligne.id) ? 0 : 1,
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
                            <button
                              onClick={() => handleRemoveLigne(ligne.id)}
                              style={{
                                backgroundColor: "#ff4444",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                padding: "2px 4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                width: "16px",
                                height: "16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: "16px",
                                lineHeight: "1",
                                margin: "0px",
                                transition: "background-color 0.2s ease",
                              }}
                            >
                              ✕
                            </button>
                            <Checkbox
                              checked={selectedLignes.includes(ligne.id)}
                              onChange={() => handleLigneSelection(ligne.id)}
                            />
                            <Typography variant="subtitle1">
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

          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">Type de devis</FormLabel>
            <RadioGroup
              row
              value={devisType}
              onChange={(e) => {
                setDevisType(e.target.value);
                if (e.target.value === "chantier") {
                  setShowClientTypeModal(true);
                }
              }}
            >
              <FormControlLabel
                value="normal"
                control={<Radio />}
                label="Devis normal"
              />
              <FormControlLabel
                value="chantier"
                control={<Radio />}
                label="Devis de chantier"
              />
            </RadioGroup>
          </FormControl>

          <button
            className="Devisbutton"
            onClick={isPreviewed ? handleSaveDevis : handlePreviewDevis}
          >
            {isPreviewed ? "Enregistrer le devis" : "Voir le devis"}
          </button>

          {showClientForm && (
            <div className="client-form-overlay">
              <div className="client-form-container">
                <ClientSocieteForm
                  clientData={clientData}
                  setClientData={setClientData}
                  onSubmit={handleClientFormSubmit}
                />
              </div>
            </div>
          )}

          <ClientTypeModal
            open={showClientTypeModal}
            onClose={() => setShowClientTypeModal(false)}
            onNewClient={handleNewClient}
            onExistingClient={handleExistingClient}
          />

          <SelectSocieteModal
            open={showSelectSocieteModal}
            onClose={() => setShowSelectSocieteModal(false)}
            onSocieteSelect={handleSocieteSelect}
          />

          <ChantierForm
            open={showChantierForm}
            onClose={() => setShowChantierForm(false)}
            onSubmit={handleChantierSubmit}
            societeId={selectedSocieteId}
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
            handleClose={() => setOpenCreatePartieModal(false)}
            onPartieCreated={handlePartieCreated}
          />
        </Paper>
      </Box>
    </Container>
  );
};

export default CreationDevis;
