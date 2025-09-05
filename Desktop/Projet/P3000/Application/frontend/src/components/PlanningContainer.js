import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import axios from "axios";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { generatePDFDrive } from "../utils/universalDriveGenerator";
import LaborCostsSummary from "./LaborCostsSummary";
import PlanningHebdoAgent from "./PlanningHebdoAgent";

const StyledFormControl = styled(FormControl)({
  minWidth: 150,
  marginRight: "20px",
});

const ControlsContainer = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "15px",
  backgroundColor: "#f5f5f5",
  borderRadius: "4px",
  marginBottom: "20px",
  marginTop: "20px",
  width: "fit-content",
});

const SelectGroup = styled("div")({
  display: "flex",
  gap: "20px",
  marginRight: "40px",
});

const ButtonGroup = styled("div")({
  display: "flex",
  gap: "10px",
});

const PlanningContainer = () => {
  const [selectedWeek, setSelectedWeek] = useState(dayjs().isoWeek());
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [laborCosts, setLaborCosts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCostsSummary, setShowCostsSummary] = useState(false);
  const [agents, setAgents] = useState([]);
  const [isLaborCostsSummaryOpen, setIsLaborCostsSummaryOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState(null);
  const [targetWeek, setTargetWeek] = useState(dayjs().isoWeek());
  const [targetYear, setTargetYear] = useState(dayjs().year());
  const [isCopying, setIsCopying] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedReportYear, setSelectedReportYear] = useState(dayjs().year());

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await axios.get("/api/agent/");
        setAgents(response.data);
        if (response.data.length > 0) {
          setSelectedAgentId(response.data[0].id); // Sélectionner le premier agent par défaut
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des agents :", error);
      }
    };

    fetchAgents();
  }, []);

  const handleSelectionChange = (agentId, week, year) => {
    setSelectedAgentId(agentId);
    setSelectedWeek(week);
    setSelectedYear(year);
  };

  const handleTargetAgentChange = (e) => {
    setTargetAgentId(Number(e.target.value));
  };

  const generateWeeks = () => {
    return Array.from({ length: 53 }, (_, i) => i + 1);
  };

  const generateYears = () => {
    const currentYear = dayjs().year();
    const minYear = 2023;
    const maxYear = currentYear + 2;
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
  };

  const generateMonths = () => {
    return [
      { value: 1, label: "Janvier" },
      { value: 2, label: "Février" },
      { value: 3, label: "Mars" },
      { value: 4, label: "Avril" },
      { value: 5, label: "Mai" },
      { value: 6, label: "Juin" },
      { value: 7, label: "Juillet" },
      { value: 8, label: "Août" },
      { value: 9, label: "Septembre" },
      { value: 10, label: "Octobre" },
      { value: 11, label: "Novembre" },
      { value: 12, label: "Décembre" },
    ];
  };

  const handleGenerateMonthlyReport = async () => {
    try {
      console.log(
        `🚀 NOUVEAU: Génération du rapport mensuel agents ${selectedMonth}/${selectedReportYear} vers le Drive...`
      );

      // Utiliser le nouveau système universel
      await generatePDFDrive(
        "rapport_agents",
        {
          month: selectedMonth,
          year: selectedReportYear,
        },
        {
          onSuccess: (response) => {
            console.log(
              "✅ NOUVEAU: Rapport mensuel généré avec succès:",
              response
            );
          },
          onError: (error) => {
            console.error(
              "❌ NOUVEAU: Erreur lors de la génération du rapport mensuel:",
              error
            );
            alert(
              `❌ Erreur lors de la génération du rapport mensuel: ${error.message}`
            );
          },
        }
      );
    } catch (error) {
      console.error(
        "❌ NOUVEAU: Erreur lors de la génération du rapport mensuel:",
        error
      );
      alert(
        `❌ Erreur lors de la génération du rapport mensuel: ${error.message}`
      );
    }
  };

  const copySchedule = async () => {
    setIsCopying(true);
    try {
      await axios.post("/api/copy_schedule/", {
        sourceAgentId: selectedAgentId,
        targetAgentId: targetAgentId,
        sourceWeek: selectedWeek,
        targetWeek: targetWeek,
        sourceYear: selectedYear,
        targetYear: targetYear,
      });
      alert("Planning copié avec succès!");
      setIsCopyModalOpen(false);
    } catch (error) {
      console.error("Erreur lors de la copie du planning:", error);
      alert("Erreur lors de la copie du planning");
    } finally {
      setIsCopying(false);
    }
  };

  const updateLaborCosts = async (chantierId, hours) => {
    try {
      await axios.post("/api/update_labor_costs/", {
        agent_id: selectedAgentId,
        chantier_id: chantierId,
        week: selectedWeek,
        year: selectedYear,
        hours: hours,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour des coûts:", error);
      throw error;
    }
  };

  const handleScheduleUpdate = async (
    updatedSchedule,
    chantierId,
    hoursChange
  ) => {
    try {
      // Mise à jour du planning
      await axios.post("/api/update_schedule/", {
        agent_id: selectedAgentId,
        week: selectedWeek,
        year: selectedYear,
        schedule: updatedSchedule[selectedAgentId],
      });

      // Mise à jour des coûts
      await updateLaborCosts(chantierId, hoursChange);

      setSchedule(updatedSchedule);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Une erreur est survenue lors de la mise à jour");
    }
  };

  const handleCostsCalculated = async (laborCosts) => {
    try {
      const payload = {
        agent_id: selectedAgentId,
        week: selectedWeek,
        year: selectedYear,
        costs: laborCosts,
        schedule: schedule[selectedAgentId] || {}, // Ajout du planning détaillé pour l'agent
      };

      console.log("Données envoyées à l'API:", payload);

      const response = await axios.post("/api/save_labor_costs/", payload);
      console.log("Réponse de l'API:", response.data);
    } catch (error) {
      console.error("Erreur détaillée:", error.response?.data);
      console.error("Erreur lors de la sauvegarde des coûts:", error);
    }
  };

  useEffect(() => {
    if (!selectedAgentId || !selectedWeek || !selectedYear) return;

    // Trouver l'agent sélectionné pour connaître son type de paiement
    const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
    const isAgentJournalier = selectedAgent?.type_paiement === "journalier";

    // Calculer les heures par chantier pour l'agent/semaine/année sélectionnés
    const hoursPerChantier = {};
    if (schedule[selectedAgentId]) {
      Object.entries(schedule[selectedAgentId]).forEach(([hour, dayData]) => {
        Object.entries(dayData).forEach(([day, chantier]) => {
          let chantierName;

          // Gérer le nouveau format d'objet et l'ancien format de chaîne
          if (typeof chantier === "object" && chantier !== null) {
            chantierName = chantier.chantierName;
          } else {
            chantierName = chantier;
          }

          if (chantierName && chantierName.trim() !== "") {
            if (isAgentJournalier) {
              // Pour les agents journaliers : Matin ou Après-midi = 0.5 jour = 4h
              hoursPerChantier[chantierName] =
                (hoursPerChantier[chantierName] || 0) + 4;
            } else {
              // Pour les agents horaires : 1 heure par créneau
              hoursPerChantier[chantierName] =
                (hoursPerChantier[chantierName] || 0) + 1;
            }
          }
        });
      });
    }
    const laborCosts = Object.entries(hoursPerChantier).map(
      ([chantierName, hours]) => ({
        chantier_name: chantierName,
        hours: hours,
      })
    );

    // Appeler la sauvegarde (même si laborCosts est vide)
    handleCostsCalculated(laborCosts);
    // eslint-disable-next-line
  }, [schedule, selectedAgentId, selectedWeek, selectedYear, agents]);

  return (
    <div className="planning-container">
      <ControlsContainer>
        <SelectGroup>
          <StyledFormControl>
            <InputLabel>Agent</InputLabel>
            <Select
              value={selectedAgentId || ""}
              onChange={(e) =>
                handleSelectionChange(
                  Number(e.target.value),
                  selectedWeek,
                  selectedYear
                )
              }
              label="Agent"
            >
              <MenuItem value="">--Sélectionner un agent--</MenuItem>
              {agents.map((agent) => (
                <MenuItem key={agent.id} value={agent.id}>
                  {agent.name}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>

          <StyledFormControl>
            <InputLabel>Semaine</InputLabel>
            <Select
              value={selectedWeek}
              onChange={(e) =>
                handleSelectionChange(
                  selectedAgentId,
                  Number(e.target.value),
                  selectedYear
                )
              }
              label="Semaine"
            >
              {Array.from({ length: 53 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  Semaine {i + 1}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>

          <StyledFormControl>
            <InputLabel>Année</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) =>
                handleSelectionChange(
                  selectedAgentId,
                  selectedWeek,
                  Number(e.target.value)
                )
              }
              label="Année"
            >
              {generateYears().map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>
        </SelectGroup>

        <ButtonGroup>
          <Button
            variant="contained"
            onClick={() => setIsLaborCostsSummaryOpen(true)}
            sx={{
              backgroundColor: "rgba(27, 120, 188, 1)",
              "&:hover": {
                backgroundColor: "rgba(27, 120, 188, 0.8)",
              },
            }}
          >
            Résumé des heures
          </Button>
          <Button
            variant="outlined"
            onClick={() => setIsCopyModalOpen(true)}
            sx={{
              marginLeft: "20px",
              backgroundColor: "#9c27b0",
              color: "white",
              borderColor: "#9c27b0",
              "&:hover": {
                backgroundColor: "#7b1fa2",
                borderColor: "#9c27b0",
              },
            }}
          >
            Copier le Planning
          </Button>
        </ButtonGroup>
      </ControlsContainer>

      {/* Section pour le rapport mensuel */}
      <ControlsContainer>
        <SelectGroup>
          <StyledFormControl>
            <InputLabel>Mois</InputLabel>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              label="Mois"
            >
              {generateMonths().map((month) => (
                <MenuItem key={month.value} value={month.value}>
                  {month.label}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>

          <StyledFormControl>
            <InputLabel>Année</InputLabel>
            <Select
              value={selectedReportYear}
              onChange={(e) => setSelectedReportYear(Number(e.target.value))}
              label="Année"
            >
              {generateYears().map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>
        </SelectGroup>

        <ButtonGroup>
          <Button
            variant="contained"
            onClick={handleGenerateMonthlyReport}
            sx={{
              backgroundColor: "#4caf50",
              "&:hover": {
                backgroundColor: "#45a049",
              },
            }}
          >
            Générer Rapport Mensuel PDF
          </Button>
        </ButtonGroup>
      </ControlsContainer>

      <PlanningHebdoAgent
        schedule={schedule}
        selectedAgentId={selectedAgentId}
        selectedWeek={selectedWeek}
        selectedYear={selectedYear}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        setSchedule={setSchedule}
        setSelectedAgentId={setSelectedAgentId}
        onCopyClick={() => setIsCopyModalOpen(true)}
        onSelectionChange={handleSelectionChange}
      />

      <LaborCostsSummary
        schedule={schedule}
        selectedAgentId={selectedAgentId}
        isOpen={isLaborCostsSummaryOpen}
        onClose={() => setIsLaborCostsSummaryOpen(false)}
        tauxHoraire={
          agents.find((agent) => agent.id === selectedAgentId)?.taux_Horaire ||
          0
        }
        onCostsCalculated={handleCostsCalculated}
      />

      {/* Modal pour copier le planning */}
      {isCopyModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Copier le Planning vers un Autre Agent</h2>
            <label htmlFor="target-agent-select">
              Sélectionner un agent cible :
            </label>
            <select
              id="target-agent-select"
              value={targetAgentId || ""}
              onChange={handleTargetAgentChange}
              style={{ width: "100%", padding: "8px", marginTop: "10px" }}
            >
              <option value="">--Sélectionner un agent cible--</option>
              {agents
                .filter((agent) => agent.id !== selectedAgentId)
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
            </select>
            <label htmlFor="target-year-select" style={{ marginTop: "10px" }}>
              Sélectionner une année cible :
            </label>
            <select
              id="target-year-select"
              value={targetYear}
              onChange={(e) => setTargetYear(Number(e.target.value))}
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            >
              {generateYears().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <label htmlFor="target-week-select" style={{ marginTop: "10px" }}>
              Sélectionner une semaine cible :
            </label>
            <select
              id="target-week-select"
              value={targetWeek}
              onChange={(e) => setTargetWeek(Number(e.target.value))}
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            >
              {generateWeeks().map((week) => (
                <option key={week} value={week}>
                  Semaine {week}
                </option>
              ))}
            </select>
            <div
              style={{
                marginTop: "15px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="contained"
                onClick={copySchedule}
                disabled={!targetAgentId || isCopying}
                sx={{
                  backgroundColor: "rgba(27, 120, 188, 1)",
                  "&:hover": {
                    backgroundColor: "rgba(27, 120, 188, 0.8)",
                  },
                }}
              >
                {isCopying ? "Copie en cours..." : "Copier"}
              </Button>
              <Button
                variant="contained"
                onClick={() => setIsCopyModalOpen(false)}
                sx={{
                  backgroundColor: "#ccc",
                  color: "black",
                  "&:hover": {
                    backgroundColor: "#999",
                  },
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningContainer;
