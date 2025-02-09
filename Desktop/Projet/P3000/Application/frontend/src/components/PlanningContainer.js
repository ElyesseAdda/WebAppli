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
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
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
      };

      console.log("Données envoyées à l'API:", payload);

      const response = await axios.post("/api/save_labor_costs/", payload);
      console.log("Réponse de l'API:", response.data);
    } catch (error) {
      console.error("Erreur détaillée:", error.response?.data);
      console.error("Erreur lors de la sauvegarde des coûts:", error);
    }
  };

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
              {Array.from({ length: 5 }, (_, i) => (
                <MenuItem key={dayjs().year() - i} value={dayjs().year() - i}>
                  {dayjs().year() - i}
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

      <PlanningHebdoAgent
        schedule={schedule}
        selectedAgentId={selectedAgentId}
        selectedWeek={selectedWeek}
        selectedYear={selectedYear}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        setSchedule={setSchedule}
        onCostsCalculated={setLaborCosts}
        setSelectedAgentId={setSelectedAgentId}
        onCopyClick={() => setIsCopyModalOpen(true)}
        onScheduleUpdate={handleScheduleUpdate}
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
