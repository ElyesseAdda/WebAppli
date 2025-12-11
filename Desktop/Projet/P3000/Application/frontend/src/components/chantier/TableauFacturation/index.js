import { Box, CircularProgress, MenuItem, Select, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTableauFacturation } from "./hooks/useTableauFacturation";
import TableauFacturationTable from "./components/TableauFacturationTable";
import DateEnvoiModal from "./components/DateEnvoiModal";
import PaiementModal from "./components/PaiementModal";
import BanqueModal from "./components/BanqueModal";

const TableauFacturation = () => {
  const [openDateModal, setOpenDateModal] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [openPaiementModal, setOpenPaiementModal] = useState(false);
  const [openBanqueModal, setOpenBanqueModal] = useState(false);
  const [selectedSituationForBanque, setSelectedSituationForBanque] =
    useState(null);

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
        />
      )}

      <DateEnvoiModal
        open={openDateModal}
        onClose={() => setOpenDateModal(false)}
        situation={selectedSituation}
        onSubmit={handleDateModalSubmit}
      />
      <PaiementModal
        open={openPaiementModal}
        onClose={() => setOpenPaiementModal(false)}
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

