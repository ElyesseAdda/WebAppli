import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
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
  StyledBox,
  StyledSelect,
  StyledTableContainer,
  StyledTextField,
} from "../../styles/tableStyles";
import { generatePDFDrive } from "../../utils/universalDriveGenerator";
import CreationSituation from "../CreationSituation";
import FactureModal from "../FactureModal";
import StatusChangeModal from "../StatusChangeModal";
import TransformationCIEModal from "../TransformationCIEModal";
import TransformationTSModal from "../TransformationTSModal";
import { RegeneratePDFIconButton } from "../shared/RegeneratePDFButton";
import { DOCUMENT_TYPES } from "../../config/documentTypeConfig";

const formatNumber = (number) => {
  if (number == null) return "";
  const formatted = parseFloat(number).toFixed(2);
  return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const toInputDate = (value) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateFr = (value) => {
  if (!value) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

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
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [editNumeroDialogOpen, setEditNumeroDialogOpen] = useState(false);
  const [devisToEditNumero, setDevisToEditNumero] = useState(null);
  const [newNumeroValue, setNewNumeroValue] = useState("");

  // Fonction pour obtenir les styles de statut (mêmes que le dashboard)
  const getStatusStyles = (status) => {
    return {
      display: "inline-block",
      px: 1.5,
      py: 0.5,
      borderRadius: 1,
      backgroundColor:
        status === "Validé"
          ? "info.light"
          : status === "Refusé"
          ? "error.light"
          : "warning.light",
      color:
        status === "Validé"
          ? "info.dark"
          : status === "Refusé"
          ? "error.dark"
          : "warning.dark",
      fontWeight: 500,
      textTransform: "capitalize",
    };
  };

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
            const devisDate = toInputDate(devis.date_creation);
            return devisDate === filters[key];
          case "price_ht":
            const devisPrice = devis.price_ht?.toString() || "";
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
            const devisDate = toInputDate(devis.date_creation);
            return devisDate === newFilters[key];
          case "price_ht":
            const devisPrice = devis.price_ht?.toString() || "";
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
      if (property === "price_ht") {
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

  const handleGeneratePDF = async (devis) => {
    try {
      // Afficher le message de téléchargement en cours
      setSnackbar({
        open: true,
        message: "Téléchargement en cours...",
        severity: "info",
      });

      // Appel à l'API existante
      const response = await axios.post(
        "/api/generate-pdf-from-preview/",
        {
          devis_id: devis.id,
          preview_url: `/api/preview-saved-devis/${devis.id}/`,
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
        link.download = `${devis.numero}.pdf`;
        document.body.appendChild(link);
        link.click();

        // Nettoyer
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);

        // Afficher le message de succès
        setSnackbar({
          open: true,
          message: "Téléchargement terminé avec succès",
          severity: "success",
        });
      } else {
        // Si ce n'est pas un PDF, c'est probablement une erreur
        const reader = new FileReader();
        reader.onload = function () {
          const errorMessage = JSON.parse(reader.result);
          setSnackbar({
            open: true,
            message: `Erreur: ${errorMessage.error || "Erreur inconnue"}`,
            severity: "error",
          });
        };
        reader.readAsText(response.data);
      }
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      setSnackbar({
        open: true,
        message: "Erreur lors de la génération du PDF. Veuillez réessayer.",
        severity: "error",
      });
    }
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
      window.location.href = `/ModificationDevisV2/${selectedDevis.id}`;
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

  const handleConvertToBonCommande = async () => {
    try {
      // Récupérer le devis complet
      const devisResponse = await axios.get(`/api/devisa/${selectedDevis.id}/`);
      const devisComplet = devisResponse.data;
      
      // Vérifier que le devis est validé
      if (devisComplet.status !== "Validé") {
        alert("Seuls les devis validés peuvent être convertis en bon de commande");
        return;
      }

      // Vérifier que le devis a des lignes
      if (!devisComplet.lignes || devisComplet.lignes.length === 0) {
        alert("Ce devis n'a pas de lignes à convertir");
        return;
      }

      // Récupérer les informations du chantier
      const chantierResponse = await axios.get(`/api/chantier/${devisComplet.chantier}/`);
      const chantier = chantierResponse.data;

      // Rediriger vers la page de création de bon de commande avec les données pré-remplies
      const queryParams = new URLSearchParams({
        from_devis: 'true',
        devis_id: selectedDevis.id,
        chantier_id: devisComplet.chantier
      });
      
      window.location.href = `/BonCommande?${queryParams.toString()}`;
      
    } catch (error) {
      console.error("Erreur lors de la conversion en bon de commande:", error);
      alert("Erreur lors de la conversion en bon de commande. Veuillez réessayer.");
    }
    handleClose();
  };

  const handleChangeStatus = () => {
    setDevisToUpdate(selectedDevis);
    setShowStatusModal(true);
    handleClose();
  };

  const handleEditNumeroClick = () => {
    if (selectedDevis) {
      setDevisToEditNumero(selectedDevis);
      setNewNumeroValue(String(selectedDevis.numero ?? ""));
      setEditNumeroDialogOpen(true);
    }
    setAnchorEl(null);
  };

  const handleEditNumeroClose = () => {
    setEditNumeroDialogOpen(false);
    setDevisToEditNumero(null);
    setNewNumeroValue("");
  };

  const handleEditNumeroSave = async () => {
    if (!devisToEditNumero) return;
    const value = String(newNumeroValue ?? "").trim();
    if (!value) {
      setSnackbar({
        open: true,
        message: "Veuillez entrer un numéro valide.",
        severity: "error",
      });
      return;
    }
    try {
      await axios.patch(`/api/devisa/${devisToEditNumero.id}/`, {
        numero: value,
      });
      await fetchDevis();
      handleEditNumeroClose();
      setSnackbar({
        open: true,
        message: `Numéro de devis mis à jour : ${value}`,
        severity: "success",
      });
    } catch (error) {
      const msg =
        error.response?.data?.numero?.[0] ||
        error.response?.data?.detail ||
        "Erreur lors de la mise à jour du numéro de devis.";
      setSnackbar({ open: true, message: msg, severity: "error" });
    }
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
        console.log(
          "🚀 Lancement de l'auto-download de la facture vers le Drive"
        );

        // Récupérer les données complètes de la facture créée
        const factureResponse = await axios.get(
          `/api/facture/${response.data.id}/`
        );
        const factureComplet = factureResponse.data;

        console.log("📋 Données de la facture complète:", factureComplet);

        // Récupérer les données de la société depuis le chantier
        const chantierResponse = await axios.get(
          `/api/chantier/${factureComplet.chantier}/`
        );
        const chantier = chantierResponse.data;

        // Récupérer les données de la société
        let societe;
        if (typeof chantier.societe === "object" && chantier.societe.id) {
          societe = chantier.societe;
        } else {
          const societeResponse = await axios.get(
            `/api/societe/${chantier.societe}/`
          );
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
              console.log(
                "✅ Facture générée avec succès dans le Drive:",
                response
              );
              alert("✅ Facture téléchargée automatiquement dans le Drive !");
            },
            onError: (error) => {
              console.error(
                "❌ Erreur lors de la génération de la facture:",
                error
              );
              alert(
                `❌ Erreur lors de la génération automatique: ${error.message}`
              );
            },
          }
        );
      } catch (autoDownloadError) {
        console.error("❌ Erreur lors de l'auto-download:", autoDownloadError);
        // Ne pas bloquer le processus principal si l'auto-download échoue
        alert(
          "⚠️ Facture créée mais erreur lors du téléchargement automatique. Vous pouvez le faire manuellement."
        );
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
                    active={orderBy === "price_ht"}
                    direction={orderBy === "price_ht" ? order : "asc"}
                    onClick={() => handleSort("price_ht")}
                    sx={{ textAlign: "center", color: "white" }}
                  >
                    <PriceTextField
                      label="Prix HT"
                      variant="standard"
                      value={filters.price_ht}
                      onChange={handleFilterChange("price_ht")}
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
                    {formatDateFr(devis.date_creation)}
                  </CenteredTableCell>
                  <CenteredTableCell
                    style={{ fontWeight: 600, color: green[500] }}
                  >
                    {formatNumber(devis.price_ht)} €
                  </CenteredTableCell>
                  <CenteredTableCell>
                    <Typography
                      variant="body2"
                      sx={getStatusStyles(devis.status || "En attente")}
                    >
                      {devis.status || "En attente"}
                    </Typography>
                  </CenteredTableCell>
                  <CenteredTableCell sx={{ width: "120px", padding: "0 8px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                      {/* Bouton de téléchargement PDF */}
                      <IconButton
                        onClick={() => handleGeneratePDF(devis)}
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
                        documentType={DOCUMENT_TYPES.DEVIS_TRAVAUX}
                        documentData={{
                          ...devis,
                          chantier: chantierData,
                        }}
                        size="small"
                        color="primary"
                        tooltipPlacement="top"
                        onSuccess={() => {
                          console.log('✅ Devis régénéré avec succès');
                        }}
                      />
                      {/* Bouton "more" */}
                      <IconButton
                        onClick={(e) => handleMoreClick(e, devis)}
                        size="small"
                        sx={{
                          "&:hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.04)",
                          },
                        }}
                      >
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

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleModifyDevis}>Modifier le devis</MenuItem>
        <MenuItem onClick={handleEditFacture}>Éditer en facture</MenuItem>
        {selectedDevis && selectedDevis.devis_chantier !== true && (
          <MenuItem onClick={handleEditTS}>Éditer en avenant</MenuItem>
        )}
        <MenuItem onClick={handleEditCIE}>Éditer en CIE</MenuItem>
        <MenuItem onClick={handleConvertToBonCommande}>Convertir en bon de commande</MenuItem>
        <MenuItem onClick={handleEditNumeroClick}>Modifier le numéro</MenuItem>
        <MenuItem onClick={handleChangeStatus}>Modifier le statut</MenuItem>
      </Menu>

      <Dialog
        open={editNumeroDialogOpen}
        onClose={handleEditNumeroClose}
        PaperProps={{
          sx: { borderRadius: 2, padding: 1 },
        }}
      >
        <DialogTitle>Modifier le numéro de devis</DialogTitle>
        <DialogContent>
          <StyledTextField
            autoFocus
            label="Numéro"
            type="text"
            value={newNumeroValue}
            onChange={(e) => setNewNumeroValue(e.target.value)}
            variant="outlined"
            fullWidth
            inputProps={{ maxLength: 100 }}
            sx={{
              mt: 1,
              "& .MuiInputBase-input": { color: "black" },
              "& .MuiInputLabel-root": { color: "rgba(0,0,0,0.6)" },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.23)",
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button onClick={handleEditNumeroClose} variant="outlined">
            Annuler
          </Button>
          <Button onClick={handleEditNumeroSave} variant="contained">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setDevisToUpdate(null);
        }}
        currentStatus={devisToUpdate?.status}
        onStatusChange={handleStatusUpdate}
        type="devis"
        title="Modifier le statut du devis"
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

      {/* Snackbar pour les notifications de téléchargement */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === "success" ? 3000 : 6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ChantierListeDevis;
