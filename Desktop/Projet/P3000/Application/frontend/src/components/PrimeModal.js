import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import axios from "axios";

const PrimeModal = ({ isOpen, onClose, month, year }) => {
  const [agents, setAgents] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [existingPrimes, setExistingPrimes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedAgent, setExpandedAgent] = useState(null);
  
  // États pour les nouveaux formulaires de prime (un par agent)
  const [newPrimes, setNewPrimes] = useState({});

  const monthNames = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  // Chargement initial
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, month, year]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadAgents(), loadChantiers(), loadExistingPrimes()]);
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await axios.get("/api/agent/");
      setAgents(response.data);
      
      // Initialiser les formulaires de nouveaux primes pour chaque agent
      const initialNewPrimes = {};
      response.data.forEach((agent) => {
        initialNewPrimes[agent.id] = {
          montant: "",
          description: "",
          type_affectation: "agence",
          chantier: null,
        };
      });
      setNewPrimes(initialNewPrimes);
    } catch (error) {
      console.error("Erreur lors du chargement des agents:", error);
      throw error;
    }
  };

  const loadChantiers = async () => {
    try {
      const response = await axios.get("/api/chantier/");
      setChantiers(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des chantiers:", error);
      throw error;
    }
  };

  const loadExistingPrimes = async () => {
    try {
      const response = await axios.get("/api/agent-primes/", {
        params: { mois: month, annee: year },
      });

      // Grouper par agent
      const grouped = {};
      response.data.forEach((prime) => {
        if (!grouped[prime.agent]) {
          grouped[prime.agent] = [];
        }
        grouped[prime.agent].push(prime);
      });
      setExistingPrimes(grouped);
    } catch (error) {
      console.error("Erreur lors du chargement des primes:", error);
      throw error;
    }
  };

  const handleAddPrime = async (agentId) => {
    const primeData = newPrimes[agentId];

    if (!primeData.montant || !primeData.description) {
      alert("Veuillez remplir le montant et la description");
      return;
    }

    if (
      primeData.type_affectation === "chantier" &&
      !primeData.chantier
    ) {
      alert("Veuillez sélectionner un chantier");
      return;
    }

    try {
      await axios.post("/api/agent-primes/", {
        agent: agentId,
        mois: month,
        annee: year,
        montant: parseFloat(primeData.montant),
        description: primeData.description,
        type_affectation: primeData.type_affectation,
        chantier:
          primeData.type_affectation === "chantier"
            ? primeData.chantier
            : null,
      });

      // Recharger les primes
      await loadExistingPrimes();

      // Réinitialiser le formulaire
      setNewPrimes({
        ...newPrimes,
        [agentId]: {
          montant: "",
          description: "",
          type_affectation: "agence",
          chantier: null,
        },
      });

      alert("Prime ajoutée avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'ajout de la prime:", error);
      alert(
        `Erreur lors de l'ajout de la prime: ${
          error.response?.data?.detail || error.message
        }`
      );
    }
  };

  const handleDeletePrime = async (primeId) => {
    if (
      !window.confirm("Êtes-vous sûr de vouloir supprimer cette prime ?")
    ) {
      return;
    }

    try {
      await axios.delete(`/api/agent-primes/${primeId}/`);
      await loadExistingPrimes();
      alert("Prime supprimée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la suppression de la prime:", error);
      alert(
        `Erreur lors de la suppression: ${
          error.response?.data?.detail || error.message
        }`
      );
    }
  };

  const handleNewPrimeChange = (agentId, field, value) => {
    setNewPrimes({
      ...newPrimes,
      [agentId]: {
        ...newPrimes[agentId],
        [field]: value,
      },
    });
  };

  const handleAccordionChange = (agentId) => (event, isExpanded) => {
    setExpandedAgent(isExpanded ? agentId : null);
  };

  const getTotalPrimesAgent = (agentId) => {
    const primes = existingPrimes[agentId] || [];
    return primes.reduce((sum, prime) => sum + parseFloat(prime.montant), 0);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">
            Gestion des primes - {monthNames[month - 1]} {year}
          </Typography>
          <IconButton onClick={onClose}>
            <DeleteIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 4,
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box>
            {agents.map((agent) => {
              const agentPrimes = existingPrimes[agent.id] || [];
              const totalPrimes = getTotalPrimesAgent(agent.id);

              return (
                <Accordion
                  key={agent.id}
                  expanded={expandedAgent === agent.id}
                  onChange={handleAccordionChange(agent.id)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                        alignItems: "center",
                        pr: 2,
                      }}
                    >
                      <Typography>
                        {agent.name} {agent.surname}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {agentPrimes.length > 0 && (
                          <>
                            <Chip
                              label={`${agentPrimes.length} prime(s)`}
                              size="small"
                              color="primary"
                            />
                            <Chip
                              label={`${totalPrimes.toFixed(2)} €`}
                              size="small"
                              color="success"
                            />
                          </>
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails>
                    {/* Formulaire pour ajouter une nouvelle prime */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "#f5f5f5",
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 2, fontWeight: "bold" }}
                      >
                        <AddIcon fontSize="small" /> Ajouter une prime
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <TextField
                          label="Montant (€)"
                          type="number"
                          size="small"
                          fullWidth
                          value={newPrimes[agent.id]?.montant || ""}
                          onChange={(e) =>
                            handleNewPrimeChange(
                              agent.id,
                              "montant",
                              e.target.value
                            )
                          }
                          inputProps={{ step: "0.01", min: "0" }}
                        />

                        <TextField
                          label="Description"
                          multiline
                          rows={2}
                          size="small"
                          fullWidth
                          value={newPrimes[agent.id]?.description || ""}
                          onChange={(e) =>
                            handleNewPrimeChange(
                              agent.id,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Ex: Prime performance Q3, Bonus chantier..."
                        />

                        <Select
                          size="small"
                          fullWidth
                          value={
                            newPrimes[agent.id]?.type_affectation ||
                            "agence"
                          }
                          onChange={(e) =>
                            handleNewPrimeChange(
                              agent.id,
                              "type_affectation",
                              e.target.value
                            )
                          }
                        >
                          <MenuItem value="agence">
                            Affectation: Agence
                          </MenuItem>
                          <MenuItem value="chantier">
                            Affectation: Chantier
                          </MenuItem>
                        </Select>

                        {newPrimes[agent.id]?.type_affectation ===
                          "chantier" && (
                          <Select
                            size="small"
                            fullWidth
                            value={newPrimes[agent.id]?.chantier || ""}
                            onChange={(e) =>
                              handleNewPrimeChange(
                                agent.id,
                                "chantier",
                                e.target.value
                              )
                            }
                            displayEmpty
                          >
                            <MenuItem value="" disabled>
                              Sélectionner un chantier
                            </MenuItem>
                            {chantiers.map((chantier) => (
                              <MenuItem
                                key={chantier.id}
                                value={chantier.id}
                              >
                                {chantier.chantier_name}
                              </MenuItem>
                            ))}
                          </Select>
                        )}

                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleAddPrime(agent.id)}
                          disabled={
                            !newPrimes[agent.id]?.montant ||
                            !newPrimes[agent.id]?.description
                          }
                        >
                          Ajouter la prime
                        </Button>
                      </Box>
                    </Box>

                    {/* Liste des primes existantes */}
                    {agentPrimes.length > 0 && (
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ mb: 1, fontWeight: "bold" }}
                        >
                          Primes existantes
                        </Typography>
                        {agentPrimes.map((prime) => (
                          <Card key={prime.id} sx={{ mb: 1 }}>
                            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                    {prime.description}
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      mt: 1,
                                    }}
                                  >
                                    <Chip
                                      label={
                                        prime.type_affectation === "agence"
                                          ? "📍 Agence"
                                          : `🏗️ ${prime.chantier_name}`
                                      }
                                      size="small"
                                      color={
                                        prime.type_affectation === "agence"
                                          ? "info"
                                          : "warning"
                                      }
                                    />
                                    <Typography
                                      variant="h6"
                                      color="success.main"
                                      sx={{ fontWeight: "bold" }}
                                    >
                                      {parseFloat(prime.montant).toFixed(2)} €
                                    </Typography>
                                  </Box>
                                </Box>
                                <IconButton
                                  onClick={() => handleDeletePrime(prime.id)}
                                  color="error"
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrimeModal;

