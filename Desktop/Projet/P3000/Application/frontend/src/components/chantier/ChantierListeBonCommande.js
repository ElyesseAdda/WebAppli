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
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiPlusCircle } from "react-icons/fi";
import { TfiMore } from "react-icons/tfi";
import {
  CenteredTableCell,
  CenteredTextField,
  DevisNumber,
  FilterCell,
  StyledBox,
  StyledTableContainer,
  StyledTextField,
} from "../../styles/tableStyles";
import BonCommandeForm from "../BonCommandeForm";

const ChantierListeBonCommande = ({
  chantierId,
  initialFilters = {},
  onSaveFilters,
}) => {
  const [bonsCommande, setBonsCommande] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
  const [paymentStatusAnchorEl, setPaymentStatusAnchorEl] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const debounceTimeout = useRef(null);
  const isFirstRender = useRef(true);
  const prevChantierId = useRef();

  useEffect(() => {
    // Ne réinitialise les filtres que si le chantier change réellement
    if (chantierId !== prevChantierId.current) {
      setFilters(initialFilters);
      prevChantierId.current = chantierId;
    }
    // Sinon, ne rien faire (évite la réinitialisation à chaque réaffichage)
  }, [chantierId, initialFilters]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!onSaveFilters) return;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      onSaveFilters(filters);
    }, 500);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [filters, onSaveFilters]);

  const handleChange = (field) => (e) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const fetchBonsCommande = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const response = await axios.get("/api/bons-commande/");
      // Filtrer côté front sur le chantier courant
      const filtered = response.data.filter((bc) => bc.chantier === chantierId);
      setBonsCommande(filtered);
    } catch (error) {
      console.error("Erreur lors du chargement des bons de commande:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBonCommandeCreated = useCallback(() => {
    fetchBonsCommande();
  }, [chantierId]);

  useEffect(() => {
    fetchBonsCommande();
    // eslint-disable-next-line
  }, [chantierId]);

  // Calcul dynamique de la liste filtrée à chaque render
  const filteredBonsCommande = bonsCommande.filter((bc) => {
    return Object.keys(filters).every((key) => {
      if (!filters[key]) return true;
      switch (key) {
        case "numero":
          return bc.numero?.toLowerCase().includes(filters[key].toLowerCase());
        case "fournisseur":
          return bc.fournisseur
            ?.toLowerCase()
            .includes(filters[key].toLowerCase());
        case "date_creation":
          if (!filters[key]) return true;
          const bcDate = new Date(bc.date_creation).toISOString().split("T")[0];
          return bcDate === filters[key];
        case "montant_total":
          if (!filters[key]) return true;
          return parseFloat(bc.montant_total) === parseFloat(filters[key]);
        case "statut":
          if (!filters[key]) return true;
          return bc.statut?.toLowerCase().includes(filters[key].toLowerCase());
        default:
          return true;
      }
    });
  });

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
  };

  const handleMenuOpen = (event, bc) => {
    setAnchorEl(event.currentTarget);
    setSelectedBC(bc);
  };
  const handleClose = () => {
    setAnchorEl(null);
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
      await axios.patch(`/api/update-bon-commande/${selectedBC.id}/`, data);
      fetchBonsCommande();
      setStatusModalOpen(false);
      setDate(null);
      setMagasin("");
      setInputValue("");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
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
  const handleDeleteBC = async () => {
    if (!selectedBC) return;
    if (
      window.confirm("Êtes-vous sûr de vouloir supprimer ce bon de commande ?")
    ) {
      try {
        await axios.delete(`/api/delete-bons-commande/${selectedBC.id}/`);
        await fetchBonsCommande();
        handleClose();
      } catch (error) {
        console.error(
          "Erreur lors de la suppression du bon de commande:",
          error
        );
        alert("Erreur lors de la suppression du bon de commande");
      }
    }
  };
  const handlePaymentMenuOpen = () => {
    setPaymentModalOpen(true);
    handleClose();
  };
  const handlePaymentSubmit = async () => {
    if (!selectedBC) {
      alert("Veuillez sélectionner un bon de commande");
      return;
    }
    try {
      const montantPaye = parseFloat(paymentAmount);
      if (isNaN(montantPaye) || montantPaye <= 0) {
        alert("Veuillez entrer un montant valide");
        return;
      }
      let nouveauStatut;
      if (montantPaye >= selectedBC.montant_total) {
        nouveauStatut = "paye";
      } else if (montantPaye > 0) {
        nouveauStatut = "paye_partiel";
      } else {
        nouveauStatut = "non_paye";
      }
      const data = {
        montant_paye: montantPaye,
        statut_paiement: nouveauStatut,
        date_paiement: new Date().toISOString().split("T")[0],
      };
      await axios.patch(`/api/bons-commande/${selectedBC.id}/`, data);
      await fetchBonsCommande();
      setPaymentModalOpen(false);
      setPaymentAmount("");
      setSelectedBC(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du paiement:", error);
      alert("Erreur lors de la mise à jour du paiement");
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
      <StyledBox
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">Bons de Commande du Chantier</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<FiPlusCircle />}
          onClick={() => setOpenForm(true)}
        >
          Nouveau BC
        </Button>
        <Dialog
          open={openForm}
          onClose={() => setOpenForm(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Créer un Bon de Commande</DialogTitle>
          <DialogContent>
            <BonCommandeForm
              onBonCommandeCreated={() => {
                setOpenForm(false);
                fetchBonsCommande();
              }}
              modal={true}
            />
          </DialogContent>
        </Dialog>
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
                  onChange={handleChange("numero")}
                />
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  label="Fournisseur"
                  variant="standard"
                  value={filters.fournisseur}
                  onChange={handleChange("fournisseur")}
                />
              </FilterCell>
              <FilterCell>
                <CenteredTextField
                  label=""
                  variant="standard"
                  type="date"
                  value={filters.date_creation}
                  onChange={handleChange("date_creation")}
                  InputLabelProps={{ shrink: true }}
                  sx={{ pt: "15px" }}
                />
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  label="Montant"
                  variant="standard"
                  value={filters.montant_total}
                  onChange={handleChange("montant_total")}
                />
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  label="Statut"
                  variant="standard"
                  value={filters.statut}
                  onChange={handleChange("statut")}
                />
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  label="Paiement"
                  variant="standard"
                  value={filters.statut_paiement}
                  onChange={handleChange("statut_paiement")}
                />
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  label="Payé"
                  variant="standard"
                  value={filters.montant_paye}
                  onChange={handleChange("montant_paye")}
                />
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  label="À Payer"
                  variant="standard"
                  value={filters.reste_a_payer}
                  onChange={handleChange("reste_a_payer")}
                />
              </FilterCell>
              <FilterCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBonsCommande.map((bc, idx) => (
              <TableRow
                key={bc.id}
                hover
                sx={{ backgroundColor: idx % 2 === 0 ? "#fafafa" : "#fff" }}
              >
                <DevisNumber
                  onClick={() => handlePreviewBonCommande(bc.id)}
                  style={{ cursor: "pointer", fontWeight: 700 }}
                >
                  {bc.numero}
                </DevisNumber>
                <CenteredTableCell>{bc.fournisseur}</CenteredTableCell>
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
                  {bc.statut_paiement === "non_paye" && (
                    <span
                      style={{
                        color: "#FF0000",
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        display: "block",
                        textAlign: "center",
                      }}
                    >
                      Non Payé
                    </span>
                  )}
                  {bc.statut_paiement === "paye" && (
                    <span
                      style={{
                        color: "#4CAF50",
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        display: "block",
                        textAlign: "center",
                      }}
                    >
                      Payé
                    </span>
                  )}
                  {bc.statut_paiement === "paye_partiel" && (
                    <span
                      style={{
                        color: "#FFA500",
                        fontSize: "14px",
                        whiteSpace: "nowrap",
                        display: "block",
                        textAlign: "center",
                      }}
                    >
                      Payé Partiellement
                    </span>
                  )}
                </CenteredTableCell>
                <CenteredTableCell
                  sx={{ whiteSpace: "nowrap", textAlign: "center" }}
                >
                  {bc.montant_paye} €
                </CenteredTableCell>
                <CenteredTableCell
                  sx={{ whiteSpace: "nowrap", textAlign: "center" }}
                >
                  {bc.reste_a_payer} €
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
        <MenuItem onClick={handlePaymentMenuOpen}>Gérer le paiement</MenuItem>
        <MenuItem onClick={handleDeleteBC} sx={{ color: "red" }}>
          Supprimer BC
        </MenuItem>
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
      <Dialog
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedBC(null);
        }}
      >
        <DialogTitle>Gérer le paiement</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Montant total : {selectedBC?.montant_total} €
          </Typography>
          <Typography variant="body1" gutterBottom>
            Déjà payé : {selectedBC?.montant_paye || 0} €
          </Typography>
          <Typography variant="body1" gutterBottom>
            Reste à payer : {selectedBC?.reste_a_payer} €
          </Typography>
          <TextField
            label="Montant du paiement"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPaymentModalOpen(false);
              setSelectedBC(null);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handlePaymentSubmit}
            variant="contained"
            color="primary"
          >
            Valider
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ChantierListeBonCommande;
