import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { green } from "@mui/material/colors";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  AlignedCell,
  CenteredTableCell,
  ChantierCell,
  DevisNumber,
  FilterCell,
  PriceTextField,
  StatusCell,
  StyledBox,
  StyledSelect,
  StyledTableContainer,
  StyledTextField,
} from "../styles/tableStyles";
import { RegeneratePDFIconButton } from "./shared/RegeneratePDFButton";
import { DOCUMENT_TYPES } from "../config/documentTypeConfig";

const formatNumber = (number) => {
  const value = Number.parseFloat(number);
  if (Number.isNaN(value)) {
    return "0,00";
  }
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatYear = (year) => year.toString().slice(-2);

const formatStatusLabel = (status) => {
  const labels = {
    brouillon: "En attente",
    validee: "Validée",
    facturee: "Facturée",
  };
  return labels[status] || status;
};

const normalizeSituationEntries = (items = []) =>
  items.map((item) => ({
    ...item,
    chantier_name: item.chantier_name || "",
    client_name: item.client_name || item.societe_name || "",
  }));

const sortByNewestFirst = (items = []) =>
  [...items].sort((a, b) => {
    const dateA = a.date_creation
      ? new Date(a.date_creation).getTime()
      : a.annee * 100 + a.mois;
    const dateB = b.date_creation
      ? new Date(b.date_creation).getTime()
      : b.annee * 100 + b.mois;
    return dateB - dateA;
  });

const hasActiveFilters = (filters) =>
  filters.numero_situation ||
  filters.chantier_name ||
  filters.client_name ||
  filters.periode ||
  filters.pourcentage_avancement ||
  filters.montant_apres_retenues ||
  (filters.statut && filters.statut !== "Tous");

const ListeSituation = () => {
  const [situations, setSituations] = useState([]);
  const [filteredSituations, setFilteredSituations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [allSituationsForFilter, setAllSituationsForFilter] = useState(null);
  const [filters, setFilters] = useState({
    numero_situation: "",
    chantier_name: "",
    client_name: "",
    periode: "",
    pourcentage_avancement: "",
    montant_apres_retenues: "",
    statut: "Tous",
  });
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [situationToDelete, setSituationToDelete] = useState(null);

  const statusOptions = [
    { value: "brouillon", label: "En attente" },
    { value: "validee", label: "Validée" },
    { value: "facturee", label: "Facturée" },
  ];

  useEffect(() => {
    fetchSituations();
  }, []);

  const fetchSituations = async (url = "/api/situations/", append = false) => {
    try {
      setIsLoading(true);
      const response = await axios.get(url);
      const data = response.data;

      const newSituations = data.results || data;
      const next = data.next || null;
      const count = data.count || newSituations.length;

      const normalized = normalizeSituationEntries(newSituations);

      if (append) {
        setSituations((prev) => [...prev, ...normalized]);
        if (!hasActiveFilters(filters)) {
          setFilteredSituations((prev) => [...prev, ...normalized]);
        }
      } else {
        setSituations(normalized);
        if (!hasActiveFilters(filters)) {
          setFilteredSituations(normalized);
        }
      }

      setNextPageUrl(next);
      setTotalCount(count);
    } catch (error) {
      console.error("Erreur lors du chargement des situations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllSituationsForFilter = async () => {
    if (allSituationsForFilter) return allSituationsForFilter;

    try {
      setIsLoading(true);
      const response = await axios.get("/api/situations/?page_size=1000");
      const data = response.data;
      const allItems = sortByNewestFirst(
        normalizeSituationEntries(data.results || data)
      );
      setAllSituationsForFilter(allItems);
      return allItems;
    } catch (error) {
      console.error("Erreur lors du chargement des situations pour filtre:", error);
      return situations;
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (items, activeFilters) =>
    items.filter((situation) =>
      Object.keys(activeFilters).every((key) => {
        if (!activeFilters[key] || activeFilters[key] === "Tous") return true;

        switch (key) {
          case "numero_situation":
            return situation.numero_situation
              ?.toLowerCase()
              .includes(activeFilters[key].toLowerCase());
          case "chantier_name":
            return situation.chantier_name
              ?.toLowerCase()
              .includes(activeFilters[key].toLowerCase());
          case "client_name":
            return situation.client_name
              ?.toLowerCase()
              .includes(activeFilters[key].toLowerCase());
          case "periode":
            return `${situation.mois}/${formatYear(situation.annee)}`.includes(
              activeFilters[key]
            );
          case "pourcentage_avancement":
            return situation.pourcentage_avancement
              ?.toString()
              .includes(activeFilters[key]);
          case "montant_apres_retenues":
            return situation.montant_apres_retenues
              ?.toString()
              .includes(activeFilters[key]);
          case "statut":
            return situation.statut === activeFilters[key];
          default:
            return true;
        }
      })
    );

  const handleFilterChange = (field) => async (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);

    if (hasActiveFilters(newFilters)) {
      const allItems = await loadAllSituationsForFilter();
      setFilteredSituations(applyFilters(allItems, newFilters));
    } else {
      setFilteredSituations(situations);
      setAllSituationsForFilter(null);
    }
  };

  const handleLoadMore = () => {
    if (nextPageUrl && !isLoading) {
      fetchSituations(nextPageUrl, true);
    }
  };

  const situationsToDisplay = filteredSituations;
  const hasMoreSituations =
    !hasActiveFilters(filters) && nextPageUrl !== null;

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sorted = [...filteredSituations].sort((a, b) => {
      if (property === "montant_apres_retenues" || property === "pourcentage_avancement") {
        return (isAsc ? 1 : -1) * (parseFloat(a[property]) - parseFloat(b[property]));
      }
      if (property === "date_creation") {
        const dateA = a.date_creation
          ? new Date(a.date_creation).getTime()
          : a.annee * 100 + a.mois;
        const dateB = b.date_creation
          ? new Date(b.date_creation).getTime()
          : b.annee * 100 + b.mois;
        return (isAsc ? 1 : -1) * (dateA - dateB);
      }
      return (isAsc ? 1 : -1) * (a[property] < b[property] ? -1 : 1);
    });

    setFilteredSituations(sorted);
  };

  const handlePreviewSituation = (situationId) => {
    window.open(`/api/preview-situation/${situationId}/`, "_blank");
  };

  const handleDeleteClick = (situation) => {
    setSituationToDelete(situation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!situationToDelete) return;

    try {
      await axios.delete(`/api/situations/${situationToDelete.id}/`);

      setSituations((prev) => prev.filter((s) => s.id !== situationToDelete.id));
      setFilteredSituations((prev) =>
        prev.filter((s) => s.id !== situationToDelete.id)
      );
      setTotalCount((prev) => Math.max(0, prev - 1));
      setAllSituationsForFilter(null);

      setDeleteDialogOpen(false);
      setSituationToDelete(null);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression de la situation");
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSituationToDelete(null);
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        width: "100%",
        maxWidth: "1400px",
        height: "auto",
        padding: "20px",
        paddingBottom: "70px",
        borderRadius: "10px",
        boxShadow: "6px 7px 20px -6px rgba(33, 33, 33, 1)",
        margin: "20px auto",
      }}
    >
      <StyledBox>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontFamily: "Merriweather, serif",
            position: "relative",
            marginBottom: "20px",
          }}
        >
          Liste des Situations
        </Typography>

        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow />
              <TableRow>
                <FilterCell>
                  <StyledTextField
                    label="N° Situation"
                    variant="standard"
                    value={filters.numero_situation}
                    onChange={handleFilterChange("numero_situation")}
                  />
                </FilterCell>
                <FilterCell>
                  <StyledTextField
                    label="Chantier"
                    variant="standard"
                    value={filters.chantier_name}
                    onChange={handleFilterChange("chantier_name")}
                  />
                </FilterCell>
                <FilterCell>
                  <StyledTextField
                    label="Société"
                    variant="standard"
                    value={filters.client_name}
                    onChange={handleFilterChange("client_name")}
                  />
                </FilterCell>
                <FilterCell>
                  <StyledTextField
                    label="Période"
                    variant="standard"
                    value={filters.periode}
                    onChange={handleFilterChange("periode")}
                    placeholder="MM/AA"
                  />
                </FilterCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "pourcentage_avancement"}
                    direction={
                      orderBy === "pourcentage_avancement" ? order : "asc"
                    }
                    onClick={() => handleSort("pourcentage_avancement")}
                  >
                    <PriceTextField
                      label="% Avancement"
                      variant="standard"
                      value={filters.pourcentage_avancement}
                      onChange={handleFilterChange("pourcentage_avancement")}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "montant_apres_retenues"}
                    direction={
                      orderBy === "montant_apres_retenues" ? order : "asc"
                    }
                    onClick={() => handleSort("montant_apres_retenues")}
                  >
                    <PriceTextField
                      label="Montant Total"
                      variant="standard"
                      value={filters.montant_apres_retenues}
                      onChange={handleFilterChange("montant_apres_retenues")}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <FilterCell>
                  <StyledSelect
                    value={filters.statut}
                    onChange={handleFilterChange("statut")}
                    variant="standard"
                    sx={{ pt: "10px" }}
                  >
                    <MenuItem value="Tous">Tous</MenuItem>
                    {statusOptions.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </StyledSelect>
                </FilterCell>
                <FilterCell>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "white",
                      fontWeight: "bold",
                      textAlign: "center",
                      pt: "10px",
                    }}
                  >
                    Actions
                  </Typography>
                </FilterCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {situationsToDisplay.map((situation) => (
                <TableRow key={situation.id}>
                  <DevisNumber
                    onClick={() => handlePreviewSituation(situation.id)}
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                  >
                    {situation.numero_situation}
                  </DevisNumber>
                  <ChantierCell>{situation.chantier_name}</ChantierCell>
                  <CenteredTableCell>{situation.client_name}</CenteredTableCell>
                  <CenteredTableCell>
                    {`${situation.mois}/${formatYear(situation.annee)}`}
                  </CenteredTableCell>
                  <CenteredTableCell>
                    {formatNumber(situation.pourcentage_avancement)}%
                  </CenteredTableCell>
                  <CenteredTableCell
                    style={{ fontWeight: 600, color: green[500] }}
                  >
                    {formatNumber(situation.montant_apres_retenues)} €
                  </CenteredTableCell>
                  <StatusCell status={formatStatusLabel(situation.statut)}>
                    {formatStatusLabel(situation.statut)}
                  </StatusCell>
                  <CenteredTableCell>
                    <RegeneratePDFIconButton
                      documentType={DOCUMENT_TYPES.SITUATION}
                      documentData={{
                        ...situation,
                        chantier: {
                          id: situation.chantier || situation.chantier_id,
                          chantier_name: situation.chantier_name,
                          societe: { nom_societe: situation.societe_name },
                        },
                      }}
                      size="small"
                      color="primary"
                      tooltipPlacement="top"
                    />
                    <IconButton
                      onClick={() => handleDeleteClick(situation)}
                      sx={{
                        color: "error.main",
                        "&:hover": {
                          backgroundColor: "error.light",
                          color: "white",
                        },
                      }}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CenteredTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>

        {isLoading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 2,
              mt: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Chargement...
            </Typography>
          </Box>
        )}

        {hasMoreSituations && !isLoading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 2,
              mt: 1,
              borderTop: "1px solid #e0e0e0",
            }}
          >
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                px: 4,
              }}
            >
              Afficher plus ({totalCount - situations.length} restants)
            </Button>
          </Box>
        )}

        {!isLoading && situationsToDisplay.length === 0 && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Aucune situation trouvée
            </Typography>
          </Box>
        )}
      </StyledBox>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirmer la suppression
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Êtes-vous sûr de vouloir supprimer la situation{" "}
            <strong>{situationToDelete?.numero_situation}</strong> ?
            <br />
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Annuler
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ListeSituation;
