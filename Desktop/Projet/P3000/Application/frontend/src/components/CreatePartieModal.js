import {
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

const CreatePartieModal = ({ open, handleClose, onPartieCreated }) => {
  const [creationType, setCreationType] = useState("partie"); // "partie", "sousPartie", "ligne"
  const [partieTitle, setPartieTitle] = useState("");
  const [selectedPartieId, setSelectedPartieId] = useState("");
  const [selectedSousPartieId, setSelectedSousPartieId] = useState("");
  const [sousParties, setSousParties] = useState([
    { description: "", lignes: [{ description: "", unite: "", prix: "" }] },
  ]);
  const [existingParties, setExistingParties] = useState([]);
  const [existingSousParties, setExistingSousParties] = useState([]);
  const [existingLignes, setExistingLignes] = useState([]);

  const handleAddSousPartie = () => {
    setSousParties([
      ...sousParties,
      { description: "", lignes: [{ description: "", unite: "", prix: "" }] },
    ]);
  };

  const handleAddLigne = (sousPartieIndex) => {
    const newSousParties = [...sousParties];
    newSousParties[sousPartieIndex].lignes.push({
      description: "",
      unite: "",
      prix: "",
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
        const partieResponse = await axios.post("/api/parties/", {
          titre: partieTitle,
        });

        // Créer les sous-parties et leurs lignes
        const sousPartiesData = [];
        for (const sousPartie of sousParties) {
          if (sousPartie.description.trim()) {
            const sousPartieResponse = await axios.post("/api/sous-parties/", {
              description: sousPartie.description,
              partie: partieResponse.data.id,
            });

            // Créer les lignes de cette sous-partie
            const lignesPromises = sousPartie.lignes.map(async (ligne) => {
              if (ligne.description.trim() && ligne.prix.toString().trim()) {
                const ligneResponse = await axios.post("/api/ligne-details/", {
                  description: ligne.description,
                  unite: ligne.unite,
                  prix: parseFloat(ligne.prix),
                  sous_partie: sousPartieResponse.data.id,
                });
                return ligneResponse.data;
              }
            });

            const createdLignes = await Promise.all(lignesPromises);
            sousPartiesData.push({
              ...sousPartieResponse.data,
              lignes_details: createdLignes.filter(
                (ligne) => ligne !== undefined
              ),
            });
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
        // Logique pour créer uniquement une sous-partie
        if (!selectedPartieId || !sousParties[0].description.trim()) {
          alert("Veuillez sélectionner une partie et saisir une description.");
          return;
        }

        // Vérifier si la sous-partie existe déjà
        const sousPartieExists = existingSousParties.some(
          (sp) =>
            sp.description.toLowerCase() ===
            sousParties[0].description.trim().toLowerCase()
        );

        if (sousPartieExists) {
          alert("Cette sous-partie existe déjà.");
          return;
        }

        // Créer la sous-partie
        const sousPartieResponse = await axios.post("/api/sous-parties/", {
          description: sousParties[0].description,
          partie: selectedPartieId,
        });

        // Créer toutes les lignes de détail associées
        const lignesPromises = sousParties[0].lignes.map(async (ligne) => {
          if (ligne.description.trim() && ligne.prix.toString().trim()) {
            const ligneResponse = await axios.post("/api/ligne-details/", {
              description: ligne.description,
              unite: ligne.unite,
              prix: parseFloat(ligne.prix),
              sous_partie: sousPartieResponse.data.id,
            });
            return ligneResponse.data;
          }
        });

        // Attendre que toutes les lignes soient créées
        const createdLignes = await Promise.all(lignesPromises);

        createdData = {
          type: "sousPartie",
          data: {
            ...sousPartieResponse.data,
            lignes_details: createdLignes.filter(
              (ligne) => ligne !== undefined
            ),
          },
        };
      } else if (creationType === "ligne") {
        // Logique pour créer uniquement une ligne
        if (
          !selectedSousPartieId ||
          !sousParties[0].lignes[0].description.trim()
        ) {
          alert(
            "Veuillez sélectionner une sous-partie et saisir une description."
          );
          return;
        }

        // Vérifier si la ligne existe déjà
        const ligneExists = existingLignes.some(
          (l) =>
            l.description.toLowerCase() ===
            sousParties[0].lignes[0].description.trim().toLowerCase()
        );

        if (ligneExists) {
          alert("Cette ligne existe déjà.");
          return;
        }

        const ligneResponse = await axios.post("/api/ligne-details/", {
          description: sousParties[0].lignes[0].description,
          unite: sousParties[0].lignes[0].unite,
          prix: parseFloat(sousParties[0].lignes[0].prix),
          sous_partie: selectedSousPartieId,
        });
        createdData = { type: "ligne", data: ligneResponse.data };
      }

      onPartieCreated(createdData);
      handleClose();
      resetForm();
    } catch (error) {
      console.error("Erreur lors de la création:", error);
      alert("Erreur lors de la création");
    }
  };

  const resetForm = () => {
    setPartieTitle("");
    setSelectedPartieId("");
    setSelectedSousPartieId("");
    setSousParties([
      { description: "", lignes: [{ description: "", unite: "", prix: "" }] },
    ]);
  };

  return (
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
            </RadioGroup>
          </FormControl>

          {creationType === "partie" && (
            <>
              <TextField
                label="Titre de la partie"
                value={partieTitle}
                onChange={(e) => setPartieTitle(e.target.value)}
              />

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
                      <TextField
                        label="Unité"
                        value={ligne.unite}
                        onChange={(e) => {
                          const newSousParties = [...sousParties];
                          newSousParties[spIndex].lignes[ligneIndex].unite =
                            e.target.value;
                          setSousParties(newSousParties);
                        }}
                      />
                      <TextField
                        label="Prix"
                        type="number"
                        value={ligne.prix}
                        onChange={(e) => {
                          const newSousParties = [...sousParties];
                          newSousParties[spIndex].lignes[ligneIndex].prix =
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
                  <TextField
                    label="Unité"
                    value={ligne.unite}
                    onChange={(e) => {
                      const newSousParties = [...sousParties];
                      newSousParties[0].lignes[ligneIndex].unite =
                        e.target.value;
                      setSousParties(newSousParties);
                    }}
                  />
                  <TextField
                    label="Prix"
                    type="number"
                    value={ligne.prix}
                    onChange={(e) => {
                      const newSousParties = [...sousParties];
                      newSousParties[0].lignes[ligneIndex].prix =
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
            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <TextField
                fullWidth
                label="Description"
                value={sousParties[0].lignes[0].description}
                onChange={(e) => {
                  const newSousParties = [...sousParties];
                  newSousParties[0].lignes[0].description = e.target.value;
                  setSousParties(newSousParties);
                }}
              />
              <TextField
                label="Unité"
                value={sousParties[0].lignes[0].unite}
                onChange={(e) => {
                  const newSousParties = [...sousParties];
                  newSousParties[0].lignes[0].unite = e.target.value;
                  setSousParties(newSousParties);
                }}
              />
              <TextField
                label="Prix"
                type="number"
                value={sousParties[0].lignes[0].prix}
                onChange={(e) => {
                  const newSousParties = [...sousParties];
                  newSousParties[0].lignes[0].prix = e.target.value;
                  setSousParties(newSousParties);
                }}
              />
            </Box>
          )}

          {(creationType === "sousPartie" || creationType === "ligne") && (
            <FormControl fullWidth>
              <InputLabel>Sélectionner une partie</InputLabel>
              <Select
                value={selectedPartieId}
                onChange={(e) => setSelectedPartieId(e.target.value)}
              >
                {existingParties.map((partie) => (
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

          {/* Le reste du formulaire selon le type sélectionné */}
          {/* ... */}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Créer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreatePartieModal;
