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
import { AiFillFilePdf } from "react-icons/ai";
import { TfiMore } from "react-icons/tfi";
import {
  AlignedCell,
  CenteredTableCell,
  DevisNumber,
  FilterCell,
  PriceTextField,
  StyledBox,
  StyledSelect,
  StyledTableContainer,
  StyledTextField,
} from "../../styles/tableStyles";
import { RegeneratePDFIconButton } from "../shared/RegeneratePDFButton";
import { DOCUMENT_TYPES } from "../../config/documentTypeConfig";
import StatusChangeModal from "../StatusChangeModal";

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
  updateSituation,
  loadSituations,
}) => {
  const [filteredSituations, setFilteredSituations] = useState([]);
  const [orderBy, setOrderBy] = useState("date_creation");
  const [order, setOrder] = useState("desc");
  const statusOptions = ["brouillon", "validee", "facturee"];
  
  // Fonction pour formater les labels de statut
  const formatStatusLabel = (status) => {
    const labels = {
      brouillon: "En attente",
      validee: "Validée",
      facturee: "Facturée",
    };
    return labels[status] || status;
  };
  
  // Fonction pour obtenir les styles de statut (mêmes que le dashboard)
  const getStatusStyles = (statut) => {
    return {
      display: "inline-block",
      px: 1.5,
      py: 0.5,
      borderRadius: 1,
      backgroundColor:
        statut === "facturee"
          ? "success.light"
          : statut === "validee"
          ? "info.light"
          : "warning.light",
      color:
        statut === "facturee"
          ? "success.dark"
          : statut === "validee"
          ? "info.dark"
          : "warning.dark",
      fontWeight: 500,
      textTransform: "capitalize",
    };
  };
  
  const [pendingSave, setPendingSave] = useState(false);
  
  // États pour le menu "more"
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [situationToUpdate, setSituationToUpdate] = useState(null);

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

  const handleGeneratePDF = async (situation) => {
    try {
      // Appel à l'API pour générer le PDF
      const response = await axios.post(
        "/api/generate-situation-pdf/",
        {
          situation_id: situation.id,
        },
        {
          responseType: "blob",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Vérifier si la réponse est bien un PDF
      if (response.headers["content-type"] === "application/pdf") {
        // Créer un URL pour le blob
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);

        // Créer un lien temporaire pour télécharger le PDF
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `${situation.numero_situation}.pdf`;
        document.body.appendChild(link);
        link.click();

        // Nettoyer
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);
      } else {
        // Si ce n'est pas un PDF, c'est probablement une erreur
        const reader = new FileReader();
        reader.onload = function () {
          const errorMessage = JSON.parse(reader.result);
          alert(`Erreur: ${errorMessage.error || "Erreur inconnue"}`);
        };
        reader.readAsText(response.data);
      }
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert(
        "Erreur lors de la génération du PDF. Vérifiez la console pour plus de détails."
      );
    }
  };

  // Handlers pour le menu "more"
  const handleMenuClick = (event, situation) => {
    setAnchorEl(event.currentTarget);
    setSelectedSituation(situation);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedSituation(null);
  };

  const handleChangeStatus = () => {
    setSituationToUpdate(selectedSituation);
    setShowStatusModal(true);
    handleClose();
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      if (!situationToUpdate || !updateSituation) return;
      await updateSituation(situationToUpdate.id, { statut: newStatus });
      if (loadSituations) {
        loadSituations();
      }
      setShowStatusModal(false);
      setSituationToUpdate(null);
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
                        {formatStatusLabel(status)}
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
                  <CenteredTableCell>
                    <Typography
                      variant="body2"
                      sx={getStatusStyles(situation.statut)}
                    >
                      {formatStatusLabel(situation.statut || "brouillon")}
                    </Typography>
                  </CenteredTableCell>
                  <CenteredTableCell sx={{ width: "180px", padding: "0 8px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                      {/* Bouton de téléchargement PDF */}
                      <IconButton
                        onClick={() => handleGeneratePDF(situation)}
                        size="small"
                        sx={{
                          color: "success.main",
                          "&:hover": {
                            backgroundColor: "rgba(46, 125, 50, 0.04)",
                          },
                        }}
                        title="Télécharger le PDF"
                      >
                        <AiFillFilePdf style={{ fontSize: "20px" }} />
                      </IconButton>
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
                      {/* Bouton "more" */}
                      <IconButton onClick={(e) => handleMenuClick(e, situation)} size="small">
                        <TfiMore size={16} color="#666" />
                      </IconButton>
                    </div>
                  </CenteredTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      </StyledBox>

      {/* Menu "more" */}
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
        <MenuItem onClick={handleChangeStatus}>Modifier le statut</MenuItem>
      </Menu>

      {/* Modal de modification du statut */}
      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSituationToUpdate(null);
        }}
        currentStatus={situationToUpdate?.statut}
        onStatusChange={handleStatusUpdate}
        statusOptions={statusOptions.map(status => ({
          value: status,
          label: formatStatusLabel(status)
        }))}
        title="Modifier le statut de la situation"
        type="situation"
      />
    </div>
  );
};

export default ChantierListeSituation;
