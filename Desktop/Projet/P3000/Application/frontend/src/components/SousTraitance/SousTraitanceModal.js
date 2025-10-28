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
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
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
import { RegeneratePDFIconButton } from "../shared/RegeneratePDFButton";
import { DOCUMENT_TYPES } from "../../config/documentTypeConfig";

const SousTraitanceModal = ({ open, onClose, chantierId, onUpdate }) => {
  const [sousTraitants, setSousTraitants] = useState([]);
  const [sousTraitantsAvecContrat, setSousTraitantsAvecContrat] = useState([]);
  const [sousTraitantsSansContrat, setSousTraitantsSansContrat] = useState([]);
  const [selectedSousTraitant, setSelectedSousTraitant] = useState(null);
  const [showSousTraitantForm, setShowSousTraitantForm] = useState(false);
  const [showContratForm, setShowContratForm] = useState(false);
  const [showAvenantForm, setShowAvenantForm] = useState(false);
  const [showSelectSousTraitant, setShowSelectSousTraitant] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [chantier, setChantier] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
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

      // Récupérer uniquement les contrats du chantier sélectionné avec leurs avenants
      const contratsResponse = await fetch(
        `/api/contrats-sous-traitance/?chantier_id=${chantierId}`
      );
      if (!contratsResponse.ok) {
        throw new Error(`HTTP error! status: ${contratsResponse.status}`);
      }
      const contratsData = await contratsResponse.json();

      // Séparer les sous-traitants avec et sans contrat pour ce chantier
      const sousTraitantsAvecContrat = [];
      const sousTraitantsSansContrat = [];

      sousTraitantsData.forEach((sousTraitant) => {
        const contrat = contratsData.find(
          (c) => c.sous_traitant === sousTraitant.id
        );
        
        if (contrat) {
          // Sous-traitant avec contrat pour ce chantier
          sousTraitantsAvecContrat.push({
            ...sousTraitant,
            contrat: contrat,
          });
        } else {
          // Sous-traitant sans contrat pour ce chantier
          sousTraitantsSansContrat.push({
            ...sousTraitant,
            contrat: null,
          });
        }
      });

      setSousTraitantsAvecContrat(sousTraitantsAvecContrat);
      setSousTraitantsSansContrat(sousTraitantsSansContrat);
      setSousTraitants(sousTraitantsAvecContrat); // Pour la compatibilité avec le reste du code
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

  const handleSelectExistingSousTraitant = () => {
    setSearchTerm(""); // Réinitialiser la recherche
    setShowSelectSousTraitant(true);
  };

  const handleSelectSousTraitantForContrat = (sousTraitant) => {
    setSelectedSousTraitant(sousTraitant);
    setShowSelectSousTraitant(false);
    setShowContratForm(true);
  };

  // Fonction de filtrage des sous-traitants par recherche
  const getFilteredSousTraitantsSansContrat = () => {
    return sousTraitantsSansContrat.filter((sousTraitant) => {
      const matchesType = !typeFilter || sousTraitant.type === typeFilter;
      const matchesSearch = !searchTerm || 
        sousTraitant.entreprise.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sousTraitant.numero_rcs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sousTraitant.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sousTraitant.representant && sousTraitant.representant.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesType && matchesSearch;
    });
  };

  // Fonction pour mettre en évidence les termes de recherche
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} style={{ backgroundColor: '#ffeb3b', fontWeight: 'bold' }}>
          {part}
        </span>
      ) : part
    );
  };

  const handleCreateAvenant = (sousTraitant) => {
    setSelectedSousTraitant(sousTraitant);
    setShowAvenantForm(true);
  };

  const handleSousTraitantSave = () => {
    setShowSousTraitantForm(false);
    setHasChanges(true);
    fetchSousTraitants();
  };

  const handleContratSave = async (contratData) => {
    try {
      setShowContratForm(false);
      setHasChanges(true);
      // Rafraîchir après un court délai pour s'assurer que la base de données est mise à jour
      setTimeout(() => {
        fetchSousTraitants();
      }, 500);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du contrat:", error);
    }
  };

  const handleAvenantSave = async (avenantData) => {
    try {
      setShowAvenantForm(false);
      setHasChanges(true);
      // Rafraîchir après un court délai pour s'assurer que la base de données est mise à jour
      setTimeout(() => {
        fetchSousTraitants();
      }, 500);
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
        setHasChanges(true);
        fetchSousTraitants(); // Rafraîchir la liste
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
        setHasChanges(true);
        fetchSousTraitants(); // Rafraîchir la liste
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

  const handleModalClose = () => {
    // Si des modifications ont été faites, déclencher onUpdate
    if (hasChanges && onUpdate) {
      onUpdate();
    }
    // Réinitialiser l'état des modifications
    setHasChanges(false);
    // Fermer le modal
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleModalClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Gestion des sous-traitants</Typography>
            <Box display="flex" gap={1}>
              <Button
                startIcon={<FaPlus />}
                variant="outlined"
                color="primary"
                onClick={handleSelectExistingSousTraitant}
              >
                Sélectionner un sous-traitant existant
              </Button>
              <Button
                startIcon={<FaPlus />}
                variant="contained"
                color="primary"
                onClick={handleCreateSousTraitant}
              >
                Nouveau sous-traitant
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Message informatif */}
          <Box sx={{ mb: 2, p: 2, backgroundColor: "rgba(25, 118, 210, 0.04)", borderRadius: 1 }}>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
              📋 Affichage des sous-traitants avec contrat pour ce chantier uniquement
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Pour ajouter un sous-traitant existant, utilisez le bouton "Sélectionner un sous-traitant existant"
            </Typography>
          </Box>

          {/* Filtre par type */}
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Filtrer par type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Filtrer par type"
              >
                <MenuItem value="">
                  <em>Tous les types</em>
                </MenuItem>
                <MenuItem value="NETTOYAGE">Nettoyage</MenuItem>
                <MenuItem value="BTP">BTP</MenuItem>
                <MenuItem value="TCE">TCE</MenuItem>
                <MenuItem value="AUTRE">Autre</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {sousTraitantsAvecContrat.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                Aucun sous-traitant avec contrat
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ce chantier n'a pas encore de sous-traitants associés.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSelectExistingSousTraitant}
                sx={{ mr: 1 }}
              >
                Sélectionner un sous-traitant existant
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleCreateSousTraitant}
              >
                Créer un nouveau sous-traitant
              </Button>
            </Box>
          ) : (
            sousTraitantsAvecContrat
              .filter(
                (sousTraitant) => !typeFilter || sousTraitant.type === typeFilter
              )
              .map((sousTraitant) => (
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
                    <Box>
                      <Typography>
                        {sousTraitant.entreprise} - {sousTraitant.numero_rcs}
                      </Typography>
                      {sousTraitant.type && (
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          Type: {sousTraitant.type}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <Tooltip title="Modifier le sous-traitant" arrow>
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSousTraitant(sousTraitant);
                          }}
                          sx={{
                            mr: 2.5,
                            color: "#2e7d32",
                            "&:hover": {
                              backgroundColor: "rgba(46, 125, 50, 0.1)",
                            },
                          }}
                        >
                          <FaEdit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Afficher le tableau de paiements" arrow>
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `/paiements-sous-traitant/${chantier.id}/${sousTraitant.id}`,
                              "_blank"
                            );
                          }}
                          sx={{
                            mr: 2.5,
                            color: "#9c27b0",
                            "&:hover": {
                              backgroundColor: "rgba(156, 39, 176, 0.1)",
                            },
                          }}
                        >
                          <FaTable />
                        </IconButton>
                      </Tooltip>
                      {sousTraitant.contrat ? (
                        <Tooltip title="Créer un avenant" arrow>
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateAvenant(sousTraitant);
                            }}
                            sx={{
                              mr: 2.5,
                              color: "#1976d2",
                              "&:hover": {
                                backgroundColor: "rgba(25, 118, 210, 0.1)",
                              },
                            }}
                          >
                            <FaPlusCircle />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Créer un contrat" arrow>
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateContrat(sousTraitant);
                            }}
                            sx={{
                              mr: 2.5,
                              color: "#1976d2",
                              "&:hover": {
                                backgroundColor: "rgba(25, 118, 210, 0.1)",
                              },
                            }}
                          >
                            <FaPlus />
                          </IconButton>
                        </Tooltip>
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
                                {/* Bouton de régénération du contrat dans le Drive */}
                                <RegeneratePDFIconButton
                                  documentType={DOCUMENT_TYPES.CONTRAT_SOUS_TRAITANCE}
                                  documentData={{
                                    ...sousTraitant.contrat,
                                    chantier: chantier,
                                    sous_traitant: {
                                      id: sousTraitant.id,
                                      entreprise: sousTraitant.entreprise,
                                    },
                                  }}
                                  size="small"
                                  color="primary"
                                  tooltipPlacement="top"
                                  onSuccess={() => {
                                    console.log('✅ Contrat régénéré avec succès');
                                  }}
                                />
                                
                                {/* Bouton de suppression */}
                                <Tooltip
                                  title="Supprimer le contrat et tous ses avenants"
                                  arrow
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleDeleteContrat(
                                        sousTraitant.contrat.id
                                      )
                                    }
                                    sx={{
                                      color: "#d32f2f",
                                      "&:hover": {
                                        backgroundColor:
                                          "rgba(211, 47, 47, 0.1)",
                                      },
                                    }}
                                  >
                                    <FaTrash />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                            {sousTraitant.contrat.avenants &&
                              sousTraitant.contrat.avenants
                                .sort((a, b) => a.numero - b.numero)
                                .map((avenant) => (
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
                                      {avenant.montant.toLocaleString("fr-FR")}{" "}
                                      €
                                    </TableCell>
                                    <TableCell align="center">
                                      {/* Bouton de régénération de l'avenant dans le Drive */}
                                      <RegeneratePDFIconButton
                                        documentType={DOCUMENT_TYPES.AVENANT_SOUS_TRAITANCE}
                                        documentData={{
                                          ...avenant,
                                          contrat: {
                                            ...sousTraitant.contrat,
                                            sous_traitant: {
                                              id: sousTraitant.id,
                                              entreprise: sousTraitant.entreprise,
                                            },
                                            chantier: chantier,
                                          },
                                          chantier: chantier,
                                        }}
                                        size="small"
                                        color="primary"
                                        tooltipPlacement="top"
                                        onSuccess={() => {
                                          console.log('✅ Avenant régénéré avec succès');
                                        }}
                                      />
                                      
                                      {/* Bouton de suppression */}
                                      <Tooltip
                                        title="Supprimer l'avenant"
                                        arrow
                                      >
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            handleDeleteAvenant(avenant.id)
                                          }
                                          sx={{
                                            color: "#d32f2f",
                                            "&:hover": {
                                              backgroundColor:
                                                "rgba(211, 47, 47, 0.1)",
                                            },
                                          }}
                                        >
                                          <FaTrash />
                                        </IconButton>
                                      </Tooltip>
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
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleModalClose}>Fermer</Button>
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
        chantier={chantier}
        onSave={handleAvenantSave}
      />

      {/* Modal de sélection des sous-traitants existants */}
      <Dialog 
        open={showSelectSousTraitant} 
        onClose={() => setShowSelectSousTraitant(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Sélectionner un sous-traitant existant</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choisissez un sous-traitant existant pour créer un contrat avec ce chantier.
          </Typography>
          
          {/* Barre de recherche */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Rechercher un sous-traitant"
              placeholder="Nom de l'entreprise, RCS, ville, représentant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    🔍
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
                  },
                },
              }}
            />
          </Box>
          
          {/* Filtre par type pour la sélection */}
          <Box sx={{ mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Filtrer par type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Filtrer par type"
              >
                <MenuItem value="">
                  <em>Tous les types</em>
                </MenuItem>
                <MenuItem value="NETTOYAGE">Nettoyage</MenuItem>
                <MenuItem value="BTP">BTP</MenuItem>
                <MenuItem value="TCE">TCE</MenuItem>
                <MenuItem value="AUTRE">Autre</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Compteur de résultats */}
          {getFilteredSousTraitantsSansContrat().length > 0 && (
            <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {getFilteredSousTraitantsSansContrat().length} sous-traitant{getFilteredSousTraitantsSansContrat().length > 1 ? 's' : ''} trouvé{getFilteredSousTraitantsSansContrat().length > 1 ? 's' : ''}
                {searchTerm && (
                  <span> pour "{searchTerm}"</span>
                )}
              </Typography>
              {(searchTerm || typeFilter) && (
                <Button
                  size="small"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("");
                  }}
                  sx={{ textTransform: "none" }}
                >
                  Effacer les filtres
                </Button>
              )}
            </Box>
          )}

          {/* Liste des sous-traitants sans contrat */}
          {getFilteredSousTraitantsSansContrat().map((sousTraitant) => (
              <Paper 
                key={sousTraitant.id} 
                sx={{ 
                  p: 2, 
                  mb: 1, 
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "rgba(25, 118, 210, 0.04)",
                  },
                }}
                onClick={() => handleSelectSousTraitantForContrat(sousTraitant)}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {highlightSearchTerm(sousTraitant.entreprise, searchTerm)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {highlightSearchTerm(sousTraitant.numero_rcs, searchTerm)} • {highlightSearchTerm(sousTraitant.ville, searchTerm)}
                    </Typography>
                    {sousTraitant.representant && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Représentant: {highlightSearchTerm(sousTraitant.representant, searchTerm)}
                      </Typography>
                    )}
                    {sousTraitant.type && (
                      <Typography variant="caption" color="primary">
                        Type: {sousTraitant.type}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSousTraitantForContrat(sousTraitant);
                    }}
                  >
                    Sélectionner
                  </Button>
                </Box>
              </Paper>
            ))}
          
          {getFilteredSousTraitantsSansContrat().length === 0 && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              {sousTraitantsSansContrat.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aucun sous-traitant disponible sans contrat pour ce chantier.
                </Typography>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Aucun sous-traitant trouvé avec les critères de recherche.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Essayez de modifier votre recherche ou de changer le filtre de type.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSelectSousTraitant(false)}>
            Annuler
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SousTraitanceModal;
