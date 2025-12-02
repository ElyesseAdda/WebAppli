import {
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
import {
  AlignedCell,
  CenteredTableCell,
  DevisNumber,
  FilterCell,
  PriceTextField,
  StatusCell,
  StyledBox,
  StyledSelect,
  StyledTableContainer,
  StyledTextField,
} from "../../styles/tableStyles";
import { RegeneratePDFIconButton } from "../shared/RegeneratePDFButton";
import { DOCUMENT_TYPES } from "../../config/documentTypeConfig";

const formatNumber = (number) => {
  if (number == null) return "";
  const formatted = parseFloat(number).toFixed(2);
  return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const getMonthName = (monthNumber) => {
  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  return months[monthNumber - 1];
};

const formatYear = (year) => year.toString().slice(-2);

const ChantierListeSituation = ({
  chantierData,
  situations,
  setSituations,
  filters,
  setFilters,
  isLoaded,
  setIsLoaded,
  onSaveFilters,
}) => {
  const [filteredSituations, setFilteredSituations] = useState([]);
  const [orderBy, setOrderBy] = useState("date_creation");
  const [order, setOrder] = useState("desc");
  const statusOptions = ["brouillon", "validee", "facturee"];
  const [pendingSave, setPendingSave] = useState(false);

  useEffect(() => {
    if (!isLoaded && chantierData?.id) {
      fetchSituations();
    } else {
      setFilteredSituations(situations);
    }
    // eslint-disable-next-line
  }, [chantierData?.id, isLoaded, situations]);

  const fetchSituations = async () => {
    if (!chantierData?.id) return;
    try {
      const response = await axios.get(
        `/api/chantier/${chantierData.id}/situations/`
      );
      setSituations(response.data);
      setFilteredSituations(response.data);
      setIsLoaded(true);
    } catch (error) {
      setSituations([]);
      setFilteredSituations([]);
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    if (!pendingSave) return;
    const handleMouseMove = () => {
      setPendingSave(false);
      onSaveFilters(filters);
      document.removeEventListener("mousemove", handleMouseMove);
    };
    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [pendingSave, filters, onSaveFilters]);

  useEffect(() => {
    // Recalcule la liste filtrée à chaque changement de filters ou de situations
    let filtered = situations.filter((situation) => {
      return Object.keys(filters).every((key) => {
        if (!filters[key] || filters[key] === "Tous") return true;
        switch (key) {
          case "numero_situation":
            return situation.numero_situation
              ?.toLowerCase()
              .includes(filters[key].toLowerCase());
          case "mois":
            return situation.mois.toString().includes(filters[key]);
          case "pourcentage_avancement":
            return situation.pourcentage_avancement
              .toString()
              .includes(filters[key]);
          case "montant_apres_retenues":
            return situation.montant_apres_retenues
              .toString()
              .includes(filters[key]);
          case "statut":
            return situation.statut === filters[key];
          default:
            return true;
        }
      });
    });
    setFilteredSituations(filtered);
  }, [filters, situations]);

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);
    setPendingSave(true);
    let filtered = situations.filter((situation) => {
      return Object.keys(newFilters).every((key) => {
        if (!newFilters[key] || newFilters[key] === "Tous") return true;
        switch (key) {
          case "numero_situation":
            return situation.numero_situation
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());
          case "mois":
            return situation.mois.toString().includes(newFilters[key]);
          case "pourcentage_avancement":
            return situation.pourcentage_avancement
              .toString()
              .includes(newFilters[key]);
          case "montant_apres_retenues":
            return situation.montant_apres_retenues
              .toString()
              .includes(newFilters[key]);
          case "statut":
            return situation.statut === newFilters[key];
          default:
            return true;
        }
      });
    });
    setFilteredSituations(filtered);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sorted = [...filteredSituations].sort((a, b) => {
      if (property === "montant_apres_retenues") {
        return (isAsc ? 1 : -1) * (a[property] - b[property]);
      }
      if (property === "pourcentage_avancement") {
        return (isAsc ? 1 : -1) * (a[property] - b[property]);
      }
      return (isAsc ? 1 : -1) * (a[property] < b[property] ? -1 : 1);
    });

    setFilteredSituations(sorted);
  };

  const handlePreviewSituation = (situationId) => {
    window.open(`/api/preview-situation/${situationId}/`, "_blank");
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
          Situations du chantier
        </Typography>

        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <FilterCell>
                  <StyledTextField
                    label="N° Situation"
                    variant="standard"
                    value={filters.numero_situation}
                    onChange={handleFilterChange("numero_situation")}
                    sx={{
                      "& .MuiInputBase-input": {
                        color: "white",
                        fontWeight: "bold",
                      },
                    }}
                  />
                </FilterCell>
                <FilterCell>
                  <StyledTextField
                    label="Mois"
                    variant="standard"
                    value={filters.mois}
                    onChange={handleFilterChange("mois")}
                    sx={{ color: "white" }}
                  />
                </FilterCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "pourcentage_avancement"}
                    direction={
                      orderBy === "pourcentage_avancement" ? order : "asc"
                    }
                    onClick={() => handleSort("pourcentage_avancement")}
                  >
                    <PriceTextField
                      label="% Avancement"
                      variant="standard"
                      value={filters.pourcentage_avancement}
                      onChange={handleFilterChange("pourcentage_avancement")}
                      sx={{ color: "white" }}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "montant_apres_retenues"}
                    direction={
                      orderBy === "montant_apres_retenues" ? order : "asc"
                    }
                    onClick={() => handleSort("montant_apres_retenues")}
                  >
                    <PriceTextField
                      label="Montant Total"
                      variant="standard"
                      value={filters.montant_apres_retenues}
                      onChange={handleFilterChange("montant_apres_retenues")}
                      sx={{ color: "white" }}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <FilterCell>
                  <StyledSelect
                    value={filters.statut}
                    onChange={handleFilterChange("statut")}
                    variant="standard"
                  >
                    <option value="Tous">Tous</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </StyledSelect>
                </FilterCell>
                <FilterCell>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "white",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    Actions
                  </Typography>
                </FilterCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSituations.map((situation, idx) => (
                <TableRow
                  key={situation.id}
                  hover
                  sx={{ backgroundColor: idx % 2 === 0 ? "#fafafa" : "#fff" }}
                >
                  <DevisNumber
                    onClick={() => handlePreviewSituation(situation.id)}
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                  >
                    {situation.numero_situation}
                  </DevisNumber>
                  <CenteredTableCell>
                    {`${situation.mois
                      .toString()
                      .padStart(2, "0")}/${formatYear(situation.annee)}`}
                  </CenteredTableCell>
                  <CenteredTableCell>
                    {formatNumber(situation.pourcentage_avancement)}%
                  </CenteredTableCell>
                  <CenteredTableCell
                    style={{ fontWeight: 600, color: green[500] }}
                  >
                    {formatNumber(situation.montant_apres_retenues)} €
                  </CenteredTableCell>
                  <StatusCell status={situation.statut}>
                    {situation.statut}
                  </StatusCell>
                  <CenteredTableCell>
                    {/* Bouton de régénération dans le Drive */}
                    <RegeneratePDFIconButton
                      documentType={DOCUMENT_TYPES.SITUATION}
                      documentData={{
                        ...situation,
                        chantier: chantierData,
                      }}
                      size="small"
                      color="primary"
                      tooltipPlacement="top"
                      onSuccess={() => {
                        console.log('✅ Situation régénérée avec succès');
                      }}
                    />
                  </CenteredTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      </StyledBox>
    </div>
  );
};

export default ChantierListeSituation;
