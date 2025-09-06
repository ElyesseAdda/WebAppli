import {
  Button,
  ButtonGroup,
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
  CenteredTextField,
  DevisNumber,
  FilterCell,
  PriceTextField,
  StatusCell,
  StyledBox,
  StyledSelect,
  StyledTableContainer,
  StyledTextField,
} from "../../styles/tableStyles";
import CreationSituation from "../CreationSituation";
import FactureModal from "../FactureModal";
import StatusChangeModal from "../StatusChangeModal";
import TransformationCIEModal from "../TransformationCIEModal";
import TransformationTSModal from "../TransformationTSModal";
import { generatePDFDrive } from "../../utils/universalDriveGenerator";

const formatNumber = (number) =>
  number?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const ChantierListeDevis = ({
  chantierData,
  devis,
  setDevis,
  filters,
  setFilters,
  isLoaded,
  setIsLoaded,
  onSaveFilters,
}) => {
  const [filteredDevis, setFilteredDevis] = useState([]);
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [devisToUpdate, setDevisToUpdate] = useState(null);
  const [factureModalOpen, setFactureModalOpen] = useState(false);
  const [tsModalOpen, setTsModalOpen] = useState(false);
  const [cieModalOpen, setCieModalOpen] = useState(false);
  const [selectedDevisForTS, setSelectedDevisForTS] = useState(null);
  const [selectedDevisForCIE, setSelectedDevisForCIE] = useState(null);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [situationModalOpen, setSituationModalOpen] = useState(false);
  const [selectedDevisForSituation, setSelectedDevisForSituation] =
    useState(null);
  const statusOptions = ["En attente", "Validé", "Refusé"];
  const [pendingSave, setPendingSave] = useState(false);

  useEffect(() => {
    if (!isLoaded && chantierData?.id) {
      fetchDevis();
    } else {
      setFilteredDevis(devis);
    }
    // eslint-disable-next-line
  }, [chantierData?.id, isLoaded, devis]);

  const fetchDevis = async () => {
    if (!chantierData?.id) return;
    try {
      const response = await axios.get("/api/devisa/");
      // Filtrer les devis du chantier courant
      const chantierDevis = response.data.filter(
        (d) => d.chantier === chantierData.id
      );
      setDevis(chantierDevis);
      setFilteredDevis(chantierDevis);
      setIsLoaded(true);
    } catch (error) {
      setDevis([]);
      setFilteredDevis([]);
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
    // Recalcule la liste filtrée à chaque changement de filters ou de devis
    let filtered = devis.filter((devis) => {
      return Object.keys(filters).every((key) => {
        if (!filters[key] || filters[key] === "Tous") return true;
        switch (key) {
          case "numero":
            return devis.numero
              ?.toLowerCase()
              .includes(filters[key].toLowerCase());
          case "client_name":
            return devis.client_name
              ?.toLowerCase()
              .includes(filters[key].toLowerCase());
          case "date_creation":
            if (!filters[key]) return true;
            const devisDate = new Date(devis.date_creation)
              .toISOString()
              .split("T")[0];
            return devisDate === filters[key];
          case "price_ttc":
            const devisPrice = devis.price_ttc?.toString() || "";
            return devisPrice.includes(filters[key]);
          case "status":
            return devis.status === filters[key];
          default:
            return true;
        }
      });
    });
    setFilteredDevis(filtered);
  }, [filters, devis]);

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);
    setPendingSave(true);
    let filtered = devis.filter((devis) => {
      return Object.keys(newFilters).every((key) => {
        if (!newFilters[key] || newFilters[key] === "Tous") return true;
        switch (key) {
          case "numero":
            return devis.numero
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());
          case "client_name":
            return devis.client_name
              ?.toLowerCase()
              .includes(newFilters[key].toLowerCase());
          case "date_creation":
            if (!newFilters[key]) return true;
            const devisDate = new Date(devis.date_creation)
              .toISOString()
              .split("T")[0];
            return devisDate === newFilters[key];
          case "price_ttc":
            const devisPrice = devis.price_ttc?.toString() || "";
            return devisPrice.includes(newFilters[key]);
          case "status":
            return devis.status === newFilters[key];
          default:
            return true;
        }
      });
    });
    setFilteredDevis(filtered);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sorted = [...filteredDevis].sort((a, b) => {
      if (property === "date_creation") {
        return (
          (isAsc ? 1 : -1) *
          (new Date(a[property]).getTime() - new Date(b[property]).getTime())
        );
      }
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
  };

  // --- Actions modales ---
  const handleModifyDevis = () => {
    if (selectedDevis) {
      window.location.href = `/ModificationDevis/${selectedDevis.id}`;
    }
    handleClose();
  };

  const handleEditFacture = () => {
    setFactureModalOpen(true);
    handleClose();
  };

  const handleEditTS = async () => {
    try {
      const devisResponse = await axios.get(`/api/devisa/${selectedDevis.id}/`);
      setSelectedDevisForTS(devisResponse.data);
      const chantierResponse = await axios.get(
        `/api/chantier/${selectedDevis.chantier}/`
      );
      setSelectedChantier(chantierResponse.data);
      setTsModalOpen(true);
    } catch (error) {
      alert("Erreur lors de la récupération des données pour TS");
    }
    handleClose();
  };

  const handleEditCIE = async () => {
    try {
      const devisResponse = await axios.get(`/api/devisa/${selectedDevis.id}/`);
      setSelectedDevisForCIE(devisResponse.data);
      const chantierResponse = await axios.get(
        `/api/chantier/${selectedDevis.chantier}/`
      );
      setSelectedChantier(chantierResponse.data);
      setCieModalOpen(true);
    } catch (error) {
      alert("Erreur lors de la récupération des données pour CIE");
    }
    handleClose();
  };

  const handleChangeStatus = () => {
    setDevisToUpdate(selectedDevis);
    setShowStatusModal(true);
    handleClose();
  };

  const handleCreateSituation = async () => {
    try {
      const devisResponse = await axios.get(`/api/devisa/${selectedDevis.id}/`);
      setSelectedDevisForSituation(devisResponse.data);
      const chantierResponse = await axios.get(
        `/api/chantier/${selectedDevis.chantier}/`
      );
      setSelectedChantier(chantierResponse.data);
      setSituationModalOpen(true);
    } catch (error) {
      alert("Erreur lors de la récupération des données pour la situation");
    }
    handleClose();
  };

  // --- Handlers pour les modales ---
  const handleStatusUpdate = async (newStatus) => {
    try {
      if (!devisToUpdate) return;
      await axios.put(`/api/list-devis/${devisToUpdate.id}/update_status/`, {
        status: newStatus,
      });
      fetchDevis();
      setShowStatusModal(false);
      setDevisToUpdate(null);
    } catch (error) {
      alert("Erreur lors de la modification du statut");
    }
  };

  const handleFactureSubmit = async (factureData) => {
    try {
      console.log("Données envoyées:", factureData);
      const response = await axios.post("/api/facture/", factureData);

      // Message de succès
      alert(`La facture ${response.data.numero} a été créée avec succès.`);

      // Auto-download de la facture dans le Drive
      try {
        console.log("🚀 Lancement de l'auto-download de la facture vers le Drive");
        
        // Récupérer les données complètes de la facture créée
        const factureResponse = await axios.get(`/api/facture/${response.data.id}/`);
        const factureComplet = factureResponse.data;
        
        console.log("📋 Données de la facture complète:", factureComplet);
        
        // Récupérer les données de la société depuis le chantier
        const chantierResponse = await axios.get(`/api/chantier/${factureComplet.chantier}/`);
        const chantier = chantierResponse.data;
        
        // Récupérer les données de la société
        let societe;
        if (typeof chantier.societe === "object" && chantier.societe.id) {
          societe = chantier.societe;
        } else {
          const societeResponse = await axios.get(`/api/societe/${chantier.societe}/`);
          societe = societeResponse.data;
        }
        
        console.log("🏢 Données de la société:", societe);
        
        // Utiliser le système universel pour générer le PDF
        await generatePDFDrive(
          "facture",
          {
            factureId: factureComplet.id,
            chantierId: factureComplet.chantier,
            chantierName: factureComplet.chantier_name,
            societeName: societe.nom_societe,
            numero: factureComplet.numero,
          },
          {
            onSuccess: (response) => {
              console.log("✅ Facture générée avec succès dans le Drive:", response);
              alert("✅ Facture téléchargée automatiquement dans le Drive !");
            },
            onError: (error) => {
              console.error("❌ Erreur lors de la génération de la facture:", error);
              alert(`❌ Erreur lors de la génération automatique: ${error.message}`);
            },
          }
        );
      } catch (autoDownloadError) {
        console.error("❌ Erreur lors de l'auto-download:", autoDownloadError);
        // Ne pas bloquer le processus principal si l'auto-download échoue
        alert("⚠️ Facture créée mais erreur lors du téléchargement automatique. Vous pouvez le faire manuellement.");
      }

      setFactureModalOpen(false);
      fetchDevis();
    } catch (error) {
      console.error(
        "Erreur lors de la création de la facture:",
        error.response?.data || error
      );
      alert(
        "Erreur lors de la création de la facture. Veuillez vérifier les données."
      );
    }
  };

  // --- Rendu principal ---
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
          Devis du chantier
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
                    sx={{ color: "white" }}
                  />
                </FilterCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "date_creation"}
                    direction={orderBy === "date_creation" ? order : "asc"}
                    onClick={() => handleSort("date_creation")}
                    sx={{ textAlign: "center", color: "white" }}
                  >
                    <CenteredTextField
                      variant="standard"
                      type="date"
                      value={filters.date_creation}
                      onChange={handleFilterChange("date_creation")}
                      InputLabelProps={{ shrink: true }}
                      sx={{ pt: "15px", color: "white" }}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "price_ttc"}
                    direction={orderBy === "price_ttc" ? order : "asc"}
                    onClick={() => handleSort("price_ttc")}
                    sx={{ textAlign: "center", color: "white" }}
                  >
                    <PriceTextField
                      label="Prix TTC"
                      variant="standard"
                      value={filters.price_ttc}
                      onChange={handleFilterChange("price_ttc")}
                      sx={{
                        maxWidth: "60px",
                        minWidth: "40px",
                        "& input": {
                          textAlign: "center",
                          color: "white",
                        },
                      }}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <FilterCell>
                  <StyledSelect
                    value={filters.status}
                    onChange={handleFilterChange("status")}
                    variant="standard"
                    sx={{ pt: "10px", color: "white" }}
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
              {filteredDevis.map((devis, idx) => (
                <TableRow
                  key={devis.id}
                  hover
                  sx={{ backgroundColor: idx % 2 === 0 ? "#fafafa" : "#fff" }}
                >
                  <DevisNumber
                    onClick={() => handlePreviewDevis(devis.id)}
                    style={{ cursor: "pointer", fontWeight: 700 }}
                  >
                    {devis.numero}
                  </DevisNumber>
                  <CenteredTableCell>
                    {new Date(devis.date_creation).toLocaleDateString()}
                  </CenteredTableCell>
                  <CenteredTableCell
                    style={{ fontWeight: 600, color: green[500] }}
                  >
                    {formatNumber(devis.price_ttc)} €
                  </CenteredTableCell>
                  <StatusCell status={devis.status}>{devis.status}</StatusCell>
                  <CenteredTableCell
                    sx={{
                      width: "60px",
                      padding: "0 8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ButtonGroup
                      variant="outlined"
                      size="small"
                      aria-label="actions button group"
                      sx={{
                        paddingTop: "10px",
                        "& .MuiButtonGroup-grouped": {
                          minWidth: "35px",
                          padding: "4px",
                          border: "none",
                          "&:hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.04)",
                          },
                        },
                      }}
                    >
                      <Button
                        onClick={(e) => handleMoreClick(e, devis)}
                        sx={{
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                          "&:hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.08)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          },
                        }}
                      >
                        <TfiMore size={16} color="#666" />
                      </Button>
                      <Button
                        onClick={() => handlePreviewDevis(devis.id)}
                        sx={{
                          color: "primary.main",
                          "&:hover": {
                            backgroundColor: "rgba(25, 118, 210, 0.04)",
                          },
                        }}
                      >
                        <AiFillFilePdf style={{ fontSize: "24px" }} />
                      </Button>
                    </ButtonGroup>
                  </CenteredTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StyledTableContainer>
      </StyledBox>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleModifyDevis}>Modifier le devis</MenuItem>
        <MenuItem onClick={handleEditFacture}>Éditer en facture</MenuItem>
        {selectedDevis && selectedDevis.devis_chantier !== true && (
          <MenuItem onClick={handleEditTS}>Éditer en avenant</MenuItem>
        )}
        <MenuItem onClick={handleEditCIE}>Éditer en CIE</MenuItem>
        <MenuItem onClick={handleChangeStatus}>Modifier l'état</MenuItem>
      </Menu>

      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setDevisToUpdate(null);
        }}
        currentStatus={devisToUpdate?.status}
        onStatusChange={handleStatusUpdate}
        type="devis"
        title="Modifier l'état du devis"
      />

      <TransformationTSModal
        open={tsModalOpen}
        onClose={() => setTsModalOpen(false)}
        devis={selectedDevisForTS}
        chantier={selectedChantier}
      />

      <TransformationCIEModal
        open={cieModalOpen}
        onClose={() => setCieModalOpen(false)}
        devis={selectedDevisForCIE}
        chantier={selectedChantier}
      />

      <FactureModal
        open={factureModalOpen}
        devis={selectedDevis}
        onClose={() => setFactureModalOpen(false)}
        onSubmit={handleFactureSubmit}
      />

      <CreationSituation
        open={situationModalOpen}
        onClose={() => {
          setSituationModalOpen(false);
          setSelectedDevisForSituation(null);
        }}
        devis={selectedDevisForSituation}
        chantier={selectedChantier}
      />
    </div>
  );
};

export default ChantierListeDevis;
