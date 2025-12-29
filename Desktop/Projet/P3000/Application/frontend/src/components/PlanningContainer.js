import {
  Button,
  FormControl,
  IconButton,
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
import AgentSelectionModal from "./AgentSelectionModal";
import PrimeModal from "./PrimeModal";

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
  // Utiliser isoWeekYear() pour obtenir l'année ISO correcte (gère les semaines qui chevauchent les années)
  const [selectedWeek, setSelectedWeek] = useState(dayjs().isoWeek());
  const [selectedYear, setSelectedYear] = useState(dayjs().isoWeekYear());
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [laborCosts, setLaborCosts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCostsSummary, setShowCostsSummary] = useState(false);
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [isLaborCostsSummaryOpen, setIsLaborCostsSummaryOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState(null);
  const [targetWeek, setTargetWeek] = useState(dayjs().isoWeek());
  const [targetYear, setTargetYear] = useState(dayjs().isoWeekYear());
  const [isCopying, setIsCopying] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedReportYear, setSelectedReportYear] = useState(dayjs().year());
  
  // États pour le modal de sélection des agents
  const [isAgentSelectionModalOpen, setIsAgentSelectionModalOpen] = useState(false);
  const [selectedAgentsForPDF, setSelectedAgentsForPDF] = useState([]);
  
  // État pour le modal de gestion des primes
  const [isPrimeModalOpen, setIsPrimeModalOpen] = useState(false);

  // Fonction utilitaire pour convertir semaine/année ISO en date de début de semaine
  // Utilise une approche basée sur le 4 janvier pour gérer correctement les semaines qui chevauchent les années
  const getWeekStartDate = (week, year) => {
    // La semaine 1 d'une année ISO est celle qui contient le 4 janvier
    // On calcule à partir du 4 janvier de l'année donnée
    const jan4 = dayjs().year(year).month(0).date(4);
    // Trouver le lundi de la semaine qui contient le 4 janvier
    // day() retourne 0 pour dimanche, 1 pour lundi, etc.
    const jan4Day = jan4.day(); // 0 = dimanche, 1 = lundi, 2 = mardi, etc.
    // Calculer le lundi de la semaine 1
    // Si jan4 est lundi (1), on soustrait 0 jours
    // Si jan4 est dimanche (0), on soustrait 6 jours pour remonter au lundi précédent
    const daysToSubtract = jan4Day === 0 ? 6 : jan4Day - 1;
    const week1Start = jan4.subtract(daysToSubtract, 'day');
    // Ajouter (week - 1) semaines pour obtenir le début de la semaine demandée
    return week1Start.add(week - 1, 'week').toDate();
  };

  // Fonction pour filtrer les agents selon la période (logique précise jour par jour)
  const getFilteredAgents = (agentsList, week, year) => {
    if (!week || !year) {
      return agentsList.filter(agent => agent.is_active);
    }
    
    const weekStartDate = getWeekStartDate(week, year);
    
    return agentsList.filter(agent => {
      // Agent actif OU désactivé après le début de la semaine
      return agent.is_active || 
             (agent.date_desactivation && new Date(agent.date_desactivation) > weekStartDate);
    });
  };

  // Fonction pour vérifier si un agent est visible pour la période actuelle
  const isAgentVisibleForPeriod = (agent, week, year) => {
    if (!week || !year) {
      return agent.is_active;
    }
    
    const weekStartDate = getWeekStartDate(week, year);
    return agent.is_active || 
           (agent.date_desactivation && new Date(agent.date_desactivation) > weekStartDate);
  };

  // Fonction pour filtrer les agents selon le mois/année (pour les rapports mensuels)
  const getFilteredAgentsForMonth = (agentsList, month, year) => {
    if (!month || !year) {
      return agentsList.filter(agent => agent.is_active);
    }
    
    const monthStartDate = dayjs().year(year).month(month - 1).startOf('month').toDate();
    
    return agentsList.filter(agent => {
      // Agent actif OU désactivé après le début du mois
      return agent.is_active || 
             (agent.date_desactivation && new Date(agent.date_desactivation) > monthStartDate);
    });
  };

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        // Récupérer tous les agents (actifs et inactifs) pour la logique temporelle
        const response = await axios.get("/api/agent/?include_inactive=true");
        setAgents(response.data);
        
        // Filtrer selon la période actuelle
        const filtered = getFilteredAgents(response.data, selectedWeek, selectedYear);
        setFilteredAgents(filtered);
        
        if (filtered.length > 0) {
          // Si aucun agent n'est sélectionné, sélectionner le premier agent disponible
          if (!selectedAgentId) {
            setSelectedAgentId(filtered[0].id);
          } else {
            // Vérifier si l'agent actuellement sélectionné est toujours visible
            const currentAgentStillVisible = filtered.some(agent => agent.id === selectedAgentId);
            if (!currentAgentStillVisible) {
              // Si l'agent sélectionné n'est plus visible, garder la sélection
              // (il sera affiché avec un message informatif)
            }
          }
        } else {
          // Si aucun agent n'est visible pour cette période, garder la sélection actuelle
          // (l'agent sera affiché avec un message informatif)
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des agents :", error);
      }
    };

    fetchAgents();
  }, [selectedWeek, selectedYear]);

  const handleSelectionChange = (agentId, week, year) => {
    setSelectedAgentId(agentId);
    setSelectedWeek(week);
    
    // Calculer l'année ISO réelle de la semaine pour synchroniser correctement
    // Cela gère les cas où la semaine chevauche deux années (ex: semaine 1 de 2026 commence en déc 2025)
    const weekStartDate = getWeekStartDate(week, year);
    const actualIsoYear = dayjs(weekStartDate).isoWeekYear();
    
    setSelectedYear(actualIsoYear);
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

      // Filtrer les agents pour le mois sélectionné
      const agentsForReport = getFilteredAgentsForMonth(agents, selectedMonth, selectedReportYear);
      console.log(`Agents inclus dans le rapport: ${agentsForReport.length}`);

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

  const handlePreviewMonthlyReport = () => {
    // Construire l'URL de prévisualisation
    const previewUrl = `/api/preview-monthly-agents-report/?month=${selectedMonth}&year=${selectedReportYear}`;
    
    // Ouvrir dans une nouvelle fenêtre/onglet
    window.open(previewUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  // Fonction pour ouvrir le modal de sélection des agents
  const handleOpenAgentSelection = () => {
    setIsAgentSelectionModalOpen(true);
  };

  // Fonction pour confirmer la sélection des agents et générer le PDF
  const handleConfirmAgentSelection = async (selectedAgentIds) => {
    try {
      console.log(
        `🚀 Génération du planning hebdomadaire avec ${selectedAgentIds.length} agents sélectionnés...`
      );

      // Utiliser le nouveau système universel avec la liste des agents
      await generatePDFDrive(
        "planning_hebdo",
        {
          week: selectedWeek,
          year: selectedYear,
          agent_ids: selectedAgentIds, // NOUVEAU : Liste des agents sélectionnés
        },
        {
          onSuccess: (response) => {
            console.log(
              "✅ Planning hebdomadaire généré avec succès:",
              response
            );
          },
          onError: (error) => {
            console.error(
              "❌ Erreur lors de la génération du planning hebdomadaire:",
              error
            );
            alert(
              `❌ Erreur lors de la génération du planning hebdomadaire: ${error.message}`
            );
          },
        }
      );
    } catch (error) {
      console.error(
        "❌ Erreur lors de la génération du planning hebdomadaire:",
        error
      );
      alert(
        `❌ Erreur lors de la génération du planning hebdomadaire: ${error.message}`
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
              {agents
                .filter((agent) => {
                  // Afficher seulement les agents visibles pour cette période
                  return isAgentVisibleForPeriod(agent, selectedWeek, selectedYear);
                })
                .sort((a, b) => {
                  // Trier par nom de famille puis par prénom
                  const nameA = `${a.surname} ${a.name}`.toLowerCase();
                  const nameB = `${b.surname} ${b.name}`.toLowerCase();
                  return nameA.localeCompare(nameB, 'fr');
                })
                .map((agent) => {
                  const isActive = agent.is_active;
                  return (
                    <MenuItem 
                      key={agent.id} 
                      value={agent.id}
                      sx={{
                        color: isActive ? 'inherit' : 'text.secondary',
                        fontStyle: isActive ? 'normal' : 'italic'
                      }}
                    >
                      {isActive ? (
                        `${agent.surname} ${agent.name}`
                      ) : (
                        `${agent.surname} ${agent.name} (Retiré de l'effectif le ${agent.date_desactivation ? new Date(agent.date_desactivation).toLocaleDateString('fr-FR') : 'N/A'})`
                      )}
                    </MenuItem>
                  );
                })}
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
          <Button
            variant="contained"
            onClick={() => setIsPrimeModalOpen(true)}
            sx={{
              backgroundColor: "#ff9800",
              "&:hover": {
                backgroundColor: "#f57c00",
              },
              marginLeft: "10px",
            }}
          >
            Gérer les Primes
          </Button>
          <IconButton
            onClick={handlePreviewMonthlyReport}
            sx={{
              backgroundColor: "#f5f5f5",
              color: "#333",
              marginLeft: "8px",
              border: "1px solid #ddd",
              "&:hover": {
                backgroundColor: "#e0e0e0",
              },
            }}
            title="Prévisualiser le rapport mensuel"
          >
            👀
          </IconButton>
        </ButtonGroup>
      </ControlsContainer>

      {selectedAgentId ? (
        (() => {
          const selectedAgent = agents.find(agent => agent.id === selectedAgentId);
          const isAgentVisible = selectedAgent ? isAgentVisibleForPeriod(selectedAgent, selectedWeek, selectedYear) : false;
          
          if (!isAgentVisible && selectedAgent) {
            // Trouver la dernière semaine où l'agent était visible
            const findLastVisibleWeek = () => {
              if (!selectedAgent.date_desactivation) return null;
              
              const desactivationDate = dayjs(selectedAgent.date_desactivation);
              // Utiliser la fonction utilitaire pour gérer correctement les semaines qui chevauchent les années
              let currentDate = dayjs(getWeekStartDate(selectedWeek, selectedYear));
              
              // Chercher en remontant jusqu'à 10 semaines en arrière
              for (let i = 0; i < 10; i++) {
                const weekStartDate = currentDate.startOf('isoWeek').toDate();
                if (desactivationDate.isAfter(weekStartDate)) {
                  return {
                    week: currentDate.isoWeek(),
                    year: currentDate.isoWeekYear() // Utiliser isoWeekYear() au lieu de year()
                  };
                }
                currentDate = currentDate.subtract(1, 'week');
              }
              return null;
            };
            
            const lastVisibleWeek = findLastVisibleWeek();
            
            const handleGoToLastVisibleWeek = () => {
              if (lastVisibleWeek) {
                // Utiliser handleSelectionChange pour synchroniser automatiquement l'année ISO
                handleSelectionChange(selectedAgentId, lastVisibleWeek.week, lastVisibleWeek.year);
              }
            };
            
            return (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                border: '2px dashed #ccc',
                margin: '20px 0'
              }}>
                <h3 style={{ color: '#666', marginBottom: '16px' }}>
                  Agent non disponible pour cette période
                </h3>
                <p style={{ color: '#888', fontSize: '16px', marginBottom: '8px' }}>
                  <strong>{selectedAgent.surname} {selectedAgent.name}</strong>
                </p>
                <p style={{ color: '#888', fontSize: '14px' }}>
                  Retiré de l'effectif le {selectedAgent.date_desactivation ? new Date(selectedAgent.date_desactivation).toLocaleDateString('fr-FR') : 'N/A'}
                </p>
                <p style={{ color: '#999', fontSize: '12px', marginTop: '16px', marginBottom: '24px' }}>
                  Cet agent n'était plus dans l'effectif au début de la semaine {selectedWeek} de {selectedYear}
                </p>
                {lastVisibleWeek ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGoToLastVisibleWeek}
                    sx={{
                      backgroundColor: '#1976d2',
                      '&:hover': {
                        backgroundColor: '#1565c0',
                      },
                    }}
                  >
                    ← Retour à la semaine {lastVisibleWeek.week} de {lastVisibleWeek.year}
                  </Button>
                ) : (
                  <p style={{ color: '#999', fontSize: '12px', fontStyle: 'italic' }}>
                    Aucune semaine précédente trouvée où cet agent était visible
                  </p>
                )}
              </div>
            );
          }
          
          return (
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
        onGeneratePDFClick={handleOpenAgentSelection}
      />
          );
        })()
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          border: '2px dashed #ccc',
          margin: '20px 0'
        }}>
          <h3 style={{ color: '#666' }}>
            Sélectionnez un agent pour voir son planning
          </h3>
        </div>
      )}

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
              {filteredAgents
                .filter((agent) => agent.id !== selectedAgentId)
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.surname} {agent.name}
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

      {/* Modal de sélection des agents pour le PDF */}
      <AgentSelectionModal
        isOpen={isAgentSelectionModalOpen}
        onClose={() => setIsAgentSelectionModalOpen(false)}
        onConfirm={handleConfirmAgentSelection}
        agents={filteredAgents}
        selectedAgents={selectedAgentsForPDF}
        setSelectedAgents={setSelectedAgentsForPDF}
        week={selectedWeek}
        year={selectedYear}
      />

      {/* Modal de gestion des primes */}
      <PrimeModal
        isOpen={isPrimeModalOpen}
        onClose={() => setIsPrimeModalOpen(false)}
        month={selectedMonth}
        year={selectedReportYear}
      />
    </div>
  );
};

export default PlanningContainer;
