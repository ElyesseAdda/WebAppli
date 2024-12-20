import {
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

const ListeDevis = () => {
  const [devis, setDevis] = useState([]);
  const [filteredDevis, setFilteredDevis] = useState([]);
  const [filters, setFilters] = useState({
    numero: "",
    chantier_name: "",
    client_name: "",
    date_creation: "",
    price_ttc: "",
    status: "Tous",
  });
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDevis, setSelectedDevis] = useState(null);

  const statusOptions = ["En attente", "Validé", "Refusé"];

  useEffect(() => {
    fetchDevis();
  }, []);

  const fetchDevis = async () => {
    try {
      const response = await axios.get("/api/list-devis/");
      setDevis(response.data);
      setFilteredDevis(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des devis:", error);
    }
  };

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);

    let filtered = devis.filter((devis) => {
      return Object.keys(newFilters).every((key) => {
        if (!newFilters[key] || newFilters[key] === "Tous") return true;

        if (key === "date_creation" && newFilters[key]) {
          const devisDate = new Date(devis[key]).toLocaleDateString();
          return devisDate.includes(newFilters[key]);
        }

        if (key === "price_ttc" && newFilters[key]) {
          const devisPrice = devis[key].toString();
          return devisPrice.includes(newFilters[key]);
        }

        const value = devis[key]?.toString().toLowerCase() || "";
        return value.includes(newFilters[key].toLowerCase());
      });
    });

    setFilteredDevis(filtered);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sorted = [...filteredDevis].sort((a, b) => {
      if (property === "price_ttc") {
        return (
          (isAsc ? 1 : -1) * (parseFloat(a[property]) - parseFloat(b[property]))
        );
      }
      return (isAsc ? 1 : -1) * (a[property] < b[property] ? -1 : 1);
    });

    setFilteredDevis(sorted);
  };

  const handlePreviewDevis = (devisId) => {
    const previewUrl = `/api/preview-saved-devis/${devisId}/`;
    window.open(previewUrl, "_blank");
  };

  const handleMoreClick = (event, devis) => {
    setAnchorEl(event.currentTarget);
    setSelectedDevis(devis);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedDevis(null);
  };

  const handleModifyDevis = () => {
    // À implémenter
    handleClose();
  };

  const handleConvertToInvoice = () => {
    // À implémenter
    handleClose();
  };

  const handleChangeStatus = () => {
    // À implémenter
    handleClose();
  };

  const handleDeleteDevis = () => {
    // À implémenter
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
          Liste des Devis
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
                    label="Client"
                    variant="standard"
                    value={filters.client_name}
                    onChange={handleFilterChange("client_name")}
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
                      value={filters.price_ttc}
                      onChange={handleFilterChange("price_ttc")}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <FilterCell>
                  <StyledSelect
                    value={filters.status}
                    onChange={handleFilterChange("status")}
                    variant="standard"
                    sx={{ pt: "10px" }}
                  >
                    <MenuItem value="Tous">Tous</MenuItem>
                    {statusOptions.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </StyledSelect>
                </FilterCell>
                <FilterCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDevis.map((devis) => (
                <React.Fragment key={devis.id}>
                  <TableRow>
                    <DevisNumber
                      onClick={() => handlePreviewDevis(devis.id)}
                      style={{ cursor: "pointer", fontWeight: 700 }}
                    >
                      {devis.numero}
                    </DevisNumber>
                    <ChantierCell>{devis.chantier_name}</ChantierCell>
                    <CenteredTableCell>{devis.client_name}</CenteredTableCell>
                    <CenteredTableCell>
                      {new Date(devis.date_creation).toLocaleDateString()}
                    </CenteredTableCell>
                    <CenteredTableCell
                      style={{ fontWeight: 600, color: green[500] }}
                    >
                      {devis.price_ttc} €
                    </CenteredTableCell>
                    <StatusCell status={devis.status}>
                      {devis.status}
                    </StatusCell>
                    <CenteredTableCell sx={{ width: "60px", padding: "0 8px" }}>
                      <IconButton
                        onClick={(e) => handleMoreClick(e, devis)}
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
                </React.Fragment>
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
        <MenuItem onClick={handleModifyDevis}>Modifier le devis</MenuItem>
        <MenuItem onClick={handleConvertToInvoice}>Éditer en facture</MenuItem>
        <MenuItem onClick={handleChangeStatus}>Modifier l'état</MenuItem>
        <MenuItem onClick={handleDeleteDevis} sx={{ color: "error.main" }}>
          Supprimer
        </MenuItem>
      </Menu>
    </div>
  );
};

export default ListeDevis;
