import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import UpdateTauxFixeModal from "./UpdateTauxFixeModal";

const CreatePartieModal = ({
  open,
  handleClose,
  onPartieCreated,
  onTauxFixeUpdated,
}) => {
  const [creationType, setCreationType] = useState("partie"); // "partie", "sousPartie", "ligne"
  const [partieTitle, setPartieTitle] = useState("");
  const [selectedPartieId, setSelectedPartieId] = useState("");
  const [selectedSousPartieId, setSelectedSousPartieId] = useState("");
  const [selectedPartieType, setSelectedPartieType] = useState("PEINTURE");
  const [defaultTauxFixe, setDefaultTauxFixe] = useState("20"); // Valeur par défaut temporaire

  // États pour la gestion dynamique des domaines
  const [availableDomaines, setAvailableDomaines] = useState([]);
  const [newDomaine, setNewDomaine] = useState("");
  const [showNewDomaineInput, setShowNewDomaineInput] = useState(false);

  // Fonction pour charger les domaines disponibles
  const loadDomaines = () => {
    axios
      .get("/api/parties/domaines/")
      .then((response) => {
        setAvailableDomaines(response.data);
        // Si aucun domaine n'est sélectionné, prendre le premier disponible
        if (!selectedPartieType && response.data.length > 0) {
          setSelectedPartieType(response.data[0]);
        }
      })
      .catch((error) => {
        console.error("Erreur lors du chargement des domaines", error);
      });
  };

  // Fonction pour ajouter un nouveau domaine
  const handleAddNewDomaine = () => {
    if (newDomaine.trim() && !availableDomaines.includes(newDomaine.trim())) {
      setAvailableDomaines((prev) => [...prev, newDomaine.trim()].sort());
      setSelectedPartieType(newDomaine.trim());
      setNewDomaine("");
      setShowNewDomaineInput(false);
    }
  };

  // Charger le taux fixe et les unités existantes depuis le backend
  useEffect(() => {
    const fetchTauxFixe = async () => {
      try {
        const response = await axios.get("/api/parametres/taux-fixe/");
        const tauxFixe = response.data.valeur.toString();
        setDefaultTauxFixe(tauxFixe);

        // Mettre à jour toutes les sous-parties existantes avec le nouveau taux
        setSousParties((prevSousParties) =>
          prevSousParties.map((sousPartie) => ({
            ...sousPartie,
            lignes: sousPartie.lignes.map((ligne) => ({
              ...ligne,
              taux_fixe: tauxFixe,
            })),
          }))
        );
      } catch (error) {
        console.error("Erreur lors du chargement du taux fixe:", error);
      }
    };

    const fetchExistingUnites = async () => {
      try {
        const response = await axios.get("/api/ligne-details/");
        const unites = [
          ...new Set(
            response.data.map((ligne) => ligne.unite).filter((unite) => unite)
          ),
        ];
        setExistingUnites(unites);
      } catch (error) {
        console.error("Erreur lors du chargement des unités:", error);
      }
    };

    if (open) {
      fetchTauxFixe();
      fetchExistingUnites();
      loadDomaines(); // Charger les domaines disponibles
    }
  }, [open]);

  const [sousParties, setSousParties] = useState([
    {
      description: "",
      lignes: [
        {
          description: "",
          unite: "",
          cout_main_oeuvre: "",
          cout_materiel: "",
          taux_fixe: defaultTauxFixe, // Utiliser la valeur du backend
          marge: "20",
        },
      ],
    },
  ]);

  const [existingParties, setExistingParties] = useState([]);
  const [existingSousParties, setExistingSousParties] = useState([]);
  const [existingLignes, setExistingLignes] = useState([]);
  const [existingUnites, setExistingUnites] = useState([]);
  const [openTauxFixeModal, setOpenTauxFixeModal] = useState(false);

  // Fonction pour détecter si une partie a des "Lignes directes"
  const getPartiesWithLignesDirectes = () => {
    return existingParties.filter((partie) => partie.has_lignes_directes);
  };

  // Fonction pour réinitialiser tous les états du modal
  const resetModalState = () => {
    setCreationType("partie");
    resetForm();
  };

  const handleAddSousPartie = () => {
    setSousParties([
      ...sousParties,
      {
        description: "",
        lignes: [
          {
            description: "",
            unite: "",
            cout_main_oeuvre: "",
            cout_materiel: "",
            taux_fixe: defaultTauxFixe, // Utiliser la valeur du backend
            marge: "20",
          },
        ],
      },
    ]);
  };

  const handleAddLigne = (sousPartieIndex) => {
    const newSousParties = [...sousParties];
    newSousParties[sousPartieIndex].lignes.push({
      description: "",
      unite: "",
      cout_main_oeuvre: "",
      cout_materiel: "",
      taux_fixe: defaultTauxFixe, // Utiliser la valeur du backend
      marge: "20",
    });
    setSousParties(newSousParties);
  };

  // Charger les parties existantes
  useEffect(() => {
    if (open) {
      axios.get("/api/parties/").then((response) => {
        setExistingParties(response.data);
      });
    }
  }, [open]);

  // Charger les sous-parties quand une partie est sélectionnée
  useEffect(() => {
    if (selectedPartieId) {
      axios
        .get(`/api/sous-parties/?partie=${selectedPartieId}`)
        .then((response) => {
          setExistingSousParties(response.data);
          setSelectedSousPartieId(""); // Réinitialiser la sous-partie sélectionnée
        });
    } else {
      setExistingSousParties([]);
      setSelectedSousPartieId("");
    }
  }, [selectedPartieId]);

  // Charger les lignes quand une sous-partie est sélectionnée
  useEffect(() => {
    if (selectedSousPartieId) {
      axios
        .get(`/api/ligne-details/?sous_partie=${selectedSousPartieId}`)
        .then((response) => {
          setExistingLignes(response.data);
        });
    }
  }, [selectedSousPartieId]);

  const handleSubmit = async () => {
    try {
      let createdData = null;

      if (creationType === "partie") {
        if (!partieTitle.trim()) {
          alert("Le titre de la partie est requis");
          return;
        }

        // 1. Créer la partie
        const partieResponse = await axios.post("/api/parties/", {
          titre: partieTitle,
          type: selectedPartieType,
          cout_estime_main_oeuvre: 0,
          cout_estime_materiel: 0,
          marge_estimee: 0,
        });
        console.log("Partie créée:", partieResponse.data);

        const sousPartiesData = [];

        // 2. Créer les sous-parties une par une
        for (const sousPartie of sousParties) {
          // Si la description est vide, on crée une "Lignes directes"
          const description = sousPartie.description.trim() || "";

          try {
            // Créer la sous-partie (même si description est vide, le backend créera "Lignes directes")
            const sousPartieResponse = await axios.post("/api/sous-parties/", {
              description: description,
              partie: partieResponse.data.id,
            });
            console.log("Sous-partie créée:", sousPartieResponse.data);

            // Attendre que la sous-partie soit bien créée
            await new Promise((resolve) => setTimeout(resolve, 100));

            // 3. Créer les lignes une par une pour cette sous-partie
            const lignesCreees = [];
            for (const ligne of sousPartie.lignes) {
              if (ligne.description.trim()) {
                try {
                  // Vérifier et convertir les valeurs numériques
                  const cout_main_oeuvre =
                    parseFloat(ligne.cout_main_oeuvre) || 0;
                  const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
                  const taux_fixe = parseFloat(ligne.taux_fixe) || 0;
                  const marge = parseFloat(ligne.marge) || 0;

                  const ligneData = {
                    description: ligne.description.trim(),
                    unite: ligne.unite.trim() || "unité",
                    cout_main_oeuvre: cout_main_oeuvre,
                    cout_materiel: cout_materiel,
                    taux_fixe: taux_fixe,
                    marge: marge,
                    sous_partie: sousPartieResponse.data.id,
                  };

                  console.log("Tentative de création de ligne:", ligneData);
                  const ligneResponse = await axios.post(
                    "/api/ligne-details/",
                    ligneData
                  );
                  console.log("Ligne créée:", ligneResponse.data);
                  lignesCreees.push(ligneResponse.data);
                } catch (error) {
                  console.error(
                    "Erreur création ligne:",
                    error.response?.data || error
                  );
                  throw new Error(
                    `Erreur lors de la création de la ligne ${ligne.description}`
                  );
                }
              }
            }

            sousPartiesData.push({
              ...sousPartieResponse.data,
              lignes_details: lignesCreees,
            });
          } catch (error) {
            console.error("Erreur création sous-partie:", error);
            throw error;
          }
        }

        createdData = {
          type: "partie",
          data: {
            ...partieResponse.data,
            sous_parties: sousPartiesData,
          },
        };
      } else if (creationType === "sousPartie") {
        // Logique similaire pour la création d'une seule sous-partie
        if (!selectedPartieId || !sousParties[0].description.trim()) {
          alert("Veuillez sélectionner une partie et saisir une description.");
          return;
        }

        const sousPartieResponse = await axios.post("/api/sous-parties/", {
          description: sousParties[0].description,
          partie: selectedPartieId,
        });
        console.log("Sous-partie créée:", sousPartieResponse.data);

        // Attendre que la sous-partie soit bien créée
        await new Promise((resolve) => setTimeout(resolve, 100));

        const lignesCreees = [];
        for (const ligne of sousParties[0].lignes) {
          if (ligne.description.trim()) {
            // On vérifie uniquement la description
            const ligneData = {
              description: ligne.description.trim(),
              unite: ligne.unite.trim() || "unité",
              cout_main_oeuvre: parseFloat(ligne.cout_main_oeuvre) || 0,
              cout_materiel: parseFloat(ligne.cout_materiel) || 0,
              taux_fixe: parseFloat(ligne.taux_fixe) || 0,
              marge: parseFloat(ligne.marge) || 0,
              sous_partie: sousPartieResponse.data.id,
            };

            const ligneResponse = await axios.post(
              "/api/ligne-details/",
              ligneData
            );
            lignesCreees.push(ligneResponse.data);
          }
        }

        createdData = {
          type: "sousPartie",
          data: {
            ...sousPartieResponse.data,
            lignes_details: lignesCreees,
          },
        };
      } else if (creationType === "ligne") {
        if (
          !selectedSousPartieId ||
          !sousParties[0].lignes[0].description.trim()
        ) {
          alert(
            "Veuillez sélectionner une sous-partie et saisir au moins une description."
          );
          return;
        }

        // Filtrer les lignes valides
        const lignesValides = sousParties[0].lignes.filter(
          (ligne) => ligne.description.trim() // On vérifie uniquement la description
        );

        if (lignesValides.length === 0) {
          alert("Veuillez saisir au moins une ligne valide.");
          return;
        }

        // Vérifier les doublons pour chaque ligne
        for (const ligne of lignesValides) {
          const ligneExists = existingLignes.some(
            (l) =>
              l.description.toLowerCase() ===
              ligne.description.trim().toLowerCase()
          );

          if (ligneExists) {
            alert(`La ligne "${ligne.description}" existe déjà.`);
            return;
          }
        }

        // Créer toutes les lignes
        const lignesPromises = lignesValides.map((ligne) =>
          axios.post("/api/ligne-details/", {
            description: ligne.description.trim(),
            unite: ligne.unite.trim() || "unité",
            cout_main_oeuvre: parseFloat(ligne.cout_main_oeuvre) || 0,
            cout_materiel: parseFloat(ligne.cout_materiel) || 0,
            taux_fixe: parseFloat(ligne.taux_fixe) || 0,
            marge: parseFloat(ligne.marge) || 0,
            sous_partie: selectedSousPartieId,
          })
        );

        const responses = await Promise.all(lignesPromises);
        const lignesCreees = responses.map((response) => response.data);

        createdData = {
          type: "ligne",
          data: lignesCreees,
        };
      } else if (creationType === "lignesDirectes") {
        if (!selectedPartieId) {
          alert("Veuillez sélectionner une partie.");
          return;
        }

        // Trouver la sous-partie "Lignes directes" de cette partie
        const partie = existingParties.find((p) => p.id === selectedPartieId);
        const sousPartieLignesDirectes = partie?.sous_parties?.find(
          (sp) => sp.description === "Lignes directes"
        );

        if (!sousPartieLignesDirectes) {
          alert(
            "Cette partie n'a pas de lignes directes. Veuillez d'abord créer une partie avec des lignes directes."
          );
          return;
        }

        // Filtrer les lignes valides
        const lignesValides = sousParties[0].lignes.filter((ligne) =>
          ligne.description.trim()
        );

        if (lignesValides.length === 0) {
          alert("Veuillez saisir au moins une ligne valide.");
          return;
        }

        // Créer toutes les lignes dans la sous-partie "Lignes directes"
        const lignesPromises = lignesValides.map((ligne) =>
          axios.post("/api/ligne-details/", {
            description: ligne.description.trim(),
            unite: ligne.unite.trim() || "unité",
            cout_main_oeuvre: parseFloat(ligne.cout_main_oeuvre) || 0,
            cout_materiel: parseFloat(ligne.cout_materiel) || 0,
            taux_fixe: parseFloat(ligne.taux_fixe) || 0,
            marge: parseFloat(ligne.marge) || 0,
            sous_partie: sousPartieLignesDirectes.id,
          })
        );

        const responses = await Promise.all(lignesPromises);
        const lignesCreees = responses.map((response) => response.data);

        createdData = {
          type: "lignesDirectes",
          data: lignesCreees,
        };
      }

      onPartieCreated(createdData);
      loadDomaines(); // Recharger les domaines après création
      handleClose();
      resetForm();
    } catch (error) {
      console.error("Erreur détaillée:", error);
      alert(`Erreur lors de la création: ${error.message}`);
    }
  };

  const resetForm = () => {
    setPartieTitle("");
    setSelectedPartieId("");
    setSelectedSousPartieId("");
    setSelectedPartieType("PEINTURE");
    setNewDomaine("");
    setShowNewDomaineInput(false);
    setSousParties([
      {
        description: "",
        lignes: [
          {
            description: "",
            unite: "",
            cout_main_oeuvre: "",
            cout_materiel: "",
            taux_fixe: defaultTauxFixe,
            marge: "20",
          },
        ],
      },
    ]);
  };

  const handleTauxFixeUpdated = (nouveauTaux, lignesMisesAJour) => {
    // Mettre à jour le taux fixe dans toutes les lignes existantes du modal
    const newSousParties = sousParties.map((sousPartie) => ({
      ...sousPartie,
      lignes: sousPartie.lignes.map((ligne) => ({
        ...ligne,
        taux_fixe: nouveauTaux.toString(),
      })),
    }));
    setSousParties(newSousParties);

    // Informer le composant parent (CreationDevis) de la mise à jour
    if (onTauxFixeUpdated) {
      onTauxFixeUpdated(nouveauTaux, lignesMisesAJour);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        inert={!open}
      >
        <DialogTitle>Créer une nouvelle partie</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <FormControl>
              <FormLabel>Type de création</FormLabel>
              <RadioGroup
                row
                value={creationType}
                onChange={(e) => setCreationType(e.target.value)}
              >
                <FormControlLabel
                  value="partie"
                  control={<Radio />}
                  label="Partie complète"
                />
                <FormControlLabel
                  value="sousPartie"
                  control={<Radio />}
                  label="Sous-partie"
                />
                <FormControlLabel
                  value="ligne"
                  control={<Radio />}
                  label="Ligne de détail"
                />
                <FormControlLabel
                  value="lignesDirectes"
                  control={<Radio />}
                  label="Ajouter lignes à une partie existante"
                />
              </RadioGroup>
            </FormControl>

            {(creationType === "sousPartie" ||
              creationType === "ligne" ||
              creationType === "lignesDirectes") && (
              <FormControl fullWidth>
                <InputLabel>
                  {creationType === "lignesDirectes"
                    ? "Sélectionner une partie avec lignes directes"
                    : "Sélectionner une partie"}
                </InputLabel>
                <Select
                  value={selectedPartieId}
                  onChange={(e) => setSelectedPartieId(e.target.value)}
                >
                  {(creationType === "lignesDirectes"
                    ? getPartiesWithLignesDirectes()
                    : existingParties
                  ).map((partie) => (
                    <MenuItem key={partie.id} value={partie.id}>
                      {partie.titre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {creationType === "ligne" && selectedPartieId && (
              <FormControl fullWidth>
                <InputLabel>Sélectionner une sous-partie</InputLabel>
                <Select
                  value={selectedSousPartieId}
                  onChange={(e) => setSelectedSousPartieId(e.target.value)}
                >
                  {existingSousParties.map((sousPartie) => (
                    <MenuItem key={sousPartie.id} value={sousPartie.id}>
                      {sousPartie.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {creationType === "lignesDirectes" && selectedPartieId && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Ajouter des lignes à la partie "
                  {
                    existingParties.find((p) => p.id === selectedPartieId)
                      ?.titre
                  }
                  "
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Ces lignes seront ajoutées aux lignes directes existantes de
                  cette partie.
                </Typography>
              </Box>
            )}

            {(creationType === "partie" ||
              creationType === "lignesDirectes") && (
              <>
                {creationType === "partie" && (
                  <>
                    <TextField
                      label="Titre de la partie"
                      value={partieTitle}
                      onChange={(e) => setPartieTitle(e.target.value)}
                    />
                    <FormControl fullWidth>
                      <InputLabel>Type de la partie</InputLabel>
                      <Select
                        value={selectedPartieType}
                        onChange={(e) => setSelectedPartieType(e.target.value)}
                      >
                        {availableDomaines.map((domaine) => (
                          <MenuItem key={domaine} value={domaine}>
                            {domaine}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Bouton pour ajouter un nouveau domaine */}
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          setShowNewDomaineInput(!showNewDomaineInput)
                        }
                        sx={{ fontSize: "0.75rem" }}
                      >
                        + Nouveau domaine
                      </Button>
                    </Box>

                    {/* Input pour nouveau domaine */}
                    {showNewDomaineInput && (
                      <Box
                        sx={{ display: "flex", gap: 1, alignItems: "center" }}
                      >
                        <TextField
                          size="small"
                          placeholder="Nom du nouveau domaine"
                          value={newDomaine}
                          onChange={(e) => setNewDomaine(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleAddNewDomaine()
                          }
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={handleAddNewDomaine}
                          disabled={!newDomaine.trim()}
                        >
                          Ajouter
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setShowNewDomaineInput(false);
                            setNewDomaine("");
                          }}
                        >
                          Annuler
                        </Button>
                      </Box>
                    )}
                  </>
                )}

                {sousParties.map((sousPartie, spIndex) => (
                  <Box
                    key={spIndex}
                    sx={{
                      border: "1px solid #ddd",
                      p: 2,
                      borderRadius: 1,
                      mt: 2,
                    }}
                  >
                    {creationType !== "lignesDirectes" && (
                      <TextField
                        fullWidth
                        label="Description de la sous-partie"
                        value={sousPartie.description}
                        onChange={(e) => {
                          const newSousParties = [...sousParties];
                          newSousParties[spIndex].description = e.target.value;
                          setSousParties(newSousParties);
                        }}
                      />
                    )}

                    {sousPartie.lignes.map((ligne, ligneIndex) => (
                      <Box
                        key={ligneIndex}
                        sx={{ display: "flex", gap: 1, mt: 2 }}
                      >
                        <TextField
                          fullWidth
                          label="Description"
                          value={ligne.description}
                          onChange={(e) => {
                            const newSousParties = [...sousParties];
                            newSousParties[spIndex].lignes[
                              ligneIndex
                            ].description = e.target.value;
                            setSousParties(newSousParties);
                          }}
                        />
                        <Autocomplete
                          freeSolo
                          options={existingUnites}
                          value={ligne.unite}
                          onChange={(event, newValue) => {
                            const newSousParties = [...sousParties];
                            newSousParties[spIndex].lignes[ligneIndex].unite =
                              newValue || "";
                            setSousParties(newSousParties);
                          }}
                          onInputChange={(event, newInputValue) => {
                            const newSousParties = [...sousParties];
                            newSousParties[spIndex].lignes[ligneIndex].unite =
                              newInputValue;
                            setSousParties(newSousParties);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Unité"
                              sx={{ minWidth: 120 }}
                            />
                          )}
                        />
                        <TextField
                          label="Main d'œuvre"
                          type="number"
                          value={ligne.cout_main_oeuvre}
                          onChange={(e) => {
                            const newSousParties = [...sousParties];
                            newSousParties[spIndex].lignes[
                              ligneIndex
                            ].cout_main_oeuvre = e.target.value;
                            setSousParties(newSousParties);
                          }}
                        />
                        <TextField
                          label="Matériel"
                          type="number"
                          value={ligne.cout_materiel}
                          onChange={(e) => {
                            const newSousParties = [...sousParties];
                            newSousParties[spIndex].lignes[
                              ligneIndex
                            ].cout_materiel = e.target.value;
                            setSousParties(newSousParties);
                          }}
                        />
                        <TextField
                          label="Taux fixe (%)"
                          type="number"
                          value={ligne.taux_fixe}
                          onChange={(e) => {
                            const newSousParties = [...sousParties];
                            newSousParties[spIndex].lignes[
                              ligneIndex
                            ].taux_fixe = e.target.value;
                            setSousParties(newSousParties);
                          }}
                        />
                        <TextField
                          label="Marge (%)"
                          type="number"
                          value={ligne.marge}
                          onChange={(e) => {
                            const newSousParties = [...sousParties];
                            newSousParties[spIndex].lignes[ligneIndex].marge =
                              e.target.value;
                            setSousParties(newSousParties);
                          }}
                        />
                      </Box>
                    ))}

                    <Button
                      onClick={() => handleAddLigne(spIndex)}
                      sx={{ mt: 1 }}
                    >
                      + Ajouter une ligne
                    </Button>
                  </Box>
                ))}

                <Button onClick={handleAddSousPartie} sx={{ mt: 2 }}>
                  + Ajouter une sous-partie
                </Button>
              </>
            )}

            {creationType === "sousPartie" && selectedPartieId && (
              <>
                <TextField
                  fullWidth
                  label="Description de la sous-partie"
                  value={sousParties[0].description}
                  onChange={(e) => {
                    const newSousParties = [...sousParties];
                    newSousParties[0].description = e.target.value;
                    setSousParties(newSousParties);
                  }}
                />

                {sousParties[0].lignes.map((ligne, ligneIndex) => (
                  <Box key={ligneIndex} sx={{ display: "flex", gap: 1, mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={ligne.description}
                      onChange={(e) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].description =
                          e.target.value;
                        setSousParties(newSousParties);
                      }}
                    />
                    <Autocomplete
                      freeSolo
                      options={existingUnites}
                      value={ligne.unite}
                      onChange={(event, newValue) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].unite =
                          newValue || "";
                        setSousParties(newSousParties);
                      }}
                      onInputChange={(event, newInputValue) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].unite =
                          newInputValue;
                        setSousParties(newSousParties);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Unité"
                          sx={{ minWidth: 120 }}
                        />
                      )}
                    />
                    <TextField
                      label="Main d'œuvre"
                      type="number"
                      value={ligne.cout_main_oeuvre}
                      onChange={(e) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].cout_main_oeuvre =
                          e.target.value;
                        setSousParties(newSousParties);
                      }}
                    />
                    <TextField
                      label="Matériel"
                      type="number"
                      value={ligne.cout_materiel}
                      onChange={(e) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].cout_materiel =
                          e.target.value;
                        setSousParties(newSousParties);
                      }}
                    />
                    <TextField
                      label="Taux fixe (%)"
                      type="number"
                      value={ligne.taux_fixe}
                      onChange={(e) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].taux_fixe =
                          e.target.value;
                        setSousParties(newSousParties);
                      }}
                    />
                    <TextField
                      label="Marge (%)"
                      type="number"
                      value={ligne.marge}
                      onChange={(e) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].marge =
                          e.target.value;
                        setSousParties(newSousParties);
                      }}
                    />
                  </Box>
                ))}

                <Button onClick={() => handleAddLigne(0)} sx={{ mt: 1 }}>
                  + Ajouter une ligne
                </Button>
              </>
            )}

            {creationType === "ligne" && selectedSousPartieId && (
              <Box
                sx={{ border: "1px solid #ddd", p: 2, borderRadius: 1, mt: 2 }}
              >
                {sousParties[0].lignes.map((ligne, ligneIndex) => (
                  <Box key={ligneIndex} sx={{ display: "flex", gap: 1, mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={ligne.description}
                      onChange={(e) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].description =
                          e.target.value;
                        setSousParties(newSousParties);
                      }}
                    />
                    <Autocomplete
                      freeSolo
                      options={existingUnites}
                      value={ligne.unite}
                      onChange={(event, newValue) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].unite =
                          newValue || "";
                        setSousParties(newSousParties);
                      }}
                      onInputChange={(event, newInputValue) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].unite =
                          newInputValue;
                        setSousParties(newSousParties);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Unité"
                          sx={{ minWidth: 120 }}
                        />
                      )}
                    />
                    <TextField
                      label="Coût main d'œuvre"
                      type="number"
                      value={ligne.cout_main_oeuvre}
                      onChange={(e) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].cout_main_oeuvre =
                          e.target.value;
                        setSousParties(newSousParties);
                      }}
                    />
                    <TextField
                      label="Coût matériel"
                      type="number"
                      value={ligne.cout_materiel}
                      onChange={(e) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].cout_materiel =
                          e.target.value;
                        setSousParties(newSousParties);
                      }}
                    />
                    <TextField
                      label="Taux fixe (%)"
                      type="number"
                      value={ligne.taux_fixe}
                      onChange={(e) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].taux_fixe =
                          e.target.value;
                        setSousParties(newSousParties);
                      }}
                    />
                    <TextField
                      label="Marge (%)"
                      type="number"
                      value={ligne.marge}
                      onChange={(e) => {
                        const newSousParties = [...sousParties];
                        newSousParties[0].lignes[ligneIndex].marge =
                          e.target.value;
                        setSousParties(newSousParties);
                      }}
                    />
                  </Box>
                ))}

                <Button onClick={() => handleAddLigne(0)} sx={{ mt: 1 }}>
                  + Ajouter une ligne
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (
                window.confirm(
                  "Voulez-vous vraiment vider tous les champs ? Cette action ne peut pas être annulée."
                )
              ) {
                resetModalState();
              }
            }}
            color="secondary"
            variant="outlined"
            sx={{ mr: "auto" }}
          >
            🗑️ Vider les champs
          </Button>
          <Button onClick={() => setOpenTauxFixeModal(true)} color="primary">
            Modifier Taux Fixe
          </Button>
          <Button onClick={handleClose}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      <UpdateTauxFixeModal
        open={openTauxFixeModal}
        handleClose={() => setOpenTauxFixeModal(false)}
        onTauxFixeUpdated={handleTauxFixeUpdated}
      />
    </>
  );
};

export default CreatePartieModal;
