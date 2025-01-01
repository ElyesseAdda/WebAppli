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
  Typography,
} from "@mui/material";
import { green } from "@mui/material/colors";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { TfiMore } from "react-icons/tfi";
import { TiWarning } from "react-icons/ti";
import { Link } from "react-router-dom";
import {
  AlignedCell,
  CenteredTableCell,
  CenteredTextField,
  ChantierCell,
  DevisNumber,
  FilterCell,
  PriceTextField,
  StyledBox,
  StyledTableContainer,
} from "../styles/tableStyles";

const ListeFactures = () => {
  const [factures, setFactures] = useState([]);
  const [filteredFactures, setFilteredFactures] = useState([]);
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [filters, setFilters] = useState({
    numero_facture: "",
    client: "",
    chantier: "",
    date_creation: "",
    montant: "",
  });
  const [chantierDetails, setChantierDetails] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
      const facturesWithDetails = await Promise.all(
        response.data.map(async (facture) => {
          if (facture.chantier) {
            const details = await fetchChantierDetails(facture.chantier);
            return {
              ...facture,
              chantierDetails: details,
            };
          }
          return facture;
        })
      );
      setFactures(facturesWithDetails);
      setFilteredFactures(facturesWithDetails);
    } catch (error) {
      // Gérer l'erreur silencieusement
    }
  };

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);

    let filtered = factures.filter((facture) => {
      const result = Object.keys(newFilters).every((key) => {
        if (!newFilters[key]) return true;

        switch (key) {
          case "numero_facture":
            return facture.numero_facture
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());

          case "client":
            const clientName =
              facture.chantierDetails?.societe?.client?.nom ||
              `${facture.chantierDetails?.societe?.client?.name} ${facture.chantierDetails?.societe?.client?.surname}` ||
              "";
            return clientName
              .toLowerCase()
              .includes(newFilters[key].toLowerCase());

          case "chantier":
            return facture.chantierDetails?.nom
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());

          case "date_creation":
            const factureDate = new Date(
              facture.date_creation
            ).toLocaleDateString();
            return factureDate.includes(newFilters[key]);

          case "montant":
            const factureMontant = facture.price_ttc?.toString() || "";
            return factureMontant.includes(newFilters[key]);

          default:
            return true;
        }
      });
      return result;
    });

    setFilteredFactures(filtered);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sorted = [...filteredFactures].sort((a, b) => {
      if (property === "montant_ttc") {
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
      <Typography variant="h5" sx={{ mb: 3 }}>
        Liste des Factures
      </Typography>

      <StyledBox>
        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <FilterCell sx={{ textAlign: "left" }}>
                  <CenteredTextField
                    placeholder="N° Facture"
                    value={filters.numero_facture}
                    onChange={handleFilterChange("numero_facture")}
                  />
                </FilterCell>
                <FilterCell>
                  <CenteredTextField
                    placeholder="Client"
                    value={filters.client}
                    onChange={handleFilterChange("client")}
                  />
                </FilterCell>
                <FilterCell>
                  <CenteredTextField
                    placeholder="Chantier"
                    value={filters.chantier}
                    onChange={handleFilterChange("chantier")}
                  />
                </FilterCell>
                <FilterCell>
                  <CenteredTextField
                    placeholder="Date d'échéance"
                    value={filters.date_creation}
                    onChange={handleFilterChange("date_creation")}
                  />
                </FilterCell>
                <FilterCell>
                  <PriceTextField
                    placeholder="Montant T.T.C"
                    value={filters.montant}
                    onChange={handleFilterChange("montant")}
                  />
                </FilterCell>
                <FilterCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFactures.map((facture) => {
                return (
                  <TableRow key={facture.id}>
                    <DevisNumber
                      onClick={() => handlePreviewFacture(facture.id)}
                      sx={{ cursor: "pointer", fontWeight: 700 }}
                    >
                      {facture.numero_facture}
                    </DevisNumber>
                    <AlignedCell
                      sx={{ backgroundColor: "white", textAlign: "center" }}
                    >
                      {facture.chantierDetails?.societe?.client?.nom ||
                        `${facture.chantierDetails?.societe?.client?.name} ${facture.chantierDetails?.societe?.client?.surname}` ||
                        "Non assigné"}
                    </AlignedCell>
                    <ChantierCell sx={{ textAlign: "center" }}>
                      <Link to={`/chantier/${facture.chantier}`}>
                        {facture.chantierDetails?.nom || "Non assigné"}
                      </Link>
                    </ChantierCell>
                    <CenteredTableCell>
                      {new Date(facture.date_creation).toLocaleDateString()}
                    </CenteredTableCell>
                    <CenteredTableCell
                      sx={{
                        fontWeight: 600,
                        color: green[500],
                      }}
                    >
                      <div sx={{ display: "flex", flexDirection: "column" }}>
                        <p sx={{ fontSize: "14px" }}>{facture.price_ttc} €</p>
                      </div>
                    </CenteredTableCell>
                    <CenteredTableCell sx={{ width: "60px", padding: "0 8px" }}>
                      <IconButton
                        onClick={(e) => handleMenuClick(e, facture)}
                        sx={{
                          width: 35,
                          height: 35,
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                          "&:hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.08)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          },
                          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          borderRadius: "50%",
                        }}
                      >
                        <TfiMore size={16} color="#666" />
                      </IconButton>
                    </CenteredTableCell>
                  </TableRow>
                );
              })}
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
            <strong>{selectedFacture?.numero_facture}</strong> ?
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
    </div>
  );
};

export default ListeFactures;
