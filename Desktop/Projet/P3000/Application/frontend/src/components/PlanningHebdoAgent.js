import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/fr"; // Assurez-vous d'importer la locale
import isoWeek from "dayjs/plugin/isoWeek";
import React, { useEffect, useState } from "react";
import LaborCostsSummary from "./LaborCostsSummary";

dayjs.extend(isoWeek);
dayjs.locale("fr"); // Définir la locale sur français

const PlanningHebdoAgent = () => {
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [schedule, setSchedule] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(dayjs().isoWeek());
  const [selectedYear, setSelectedYear] = useState(dayjs().year()); // Ajout de l'état pour l'année
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
  const [isLoading, setIsLoading] = useState(false);
  const [chantiers, setChantiers] = useState([]); // Nouvel état pour les chantiers
  const [isChantierModalOpen, setIsChantierModalOpen] = useState(false); // État pour le modal
  const [selectedChantier, setSelectedChantier] = useState(null); // Chantier sélectionné

  // Nouvel état pour le modal de copie de planning
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false); // État pour le modal de copie
  const [targetAgentId, setTargetAgentId] = useState(null); // ID de l'agent cible
  const [targetWeek, setTargetWeek] = useState(selectedWeek); // Semaine cible
  const [targetYear, setTargetYear] = useState(selectedYear); // Année cible
  const [isCopying, setIsCopying] = useState(false); // État pour le processus de copie

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

  // Récupérer les agents depuis l'API
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await axios.get("/api/agent/"); // Assurez-vous que l'URL est correcte
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
      if (selectedAgentId && selectedWeek && selectedYear) {
        setIsLoading(true);
        try {
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
        } catch (error) {
          console.error("Erreur lors de la récupération des données :", error);
          alert(
            "Erreur lors de la récupération du planning ou des événements. Consultez la console pour plus de détails."
          );
        } finally {
          setIsLoading(false);
        }
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
    setSelectedAgentId(Number(event.target.value));
  };

  // Fonction pour gérer le changement de semaine
  const handleWeekChange = (event) => {
    setSelectedWeek(Number(event.target.value));
  };

  // Fonction pour gérer le changement d'année
  const handleYearChange = (event) => {
    setSelectedYear(Number(event.target.value));
  };

  // Fonction pour gérer le changement d'agent cible dans le modal de copie
  const handleTargetAgentChange = (event) => {
    setTargetAgentId(event.target.value);
  };

  // Fonction pour copier le planning
  const copySchedule = async () => {
    if (!targetAgentId) {
      alert("Veuillez sélectionner un agent cible pour copier le planning.");
      return;
    }

    setIsCopying(true);

    try {
      const sourceAgentId = selectedAgentId;
      const sourceWeek = selectedWeek;
      const sourceYear = selectedYear;
      const newWeek = targetWeek;
      const newYear = targetYear;

      // Envoyer une requête POST pour copier le planning
      const response = await axios.post("/api/copy_schedule/", {
        sourceAgentId,
        targetAgentId,
        sourceWeek,
        targetWeek: newWeek,
        sourceYear,
        targetYear: newYear,
      });

      console.log("Response from API copy_schedule:", response.data);

      alert("Le planning a été copié avec succès.");

      // Rafraîchir le planning après copie
      fetchSchedule(selectedAgentId, selectedWeek, selectedYear);
      closeCopyModal();
    } catch (error) {
      console.error("Erreur lors de la copie du planning :", error);
      alert(
        "Erreur lors de la copie du planning. Consultez la console pour plus de détails."
      );
    } finally {
      setIsCopying(false);
    }
  };

  // Fonction pour ouvrir le modal de copie
  const openCopyModal = () => {
    setIsCopyModalOpen(true);
  };

  // Fonction pour fermer le modal de copie et réinitialiser les sélections
  const closeCopyModal = () => {
    setIsCopyModalOpen(false);
    setTargetAgentId(null);
    setTargetWeek(selectedWeek); // Réinitialiser à la semaine sélectionnée
    setTargetYear(selectedYear); // Réinitialiser à l'année sélectionnée
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
        hour: cell.hour, // Format 'H:mm'
        chantierId: selectedChantier.id,
      }));

      await axios.post("/api/assign_chantier/", updates);
      fetchSchedule(selectedAgentId, selectedWeek, selectedYear);
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
      alert("Assignations supprimées avec succès.");
      // Rafraîchir le planning
      fetchSchedule(selectedAgentId, selectedWeek, selectedYear);
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
    if (!agentId || !week || !year) return;

    setIsLoading(true);
    try {
      // Récupérer le planning
      const scheduleResponse = await axios.get(
        `/api/get_schedule/?agent=${agentId}&week=${week}&year=${year}`
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
      scheduleResponse.data.forEach((item) => {
        const formattedHour = dayjs(item.hour, "HH:mm:ss").format("H:mm");
        if (scheduleData[formattedHour] && daysOfWeek.includes(item.day)) {
          scheduleData[formattedHour][item.day] = item.chantier_id
            ? getChantierName(item.chantier_id)
            : "";
        }
      });

      // Récupérer les événements de la semaine
      const startOfWeek = dayjs().year(year).isoWeek(week).startOf("isoWeek");
      const endOfWeek = startOfWeek.add(6, "day").endOf("day");

      const eventsResponse = await axios.get("/api/events/", {
        params: {
          agent: agentId,
          start_date: startOfWeek.format("YYYY-MM-DD"),
          end_date: endOfWeek.format("YYYY-MM-DD"),
        },
      });

      const eventsData = eventsResponse.data.filter(
        (event) => event.status === "A" || event.status === "C"
      );

      // Identifier les jours avec événements A ou C
      const joursAvecEvents = eventsData.map((event) =>
        dayjs(event.start_date).format("DD/MM/YYYY")
      );

      // Supprimer les assignations pour les jours avec événements A ou C
      joursAvecEvents.forEach((date) => {
        daysOfWeek.forEach((day, index) => {
          const dateOfDay = startOfWeek.add(index, "day").format("DD/MM/YYYY");
          if (dateOfDay === date) {
            hours.forEach((hour) => {
              scheduleData[hour][day] = ""; // Supprimer l'assignation
            });
          }
        });
      });

      // Mettre à jour le planning et les événements
      setSchedule((prevSchedule) => ({
        ...prevSchedule,
        [agentId]: { ...scheduleData },
      }));
      setEvents(eventsData);
    } catch (error) {
      console.error("Erreur lors de la récupération du planning :", error);
    } finally {
      setIsLoading(false);
    }
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

      // Parcourir le planning
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
              processedCells.add(cellKey);

              if (!hoursPerChantier[chantierName]) {
                hoursPerChantier[chantierName] = 0;
              }

              hoursPerChantier[chantierName] =
                parseFloat(hoursPerChantier[chantierName]) + 1;

              console.log(`Traitement cellule - ${cellKey}`);
              console.log(
                `Total actuel pour ${chantierName}: ${hoursPerChantier[chantierName]}`
              );
            }
          });
        });
      }

      console.log("Cellules traitées:", Array.from(processedCells));
      console.log("Résultat final hoursPerChantier:", hoursPerChantier);

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

      const modifiedHoursResponse = await axios.get("/api/events/", {
        params: {
          agent: selectedAgentId,
          start_date: startOfWeek.format("YYYY-MM-DD"),
          end_date: endOfWeek.format("YYYY-MM-DD"),
          status: "M",
        },
      });

      // Ajouter les heures modifiées
      modifiedHoursResponse.data.forEach((event) => {
        if (event.chantier) {
          const chantierName =
            event.chantier_name || `Chantier ${event.chantier}`;
          if (!hoursPerChantier[chantierName]) {
            hoursPerChantier[chantierName] = 0;
          }
          hoursPerChantier[chantierName] += event.hours_modified;
        }
      });

      // 3. Récupérer le taux horaire de l'agent
      const agentResponse = await axios.get(`/api/agent/${selectedAgentId}/`);
      const hourlyRate = agentResponse.data.taux_horaire || 0;

      // 4. Calculer le coût pour chaque chantier
      const laborCosts = Object.entries(hoursPerChantier).map(
        ([chantierName, hours]) => {
          const cost = {
            chantier_name: chantierName,
            hours: parseFloat(hours),
            cost: parseFloat(hours) * parseFloat(hourlyRate || 0),
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

      {/* Sélecteur d'année */}
      <label htmlFor="year-select">Sélectionner une année :</label>
      <select
        id="year-select"
        value={selectedYear}
        onChange={handleYearChange}
        style={{ width: "120px", margin: "0 10px" }}
      >
        {generateYears().map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      {/* Sélecteur de semaine */}
      <label htmlFor="week-select">Sélectionner une semaine :</label>
      <select
        id="week-select"
        value={selectedWeek}
        onChange={handleWeekChange}
        style={{ width: "120px", margin: "0 10px" }}
      >
        {generateWeeks().map((week) => (
          <option key={week} value={week}>
            Semaine {week}
          </option>
        ))}
      </select>

      {/* Sélecteur d'agent */}
      <label htmlFor="agent-select">Sélectionner un agent :</label>
      <select
        id="agent-select"
        value={selectedAgentId}
        onChange={handleAgentChange}
        style={{ width: "120px", margin: "0 10px" }}
      >
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>

      {/* Bouton pour Copier le Planning avec couleurs inversées */}
      <button
        onClick={openCopyModal}
        style={{
          marginLeft: "20px",
          backgroundColor: "white",
          color: "rgba(27, 120, 188, 1)",
          fontWeight: "500",
          border: "none",
          padding: "10px 20px",
          cursor: "pointer",
          borderRadius: "5px",
        }}
      >
        Copier le Planning
      </button>

      <div className="controls-container">
        <button
          onClick={calculateLaborCosts}
          className="btn-calculate"
          disabled={isLoading}
        >
          {isLoading ? "Calcul en cours..." : "Calculer Coûts Main d'Œuvre"}
        </button>

        <button
          onClick={() => setShowCostsSummary(!showCostsSummary)}
          className="btn-toggle-summary"
        >
          {showCostsSummary ? "Masquer le résumé" : "Afficher le résumé"}
        </button>
      </div>

      {showCostsSummary && (
        <LaborCostsSummary
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

            <table border="1" className={isLoading ? "loading" : ""}>
              <thead>
                <tr>
                  <th>Heures</th>
                  {getDatesOfWeek(selectedWeek).map((date, index) => (
                    <th key={index}>
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
                    <td>{hour}</td>
                    {daysOfWeek.map((day) => (
                      <td
                        key={`${hour}-${day}`}
                        onMouseDown={() => handleMouseDown(hour, day)}
                        onMouseEnter={() => handleMouseEnter(hour, day)}
                        style={{
                          cursor: "pointer",
                          backgroundColor: getCellStyle(
                            hour,
                            day,
                            schedule[selectedAgentId]
                          ),
                        }}
                      >
                        {schedule[selectedAgentId] &&
                        schedule[selectedAgentId][hour] &&
                        schedule[selectedAgentId][hour][day]
                          ? schedule[selectedAgentId][hour][day]
                          : ""}
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
              <button
                onClick={assignChantier}
                disabled={!selectedChantier}
                style={{
                  backgroundColor: "rgba(27, 120, 188, 1)",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderRadius: "5px",
                }}
              >
                Assigner
              </button>
              <button
                onClick={deleteChantierAssignment}
                disabled={selectedCells.length === 0}
                style={{
                  marginLeft: "10px",
                  backgroundColor: "red",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderRadius: "5px",
                }}
              >
                Supprimer Assignation
              </button>
              <button
                onClick={closeChantierModal}
                style={{
                  marginTop: "10px", // Ajout de l'espace au-dessus du bouton "Annuler"
                  backgroundColor: "#ccc",
                  color: "black",
                  border: "none",
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderRadius: "5px",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour copier le planning */}
      {isCopyModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Copier le Planning vers un Autre Agent</h2>

            {/* Sélecteur d'agent cible */}
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
                .filter((agent) => agent.id !== selectedAgentId) // Exclure l'agent actuel
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
            </select>

            {/* Sélecteur d'année cible */}
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

            {/* Sélecteur de semaine cible */}
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
              <button
                onClick={copySchedule}
                disabled={!targetAgentId || isCopying}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "rgba(27, 120, 188, 1)",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                {isCopying ? "Copie en cours..." : "Copier"}
              </button>
              <button
                onClick={closeCopyModal}
                style={{
                  padding: "8px 12px",
                  marginLeft: "10px",
                  backgroundColor: "#ccc",
                  color: "black",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
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
