import { Alert, Box, CircularProgress, MenuItem, Select, Snackbar, Typography } from "@mui/material";
import React, { useCallback, useState } from "react";
import { useTableauFacturation } from "./hooks/useTableauFacturation";
import TableauFacturationTable from "./components/TableauFacturationTable";
import DateEnvoiModal from "./components/DateEnvoiModal";
import PaiementModal from "./components/PaiementModal";
import BanqueModal from "./components/BanqueModal";
import { downloadDocumentPdf } from "./utils/downloadDocumentPdf";

const TableauFacturation = () => {
  const [openDateModal, setOpenDateModal] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [openPaiementModal, setOpenPaiementModal] = useState(false);
  const [openBanqueModal, setOpenBanqueModal] = useState(false);
  const [selectedSituationForBanque, setSelectedSituationForBanque] =
    useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const {
    selectedAnnee,
    setSelectedAnnee,
    loading,
    banques,
    situationsAvecSousTotaux,
    totaux,
    calculerCumulSituationHT,
    handleDateModalSubmit,
    handlePaiementModalSubmit,
    handleNumeroCPChange,
    handleBanqueChange,
    handleCreateBanque,
  } = useTableauFacturation();

  const handleOpenDateModal = (situation) => {
    setSelectedSituation(situation);
    setOpenDateModal(true);
  };

  const handleOpenPaiementModal = (situation) => {
    setSelectedSituation(situation);
    setOpenPaiementModal(true);
  };

  const handleOpenBanqueModal = (situation) => {
    setSelectedSituationForBanque(situation);
    setOpenBanqueModal(true);
  };

  const handleDownloadStatus = useCallback((status) => {
    setSnackbar({ open: true, ...status });
  }, []);

  const handleDownloadSituationPdf = useCallback(
    (situation) => {
      downloadDocumentPdf({
        url: "/api/generate-situation-pdf/",
        payload: { situation_id: situation.id },
        filename: situation.numero_situation || `situation-${situation.id}`,
        onStatus: handleDownloadStatus,
      });
    },
    [handleDownloadStatus]
  );

  const handleDownloadFacturePdf = useCallback(
    (facture) => {
      downloadDocumentPdf({
        url: "/api/generate-facture-pdf-from-preview/",
        payload: { facture_id: facture.id },
        filename: facture.numero || `facture-${facture.id}`,
        onStatus: handleDownloadStatus,
      });
    },
    [handleDownloadStatus]
  );

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontFamily: "Merriweather, serif",
            color: "white",
            fontWeight: "bold",
          }}
        >
          TABLEAU FACTURATION Année {selectedAnnee}
        </Typography>

        {/* Sélecteur d'année */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
          <Select
            value={selectedAnnee}
            onChange={(e) => setSelectedAnnee(e.target.value)}
            variant="standard"
            sx={{
              minWidth: 120,
              color: "rgba(27, 120, 188, 1)",
              backgroundColor: "white",
            }}
          >
            {Array.from(
              { length: 5 },
              (_, i) => new Date().getFullYear() - 2 + i
            ).map((annee) => (
              <MenuItem key={annee} value={annee}>
                {annee}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <TableauFacturationTable
          situationsAvecSousTotaux={situationsAvecSousTotaux}
          totaux={totaux}
          banques={banques}
          calculerCumulSituationHT={calculerCumulSituationHT}
          onOpenDateModal={handleOpenDateModal}
          onOpenPaiementModal={handleOpenPaiementModal}
          onOpenBanqueModal={handleOpenBanqueModal}
          onNumeroCPChange={handleNumeroCPChange}
          onDownloadSituationPdf={handleDownloadSituationPdf}
          onDownloadFacturePdf={handleDownloadFacturePdf}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <DateEnvoiModal
        open={openDateModal}
        onClose={() => {
          setOpenDateModal(false);
          setSelectedSituation(null);
        }}
        situation={selectedSituation}
        onSubmit={handleDateModalSubmit}
      />
      <PaiementModal
        open={openPaiementModal}
        onClose={() => {
          setOpenPaiementModal(false);
          setSelectedSituation(null);
        }}
        situation={selectedSituation}
        onSubmit={handlePaiementModalSubmit}
      />
      <BanqueModal
        open={openBanqueModal}
        onClose={() => {
          setOpenBanqueModal(false);
          setSelectedSituationForBanque(null);
        }}
        banques={banques}
        selectedSituation={selectedSituationForBanque}
        onSelectBanque={handleBanqueChange}
        onCreateBanque={handleCreateBanque}
      />
    </Box>
  );
};

export default TableauFacturation;

