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
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Fade,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Euro as EuroIcon,
  Business as BusinessIcon,
  Construction as ConstructionIcon,
  Description as DescriptionIcon,
  AccountCircle as AccountCircleIcon,
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
      maxWidth="lg"
      fullWidth
      scroll="paper"
      TransitionComponent={Fade}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, rgba(27, 120, 188, 1) 0%, rgba(27, 120, 188, 0.8) 100%)",
          color: "white",
          py: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <EuroIcon sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Gestion des primes
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {monthNames[month - 1]} {year}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: "white",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
            }}
          >
            <CloseIcon />
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
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : (
          <Box sx={{ p: 1 }}>
            {agents.length === 0 ? (
              <Alert severity="info" sx={{ m: 2 }}>
                Aucun agent disponible. Veuillez d'abord créer des agents.
              </Alert>
            ) : (
              agents.map((agent) => {
              const agentPrimes = existingPrimes[agent.id] || [];
              const totalPrimes = getTotalPrimesAgent(agent.id);

              return (
                <Accordion
                  key={agent.id}
                  expanded={expandedAgent === agent.id}
                  onChange={handleAccordionChange(agent.id)}
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                    "&:before": { display: "none" },
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      backgroundColor: "#f8f9fa",
                      borderRadius: "8px 8px 0 0",
                      "&:hover": {
                        backgroundColor: "#e9ecef",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                        alignItems: "center",
                        pr: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <AccountCircleIcon sx={{ color: "rgba(27, 120, 188, 1)", fontSize: 28 }} />
                        <Typography variant="h6" sx={{ fontWeight: 500 }}>
                          {agent.name} {agent.surname}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {agentPrimes.length > 0 && (
                          <>
                            <Chip
                              label={`${agentPrimes.length} prime(s)`}
                              size="small"
                              sx={{
                                backgroundColor: "rgba(27, 120, 188, 0.1)",
                                color: "rgba(27, 120, 188, 1)",
                                fontWeight: 600,
                                border: "1px solid rgba(27, 120, 188, 0.3)",
                              }}
                            />
                            <Chip
                              label={`${totalPrimes.toFixed(2)} €`}
                              size="small"
                              sx={{
                                backgroundColor: "rgba(27, 120, 188, 1)",
                                color: "white",
                                fontWeight: 600,
                              }}
                            />
                          </>
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ p: 3 }}>
                    {/* Formulaire pour ajouter une nouvelle prime */}
                    <Box
                      sx={{
                        p: 3,
                        backgroundColor: "#f8f9fa",
                        borderRadius: 2,
                        mb: 3,
                        border: "1px solid rgba(27, 120, 188, 0.2)",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 3,
                        }}
                      >
                        <AddIcon sx={{ color: "rgba(27, 120, 188, 1)", fontSize: 24 }} />
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 600, color: "rgba(27, 120, 188, 1)" }}
                        >
                          Ajouter une nouvelle prime
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Montant"
                            type="number"
                            fullWidth
                            value={newPrimes[agent.id]?.montant || ""}
                            onChange={(e) =>
                              handleNewPrimeChange(
                                agent.id,
                                "montant",
                                e.target.value
                              )
                            }
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <EuroIcon sx={{ color: "rgba(27, 120, 188, 1)" }} />
                                </InputAdornment>
                              ),
                            }}
                            inputProps={{ step: "0.01", min: "0" }}
                          />
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <TextField
                            select
                            label="Affectation"
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
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  {newPrimes[agent.id]?.type_affectation === "agence" ? (
                                    <BusinessIcon sx={{ color: "rgba(27, 120, 188, 1)" }} />
                                  ) : (
                                    <ConstructionIcon sx={{ color: "rgba(27, 120, 188, 1)" }} />
                                  )}
                                </InputAdornment>
                              ),
                            }}
                          >
                            <MenuItem value="agence">Agence</MenuItem>
                            <MenuItem value="chantier">Chantier</MenuItem>
                          </TextField>
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="Description"
                            multiline
                            rows={2}
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
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <DescriptionIcon sx={{ color: "rgba(27, 120, 188, 0.7)" }} />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>

                        {newPrimes[agent.id]?.type_affectation ===
                          "chantier" && (
                          <Grid item xs={12}>
                            <TextField
                              select
                              label="Chantier"
                              fullWidth
                              value={newPrimes[agent.id]?.chantier || ""}
                              onChange={(e) =>
                                handleNewPrimeChange(
                                  agent.id,
                                  "chantier",
                                  e.target.value
                                )
                              }
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <ConstructionIcon sx={{ color: "rgba(27, 120, 188, 1)" }} />
                                  </InputAdornment>
                                ),
                              }}
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
                            </TextField>
                          </Grid>
                        )}

                        <Grid item xs={12}>
                          <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            onClick={() => handleAddPrime(agent.id)}
                            disabled={
                              !newPrimes[agent.id]?.montant ||
                              !newPrimes[agent.id]?.description
                            }
                            startIcon={<AddIcon />}
                            sx={{
                              backgroundColor: "rgba(27, 120, 188, 1)",
                              py: 1.5,
                              fontSize: "1rem",
                              fontWeight: 600,
                              textTransform: "none",
                              boxShadow: "0 2px 8px rgba(27, 120, 188, 0.3)",
                              "&:hover": {
                                backgroundColor: "rgba(27, 120, 188, 0.8)",
                                boxShadow: "0 4px 12px rgba(27, 120, 188, 0.4)",
                              },
                              "&:disabled": {
                                background: "#ccc",
                                boxShadow: "none",
                              },
                            }}
                          >
                            Ajouter la prime
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Liste des primes existantes */}
                    {agentPrimes.length > 0 && (
                      <Box>
                        <Divider sx={{ my: 3 }} />
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 600, color: "#333" }}
                          >
                            Primes existantes
                          </Typography>
                          <Chip
                            label={agentPrimes.length}
                            size="small"
                            sx={{
                              backgroundColor: "rgba(27, 120, 188, 0.1)",
                              color: "rgba(27, 120, 188, 1)",
                              fontWeight: 600,
                              border: "1px solid rgba(27, 120, 188, 0.3)",
                            }}
                          />
                        </Box>
                        <Grid container spacing={2}>
                          {agentPrimes.map((prime) => (
                            <Grid item xs={12} key={prime.id}>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  p: 2,
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #e0e0e0",
                                  borderRadius: 1,
                                  transition: "all 0.2s ease",
                                  "&:hover": {
                                    backgroundColor: "#f8f9fa",
                                    borderColor: "rgba(27, 120, 188, 0.3)",
                                  },
                                }}
                              >
                                <Box sx={{ flex: 1 }}>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontWeight: 500,
                                      color: "#333",
                                      mb: 1,
                                    }}
                                  >
                                    {prime.description}
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 2,
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "#666",
                                        px: 1,
                                        py: 0.5,
                                        backgroundColor: "#f5f5f5",
                                        borderRadius: 0.5,
                                      }}
                                    >
                                      {prime.type_affectation === "agence"
                                        ? "Agence"
                                        : prime.chantier_name}
                                    </Typography>
                                    <Typography
                                      variant="h6"
                                      sx={{
                                        color: "rgba(27, 120, 188, 1)",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {parseFloat(prime.montant).toFixed(2)} €
                                    </Typography>
                                  </Box>
                                </Box>
                                <IconButton
                                  onClick={() => handleDeletePrime(prime.id)}
                                  size="small"
                                  sx={{
                                    color: "#999",
                                    "&:hover": {
                                      color: "#d32f2f",
                                      backgroundColor: "rgba(211, 47, 47, 0.08)",
                                    },
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          backgroundColor: "#f8f9fa",
          borderTop: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            alignItems: "center",
          }}
        >
          <Typography variant="body2" sx={{ color: "#666", fontStyle: "italic" }}>
            Les modifications sont enregistrées automatiquement
          </Typography>
          <Button
            onClick={onClose}
            variant="contained"
            size="large"
            sx={{
              backgroundColor: "rgba(27, 120, 188, 1)",
              px: 4,
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 600,
              textTransform: "none",
              boxShadow: "0 2px 8px rgba(27, 120, 188, 0.3)",
              "&:hover": {
                backgroundColor: "rgba(27, 120, 188, 0.8)",
                boxShadow: "0 4px 12px rgba(27, 120, 188, 0.4)",
              },
            }}
          >
            Fermer
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default PrimeModal;

