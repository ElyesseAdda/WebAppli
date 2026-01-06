import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
  CenteredTextField,
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

const formatNumber = (number) => {
  if (number == null) return "";
  const formatted = parseFloat(number).toFixed(2);
  return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const ChantierListeAvenants = ({
  chantierData,
  avenants,
  setAvenants,
  filters,
  setFilters,
  isLoaded,
  setIsLoaded,
  onSaveFilters,
}) => {
  const [filteredAvenants, setFilteredAvenants] = useState([]);
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAvenant, setSelectedAvenant] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);

  // Aplatir les avenants en liste de devis (un devis par ligne)
  const flattenAvenants = (avenantsList) => {
    const flattened = [];
    avenantsList.forEach((avenant) => {
      if (avenant.factures_ts && avenant.factures_ts.length > 0) {
        avenant.factures_ts.forEach((factureTs) => {
          flattened.push({
            id: factureTs.id,
            avenant_id: avenant.id,
            avenant_numero: avenant.numero,
            devis_id: factureTs.devis,
            devis_numero: factureTs.devis_numero || factureTs.devis?.numero || `TS n°${String(factureTs.numero_ts).padStart(3, "0")}`,
            designation: factureTs.designation || "",
            date_creation: factureTs.devis_date_creation || factureTs.date_creation,
            montant_ht: factureTs.montant_ht || factureTs.devis_price_ht,
            montant_ttc: factureTs.montant_ttc || factureTs.devis_price_ttc,
            nature_travaux: factureTs.devis_nature_travaux || "",
            status: factureTs.devis_status || "En Cours",
            numero_ts: factureTs.numero_ts,
          });
        });
      }
    });
    return flattened;
  };

  useEffect(() => {
    if (!isLoaded && chantierData?.id) {
      fetchAvenants();
    } else {
      const flattened = flattenAvenants(avenants);
      setFilteredAvenants(flattened);
    }
    // eslint-disable-next-line
  }, [chantierData?.id, isLoaded, avenants]);

  const fetchAvenants = async () => {
    try {
      const response = await axios.get(
        `/api/avenant_chantier/${chantierData.id}/avenants/`
      );
      if (response.data.success) {
        setAvenants(response.data.avenants);
        const flattened = flattenAvenants(response.data.avenants);
        setFilteredAvenants(flattened);
      } else {
        setAvenants([]);
        setFilteredAvenants([]);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error("Erreur lors du chargement des avenants:", error);
      setAvenants([]);
      setFilteredAvenants([]);
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
    // Recalcule la liste filtrée à chaque changement de filters ou de avenants
    const flattened = flattenAvenants(avenants);
    let filtered = flattened.filter((item) => {
      return Object.keys(filters).every((key) => {
        if (!filters[key] || filters[key] === "Tous") return true;
        switch (key) {
          case "numero_devis":
            return item.devis_numero
              ?.toLowerCase()
              .includes(filters[key].toLowerCase());
          case "date_creation":
            if (!filters[key]) return true;
            const itemDate = new Date(item.date_creation)
              .toISOString()
              .split("T")[0];
            return itemDate === filters[key];
          case "montant":
            const itemMontant = item.montant_ht?.toString() || "";
            return itemMontant.includes(filters[key]);
          case "avenant_numero":
            return item.avenant_numero?.toString() === filters[key];
          default:
            return true;
        }
      });
    });
    setFilteredAvenants(filtered);
  }, [filters, avenants]);

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);
    setPendingSave(true);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);

    const sorted = [...filteredAvenants].sort((a, b) => {
      if (property === "date_creation") {
        return (
          (isAsc ? 1 : -1) *
          (new Date(a[property]).getTime() - new Date(b[property]).getTime())
        );
      }
      if (property === "montant_ht") {
        return (
          (isAsc ? 1 : -1) * (parseFloat(a[property]) - parseFloat(b[property]))
        );
      }
      return (isAsc ? 1 : -1) * (a[property] < b[property] ? -1 : 1);
    });

    setFilteredAvenants(sorted);
  };

  const handlePreviewDevis = (devisId) => {
    window.open(`/api/preview-saved-devis-v2/${devisId}/`, "_blank");
  };

  const handleMenuClick = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedAvenant(item);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedAvenant(null);
  };

  const handleDeleteAvenant = async () => {
    if (!selectedAvenant) return;
    try {
      // Supprimer la FactureTS (qui supprimera aussi le lien avec l'avenant)
      await axios.delete(`/api/factures-ts/${selectedAvenant.id}/`);
      fetchAvenants();
      handleClose();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression de l'avenant.");
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const handleGeneratePDF = async (item) => {
    try {
      // Appel à l'API pour générer le PDF du devis
      const response = await axios.post(
        "/api/generate-devis-pdf-from-preview/",
        {
          devis_id: item.devis_id,
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
        link.download = `${item.devis_numero}.pdf`;
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

  // Obtenir les numéros d'avenants uniques pour le filtre
  const avenantNumeros = [...new Set(avenants.map((a) => a.numero))].sort(
    (a, b) => a - b
  );

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
          Avenants du chantier
        </Typography>

        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <FilterCell>
                  <StyledTextField
                    label="Numéro devis"
                    variant="standard"
                    value={filters.numero_devis || ""}
                    onChange={handleFilterChange("numero_devis")}
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
                      value={filters.date_creation || ""}
                      onChange={handleFilterChange("date_creation")}
                      InputLabelProps={{ shrink: true }}
                      sx={{ pt: "15px" }}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <AlignedCell>
                  <TableSortLabel
                    active={orderBy === "montant_ht"}
                    direction={orderBy === "montant_ht" ? order : "asc"}
                    onClick={() => handleSort("montant_ht")}
                    sx={{ textAlign: "center" }}
                  >
                    <PriceTextField
                      label="Prix HT"
                      variant="standard"
                      value={filters.montant || ""}
                      onChange={handleFilterChange("montant")}
                    />
                  </TableSortLabel>
                </AlignedCell>
                <FilterCell>
                  <StyledSelect
                    value={filters.avenant_numero || "Tous"}
                    onChange={handleFilterChange("avenant_numero")}
                    variant="standard"
                    sx={{ pt: "10px" }}
                  >
                    <MenuItem value="Tous">Tous</MenuItem>
                    {avenantNumeros.map((numero) => (
                      <MenuItem key={numero} value={numero.toString()}>
                        Avenant n°{numero}
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
              {filteredAvenants.length === 0 ? (
                <TableRow>
                  <CenteredTableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      Aucun avenant trouvé
                    </Typography>
                  </CenteredTableCell>
                </TableRow>
              ) : (
                filteredAvenants.map((item, idx) => (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{ backgroundColor: idx % 2 === 0 ? "#fafafa" : "#fff" }}
                  >
                    <DevisNumber
                      onClick={() => handlePreviewDevis(item.devis_id)}
                      sx={{ cursor: "pointer", fontWeight: 700 }}
                    >
                      {item.devis_numero}
                      {item.designation && ` - ${item.designation}`}
                    </DevisNumber>
                    <CenteredTableCell>
                      {new Date(item.date_creation).toLocaleDateString()}
                    </CenteredTableCell>
                    <CenteredTableCell
                      sx={{ fontWeight: 600, color: green[500] }}
                    >
                      {formatNumber(item.montant_ht)} €
                    </CenteredTableCell>
                    <CenteredTableCell>
                      Avenant n°{item.avenant_numero}
                    </CenteredTableCell>
                    <CenteredTableCell sx={{ width: "120px", padding: "0 8px" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {/* Bouton de téléchargement PDF */}
                        <IconButton
                          onClick={() => handleGeneratePDF(item)}
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
                          documentType={DOCUMENT_TYPES.DEVIS}
                          documentData={{
                            id: item.devis_id,
                            numero: item.devis_numero,
                            chantier: chantierData,
                          }}
                          size="small"
                          color="primary"
                          tooltipPlacement="top"
                          onSuccess={() => {
                            console.log("✅ Devis régénéré avec succès");
                          }}
                        />
                        {/* Bouton "more" */}
                        <IconButton
                          onClick={(e) => handleMenuClick(e, item)}
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
                ))
              )}
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
        <MenuItem
          onClick={() => handlePreviewDevis(selectedAvenant?.devis_id)}
        >
          Voir le devis
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleGeneratePDF(selectedAvenant);
            handleClose();
          }}
        >
          Télécharger le PDF
        </MenuItem>
        <MenuItem
          onClick={handleDeleteClick}
          sx={{
            color: "error.main",
            "&:hover": {
              backgroundColor: "error.light",
              color: "error.contrastText",
            },
          }}
        >
          Supprimer
        </MenuItem>
      </Menu>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            padding: 1,
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          Confirmation de suppression
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l'avenant{" "}
            {selectedAvenant?.devis_numero} ?
            <br />
            Cette action est irréversible et supprimera le lien entre le devis et
            l'avenant.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ padding: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleDeleteAvenant}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ChantierListeAvenants;

