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
  onCostsCalculated,
  setSelectedAgentId,
  onCopyClick,
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

  // Fonction utilitaire pour récupérer le nom du chantier
  const getChantierName = (chantierId) => {
    const chantier = chantiers.find((c) => c.id === chantierId);
    return chantier ? chantier.chantier_name : `Chantier ${chantierId}`;
  };

  // Générer une liste d'années
  const generateYears = () => {
    const currentYear = dayjs().year();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
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

          const eventsData = eventsResponse.data.filter(
            (event) => event.status === "A" || event.status === "C"
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

        // Calculer ici à partir de newSchedule !
        let remainingHours = 0;
        let chantierName = selectedChantier
          ? selectedChantier.chantier_name
          : null;
        if (newSchedule[selectedAgentId]) {
          Object.entries(newSchedule[selectedAgentId]).forEach(
            ([hour, dayData]) => {
              Object.entries(dayData).forEach(([day, chantier]) => {
                if (chantier && chantier === chantierName) {
                  remainingHours += 1;
                }
              });
            }
          );
        }
        if (remainingHours === 0) {
          onCostsCalculated([]); // Déclenche la suppression côté backend
        } else {
          onCostsCalculated([
            {
              chantier_name: chantierName,
              hours: remainingHours,
            },
          ]);
        }

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

        // Calculer ici à partir de newSchedule !
        let remainingHours = 0;
        let chantierName = selectedChantier
          ? selectedChantier.chantier_name
          : null;
        if (newSchedule[selectedAgentId]) {
          Object.entries(newSchedule[selectedAgentId]).forEach(
            ([hour, dayData]) => {
              Object.entries(dayData).forEach(([day, chantier]) => {
                if (chantier && chantier === chantierName) {
                  remainingHours += 1;
                }
              });
            }
          );
        }
        if (remainingHours === 0) {
          onCostsCalculated([]); // Déclenche la suppression côté backend
        } else {
          onCostsCalculated([
            {
              chantier_name: chantierName,
              hours: remainingHours,
            },
          ]);
        }

        return newSchedule;
      });

      // Vérification explicite après suppression : si tout est vide, onCostsCalculated([])
      let isAllEmpty = true;
      if (schedule[selectedAgentId]) {
        Object.entries(schedule[selectedAgentId]).forEach(([hour, dayData]) => {
          Object.entries(dayData).forEach(([day, chantier]) => {
            if (chantier && chantier.trim() !== "") {
              isAllEmpty = false;
            }
          });
        });
      }
      if (isAllEmpty) {
        onCostsCalculated([]);
      }

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

    // Vérifier si un événement A ou C existe pour cette date
    const hasEvent = events.find((event) => {
      const eventDate = dayjs(event.start_date).format("YYYY-MM-DD");
      return (
        eventDate === currentDate &&
        (event.status === "A" || event.status === "C") &&
        event.agent === selectedAgentId // Ajout de la vérification de l'agent
      );
    });

    if (hasEvent) {
      return hasEvent.status === "A" ? "red" : "purple";
    }

    // Style existant pour les cellules sélectionnées et assignées
    if (selectedCells.some((cell) => cell.hour === hour && cell.day === day)) {
      return "lightblue";
    }

    if (scheduleData && scheduleData[hour] && scheduleData[hour][day]) {
      return "lightgreen";
    }

    return "white";
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

  const calculateHoursPerChantier = (
    schedule,
    selectedAgentId,
    selectedWeek,
    selectedYear
  ) => {
    const hoursPerChantier = {};
    const processedCells = new Set();

    // Logique de calcul existante
    // Référence aux lignes existantes :

    return hoursPerChantier;
  };

  const calculateLaborCosts = async () => {
    if (!selectedAgentId || !selectedWeek || !selectedYear) {
      alert("Veuillez sélectionner un agent, une semaine et une année.");
      return;
    }

    try {
      setIsLoading(true);
      const hoursPerChantier = {};
      const processedCells = new Set();

      console.log("Schedule data:", schedule[selectedAgentId]); // Debug log

      // Parcourir le planning initial pour comptabiliser les heures
      if (schedule[selectedAgentId]) {
        Object.entries(schedule[selectedAgentId]).forEach(([hour, dayData]) => {
          Object.entries(dayData).forEach(([day, chantierName]) => {
            const cellKey = `${hour}-${day}-${chantierName}`;

            if (
              chantierName &&
              typeof chantierName === "string" &&
              chantierName.trim() !== "" &&
              chantierName !== "undefined" &&
              chantierName !== "null" &&
              !processedCells.has(cellKey)
            ) {
              // Marquer la cellule comme traitée pour éviter le double comptage
              processedCells.add(cellKey);

              // Incrémenter le compteur d'heures pour le chantier
              hoursPerChantier[chantierName] =
                (hoursPerChantier[chantierName] || 0) + 1;

              console.log(`Traitement cellule - ${cellKey}`);
              console.log(
                `Total actuel pour ${chantierName}: ${hoursPerChantier[chantierName]}`
              );
            } else {
              if (!chantierName) {
                console.log(
                  `Cellule ignorée (chantierName manquant) - ${cellKey}`
                );
              }
              if (processedCells.has(cellKey)) {
                console.log(`Cellule déjà traitée - ${cellKey}`);
              }
            }
          });
        });
      }

      console.log("Cellules traitées:", Array.from(processedCells));
      console.log(
        "Résultat final hoursPerChantier après comptage initial:",
        hoursPerChantier
      );

      // Vérification avant de continuer
      if (Object.keys(hoursPerChantier).length === 0) {
        alert("Aucune heure de travail trouvée dans le planning.");
        setIsLoading(false);
        return;
      }

      // 2. Récupérer les événements "M" pour la semaine
      const startOfWeek = dayjs()
        .year(selectedYear)
        .isoWeek(selectedWeek)
        .startOf("isoWeek");
      const endOfWeek = startOfWeek.add(6, "day").endOf("day");

      // **Correction des paramètres envoyés à l'API**
      const modifiedHoursResponse = await axios.get("/api/events/", {
        params: {
          agent_id: selectedAgentId, // Changement de 'agent' à 'agent_id'
          start_date: startOfWeek.format("YYYY-MM-DD"),
          end_date: endOfWeek.format("YYYY-MM-DD"),
          status: "M",
        },
      });

      console.log("Événements 'M' reçus:", modifiedHoursResponse.data);

      // Ajouter les heures modifiées
      modifiedHoursResponse.data.forEach((event, index) => {
        if (event.chantier) {
          const chantierName =
            event.chantier_name || `Chantier ${event.chantier}`;
          const hoursToAdd = parseFloat(event.hours_modified || 0);

          console.log(`Événement ${index + 1}:`);
          console.log(`  Chantier: ${chantierName}`);
          console.log(`  Heures Modifiées: ${hoursToAdd}`);

          if (!hoursPerChantier[chantierName]) {
            hoursPerChantier[chantierName] = 0;
          }
          hoursPerChantier[chantierName] += hoursToAdd;

          console.log(
            `  Total après ajout des heures modifiées: ${hoursPerChantier[chantierName]}`
          );
        } else {
          console.log(`Événement ${index + 1} ignoré (chantier manquant).`);
        }
      });

      console.log(
        "Résultat final hoursPerChantier après ajout des événements 'M':",
        hoursPerChantier
      );

      // 3. Récupérer le taux horaire de l'agent
      const agentResponse = await axios.get(`/api/agent/${selectedAgentId}/`);
      const hourlyRate = parseFloat(agentResponse.data.taux_Horaire || 0);

      console.log(
        `Taux horaire pour l'agent ${selectedAgentId}: ${hourlyRate}€`
      );

      // 4. Calculer le coût pour chaque chantier
      const laborCosts = Object.entries(hoursPerChantier).map(
        ([chantierName, hours]) => {
          const parsedHours = parseFloat(hours);
          const parsedHourlyRate = parseFloat(hourlyRate || 0);
          const cost = {
            chantier_name: chantierName,
            hours: isNaN(parsedHours) ? 0 : parsedHours,
            cost:
              isNaN(parsedHours) || isNaN(parsedHourlyRate)
                ? 0
                : parsedHours * parsedHourlyRate,
          };
          console.log(`Préparation coût pour ${chantierName}:`, cost);
          return cost;
        }
      );

      console.log("Données envoyées à l'API:", {
        agent_id: selectedAgentId,
        week: selectedWeek,
        year: selectedYear,
        costs: laborCosts,
      });

      // Vérifier qu'il y a des coûts à enregistrer
      if (laborCosts.length === 0) {
        alert("Aucune heure de travail trouvée pour cette période.");
        return;
      }

      // 5. Envoyer les données à l'API
      const response = await axios.post("/api/save_labor_costs/", {
        agent_id: selectedAgentId,
        week: selectedWeek,
        year: selectedYear,
        costs: laborCosts,
      });

      console.log("Réponse de l'API:", response.data);

      // Appeler la fonction du parent pour transmettre les coûts
      onCostsCalculated(response.data.costs); // Transmettez les coûts au parent

      setShowCostsSummary(true);
      alert("Coûts de main d'œuvre calculés et enregistrés avec succès!");
    } catch (error) {
      console.error("Erreur lors du calcul des coûts de main d'œuvre:", error);
      alert(
        `Erreur lors du calcul des coûts: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div onMouseUp={handleMouseUp}>
      <h1>Planning Hebdomadaire des Agents</h1>

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
            {/* Titre Dynamique Ajouté */}
            <h2>
              Planning Hebdomadaire de{" "}
              {agents.find((agent) => agent.id === selectedAgentId)?.name} -
              Semaine {selectedWeek} {selectedYear}
            </h2>

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
                    {daysOfWeek.map((day) => (
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
                        }}
                      >
                        {schedule[selectedAgentId]?.[hour]?.[day] || ""}
                      </td>
                    ))}
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
