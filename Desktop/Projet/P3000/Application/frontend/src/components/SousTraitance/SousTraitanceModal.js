import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  FaChevronDown,
  FaEdit,
  FaPlus,
  FaPlusCircle,
  FaTable,
  FaTrash,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import AvenantForm from "./AvenantForm";
import ContratForm from "./ContratForm";
import SousTraitantForm from "./SousTraitantForm";

const SousTraitanceModal = ({ open, onClose, chantierId, onUpdate }) => {
  const [sousTraitants, setSousTraitants] = useState([]);
  const [selectedSousTraitant, setSelectedSousTraitant] = useState(null);
  const [showSousTraitantForm, setShowSousTraitantForm] = useState(false);
  const [showContratForm, setShowContratForm] = useState(false);
  const [showAvenantForm, setShowAvenantForm] = useState(false);
  const [chantier, setChantier] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchChantier();
      fetchSousTraitants();
    }
  }, [open, chantierId]);

  const fetchChantier = async () => {
    try {
      const response = await fetch(`/api/chantier/${chantierId}/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setChantier(data);
    } catch (error) {
      console.error("Erreur lors de la récupération du chantier:", error);
    }
  };

  const fetchSousTraitants = async () => {
    try {
      // Récupérer tous les sous-traitants
      const response = await fetch(`/api/sous-traitants/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const sousTraitantsData = await response.json();

      // Récupérer uniquement les contrats du chantier sélectionné
      const contratsResponse = await fetch(
        `/api/contrats-sous-traitance/?chantier_id=${chantierId}`
      );
      if (!contratsResponse.ok) {
        throw new Error(`HTTP error! status: ${contratsResponse.status}`);
      }
      const contratsData = await contratsResponse.json();

      // Associer uniquement les contrats spécifiques au chantier
      const sousTraitantsWithContrats = sousTraitantsData.map(
        (sousTraitant) => {
          const contrat = contratsData.find(
            (c) => c.sous_traitant === sousTraitant.id
          );
          return {
            ...sousTraitant,
            contrat: contrat || null,
          };
        }
      );

      setSousTraitants(sousTraitantsWithContrats);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des sous-traitants:",
        error
      );
    }
  };

  const handleCreateSousTraitant = () => {
    setSelectedSousTraitant(null);
    setShowSousTraitantForm(true);
  };

  const handleEditSousTraitant = (sousTraitant) => {
    setSelectedSousTraitant(sousTraitant);
    setShowSousTraitantForm(true);
  };

  const handleCreateContrat = (sousTraitant) => {
    setSelectedSousTraitant(sousTraitant);
    setShowContratForm(true);
  };

  const handleCreateAvenant = (sousTraitant) => {
    setSelectedSousTraitant(sousTraitant);
    setShowAvenantForm(true);
  };

  const handleSousTraitantSave = () => {
    setShowSousTraitantForm(false);
    fetchSousTraitants();
  };

  const handleContratSave = async (contratData) => {
    try {
      const response = await fetch("/api/contrats-sous-traitance/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contratData),
      });

      if (response.ok) {
        setShowContratForm(false);
        fetchSousTraitants(); // Rafraîchir la liste
        if (onUpdate) {
          onUpdate();
        }
      } else {
        console.error("Erreur lors de la sauvegarde du contrat");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du contrat:", error);
    }
  };

  const handleAvenantSave = async (avenantData) => {
    try {
      const response = await fetch("/api/avenants-sous-traitance/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(avenantData),
      });

      if (response.ok) {
        setShowAvenantForm(false);
        fetchSousTraitants(); // Rafraîchir la liste
        if (onUpdate) {
          onUpdate();
        }
      } else {
        console.error("Erreur lors de la sauvegarde de l'avenant");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'avenant:", error);
    }
  };

  const handleDeleteContrat = async (contratId) => {
    try {
      // Confirmation avant suppression
      if (
        !window.confirm(
          "Êtes-vous sûr de vouloir supprimer ce contrat ? Tous les avenants associés seront également supprimés."
        )
      ) {
        return;
      }

      const response = await fetch(
        `/api/contrats-sous-traitance/${contratId}/`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        fetchSousTraitants(); // Rafraîchir la liste
        if (onUpdate) {
          onUpdate();
        }
      } else {
        console.error("Erreur lors de la suppression du contrat");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du contrat:", error);
    }
  };

  const handleDeleteAvenant = async (avenantId) => {
    try {
      // Confirmation avant suppression
      if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet avenant ?")) {
        return;
      }

      const response = await fetch(
        `/api/avenants-sous-traitance/${avenantId}/`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        fetchSousTraitants(); // Rafraîchir la liste
        if (onUpdate) {
          onUpdate();
        }
      } else {
        console.error("Erreur lors de la suppression de l'avenant");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de l'avenant:", error);
    }
  };

  const handlePreviewContrat = (contratId) => {
    const previewUrl = `/api/preview-contrat/${contratId}/`;
    window.open(previewUrl, "_blank");
  };

  const handlePreviewAvenant = (avenantId) => {
    const previewUrl = `/api/preview-avenant/${avenantId}/`;
    window.open(previewUrl, "_blank");
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Gestion des sous-traitants</Typography>
            <Button
              startIcon={<FaPlus />}
              variant="contained"
              color="primary"
              onClick={handleCreateSousTraitant}
            >
              Nouveau sous-traitant
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {sousTraitants.map((sousTraitant) => (
            <Accordion key={sousTraitant.id}>
              <AccordionSummary
                expandIcon={<FaChevronDown />}
                aria-controls={`panel${sousTraitant.id}-content`}
                id={`panel${sousTraitant.id}-header`}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  width="100%"
                >
                  <Typography>
                    {sousTraitant.entreprise} - {sousTraitant.numero_rcs}
                  </Typography>
                  <Box>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSousTraitant(sousTraitant);
                      }}
                      sx={{ mr: 2.5 }}
                    >
                      <FaEdit />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `/paiements-sous-traitant/${chantier.id}/${sousTraitant.id}`,
                          "_blank"
                        );
                      }}
                      sx={{ mr: 2.5 }}
                    >
                      <FaTable />
                    </IconButton>
                    {sousTraitant.contrat ? (
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateAvenant(sousTraitant);
                        }}
                        sx={{ mr: 2.5 }}
                      >
                        <FaPlusCircle />
                      </IconButton>
                    ) : (
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateContrat(sousTraitant);
                        }}
                        sx={{ mr: 2.5 }}
                      >
                        <FaPlus />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {sousTraitant.contrat ? (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Contrat de sous-traitance
                    </Typography>
                    <TableContainer component={Paper} sx={{ mb: 3 }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell width="15%">Type</TableCell>
                            <TableCell width="30%">Description</TableCell>
                            <TableCell width="15%">Catégorie</TableCell>
                            <TableCell width="15%">Date</TableCell>
                            <TableCell
                              width="15%"
                              align="right"
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              Montant
                            </TableCell>
                            <TableCell width="10%" align="center">
                              Actions
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell
                              onClick={() =>
                                handlePreviewContrat(sousTraitant.contrat.id)
                              }
                              sx={{
                                cursor: "pointer",
                                color: "primary.main",
                                fontWeight: "bold",
                                "&:hover": {
                                  textDecoration: "underline",
                                },
                              }}
                            >
                              Contrat initial
                            </TableCell>
                            <TableCell>
                              {sousTraitant.contrat.description_prestation}
                            </TableCell>
                            <TableCell>
                              {sousTraitant.contrat.type_contrat}
                            </TableCell>
                            <TableCell>
                              {new Date(
                                sousTraitant.contrat.date_debut
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              {sousTraitant.contrat.montant_operation.toLocaleString(
                                "fr-FR"
                              )}{" "}
                              €
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() =>
                                  handleDeleteContrat(sousTraitant.contrat.id)
                                }
                                title="Supprimer le contrat et tous ses avenants"
                              >
                                <FaTrash />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                          {sousTraitant.contrat.avenants &&
                            sousTraitant.contrat.avenants.map((avenant) => (
                              <TableRow key={avenant.id}>
                                <TableCell
                                  onClick={() =>
                                    handlePreviewAvenant(avenant.id)
                                  }
                                  sx={{
                                    cursor: "pointer",
                                    color: "primary.main",
                                    "&:hover": {
                                      textDecoration: "underline",
                                    },
                                  }}
                                >
                                  Avenant n°{avenant.numero}
                                </TableCell>
                                <TableCell>{avenant.description}</TableCell>
                                <TableCell>
                                  {sousTraitant.contrat.type_contrat}
                                </TableCell>
                                <TableCell>
                                  {new Date(
                                    avenant.date_creation
                                  ).toLocaleDateString()}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ whiteSpace: "nowrap" }}
                                >
                                  {avenant.montant.toLocaleString("fr-FR")} €
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      handleDeleteAvenant(avenant.id)
                                    }
                                    title="Supprimer l'avenant"
                                  >
                                    <FaTrash />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                ) : (
                  <Typography color="text.secondary">
                    Aucun contrat de sous-traitance pour ce sous-traitant
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <SousTraitantForm
        open={showSousTraitantForm}
        onClose={() => setShowSousTraitantForm(false)}
        sousTraitant={selectedSousTraitant}
        onSave={handleSousTraitantSave}
      />

      <ContratForm
        open={showContratForm}
        onClose={() => setShowContratForm(false)}
        sousTraitant={selectedSousTraitant}
        chantier={chantier}
        onSave={handleContratSave}
      />

      <AvenantForm
        open={showAvenantForm}
        onClose={() => setShowAvenantForm(false)}
        contrat={selectedSousTraitant?.contrat || null}
        onSave={handleAvenantSave}
      />
    </>
  );
};

export default SousTraitanceModal;
