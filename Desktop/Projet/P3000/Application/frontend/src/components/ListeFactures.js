import {
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
  StyledBox,
  StyledTableContainer,
} from "../styles/tableStyles";

const ListeFactures = () => {
  const [factures, setFactures] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [filters, setFilters] = useState({
    numero: "",
    client: "",
    chantier: "",
    montant: "",
  });

  const fetchFactures = async () => {
    try {
      const response = await axios.get("/api/facture/");
      console.log("Factures reçues:", response.data);
      setFactures(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des factures:", error);
    }
  };

  useEffect(() => {
    fetchFactures();
  }, []);

  const handleMenuClick = (event, facture) => {
    setAnchorEl(event.currentTarget);
    setSelectedFacture(facture);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedFacture(null);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const filteredFactures = factures.filter((facture) => {
    return (
      facture.numero_facture
        ?.toLowerCase()
        .includes(filters.numero.toLowerCase()) &&
      (facture.chantier?.chantier_name || "")
        .toLowerCase()
        .includes(filters.chantier.toLowerCase()) &&
      (facture.chantier?.societe?.client_name?.name || "")
        .toLowerCase()
        .includes(filters.client.toLowerCase()) &&
      (facture.montant_ttc?.toString() || "").includes(filters.montant)
    );
  });

  const handlePreviewFacture = (factureId) => {
    window.open(`/api/facture/preview/${factureId}/`, "_blank");
  };

  const handleDeleteFacture = async () => {
    if (!selectedFacture) return;

    try {
      await axios.delete(`/api/facture/${selectedFacture.id}/`);
      fetchFactures();
      handleClose();
    } catch (error) {
      console.error("Erreur lors de la suppression de la facture:", error);
      alert("Erreur lors de la suppression de la facture");
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
      <Typography variant="h5" sx={{ mb: 3 }}>
        Liste des Factures
      </Typography>

      <StyledBox>
        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <FilterCell>
                  <CenteredTextField
                    placeholder="N° Facture"
                    value={filters.numero}
                    onChange={(e) =>
                      handleFilterChange("numero", e.target.value)
                    }
                  />
                </FilterCell>
                <FilterCell>
                  <CenteredTextField
                    placeholder="Client"
                    value={filters.client}
                    onChange={(e) =>
                      handleFilterChange("client", e.target.value)
                    }
                  />
                </FilterCell>
                <FilterCell>
                  <CenteredTextField
                    placeholder="Chantier"
                    value={filters.chantier}
                    onChange={(e) =>
                      handleFilterChange("chantier", e.target.value)
                    }
                  />
                </FilterCell>
                <FilterCell>
                  <CenteredTextField
                    placeholder="Montant"
                    value={filters.montant}
                    onChange={(e) =>
                      handleFilterChange("montant", e.target.value)
                    }
                  />
                </FilterCell>
                <FilterCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFactures.map((facture) => (
                <TableRow key={facture.id}>
                  <DevisNumber onClick={() => handlePreviewFacture(facture.id)}>
                    {facture.numero_facture}
                  </DevisNumber>
                  <AlignedCell>
                    {facture.chantier?.societe?.client_name?.name}{" "}
                    {facture.chantier?.societe?.client_name?.surname}
                  </AlignedCell>
                  <ChantierCell>{facture.chantier?.chantier_name}</ChantierCell>
                  <CenteredTableCell>{facture.montant_ttc}€</CenteredTableCell>
                  <CenteredTableCell>
                    <IconButton onClick={(e) => handleMenuClick(e, facture)}>
                      <TfiMore />
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
        <MenuItem onClick={handleDeleteFacture} sx={{ color: "error.main" }}>
          Supprimer
        </MenuItem>
      </Menu>
    </div>
  );
};

export default ListeFactures;
