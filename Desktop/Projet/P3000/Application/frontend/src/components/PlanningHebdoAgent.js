import { Button, styled as muiStyled } from "@mui/material";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/fr"; // Assurez-vous d'importer la locale
import isoWeek from "dayjs/plugin/isoWeek";
import React, { useEffect, useState } from "react";

import "./../../static/css/planningHebdo.css";
import LaborCostsSummary from "./LaborCostsSummary";

dayjs.extend(isoWeek);
dayjs.locale("fr"); // Définir la locale sur français

// Styles personnalisés pour les boutons Material UI
const StyledButton = muiStyled(Button)(({ theme }) => ({
  margin: "10px",
  textTransform: "none",
  fontWeight: 500,
}));

const PlanningHebdoAgent = ({
  selectedAgentId,
  selectedWeek,
  selectedYear,
  schedule,
  isLoading,
  setIsLoading,
  setSchedule,
  onCopyClick,
  setSelectedAgentId,
  onSelectionChange,
}) => {
  const [agents, setAgents] = useState([]);
  const hours = Array.from({ length: 17 }, (_, i) => `${i + 6}:00`); // Heures de 6h à 22h
  const daysOfWeek = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
  ];
  const [events, setEvents] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedCells, setSelectedCells] = useState([]);
  const [chantiers, setChantiers] = useState([]); // Nouvel état pour les chantiers
  const [isChantierModalOpen, setIsChantierModalOpen] = useState(false); // État pour le modal
  const [selectedChantier, setSelectedChantier] = useState(null); // Chantier sélectionné

  // Nouvel état pour le modal de copie
  const [targetAgentId, setTargetAgentId] = useState(null);
  const [targetWeek, setTargetWeek] = useState(selectedWeek);
  const [targetYear, setTargetYear] = useState(selectedYear);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const [showCostsSummary, setShowCostsSummary] = useState(false);

  const currentYear = dayjs().year();
  const currentWeek = dayjs().isoWeek();
  const minYear = 2023; // adapte cette valeur à ton année de début
  const isFirstWeek = selectedYear === minYear && selectedWeek === 1;
  const isLastWeek = selectedWeek === 52; // ou 53 si tu utilises 53 semaines

  // Fonction utilitaire pour récupérer le nom du chantier
  const getChantierName = (chantierId) => {
    const chantier = chantiers.find((c) => c.id === chantierId);
    return chantier ? chantier.chantier_name : `Chantier ${chantierId}`;
  };

  // Générer une liste d'années
  const generateYears = () => {
    const currentYear = dayjs().year();
    const years = [];
    const minYear = 2023; // adapte à ton année de début
    const maxYear = currentYear + 2; // autorise 2 ans dans le futur
    for (let i = maxYear; i >= minYear; i--) {
      years.push(i);
    }
    return years;
  };

  // Générer une liste de semaines
  const generateWeeks = () => {
    const weeks = [];
    for (let i = 1; i <= 53; i++) {
      weeks.push(i);
    }
    return weeks;
  };

  // Fonction pour récupérer les agents
  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/agent/");
      setAgents(response.data);
      if (response.data.length > 0) {
        setSelectedAgentId(response.data[0].id);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des agents :", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // Récupérer les chantiers depuis l'API
  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        const response = await axios.get("/api/chantier/"); // URL de votre API pour les chantiers
        setChantiers(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des chantiers :", error);
      }
    };

    fetchChantiers();
  }, []);

  // Charger les plannings et les événements lorsqu'un agent, une semaine ou une année est sélectionné
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (selectedAgentId && selectedWeek && selectedYear) {
          // Récupérer le planning
          const scheduleResponse = await axios.get(
            `/api/get_schedule/?agent=${selectedAgentId}&week=${selectedWeek}&year=${selectedYear}`
          );
          console.log(
            "Données reçues de l'API schedule:",
            scheduleResponse.data
          );

          // Initialiser scheduleData avec toutes les heures et jours par défaut
          const scheduleData = {};
          hours.forEach((hour) => {
            scheduleData[hour] = {};
            daysOfWeek.forEach((day) => {
              scheduleData[hour][day] = "";
            });
          });

          // Remplir scheduleData avec les données de l'API
          scheduleResponse.data.forEach((item, index) => {
            console.log(`Traitement de l'élément ${index}:`, item);

            // Formater l'heure pour correspondre au format défini dans 'hours'
            const formattedHour = dayjs(item.hour, "HH:mm:ss").format("H:mm");

            if (scheduleData[formattedHour] && daysOfWeek.includes(item.day)) {
              scheduleData[formattedHour][item.day] = item.chantier_id
                ? getChantierName(item.chantier_id) // Utiliser le nom du chantier
                : "";
            } else {
              console.warn(
                `Heure ou jour invalide détecté: Heure=${item.hour}, Jour=${item.day}`
              );
            }
          });

          console.log("Données transformées pour le planning:", scheduleData);

          // Récupérer les événements de la semaine
          const startOfWeek = dayjs()
            .year(selectedYear)
            .isoWeek(selectedWeek)
            .startOf("isoWeek");
          const endOfWeek = startOfWeek.add(6, "day").endOf("day");

          const eventsResponse = await axios.get("/api/events/", {
            params: {
              agent: selectedAgentId,
              start_date: startOfWeek.format("YYYY-MM-DD"),
              end_date: endOfWeek.format("YYYY-MM-DD"),
            },
          });

          console.log("Données reçues de l'API events:", eventsResponse.data);

          // Remplacer le filtrage des événements par :
          const eventsData = eventsResponse.data.filter(
            (event) =>
              event.event_type === "absence" || event.event_type === "conge"
          );

          // Identifier les jours avec événements A ou C
          const joursAvecEvents = eventsData.map((event) =>
            dayjs(event.start_date).format("DD/MM/YYYY")
          );

          console.log("Jours avec événements A ou C:", joursAvecEvents);

          // Supprimer les assignations pour les jours avec événements A ou C
          joursAvecEvents.forEach((date) => {
            daysOfWeek.forEach((day, index) => {
              const dateOfDay = startOfWeek
                .add(index, "day")
                .format("DD/MM/YYYY");
              if (dateOfDay === date) {
                hours.forEach((hour) => {
                  scheduleData[hour][day] = ""; // Supprimer l'assignation
                });
              }
            });
          });

          // Mettre à jour le planning
          setSchedule((prevSchedule) => ({
            ...prevSchedule,
            [selectedAgentId]: { ...scheduleData },
          }));

          // Mettre à jour les événements
          setEvents(eventsData);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        alert(
          "Erreur lors de la récupération du planning ou des événements. Consultez la console pour plus de détails."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedAgentId, selectedWeek, selectedYear]);

  // Fonction pour générer les dates de la semaine
  const getDatesOfWeek = (weekNumber) => {
    const startOfWeek = dayjs()
      .year(selectedYear)
      .isoWeek(weekNumber)
      .startOf("isoWeek");
    return daysOfWeek.map((_, index) =>
      startOfWeek.add(index, "day").format("DD/MM/YYYY")
    );
  };

  // Fonctions de sélection de cellules (handleMouseDown, handleMouseEnter, handleMouseUp)
  const handleMouseDown = (hour, day) => {
    setIsSelecting(true);
    setSelectedCells([{ hour, day }]);
  };

  const handleMouseEnter = (hour, day) => {
    if (isSelecting) {
      setSelectedCells((prev) => {
        // Éviter les duplications
        const newCell = { hour, day };
        if (
          !prev.some(
            (cell) => cell.hour === newCell.hour && cell.day === newCell.day
          )
        ) {
          return [...prev, newCell];
        }
        return prev;
      });
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    if (selectedCells.length > 0) {
      // Ouvrir le modal pour sélectionner le chantier
      openChantierModal();
    }
  };

  // Fonctions pour gérer le modal des chantiers
  const openChantierModal = () => {
    setIsChantierModalOpen(true);
  };

  const closeChantierModal = () => {
    setIsChantierModalOpen(false);
    setSelectedChantier(null);
    setSelectedCells([]); // Réinitialiser la sélection des cellules
  };

  // Fonction pour gérer le changement d'agent
  const handleAgentChange = (event) => {
    const agentId = Number(event.target.value);
    onSelectionChange(agentId, selectedWeek, selectedYear); // Appel de la fonction pour mettre à jour le parent
  };

  // Fonction pour gérer le changement de semaine
  const handleWeekChange = (event) => {
    const week = Number(event.target.value);
    onSelectionChange(selectedAgentId, week, selectedYear); // Appel de la fonction pour mettre à jour le parent
  };

  // Fonction pour gérer le changement d'année
  const handleYearChange = (event) => {
    const year = Number(event.target.value);
    onSelectionChange(selectedAgentId, selectedWeek, year); // Appel de la fonction pour mettre à jour le parent
  };

  // Fonction pour gérer le changement d'agent cible
  const handleTargetAgentChange = (e) => {
    setTargetAgentId(Number(e.target.value));
  };

  // Fonction pour ouvrir le modal de copie
  const openCopyModal = () => {
    setTargetAgentId(null); // Réinitialiser l'agent cible
    setTargetWeek(selectedWeek);
    setTargetYear(selectedYear);
    setIsCopyModalOpen(true);
  };

  // Fonction pour fermer le modal de copie
  const closeCopyModal = () => {
    setIsCopyModalOpen(false);
    setTargetAgentId(null);
  };

  // Fonction pour copier le planning
  const copySchedule = async () => {
    if (!targetAgentId) {
      alert("Veuillez sélectionner un agent cible.");
      return;
    }

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
      closeCopyModal();
    } catch (error) {
      console.error("Erreur lors de la copie du planning:", error);
      alert(
        "Erreur lors de la copie du planning. Consultez la console pour plus de détails."
      );
    } finally {
      setIsCopying(false);
    }
  };

  // Fonction pour assigner un chantier aux cellules sélectionnées
  const assignChantier = async () => {
    if (!selectedChantier) {
      alert("Veuillez sélectionner un chantier.");
      return;
    }

    try {
      const updates = selectedCells.map((cell) => ({
        agentId: selectedAgentId,
        week: selectedWeek,
        year: selectedYear,
        day: cell.day,
        hour: cell.hour,
        chantierId: selectedChantier.id,
      }));

      await axios.post("/api/assign_chantier/", updates);

      // Mettre à jour le state schedule localement
      setSchedule((prevSchedule) => {
        const newSchedule = { ...prevSchedule };
        if (!newSchedule[selectedAgentId]) {
          newSchedule[selectedAgentId] = {};
        }

        selectedCells.forEach((cell) => {
          if (!newSchedule[selectedAgentId][cell.hour]) {
            newSchedule[selectedAgentId][cell.hour] = {};
          }
          newSchedule[selectedAgentId][cell.hour][cell.day] =
            selectedChantier.chantier_name;
        });

        return newSchedule;
      });

      // Réinitialiser la sélection
      setSelectedCells([]);
      closeChantierModal();
    } catch (error) {
      console.error("Erreur lors de l'assignation du chantier :", error);
      alert(
        "Erreur lors de l'assignation du chantier. Consultez la console pour plus de détails."
      );
    }
  };

  // Nouvelle fonction de suppression
  const deleteChantierAssignment = async () => {
    if (selectedCells.length === 0) {
      alert("Aucune cellule sélectionnée pour la suppression.");
      return;
    }

    const confirmation = window.confirm(
      "Êtes-vous sûr de vouloir supprimer les assignations sélectionnées ?"
    );
    if (!confirmation) return;

    // Préparer les données à envoyer
    const deletions = selectedCells.map((cell) => ({
      agentId: selectedAgentId,
      week: selectedWeek,
      year: selectedYear,
      day: cell.day,
      hour: cell.hour,
    }));

    try {
      await axios.post("/api/delete_schedule/", deletions);

      // Mettre à jour le state schedule localement
      setSchedule((prevSchedule) => {
        const newSchedule = { ...prevSchedule };
        if (!newSchedule[selectedAgentId]) {
          newSchedule[selectedAgentId] = {};
        }

        selectedCells.forEach((cell) => {
          if (!newSchedule[selectedAgentId][cell.hour]) {
            newSchedule[selectedAgentId][cell.hour] = {};
          }
          newSchedule[selectedAgentId][cell.hour][cell.day] = ""; // Vider l'assignation
        });

        return newSchedule;
      });

      // Réinitialiser la sélection
      setSelectedCells([]);
      closeChantierModal();
    } catch (error) {
      console.error("Erreur lors de la suppression des assignations :", error);
      alert(
        "Erreur lors de la suppression des assignations. Consultez la console pour plus de détails."
      );
    }
  };

  // Fonction utilitaire pour générer une couleur unique par chantier
  function getColorForChantier(chantierId) {
    // Palette de couleurs (ajustable)
    const palette = [
      "#1b78bc",
      "#e57373",
      "#81c784",
      "#ffd54f",
      "#ba68c8",
      "#4dd0e1",
      "#ff8a65",
      "#a1887f",
      "#90a4ae",
      "#f06292",
      "#7986cb",
      "#dce775",
      "#9575cd",
      "#ffb74d",
      "#aed581",
      "#64b5f6",
      "#fff176",
      "#4db6ac",
      "#f44336",
      "#8d6e63",
    ];
    if (!chantierId) return "#bdbdbd";
    // Simple hash pour indexer la palette
    let hash = 0;
    const str = chantierId.toString();
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % palette.length;
    return palette[idx];
  }

  // Fonction pour déterminer le style des cellules
  const getCellStyle = (hour, day, scheduleData) => {
    // Convertir le format de date pour la comparaison
    const startOfWeek = dayjs()
      .year(selectedYear)
      .isoWeek(selectedWeek)
      .startOf("isoWeek");
    const dayIndex = daysOfWeek.indexOf(day) + 1; // Lundi = 1
    const currentDate = startOfWeek
      .add(dayIndex - 1, "day")
      .format("YYYY-MM-DD");

    // Vérifier si un événement absence ou congé existe pour cette date
    const hasEvent = events.find((event) => {
      const eventDate = dayjs(event.start_date).format("YYYY-MM-DD");
      return (
        eventDate === currentDate &&
        (event.event_type === "absence" || event.event_type === "conge") &&
        event.agent === selectedAgentId
      );
    });

    if (hasEvent) {
      // Couleur selon le sous-type
      if (hasEvent.event_type === "absence") {
        if (hasEvent.subtype === "justifiee") return "#fbc02d"; // jaune
        if (hasEvent.subtype === "injustifiee") return "#d32f2f"; // rouge foncé
        if (hasEvent.subtype === "maladie") return "#1976d2"; // bleu
        if (hasEvent.subtype === "rtt") return "#7b1fa2"; // violet
        return "red";
      }
      if (hasEvent.event_type === "conge") {
        if (hasEvent.subtype === "paye") return "#388e3c"; // vert foncé
        if (hasEvent.subtype === "sans_solde") return "#ffa000"; // orange
        if (hasEvent.subtype === "parental") return "#0288d1"; // bleu clair
        if (
          hasEvent.subtype === "maternite" ||
          hasEvent.subtype === "paternite"
        )
          return "#f06292"; // rose
        return "purple";
      }
    }

    // Style existant pour les cellules sélectionnées et assignées
    if (selectedCells.some((cell) => cell.hour === hour && cell.day === day)) {
      return "lightblue";
    }

    // Couleur par chantier si assigné
    if (scheduleData && scheduleData[hour] && scheduleData[hour][day]) {
      // On suppose que scheduleData[hour][day] contient le nom du chantier
      // Il faut retrouver l'id du chantier correspondant au nom
      const chantierName = scheduleData[hour][day];
      const chantier = chantiers.find((c) => c.chantier_name === chantierName);
      return getColorForChantier(chantier ? chantier.id : chantierName);
    }

    return "white";
  };

  // Fonction utilitaire pour obtenir les initiales de l'événement
  const getEventInitials = (event) => {
    if (!event) return "";
    if (event.event_type === "absence") {
      if (event.subtype === "justifiee") return "AJ";
      if (event.subtype === "injustifiee") return "AI";
      if (event.subtype === "maladie") return "MA";
      if (event.subtype === "rtt") return "RTT";
      return "A";
    }
    if (event.event_type === "conge") {
      if (event.subtype === "paye") return "CP";
      if (event.subtype === "sans_solde") return "CSS";
      if (event.subtype === "parental") return "CPR";
      if (event.subtype === "maternite") return "CM";
      if (event.subtype === "paternite") return "CPAT";
      return "C";
    }
    return "";
  };

  // Ajouter cette fonction après les autres fonctions utilitaires
  const fetchSchedule = async (agentId, week, year) => {
    setIsLoading(true);
    try {
      // Récupérer le planning
      const response = await axios.get(
        `/api/get_schedule/?agent=${agentId}&week=${week}&year=${year}`
      );
      setSchedule((prevSchedule) => ({
        ...prevSchedule,
        [agentId]: response.data,
      }));
    } catch (error) {
      console.error("Erreur lors de la récupération du planning :", error);
    } finally {
      setIsLoading(false);
    }
  };
  // Fonction pour générer le PDF de tous les agents pour la semaine sélectionnée
  const handleGeneratePDF = async () => {
    try {
      const response = await axios.get(
        `/api/planning_hebdo_pdf/?week=${selectedWeek}&year=${selectedYear}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `planning_hebdo_agents_semaine_${selectedWeek}_${selectedYear}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Erreur lors de la génération du PDF.");
      console.error(error);
    }
  };

  // Ajout des fonctions de navigation de semaine
  const handlePrevWeek = () => {
    let week = selectedWeek - 1;
    let year = selectedYear;
    if (week < 1) {
      week = 52; // ou 53 selon ton calendrier
      year = selectedYear - 1;
    }
    if (typeof onSelectionChange === "function") {
      onSelectionChange(selectedAgentId, week, year);
    }
  };

  const handleNextWeek = () => {
    let week = selectedWeek + 1;
    let year = selectedYear;
    if (week > 52) {
      week = 1;
      year = selectedYear + 1;
    }
    if (typeof onSelectionChange === "function") {
      onSelectionChange(selectedAgentId, week, year);
    }
  };

  return (
    <div onMouseUp={handleMouseUp}>
      {/* Ligne titre + bouton */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          marginRight: 200,
        }}
      >
        <h1 style={{ margin: 0 }}>Planning Hebdomadaire des Agents</h1>
      </div>

      {showCostsSummary && (
        <LaborCostsSummary
          key={`${selectedWeek}-${selectedYear}-${selectedAgentId}-${JSON.stringify(
            schedule
          )}`}
          week={selectedWeek}
          year={selectedYear}
          agentId={selectedAgentId}
        />
      )}

      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        selectedAgentId && (
          <div>
            {/* Ligne h2 + bouton (optionnel) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
                marginRight: 200,
              }}
            >
              <h2 style={{ margin: 0 }}>
                {agents.find((agent) => agent.id === selectedAgentId)?.name} -
                Semaine {selectedWeek} {selectedYear}
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <Button
                  onClick={handlePrevWeek}
                  variant="contained"
                  color="primary"
                  disabled={isFirstWeek}
                  sx={{ minWidth: 180 }}
                >
                  {"< Semaine précédente"}
                </Button>
                <Button
                  onClick={handleNextWeek}
                  variant="contained"
                  color="primary"
                  disabled={isLastWeek}
                  sx={{ minWidth: 180 }}
                >
                  {"Semaine suivante >"}
                </Button>
              </div>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGeneratePDF}
              >
                Télécharger le planning hebdomadaire
              </Button>
            </div>

            <table className={`planning-table ${isLoading ? "loading" : ""}`}>
              <thead>
                <tr>
                  <th className="hours-header">Heures</th>
                  {getDatesOfWeek(selectedWeek).map((date, index) => (
                    <th key={index} className="date-header">
                      {daysOfWeek[index]}
                      <br />
                      {date}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => (
                  <tr key={hour}>
                    <td className="hour-cell">{hour}</td>
                    {daysOfWeek.map((day) => {
                      // Détermination de l'événement pour la cellule
                      const startOfWeek = dayjs()
                        .year(selectedYear)
                        .isoWeek(selectedWeek)
                        .startOf("isoWeek");
                      const dayIndex = daysOfWeek.indexOf(day) + 1;
                      const currentDate = startOfWeek
                        .add(dayIndex - 1, "day")
                        .format("YYYY-MM-DD");
                      const cellEvent = events.find((event) => {
                        const eventDate = dayjs(event.start_date).format(
                          "YYYY-MM-DD"
                        );
                        return (
                          eventDate === currentDate &&
                          (event.event_type === "absence" ||
                            event.event_type === "conge") &&
                          event.agent === selectedAgentId
                        );
                      });
                      return (
                        <td
                          key={`${hour}-${day}`}
                          onMouseDown={() => handleMouseDown(hour, day)}
                          onMouseEnter={() => handleMouseEnter(hour, day)}
                          className={`schedule-cell`}
                          style={{
                            backgroundColor: getCellStyle(
                              hour,
                              day,
                              schedule[selectedAgentId]
                            ),
                            fontWeight: cellEvent ? "bold" : "normal",
                            color: cellEvent ? "#222" : undefined,
                            textAlign: "center",
                          }}
                        >
                          {cellEvent
                            ? getEventInitials(cellEvent)
                            : schedule[selectedAgentId]?.[hour]?.[day] || ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal pour sélectionner un chantier */}
      {isChantierModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Sélectionner un chantier</h2>
            <select
              value={selectedChantier ? selectedChantier.id : ""}
              onChange={(e) => {
                const selectedId = Number(e.target.value);
                console.log("ID Sélectionné:", selectedId);
                const chantier = chantiers.find((c) => c.id === selectedId);
                console.log("Chantier Trouvé:", chantier);
                setSelectedChantier(chantier);
              }}
            >
              <option value="">--Sélectionner un chantier--</option>
              {chantiers.map((chantier) => (
                <option key={chantier.id} value={chantier.id}>
                  {chantier.chantier_name}
                </option>
              ))}
            </select>
            <div style={{ marginTop: "10px" }}>
              <StyledButton
                variant="contained"
                onClick={assignChantier}
                disabled={!selectedChantier}
                sx={{
                  backgroundColor: "rgba(27, 120, 188, 1)",
                  "&:hover": {
                    backgroundColor: "rgba(27, 120, 188, 0.8)",
                  },
                }}
              >
                Assigner
              </StyledButton>
              <StyledButton
                variant="contained"
                onClick={deleteChantierAssignment}
                disabled={selectedCells.length === 0}
                sx={{
                  backgroundColor: "red",
                  "&:hover": {
                    backgroundColor: "darkred",
                  },
                }}
              >
                Supprimer Assignation
              </StyledButton>
              <StyledButton
                variant="contained"
                onClick={closeChantierModal}
                sx={{
                  backgroundColor: "#ccc",
                  color: "black",
                  "&:hover": {
                    backgroundColor: "#999",
                  },
                }}
              >
                Annuler
              </StyledButton>
            </div>
          </div>
        </div>
      )}

      {/* Styles CSS du Modal */}
      <style jsx>{`
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background-color: #fff;
          padding: 20px;
          border-radius: 5px;
          width: 300px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        .modal-content h2 {
          margin-top: 0;
        }

        .modal-content select {
          width: 100%;
          padding: 8px;
          margin-top: 10px;
        }

        .modal-content button {
          padding: 8px 12px;
        }

        .controls-container {
          margin: 20px 0;
          display: flex;
          gap: 10px;
        }

        .btn-calculate,
        .btn-toggle-summary {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.3s;
        }

        .btn-calculate {
          background-color: #4caf50;
          color: white;
        }

        .btn-toggle-summary {
          background-color: #2196f3;
          color: white;
        }

        .btn-calculate:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        .btn-calculate:hover:not(:disabled),
        .btn-toggle-summary:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default PlanningHebdoAgent;
