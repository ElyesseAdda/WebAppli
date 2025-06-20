import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
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
import { TfiMore } from "react-icons/tfi";
import {
  AlignedCell,
  CenteredTableCell,
  CenteredTextField,
  DevisNumber,
  FilterCell,
  PriceTextField,
  StatusCell,
  StyledBox,
  StyledSelect,
  StyledTableContainer,
  StyledTextField,
} from "../../styles/tableStyles";
import StatusChangeModal from "../StatusChangeModal";

const formatNumber = (number) =>
  number?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const ChantierListeFactures = ({ chantierData }) => {
  const [factures, setFactures] = useState([]);
  const [filteredFactures, setFilteredFactures] = useState([]);
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [filters, setFilters] = useState({
    numero_facture: "",
    date_creation: "",
    montant: "",
    state_facture: "Tous",
    type_facture: "Tous",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [factureToUpdate, setFactureToUpdate] = useState(null);

  const statusOptions = ["En cours", "Attente paiement", "Payée"];

  useEffect(() => {
    fetchFactures();
  }, [chantierData?.id]);

  const fetchFactures = async () => {
    try {
      const response = await axios.get("/api/facture/");
      const facturesData = response.data.filter(
        (f) => f.chantier === chantierData.id
      );
      setFactures(facturesData);
      setFilteredFactures(facturesData);
    } catch (error) {
      setFactures([]);
      setFilteredFactures([]);
    }
  };

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);

    let filtered = factures.filter((facture) => {
      return Object.keys(newFilters).every((key) => {
        if (!newFilters[key] || newFilters[key] === "Tous") return true;

        switch (key) {
          case "numero_facture":
            return facture.numero
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());
          case "date_creation":
            if (!newFilters[key]) return true;
            const factureDate = new Date(facture.date_creation)
              .toISOString()
              .split("T")[0];
            return factureDate === newFilters[key];
          case "montant":
            const factureMontant = facture.price_ttc?.toString() || "";
            return factureMontant.includes(newFilters[key]);
          case "state_facture":
            return facture.state_facture === newFilters[key];
          case "type_facture":
            if (newFilters[key] === "Tous") return true;
            if (newFilters[key] === "ts") {
              return (
                facture.type_facture !== "cie" &&
                facture.type_facture !== "classique"
              );
            }
            return facture.type_facture === newFilters[key];
          default:
            return true;
        }
      });
    });

    setFilteredFactures(filtered);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sorted = [...filteredFactures].sort((a, b) => {
      if (property === "date_creation") {
        return (
          (isAsc ? 1 : -1) *
          (new Date(a[property]).getTime() - new Date(b[property]).getTime())
        );
      }
      if (property === "price_ttc") {
        return (
          (isAsc ? 1 : -1) * (parseFloat(a[property]) - parseFloat(b[property]))
        );
      }
      return (isAsc ? 1 : -1) * (a[property] < b[property] ? -1 : 1);
    });

    setFilteredFactures(sorted);
  };

  const handlePreviewFacture = (factureId) => {
    window.open(`/api/preview-facture/${factureId}/`, "_blank");
  };

  const handleMenuClick = (event, facture) => {
    setAnchorEl(event.currentTarget);
    setSelectedFacture(facture);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedFacture(null);
  };

  const handleDeleteFacture = async () => {
    if (!selectedFacture) return;
    try {
      await axios.delete(`/api/facture/${selectedFacture.id}/`);
      fetchFactures();
      handleClose();
      setDeleteDialogOpen(false);
    } catch (error) {
      alert("Erreur lors de la suppression de la facture.");
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const handleChangeStatus = () => {
    setFactureToUpdate(selectedFacture);
    setShowStatusModal(true);
    handleClose();
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      if (!factureToUpdate) return;
      await axios.put(`/api/facture/${factureToUpdate.id}/update_status/`, {
        state_facture: newStatus,
      });
      fetchFactures();
      setShowStatusModal(false);
      setFactureToUpdate(null);
    } catch (error) {
      alert("Erreur lors de la modification du statut");
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        width: "100%",
        maxWidth: "1400px",
        height: "auto",
        padding: "20px",
        paddingBottom: "30px",
        borderRadius: "10px",
        boxShadow: "6px 7px 20px -6px rgba(33, 33, 33, 1)",
        margin: "20px auto",
      }}
    >
      <StyledBox>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontFamily: "Merriweather, serif",
            position: "relative",
            marginBottom: "20px",
          }}
        >
          Factures du chantier
        </Typography>

        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <FilterCell>
                  <StyledTextField
                    label="Numéro"
                    variant="standard"
                    value={filters.numero_facture}
                    onChange={handleFilterChange("numero_facture")}
                  />
                </FilterCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "date_creation"}
                    direction={orderBy === "date_creation" ? order : "asc"}
                    onClick={() => handleSort("date_creation")}
                    sx={{ textAlign: "center" }}
                  >
                    <CenteredTextField
                      variant="standard"
                      type="date"
                      value={filters.date_creation}
                      onChange={handleFilterChange("date_creation")}
                      InputLabelProps={{ shrink: true }}
                      sx={{ pt: "15px" }}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "price_ttc"}
                    direction={orderBy === "price_ttc" ? order : "asc"}
                    onClick={() => handleSort("price_ttc")}
                    sx={{ textAlign: "center" }}
                  >
                    <PriceTextField
                      label="Prix TTC"
                      variant="standard"
                      value={filters.montant}
                      onChange={handleFilterChange("montant")}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <FilterCell>
                  <StyledSelect
                    value={filters.type_facture || "Tous"}
                    onChange={handleFilterChange("type_facture")}
                    variant="standard"
                    sx={{ pt: "10px" }}
                  >
                    <MenuItem value="Tous">Tous</MenuItem>
                    <MenuItem value="cie">CIE</MenuItem>
                    <MenuItem value="classique">Classique</MenuItem>
                    <MenuItem value="ts">TS</MenuItem>
                  </StyledSelect>
                </FilterCell>
                <FilterCell>
                  <StyledSelect
                    value={filters.state_facture}
                    onChange={handleFilterChange("state_facture")}
                    variant="standard"
                    sx={{ pt: "10px" }}
                  >
                    <MenuItem value="Tous">Tous</MenuItem>
                    <MenuItem value="En cours">En cours</MenuItem>
                    <MenuItem value="Attente paiement">
                      Attente paiement
                    </MenuItem>
                    <MenuItem value="Payée">Payée</MenuItem>
                  </StyledSelect>
                </FilterCell>
                <FilterCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFactures.map((facture, idx) => (
                <TableRow
                  key={facture.id}
                  hover
                  sx={{ backgroundColor: idx % 2 === 0 ? "#fafafa" : "#fff" }}
                >
                  <DevisNumber
                    onClick={() => handlePreviewFacture(facture.id)}
                    sx={{ cursor: "pointer", fontWeight: 700 }}
                  >
                    {facture.numero}
                  </DevisNumber>
                  <CenteredTableCell>
                    {new Date(facture.date_creation).toLocaleDateString()}
                  </CenteredTableCell>
                  <CenteredTableCell
                    sx={{ fontWeight: 600, color: green[500] }}
                  >
                    {formatNumber(facture.price_ttc)} €
                  </CenteredTableCell>
                  <CenteredTableCell>
                    {facture.type_facture === "cie"
                      ? "CIE"
                      : facture.type_facture === "classique"
                      ? "Classique"
                      : "TS"}
                  </CenteredTableCell>
                  <StatusCell
                    sx={{
                      color:
                        facture.state_facture === "Payée"
                          ? "#4caf50"
                          : facture.state_facture === "Attente paiement"
                          ? "#ff9800"
                          : facture.state_facture === "En cours"
                          ? "#f44336"
                          : "#666",
                      fontWeight: 600,
                    }}
                  >
                    {facture.state_facture}
                  </StatusCell>
                  <CenteredTableCell sx={{ width: "60px", padding: "0 8px" }}>
                    <IconButton onClick={(e) => handleMenuClick(e, facture)}>
                      <TfiMore size={16} color="#666" />
                    </IconButton>
                  </CenteredTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      </StyledBox>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: 2,
            minWidth: 150,
          },
        }}
      >
        <MenuItem onClick={() => handlePreviewFacture(selectedFacture?.id)}>
          Voir la facture
        </MenuItem>
        <MenuItem onClick={handleChangeStatus}>Modifier le statut</MenuItem>
        <MenuItem
          onClick={handleDeleteClick}
          sx={{
            color: "error.main",
            "&:hover": {
              backgroundColor: "error.light",
              color: "error.contrastText",
            },
          }}
        >
          Supprimer
        </MenuItem>
      </Menu>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            padding: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          Confirmation de suppression
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer la facture{" "}
            {selectedFacture?.numero} ?
            <br />
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleDeleteFacture}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setFactureToUpdate(null);
        }}
        currentStatus={factureToUpdate?.state_facture}
        onStatusChange={handleStatusUpdate}
        type="facture"
        title="Modifier l'état de la facture"
      />
    </div>
  );
};

export default ChantierListeFactures;
