import {
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
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
    price_ht: "",
    status: "Tous",
  });
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");

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

        if (key === "price_ht" && newFilters[key]) {
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
      if (property === "price_ht") {
        return (
          (isAsc ? 1 : -1) * (parseFloat(a[property]) - parseFloat(b[property]))
        );
      }
      return (isAsc ? 1 : -1) * (a[property] < b[property] ? -1 : 1);
    });

    setFilteredDevis(sorted);
  };

  return (
    <StyledBox>
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontFamily: "Merriweather, serif",
          position: "relative",
          top: "0px",
          right: "20px",
        }}
      >
        Liste des Devis
      </Typography>

      <StyledTableContainer component={Paper}>
        <Table>
          <TableHead>
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
                  active={orderBy === "price_ht"}
                  direction={orderBy === "price_ht" ? order : "asc"}
                  onClick={() => handleSort("price_ht")}
                >
                  <PriceTextField
                    label="Prix HT"
                    variant="standard"
                    value={filters.price_ht}
                    onChange={handleFilterChange("price_ht")}
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
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDevis.map((devis) => (
              <TableRow key={devis.id}>
                <DevisNumber>{devis.numero}</DevisNumber>
                <ChantierCell>{devis.chantier_name}</ChantierCell>
                <CenteredTableCell>{devis.client_name}</CenteredTableCell>
                <CenteredTableCell>
                  {new Date(devis.date_creation).toLocaleDateString()}
                </CenteredTableCell>
                <CenteredTableCell>{devis.price_ht} €</CenteredTableCell>
                <StatusCell status={devis.status}>{devis.status}</StatusCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>
    </StyledBox>
  );
};

export default ListeDevis;
