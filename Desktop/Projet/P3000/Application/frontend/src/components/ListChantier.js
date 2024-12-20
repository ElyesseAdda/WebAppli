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
import { Link } from "react-router-dom";
import {
  AlignedCell,
  CenteredTableCell,
  CenteredTextField,
  ChantierCell,
  FilterCell,
  PriceTextField,
  StatusCell,
  StyledBox,
  StyledSelect,
  StyledTableContainer,
  StyledTextField,
} from "../styles/tableStyles";

const ListChantiers = () => {
  const [chantiers, setChantiers] = useState([]);
  const [filteredChantiers, setFilteredChantiers] = useState([]);
  const [filters, setFilters] = useState({
    chantier_name: "",
    client_name: "",
    state_chantier: "Tous",
    date_debut: "",
    chiffre_affaire: "",
  });
  const [orderBy, setOrderBy] = useState("date_debut");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(false);

  const statusOptions = ["En Cours", "Terminé", "En Attente Signature"];

  useEffect(() => {
    fetchChantiers();
  }, []);

  const fetchChantiers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/chantier/");
      console.log(
        "Structure des données reçues:",
        JSON.stringify(response.data[0], null, 2)
      );
      setChantiers(response.data);
      setFilteredChantiers(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des chantiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);

    let filtered = chantiers.filter((chantier) => {
      return Object.keys(newFilters).every((key) => {
        if (!newFilters[key] || newFilters[key] === "Tous") return true;

        if (key === "date_debut" && newFilters[key]) {
          const chantierDate = new Date(chantier[key]).toLocaleDateString();
          return chantierDate.includes(newFilters[key]);
        }

        if (key === "chiffre_affaire" && newFilters[key]) {
          const chantierCA = chantier[key]?.toString() || "0";
          return chantierCA.includes(newFilters[key]);
        }

        const value = chantier[key]?.toString().toLowerCase() || "";
        return value.includes(newFilters[key].toLowerCase());
      });
    });

    setFilteredChantiers(filtered);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sorted = [...filteredChantiers].sort((a, b) => {
      if (property === "chiffre_affaire") {
        return (
          (isAsc ? 1 : -1) *
          (parseFloat(a[property] || 0) - parseFloat(b[property] || 0))
        );
      }
      return (
        (isAsc ? 1 : -1) * ((a[property] || "") < (b[property] || "") ? -1 : 1)
      );
    });

    setFilteredChantiers(sorted);
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
          Liste des Chantiers
        </Typography>

        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <FilterCell>
                  <StyledTextField
                    label="Nom Chantier"
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
                    active={orderBy === "date_debut"}
                    direction={orderBy === "date_debut" ? order : "asc"}
                    onClick={() => handleSort("date_debut")}
                  >
                    <CenteredTextField
                      variant="standard"
                      type="date"
                      value={filters.date_debut}
                      onChange={handleFilterChange("date_debut")}
                      InputLabelProps={{ shrink: true }}
                      sx={{ pt: "15px" }}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <FilterCell>
                  <StyledTextField
                    label="Taux facturation"
                    variant="standard"
                    disabled
                    sx={{ color: "gray" }}
                  />
                </FilterCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "chiffre_affaire"}
                    direction={orderBy === "chiffre_affaire" ? order : "asc"}
                    onClick={() => handleSort("chiffre_affaire")}
                  >
                    <PriceTextField
                      label="Chiffre d'affaires"
                      variant="standard"
                      value={filters.chiffre_affaire}
                      onChange={handleFilterChange("chiffre_affaire")}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <FilterCell>
                  <StyledSelect
                    value={filters.state_chantier}
                    onChange={handleFilterChange("state_chantier")}
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
              {filteredChantiers.map((chantier) => (
                <TableRow key={chantier.id}>
                  <ChantierCell>
                    <Link to={`/chantier/${chantier.id}`}>
                      {chantier.chantier_name}
                    </Link>
                  </ChantierCell>
                  <CenteredTableCell>
                    {chantier.societe?.client?.name &&
                    chantier.societe?.client?.surname
                      ? `${chantier.societe.client.name} ${chantier.societe.client.surname}`
                      : "Non assigné"}
                  </CenteredTableCell>
                  <CenteredTableCell>
                    {new Date(chantier.date_debut).toLocaleDateString()}
                  </CenteredTableCell>
                  <CenteredTableCell>-</CenteredTableCell>
                  <CenteredTableCell>
                    {chantier.chiffre_affaire || 0} €
                  </CenteredTableCell>
                  <StatusCell status={chantier.state_chantier}>
                    {chantier.state_chantier}
                  </StatusCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      </StyledBox>
    </div>
  );
};

export default ListChantiers;
