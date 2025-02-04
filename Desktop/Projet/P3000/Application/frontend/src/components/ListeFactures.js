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
import { FaFileInvoiceDollar } from "react-icons/fa";
import { TfiMore } from "react-icons/tfi";
import { TiWarning } from "react-icons/ti";
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
} from "../styles/tableStyles";
import StatusChangeModal from "./StatusChangeModal";

const ListeFactures = () => {
  const [factures, setFactures] = useState([]);
  const [filteredFactures, setFilteredFactures] = useState([]);
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [filters, setFilters] = useState({
    numero_facture: "",
    chantier_name: "",
    date_creation: "",
    montant: "",
    state_facture: "Tous",
  });
  const [chantierDetails, setChantierDetails] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [factureToUpdate, setFactureToUpdate] = useState(null);

  const statusOptions = ["En cours", "Attente paiement", "Payée"];

  useEffect(() => {
    fetchFactures();
  }, []);

  const fetchChantierDetails = async (chantierId) => {
    try {
      const response = await axios.get(`/api/chantier/${chantierId}/details/`);
      setChantierDetails((prevDetails) => ({
        ...prevDetails,
        [chantierId]: response.data,
      }));
      return response.data;
    } catch (error) {
      return null;
    }
  };

  const fetchFactures = async () => {
    try {
      const response = await axios.get("/api/facture/");
      const facturesData = response.data;

      // Plus besoin de recalculer le TTC puisqu'il est déjà dans la base de données
      setFactures(facturesData);
      setFilteredFactures(facturesData);
    } catch (error) {
      console.error("Erreur lors du chargement des factures:", error);
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

          case "chantier_name":
            return facture.chantier_name
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());

          case "date_creation":
            if (!newFilters[key]) return true;
            // Convertir la date de la facture au format YYYY-MM-DD pour la comparaison
            const factureDate = new Date(facture.date_creation)
              .toISOString()
              .split("T")[0];
            return factureDate === newFilters[key];

          case "montant":
            const factureMontant = facture.price_ttc?.toString() || "";
            return factureMontant.includes(newFilters[key]);

          case "state_facture":
            return facture.state_facture === newFilters[key];

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
      console.error("Erreur lors de la suppression de la facture:", error);
      alert(
        "Erreur lors de la suppression de la facture. " +
          (error.response?.data?.message || "Veuillez réessayer.")
      );
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Payée":
        return "#4caf50"; // vert
      case "Attente paiement":
        return "#ff9800"; // orange
      case "En cours":
        return "#f44336"; // rouge
      default:
        return "#666";
    }
  };

  const handleRedirectToDevis = (devisNumero) => {
    // Encode les paramètres pour l'URL
    const searchParams = new URLSearchParams({
      numero: devisNumero,
    }).toString();

    // Ouvre dans un nouvel onglet
    window.open(`/ListeDevis?${searchParams}`, "_blank");
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

      // Mise à jour locale des données
      setFactures(
        factures.map((f) =>
          f.id === factureToUpdate.id ? { ...f, state_facture: newStatus } : f
        )
      );
      setFilteredFactures(
        filteredFactures.map((f) =>
          f.id === factureToUpdate.id ? { ...f, state_facture: newStatus } : f
        )
      );

      setShowStatusModal(false);
      setFactureToUpdate(null);
    } catch (error) {
      console.error("Erreur lors de la modification du statut:", error);
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
          Liste des Factures
        </Typography>

        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow></TableRow>
              <TableRow>
                <FilterCell>
                  <StyledTextField
                    label="Numéro"
                    variant="standard"
                    value={filters.numero_facture}
                    onChange={handleFilterChange("numero_facture")}
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
              {filteredFactures.map((facture) => (
                <TableRow key={facture.id}>
                  <DevisNumber
                    onClick={() => handlePreviewFacture(facture.id)}
                    sx={{ cursor: "pointer", fontWeight: 700 }}
                  >
                    {facture.numero}
                  </DevisNumber>
                  <CenteredTableCell>
                    {facture.chantier_name}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRedirectToDevis(facture.devis_numero);
                      }}
                      sx={{
                        ml: 1,
                        width: 24,
                        height: 24,
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.08)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        },
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      }}
                      title="Voir le devis associé"
                    >
                      <FaFileInvoiceDollar size={14} color="#666" />
                    </IconButton>
                  </CenteredTableCell>
                  <CenteredTableCell>
                    {new Date(facture.date_creation).toLocaleDateString()}
                  </CenteredTableCell>
                  <CenteredTableCell
                    sx={{ fontWeight: 600, color: green[500] }}
                  >
                    {facture.price_ttc?.toFixed(2)} €
                  </CenteredTableCell>
                  <StatusCell
                    sx={{
                      color: getStatusColor(facture.state_facture),
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
          <TiWarning size={24} color="#f44336" />
          Confirmation de suppression
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer la facture{" "}
            <strong>{selectedFacture?.numero}</strong> ?
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

export default ListeFactures;
