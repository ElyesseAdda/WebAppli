import {
  Box,
  Button,
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
import { Link } from "react-router-dom";
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
import NewChantierModal from "./NewChantierModal";

const ListChantiers = () => {
  const [chantiers, setChantiers] = useState([]);
  const [filteredChantiers, setFilteredChantiers] = useState([]);
  const [filters, setFilters] = useState({
    chantier_name: "",
    client_name: "",
    state_chantier: "Tous",
    date_debut: "",
    chiffre_affaire: "",
    taux_facturation: "",
  });
  const [orderBy, setOrderBy] = useState("date_debut");
  const [order, setOrder] = useState("desc");
  const [loading, setLoading] = useState(false);
  const [showNewChantierModal, setShowNewChantierModal] = useState(false);

  const statusOptions = ["En Cours", "Terminé", "En Attente Signature"];

  useEffect(() => {
    fetchChantiers();
  }, []);

  const fetchChantiers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/chantier-relations/");
      console.log("Données reçues:", response.data);
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
          (parseFloat(a.montant_ttc || 0) - parseFloat(b.montant_ttc || 0))
        );
      }
      if (property === "taux_facturation") {
        return (
          (isAsc ? 1 : -1) *
          (parseFloat(a.taux_facturation || 0) -
            parseFloat(b.taux_facturation || 0))
        );
      }
      return (
        (isAsc ? 1 : -1) * ((a[property] || "") < (b[property] || "") ? -1 : 1)
      );
    });

    setFilteredChantiers(sorted);
  };

  const handleNewChantierSuccess = (newChantier) => {
    fetchChantiers();
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
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
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowNewChantierModal(true)}
          >
            Nouveau Chantier
          </Button>
        </Box>

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
                    value={filters.taux_facturation}
                    onChange={handleFilterChange("taux_facturation")}
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
                  <DevisNumber sx={{ fontSize: "16px", fontWeight: 700 }}>
                    <Link to={`/chantier/${chantier.id}`}>
                      {chantier.chantier_name}
                    </Link>
                  </DevisNumber>
                  <CenteredTableCell sx={{ textAlign: "left" }}>
                    {chantier.societe_info
                      ? `${chantier.societe_info.client.name} ${chantier.societe_info.client.surname}`
                      : "Non assigné"}
                  </CenteredTableCell>
                  <CenteredTableCell>
                    {new Date(chantier.date_debut).toLocaleDateString()}
                  </CenteredTableCell>
                  <CenteredTableCell>
                    {chantier.taux_facturation}%
                  </CenteredTableCell>
                  <CenteredTableCell style={{ fontWeight: 600 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ color: "gray" }}>
                        Attendu: {chantier.montant_ttc || "NA"} €
                      </span>
                      <span style={{ color: green[500] }}>
                        Réel: {chantier.ca_reel || 0} €
                      </span>
                    </div>
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

      <NewChantierModal
        open={showNewChantierModal}
        onClose={() => setShowNewChantierModal(false)}
        onSuccess={handleNewChantierSuccess}
      />
    </div>
  );
};

export default ListChantiers;
