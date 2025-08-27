import DeleteIcon from "@mui/icons-material/Delete";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
  DevisNumber,
  FilterCell,
  PriceTextField,
  StatusCell,
  StyledBox,
  StyledSelect,
  StyledTableContainer,
  StyledTextField,
} from "../styles/tableStyles";

const formatNumber = (number) => {
  return number?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const getMonthName = (monthNumber) => {
  const months = [
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
  return months[monthNumber - 1];
};

const formatYear = (year) => {
  return year.toString().slice(-2);
};

const ListeSituation = () => {
  const [chantiers, setChantiers] = useState([]);
  const [selectedChantierId, setSelectedChantierId] = useState("");
  const [situations, setSituations] = useState([]);
  const [filteredSituations, setFilteredSituations] = useState([]);
  const [filters, setFilters] = useState({
    numero_situation: "",
    mois: "",
    annee: "",
    pourcentage_avancement: "",
    montant_apres_retenues: "",
    statut: "Tous",
  });
  const [orderBy, setOrderBy] = useState("date_creation");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [situationToDelete, setSituationToDelete] = useState(null);

  const statusOptions = ["brouillon", "validee", "facturee"];

  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/chantier/");
        setChantiers(response.data);
        if (response.data.length > 0) {
          setSelectedChantierId(response.data[0].id);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des chantiers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChantiers();
  }, []);

  useEffect(() => {
    if (selectedChantierId) {
      fetchSituations();
    }
  }, [selectedChantierId]);

  const fetchSituations = async () => {
    if (!selectedChantierId) return;

    try {
      const response = await axios.get(
        `/api/chantier/${selectedChantierId}/situations/`
      );
      setSituations(response.data);
      setFilteredSituations(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des situations:", error);
    }
  };

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);

    let filtered = situations.filter((situation) => {
      return Object.keys(newFilters).every((key) => {
        if (!newFilters[key] || newFilters[key] === "Tous") return true;

        switch (key) {
          case "numero_situation":
            return situation.numero_situation
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());
          case "mois":
            return situation.mois.toString().includes(newFilters[key]);
          case "annee":
            return situation.annee.toString().includes(newFilters[key]);
          case "pourcentage_avancement":
            return situation.pourcentage_avancement
              .toString()
              .includes(newFilters[key]);
          case "montant_apres_retenues":
            return situation.montant_apres_retenues
              .toString()
              .includes(newFilters[key]);
          case "statut":
            return situation.statut === newFilters[key];
          default:
            return true;
        }
      });
    });

    setFilteredSituations(filtered);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sorted = [...filteredSituations].sort((a, b) => {
      if (property === "montant_apres_retenues") {
        return (isAsc ? 1 : -1) * (a[property] - b[property]);
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

      // Mettre à jour la liste des situations
      setSituations((prevSituations) =>
        prevSituations.filter((s) => s.id !== situationToDelete.id)
      );

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

  if (loading) {
    return (
      <Typography variant="body1" sx={{ textAlign: "center", mt: 3 }}>
        Chargement des chantiers...
      </Typography>
    );
  }

  if (chantiers.length === 0) {
    return (
      <Typography variant="body1" sx={{ textAlign: "center", mt: 3 }}>
        Aucun chantier disponible
      </Typography>
    );
  }

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

        <Select
          value={selectedChantierId}
          onChange={(e) => setSelectedChantierId(e.target.value)}
          variant="standard"
          sx={{
            mb: 3,
            minWidth: 200,
            color: "rgba(27, 120, 188, 1)",
            fontWeight: "bold",
          }}
        >
          Mois :
          {chantiers.map((chantier) => (
            <MenuItem key={chantier.id} value={chantier.id}>
              {chantier.chantier_name}
            </MenuItem>
          ))}
        </Select>

        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <FilterCell>
                  <StyledTextField
                    label="N° Situation"
                    variant="standard"
                    value={filters.numero_situation}
                    onChange={handleFilterChange("numero_situation")}
                    sx={{
                      "& .MuiInputBase-input": {
                        color: "rgba(27, 120, 188, 1)",
                        fontWeight: "bold",
                      },
                    }}
                  />
                </FilterCell>
                <FilterCell>
                  <StyledTextField
                    label="Période"
                    variant="standard"
                    value={filters.mois}
                    onChange={handleFilterChange("mois")}
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
                  >
                    <MenuItem value="Tous">Tous</MenuItem>
                    {statusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </StyledSelect>
                </FilterCell>
                <FilterCell>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "rgba(27, 120, 188, 1)",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    Actions
                  </Typography>
                </FilterCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSituations.map((situation) => (
                <TableRow key={situation.id}>
                  <DevisNumber
                    onClick={() => handlePreviewSituation(situation.id)}
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                  >
                    {situation.numero_situation}
                  </DevisNumber>
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
                  <StatusCell status={situation.statut}>
                    {situation.statut}
                  </StatusCell>
                  <CenteredTableCell>
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
      </StyledBox>

      {/* Modal de confirmation de suppression */}
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
