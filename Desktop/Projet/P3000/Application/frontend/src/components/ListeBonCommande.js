import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import axios from "axios";
import fr from "date-fns/locale/fr";
import React, { useCallback, useEffect, useState } from "react";
import { TfiMore } from "react-icons/tfi";
import {
  AlignedCell,
  CenteredTableCell,
  CenteredTextField,
  ChantierCell,
  DevisNumber,
  FilterCell,
  StyledBox,
  StyledTableContainer,
  StyledTextField,
} from "../styles/tableStyles";
import BonCommandeForm from "./BonCommandeForm";

const ListeBonCommande = () => {
  const [bonsCommande, setBonsCommande] = useState([]);
  const [filteredBonsCommande, setFilteredBonsCommande] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    numero: "",
    chantier_name: "",
    fournisseur: "",
    date_creation: "",
    montant_total: "",
    statut: "",
  });
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [anchorEl, setAnchorEl] = useState(null);
  const [statusAnchorEl, setStatusAnchorEl] = useState(null);
  const [selectedBC, setSelectedBC] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [date, setDate] = useState(null);
  const [magasin, setMagasin] = useState("");
  const [magasins, setMagasins] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const fetchBonsCommande = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const response = await axios.get("/api/bons-commande/");
      setBonsCommande(response.data);
      setFilteredBonsCommande(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des bons de commande:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBonCommandeCreated = useCallback(() => {
    fetchBonsCommande();
  }, []);

  useEffect(() => {
    fetchBonsCommande();
  }, []);

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);

    let filtered = bonsCommande.filter((bc) => {
      return Object.keys(newFilters).every((key) => {
        if (!newFilters[key]) return true;

        switch (key) {
          case "numero":
            return bc.numero
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());
          case "chantier_name":
            return bc.chantier_name
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());
          case "fournisseur":
            return bc.fournisseur
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());
          case "date_creation":
            if (!newFilters[key]) return true;
            const bcDate = new Date(bc.date_creation)
              .toISOString()
              .split("T")[0];
            return bcDate === newFilters[key];
          case "montant_total":
            if (!newFilters[key]) return true;
            return parseFloat(bc.montant_total) === parseFloat(newFilters[key]);
          case "statut":
            if (!newFilters[key]) return true;
            return bc.statut
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());
          default:
            return true;
        }
      });
    });

    setFilteredBonsCommande(filtered);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sortedBCs = [...filteredBonsCommande].sort((a, b) => {
      if (property === "date_creation") {
        return (
          (isAsc ? 1 : -1) * (new Date(a[property]) - new Date(b[property]))
        );
      }
      return (isAsc ? 1 : -1) * (a[property] < b[property] ? -1 : 1);
    });

    setFilteredBonsCommande(sortedBCs);
  };

  const handleMenuOpen = (event, bc) => {
    setAnchorEl(event.currentTarget);
    setSelectedBC(bc);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedBC(null);
  };

  const handleStatusMenuOpen = () => {
    handleClose();
    setStatusAnchorEl(anchorEl);
    setSelectedBC(selectedBC);
  };

  const handleStatusMenuClose = () => {
    setStatusAnchorEl(null);
  };

  const loadMagasins = async (fournisseur) => {
    try {
      const response = await axios.get(
        `/api/fournisseur-magasins/?fournisseur=${fournisseur}`
      );
      setMagasins(response.data.map((m) => m.magasin));
    } catch (error) {
      console.error("Erreur lors du chargement des magasins:", error);
    }
  };

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    if (status === "retrait_magasin" && selectedBC) {
      loadMagasins(selectedBC.fournisseur);
    }
    setStatusModalOpen(true);
    handleStatusMenuClose();
  };

  const handleStatusConfirm = async () => {
    try {
      const formattedDate = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(date.getDate()).padStart(2, "0")}`
        : null;

      const data = {
        statut: selectedStatus,
        date_livraison: formattedDate,
        magasin_retrait: magasin || "",
      };

      console.log("Data envoyée à l'API:", data);

      await axios.patch(`/api/update-bon-commande/${selectedBC.id}/`, data);
      fetchBonsCommande();
      setStatusModalOpen(false);
      setDate(null);
      setMagasin("");
      setInputValue("");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      console.error("Data qui a causé l'erreur:", date);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  const handlePreviewBonCommande = (bonCommandeId) => {
    window.open(`/api/preview-saved-bon-commande/${bonCommandeId}/`, "_blank");
  };

  const handleModifyBC = () => {
    if (selectedBC) {
      window.location.href = `/ModificationBC/${selectedBC.id}`;
    }
    handleClose();
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
      <StyledBox
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "right",
          mb: 3,
        }}
      >
        <Typography variant="h5">Liste des Bons de Commande</Typography>
        <BonCommandeForm onBonCommandeCreated={handleBonCommandeCreated} />
      </StyledBox>

      <StyledTableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <FilterCell>
                <StyledTextField
                  label="N° BC"
                  variant="standard"
                  value={filters.numero}
                  onChange={handleFilterChange("numero")}
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
                  label="Fournisseur"
                  variant="standard"
                  value={filters.fournisseur}
                  onChange={handleFilterChange("fournisseur")}
                />
              </FilterCell>
              <FilterCell>
                <CenteredTextField
                  label=""
                  variant="standard"
                  type="date"
                  value={filters.date_creation}
                  onChange={handleFilterChange("date_creation")}
                  InputLabelProps={{ shrink: true }}
                  sx={{ pt: "15px" }}
                />
              </FilterCell>
              <FilterCell sx={{ textAlign: "center" }}>
                <StyledTextField
                  label="Montant"
                  variant="standard"
                  value={filters.montant_total}
                  onChange={handleFilterChange("montant_total")}
                  sx={{ textAlign: "center" }}
                />
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  label="Statut"
                  variant="standard"
                  value={filters.statut}
                  onChange={handleFilterChange("statut")}
                />
              </FilterCell>
              <FilterCell />
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredBonsCommande.map((bc) => (
              <TableRow key={bc.id} hover>
                <DevisNumber
                  onClick={() => handlePreviewBonCommande(bc.id)}
                  style={{ cursor: "pointer", fontWeight: 700 }}
                >
                  {bc.numero}
                </DevisNumber>
                <ChantierCell>{bc.chantier_name}</ChantierCell>
                <AlignedCell
                  sx={{
                    backgroundColor: "white",
                    color: "rgba(27, 120, 188, 1)",
                    fontWeight: 700,
                  }}
                >
                  {bc.fournisseur}
                </AlignedCell>
                <CenteredTableCell>
                  {new Date(bc.date_creation).toLocaleDateString()}
                </CenteredTableCell>

                <CenteredTableCell sx={{ textAlign: "center" }}>
                  {parseFloat(bc.montant_total).toFixed(2)} €
                </CenteredTableCell>
                <CenteredTableCell>
                  {bc.statut === "en_attente" && (
                    <span
                      style={{
                        color: "#FFA500",
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      En attente Livraison
                    </span>
                  )}
                  {bc.statut === "livre_chantier" && (
                    <span
                      style={{
                        color: "#4CAF50",
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      Livré Chantier
                    </span>
                  )}
                  {bc.statut === "retrait_magasin" && (
                    <span
                      style={{
                        color: "rgba(27, 120, 188, 1)",
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      Retrait Magasin
                    </span>
                  )}
                </CenteredTableCell>
                <CenteredTableCell>
                  <IconButton onClick={(e) => handleMenuOpen(e, bc)}>
                    <TfiMore />
                  </IconButton>
                </CenteredTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleModifyBC}>Modifier BC</MenuItem>
        <MenuItem onClick={handleStatusMenuOpen}>Modifier le statut</MenuItem>
      </Menu>

      <Menu
        anchorEl={statusAnchorEl}
        open={Boolean(statusAnchorEl)}
        onClose={handleStatusMenuClose}
      >
        <MenuItem onClick={() => handleStatusChange("en_attente")}>
          En attente Livraison
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange("livre_chantier")}>
          Livré Chantier
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange("retrait_magasin")}>
          Retrait Magasin
        </MenuItem>
      </Menu>

      <Dialog open={statusModalOpen} onClose={() => setStatusModalOpen(false)}>
        <DialogTitle>
          {selectedStatus === "en_attente"
            ? "En attente Livraison"
            : selectedStatus === "livre_chantier"
            ? "Livré Chantier"
            : "Retrait Magasin"}
        </DialogTitle>
        <DialogContent>
          {selectedStatus !== "en_attente" && (
            <LocalizationProvider
              dateAdapter={AdapterDateFns}
              adapterLocale={fr}
            >
              <DatePicker
                label="Date de livraison"
                value={date}
                onChange={(newDate) => setDate(newDate)}
                renderInput={(params) => (
                  <TextField {...params} fullWidth sx={{ mt: 2 }} />
                )}
              />
            </LocalizationProvider>
          )}

          {selectedStatus === "retrait_magasin" && (
            <Autocomplete
              freeSolo
              value={magasin}
              onChange={(event, newValue) => {
                setMagasin(newValue);
              }}
              inputValue={inputValue}
              onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
              }}
              options={magasins}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Magasin"
                  fullWidth
                  sx={{ mt: 2 }}
                />
              )}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusModalOpen(false)}>Annuler</Button>
          <Button onClick={handleStatusConfirm} variant="contained">
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ListeBonCommande;
