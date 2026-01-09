import AssignmentIcon from "@mui/icons-material/Assignment";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Button,
  IconButton,
  styled as muiStyled,
  Tooltip,
} from "@mui/material";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/fr"; // Assurez-vous d'importer la locale
import isoWeek from "dayjs/plugin/isoWeek";
import React, { useEffect, useState } from "react";

import { generatePDFDrive } from "../utils/universalDriveGenerator";
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
  onGeneratePDFClick,
}) => {
  const [agents, setAgents] = useState([]);
  const daysOfWeek = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
  ];

  // Déterminer le type d'agent sélectionné
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
  const isAgentJournalier = selectedAgent?.type_paiement === "journalier";

  // Adapter les heures selon le type d'agent
  const hours = isAgentJournalier
    ? ["Matin", "Après-midi"]
    : Array.from({ length: 17 }, (_, i) => `${i + 6}:00`); // Heures de 6h à 22h

  // Fonction pour formater l'affichage des heures (uniquement pour l'affichage)
  const formatHourDisplay = (hour) => {
    if (isAgentJournalier) {
      return hour; // "Matin" ou "Après-midi" restent inchangés
    }
    // Pour les agents horaires, convertir "6:00" en "6h-7h"
    const hourNum = parseInt(hour.split(':')[0]);
    return `${hourNum}h-${hourNum + 1}h`;
  };

  // Fonction pour vérifier si c'est l'heure de pause (12h-13h)
  const isPauseHour = (hour) => {
    if (isAgentJournalier) {
      return false; // Pas de pause pour les agents journaliers
    }
    return hour === "12:00"; // Heure de pause pour tous les agents horaires
  };
  const [events, setEvents] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [lastSelectedCell, setLastSelectedCell] = useState(null);
  const [chantiers, setChantiers] = useState([]); // Nouvel état pour les chantiers
  const [isChantierModalOpen, setIsChantierModalOpen] = useState(false); // État pour le modal
  const [selectedChantier, setSelectedChantier] = useState(null); // Chantier sélectionné
  const [isSav, setIsSav] = useState(false); // État pour la checkbox SAV
  const [overtimeHours, setOvertimeHours] = useState(0); // État pour les heures supplémentaires

  // Nouvel état pour le modal de copie
  const [targetAgentId, setTargetAgentId] = useState(null);
  const [targetWeek, setTargetWeek] = useState(selectedWeek);
  const [targetYear, setTargetYear] = useState(selectedYear);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const [showCostsSummary, setShowCostsSummary] = useState(false);
  const [publicHolidays, setPublicHolidays] = useState({}); // État pour stocker les jours fériés de la semaine

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

  // Fonction pour calculer la date de Pâques (algorithme de Gauss)
  const calculateEaster = (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return dayjs().year(year).month(month - 1).date(day);
  };

  // Fonction pour obtenir tous les jours fériés français d'une année
  const getFrenchHolidays = (year) => {
    const holidays = {};

    // Jours fériés fixes
    const fixedHolidays = {
      "01-01": "Jour de l'an",
      "05-01": "Fête du Travail",
      "05-08": "Victoire 1945",
      "07-14": "Fête nationale",
      "08-15": "Assomption",
      "11-01": "Toussaint",
      "11-11": "Armistice",
      "12-25": "Noël",
    };

    // Ajouter les jours fériés fixes
    Object.keys(fixedHolidays).forEach((dateStr) => {
      const [month, day] = dateStr.split("-").map(Number);
      const date = dayjs().year(year).month(month - 1).date(day);
      holidays[date.format("YYYY-MM-DD")] = fixedHolidays[dateStr];
    });

    // Calculer Pâques et les jours fériés variables
    const easter = calculateEaster(year);
    const easterMonday = easter.add(1, "day");
    const ascension = easter.add(39, "day");
    const whitMonday = easter.add(50, "day");

    holidays[easter.format("YYYY-MM-DD")] = "Pâques";
    holidays[easterMonday.format("YYYY-MM-DD")] = "Lundi de Pâques";
    holidays[ascension.format("YYYY-MM-DD")] = "Ascension";
    holidays[whitMonday.format("YYYY-MM-DD")] = "Lundi de Pentecôte";

    return holidays;
  };

  // Fonction pour obtenir le nom du jour férié pour une date donnée
  const getHolidayName = (date) => {
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    return publicHolidays[dateStr] || null;
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
      // Ne pas sélectionner automatiquement un agent ici
      // La sélection est gérée par le composant parent (PlanningContainer)
    } catch (error) {
      console.error("Erreur lors de la récupération des agents :", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

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
    return week1Start.add(week - 1, 'week');
  };

  // Récupérer les chantiers depuis l'API
  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        const response = await axios.get("/api/chantier/"); // URL de votre API pour les chantiers
        // Filtrer les chantiers avec le statut "Terminé" ou "En attente"
        const filteredChantiers = response.data.filter(
          (chantier) =>
            chantier.state_chantier !== "Terminé" &&
            chantier.state_chantier !== "En attente"
        );
        setChantiers(filteredChantiers);
      } catch (error) {
        console.error("Erreur lors de la récupération des chantiers :", error);
      }
    };

    fetchChantiers();
  }, []);

  // Charger les jours fériés de la semaine
  useEffect(() => {
    if (selectedWeek && selectedYear) {
      const startOfWeek = getWeekStartDate(selectedWeek, selectedYear).startOf("isoWeek");
      const holidays = {};
      
      // Récupérer les jours fériés pour l'année de la semaine et l'année suivante (au cas où la semaine chevauche)
      const weekYear = startOfWeek.year();
      const nextYear = startOfWeek.add(6, "day").year();
      
      const allHolidays = { ...getFrenchHolidays(weekYear) };
      if (nextYear !== weekYear) {
        Object.assign(allHolidays, getFrenchHolidays(nextYear));
      }
      
      // Filtrer pour ne garder que les jours fériés de la semaine
      daysOfWeek.forEach((_, index) => {
        const date = startOfWeek.add(index, "day");
        const dateStr = date.format("YYYY-MM-DD");
        if (allHolidays[dateStr]) {
          holidays[dateStr] = allHolidays[dateStr];
        }
      });
      
      setPublicHolidays(holidays);
    }
  }, [selectedWeek, selectedYear]);

  // Charger les plannings et les événements lorsqu'un agent, une semaine ou une année est sélectionné
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Attendre que les chantiers soient chargés avant de charger le planning
        if (selectedAgentId && selectedWeek && selectedYear && chantiers.length > 0) {
          // Récupérer le planning
          const scheduleResponse = await axios.get(
            `/api/get_schedule/?agent=${selectedAgentId}&week=${selectedWeek}&year=${selectedYear}`
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
            let formattedHour;

            // Adapter le formatage selon le type d'agent
            if (isAgentJournalier) {
              // Pour les agents journaliers, item.hour est déjà "Matin" ou "Après-midi"
              formattedHour = item.hour;
            } else {
              // Pour les agents horaires, formater l'heure au format "H:mm"
              // Essayer plusieurs formats pour être compatible avec différents formats d'heure
              let parsedHour = dayjs(item.hour, "H:mm"); // Format "8:00"
              if (!parsedHour.isValid()) {
                parsedHour = dayjs(item.hour, "HH:mm"); // Format "08:00"
              }
              if (!parsedHour.isValid()) {
                parsedHour = dayjs(item.hour, "HH:mm:ss"); // Format "08:00:00"
              }

              if (parsedHour.isValid()) {
                formattedHour = parsedHour.format("H:mm");
              } else {
                // Si aucun format ne marche, utiliser directement la valeur
                console.warn(
                  `Impossible de parser l'heure "${item.hour}", utilisation directe`
                );
                formattedHour = item.hour;
              }
            }

            if (scheduleData[formattedHour] && daysOfWeek.includes(item.day)) {
              scheduleData[formattedHour][item.day] = item.chantier_id
                ? {
                    chantierName: getChantierName(item.chantier_id),
                    isSav: item.is_sav || false,
                    overtimeHours: item.overtime_hours || 0,
                  }
                : "";
            }
          });

          // Récupérer les événements de la semaine
          // Utiliser la fonction utilitaire pour gérer correctement les semaines qui chevauchent les années
          const startOfWeek = getWeekStartDate(selectedWeek, selectedYear).startOf("isoWeek");
          const endOfWeek = startOfWeek.add(6, "day").endOf("day");

          const eventsResponse = await axios.get("/api/events/", {
            params: {
              agent_id: selectedAgentId,
              start_date: startOfWeek.format("YYYY-MM-DD"),
              end_date: endOfWeek.format("YYYY-MM-DD"),
            },
          });


          // Remplacer le filtrage des événements par :
          const eventsData = eventsResponse.data.filter(
            (event) =>
              event.event_type === "absence" || event.event_type === "conge"
          );


          // Identifier les jours avec événements A ou C pour cet agent spécifique
          const joursAvecEvents = eventsData.map((event) =>
            dayjs(event.start_date).format("DD/MM/YYYY")
          );

          // Supprimer les assignations pour les jours avec événements A ou C
          // SEULEMENT pour l'agent sélectionné qui a ces événements
          if (joursAvecEvents.length > 0) {
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
          } else {
          }

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
  }, [selectedAgentId, selectedWeek, selectedYear, chantiers]);

  // Fonction pour générer les dates de la semaine
  const getDatesOfWeek = (weekNumber) => {
    // Utiliser la fonction utilitaire pour gérer correctement les semaines qui chevauchent les années
    const startOfWeek = getWeekStartDate(weekNumber, selectedYear).startOf("isoWeek");
    return daysOfWeek.map((_, index) =>
      startOfWeek.add(index, "day").format("DD/MM/YYYY")
    );
  };

  // Fonction pour calculer une plage de cellules
  const getCellRange = (startCell, endCell) => {
    if (!startCell || !endCell) {
      return [];
    }

    const startHourIndex = hours.indexOf(startCell.hour);
    const endHourIndex = hours.indexOf(endCell.hour);
    const startDayIndex = daysOfWeek.indexOf(startCell.day);
    const endDayIndex = daysOfWeek.indexOf(endCell.day);

    // Vérification que les indices sont valides
    if (
      startHourIndex === -1 ||
      endHourIndex === -1 ||
      startDayIndex === -1 ||
      endDayIndex === -1
    ) {
      return [endCell]; // Retourner au moins la cellule de fin
    }

    const minHour = Math.min(startHourIndex, endHourIndex);
    const maxHour = Math.max(startHourIndex, endHourIndex);
    const minDay = Math.min(startDayIndex, endDayIndex);
    const maxDay = Math.max(startDayIndex, endDayIndex);

    const range = [];
    for (let h = minHour; h <= maxHour; h++) {
      for (let d = minDay; d <= maxDay; d++) {
        if (hours[h] && daysOfWeek[d]) {
          range.push({ hour: hours[h], day: daysOfWeek[d] });
        }
      }
    }

    return range;
  };

  // Double-clic pour ouvrir directement le modal
  const handleCellDoubleClick = (hour, day, event) => {
    event.preventDefault();
    event.stopPropagation();

    const newCell = { hour, day };
    setSelectedCells([newCell]);
    setLastSelectedCell(newCell);
    
    openChantierModal();
  };

  // Gestionnaire pour onMouseDown pour capturer les modificateurs plus tôt
  const handleCellMouseDown = (hour, day, event) => {

    // Empêcher la sélection de texte
    event.preventDefault();
    event.stopPropagation();

    // Stocker les informations pour le mouseup
    const cellInfo = {
      hour,
      day,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      button: event.button,
    };

    // Stocker dans une ref ou variable temporaire
    window.tempCellInfo = cellInfo;
  };

  // Gestionnaire pour onMouseUp pour traiter la sélection
  const handleCellMouseUp = (hour, day, event) => {

    event.preventDefault();
    event.stopPropagation();

    // Récupérer les informations stockées
    const cellInfo = window.tempCellInfo;
    if (!cellInfo || cellInfo.hour !== hour || cellInfo.day !== day) {
      return; // Pas le même élément
    }

    // Nettoyer
    delete window.tempCellInfo;

    const newCell = { hour, day };

    if (cellInfo.ctrlKey || cellInfo.metaKey) {
      // Ctrl/Cmd + clic : ajouter/supprimer de la sélection

      setSelectedCells((prev) => {
        const exists = prev.some(
          (cell) => cell.hour === newCell.hour && cell.day === newCell.day
        );
        if (exists) {
          // Supprimer la cellule de la sélection

          return prev.filter(
            (cell) => !(cell.hour === newCell.hour && cell.day === newCell.day)
          );
        } else {
          // Ajouter la cellule à la sélection

          setLastSelectedCell(newCell);
          return [...prev, newCell];
        }
      });
    } else if (cellInfo.shiftKey && lastSelectedCell) {
      // Shift + clic : sélection de plage depuis la dernière cellule sélectionnée
      const range = getCellRange(lastSelectedCell, newCell);
      setSelectedCells(range);
      // Ne pas changer lastSelectedCell pour permettre des extensions de sélection
    } else if (cellInfo.shiftKey && !lastSelectedCell) {
      // Shift sans cellule de référence - traiter comme un clic simple

      setSelectedCells([newCell]);
      setLastSelectedCell(newCell);
    } else {
      // Clic simple : nouvelle sélection

      setSelectedCells([newCell]);
      setLastSelectedCell(newCell);
    }
  };

  // Fonction pour valider la sélection et ouvrir le modal
  const validateSelection = () => {
    openChantierModal();
  };

  // Fonctions pour gérer le modal des chantiers
  const openChantierModal = () => {
    setIsChantierModalOpen(true);
  };

  const closeChantierModal = () => {
    setIsChantierModalOpen(false);
    setSelectedChantier(null);
    setSelectedCells([]); // Réinitialiser la sélection des cellules
    setLastSelectedCell(null); // Réinitialiser la dernière cellule sélectionnée
    setIsSav(false); // Réinitialiser la checkbox SAV
    setOvertimeHours(0); // Réinitialiser les heures supplémentaires
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
    if (selectedCells.length === 0) {
      alert("Veuillez sélectionner au moins une cellule.");
      return;
    }
    
    if (!selectedChantier) {
      alert("Veuillez sélectionner un chantier.");
      return;
    }

    try {
      // Filtrer les cellules pour exclure les heures de pause
      const validCells = selectedCells.filter(cell => !isPauseHour(cell.hour));
      const excludedPauseCells = selectedCells.filter(cell => isPauseHour(cell.hour));
      
      if (validCells.length === 0) {
        alert("Aucune cellule valide sélectionnée (les heures de pause sont automatiquement exclues).");
        return;
      }

      // Afficher un message informatif si des heures de pause ont été exclues
      if (excludedPauseCells.length > 0) {
        console.log(`ℹ️ ${excludedPauseCells.length} heure(s) de pause exclue(s) de l'assignation`);
      }

      const updates = validCells.map((cell) => {
        // Calculer la date réelle du créneau
        // Utiliser la fonction utilitaire pour gérer correctement les semaines qui chevauchent les années
        const startOfWeek = getWeekStartDate(selectedWeek, selectedYear).startOf("isoWeek");
        const dayIndex = daysOfWeek.indexOf(cell.day);
        const date = startOfWeek.add(dayIndex, "day");
        const weekISO = date.isoWeek();
        const yearISO = date.isoWeekYear();

        const update = {
          agentId: selectedAgentId,
          week: weekISO,
          year: yearISO,
          day: cell.day,
          hour: cell.hour,
          chantierId: selectedChantier.id,
          isSav: isSav, // Ajouter le paramètre SAV
          overtimeHours: overtimeHours, // Ajouter les heures supplémentaires
        };

        return update;
      });

      const response = await axios.post("/api/assign_chantier/", updates);

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
          newSchedule[selectedAgentId][cell.hour][cell.day] = {
            chantierName: selectedChantier.chantier_name,
            isSav: isSav,
            overtimeHours: overtimeHours,
          };
        });

        return newSchedule;
      });

      // Réinitialiser la sélection
      setSelectedCells([]);
      setLastSelectedCell(null);
      closeChantierModal();

      // Recalculer les coûts de main d'œuvre pour tout le mois (nouveau endpoint)
      const { month, year } = getCurrentMonthYear();
      await axios.post("/api/recalculate_labor_costs_month/", {
        year,
        month,
      });
    } catch (error) {
      console.error("Erreur lors de l'assignation du chantier :", error);
      const errorMessage =
        error.response?.data?.error || error.message || "Erreur inconnue";
      alert(`Erreur lors de l'assignation du chantier: ${errorMessage}`);
    }
  };

  // Nouvelle fonction de suppression
  const deleteChantierAssignment = async () => {
    if (selectedCells.length === 0) {
      alert("Aucune cellule sélectionnée pour la suppression.");
      return;
    }

    const confirmation = window.confirm(
      `Êtes-vous sûr de vouloir supprimer les assignations de ${selectedCells.length} cellule(s) sélectionnée(s) ?`
    );
    if (!confirmation) return;

    // Préparer les données à envoyer
    const deletions = selectedCells.map((cell) => {
      // Calculer la date réelle du créneau
      // Utiliser la fonction utilitaire pour gérer correctement les semaines qui chevauchent les années
      const startOfWeek = getWeekStartDate(selectedWeek, selectedYear).startOf("isoWeek");
      const dayIndex = daysOfWeek.indexOf(cell.day);
      const date = startOfWeek.add(dayIndex, "day");
      const weekISO = date.isoWeek();
      const yearISO = date.isoWeekYear();

      const deletion = {
        agentId: selectedAgentId,
        week: weekISO,
        year: yearISO,
        day: cell.day,
        hour: cell.hour,
      };

      return deletion;
    });

    try {
      const deleteResponse = await axios.post(
        "/api/delete_schedule/",
        deletions
      );

      // Recalculer les coûts de main d'œuvre pour tout le mois (nouveau endpoint)
      const { month, year } = getCurrentMonthYear();
      await axios.post("/api/recalculate_labor_costs_month/", {
        year,
        month,
      });

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
      setLastSelectedCell(null);
      closeChantierModal();

      alert(
        `${selectedCells.length} assignation(s) supprimée(s) avec succès !`
      );
    } catch (error) {
      console.error("Erreur lors de la suppression des assignations :", error);
      const errorMessage =
        error.response?.data?.error || error.message || "Erreur inconnue";
      alert(`Erreur lors de la suppression des assignations: ${errorMessage}`);
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
    // Vérifier si c'est une heure de pause
    if (isPauseHour(hour)) {
      return "#e8e8e8"; // Gris clair doux pour les heures de pause
    }

    // Convertir le format de date pour la comparaison
    // Utiliser la fonction utilitaire pour gérer correctement les semaines qui chevauchent les années
    const startOfWeek = getWeekStartDate(selectedWeek, selectedYear).startOf("isoWeek");
    const dayIndex = daysOfWeek.indexOf(day) + 1; // Lundi = 1
    const currentDate = startOfWeek
      .add(dayIndex - 1, "day")
      .format("YYYY-MM-DD");

    // Vérifier si c'est un jour férié
    const isHoliday = publicHolidays[currentDate];

    // Si c'est un jour férié, appliquer un style gris léger (mais pas si c'est aussi un événement)
    if (isHoliday) {
      // Vérifier d'abord si un événement absence ou congé existe pour cette date
      const hasEvent = events.find((event) => {
        const eventDate = dayjs(event.start_date).format("YYYY-MM-DD");
        return (
          eventDate === currentDate &&
          (event.event_type === "absence" || event.event_type === "conge") &&
          event.agent === selectedAgentId
        );
      });

      // Si pas d'événement, appliquer le style jour férié (gris léger)
      if (!hasEvent) {
        return "#e0e0e0"; // Gris léger pour les jours fériés
      }
    }

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
      const cellData = scheduleData[hour][day];
      let chantierName;

      // Gérer le nouveau format d'objet et l'ancien format de chaîne
      if (typeof cellData === "object") {
        chantierName = cellData.chantierName;
      } else {
        chantierName = cellData;
      }

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
  // Fonction pour ouvrir le modal de sélection des agents
  const handleGeneratePDF = () => {
    if (onGeneratePDFClick) {
      onGeneratePDFClick();
    }
  };

  // Ajout des fonctions de navigation de semaine
  // Utiliser les dates ISO pour gérer correctement les semaines qui chevauchent les années
  const handlePrevWeek = () => {
    // Calculer la date de début de la semaine actuelle
    const currentWeekStart = getWeekStartDate(selectedWeek, selectedYear).startOf("isoWeek");
    
    // Soustraire une semaine
    const prevWeekStart = currentWeekStart.subtract(1, "week");
    
    // Récupérer la semaine et l'année ISO de la semaine précédente
    const week = prevWeekStart.isoWeek();
    const year = prevWeekStart.isoWeekYear();
    
    if (typeof onSelectionChange === "function") {
      onSelectionChange(selectedAgentId, week, year);
    }
  };

  const handleNextWeek = () => {
    // Calculer la date de début de la semaine actuelle
    const currentWeekStart = getWeekStartDate(selectedWeek, selectedYear).startOf("isoWeek");
    
    // Ajouter une semaine
    const nextWeekStart = currentWeekStart.add(1, "week");
    
    // Récupérer la semaine et l'année ISO de la semaine suivante
    const week = nextWeekStart.isoWeek();
    const year = nextWeekStart.isoWeekYear();
    
    if (typeof onSelectionChange === "function") {
      onSelectionChange(selectedAgentId, week, year);
    }
  };

  const getCurrentMonthYear = () => {
    // Trouve le mois et l'année correspondant à la semaine sélectionnée
    // Utiliser la fonction utilitaire pour gérer correctement les semaines qui chevauchent les années
    const startOfWeek = getWeekStartDate(selectedWeek, selectedYear).startOf("isoWeek");
    return { month: startOfWeek.month() + 1, year: startOfWeek.year() };
  };

  // Nettoyer les informations temporaires si la souris sort du tableau
  const handleTableMouseLeave = () => {
    if (window.tempCellInfo) {
      delete window.tempCellInfo;
    }
  };

  return (
    <div onMouseLeave={handleTableMouseLeave}>
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

            {/* Contrôles de sélection */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "15px",
                padding: "10px 0",
              }}
            >
              <span className="selection-info">
                Cellules sélectionnées: {selectedCells.length}
                {lastSelectedCell && (
                  <span
                    style={{
                      marginLeft: "10px",
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    (Dernière: {lastSelectedCell.hour} - {lastSelectedCell.day})
                  </span>
                )}
              </span>

              <Tooltip
                title="Assigner un chantier aux cellules sélectionnées"
                arrow
              >
                <span>
                  <IconButton
                    onClick={validateSelection}
                    disabled={selectedCells.length === 0}
                    sx={{
                      backgroundColor: "#1976d2",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#1565c0",
                        transform: "scale(1.05)",
                      },
                      "&:disabled": {
                        backgroundColor: "#1976d2",
                        color: "white",
                        opacity: 0.5,
                      },
                      transition: "all 0.2s ease",
                      width: "36px",
                      height: "36px",
                    }}
                  >
                    <AssignmentIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Supprimer les assignations sélectionnées" arrow>
                <span>
                  <IconButton
                    onClick={deleteChantierAssignment}
                    disabled={selectedCells.length === 0}
                    sx={{
                      backgroundColor: "#f44336",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#d32f2f",
                        transform: "scale(1.05)",
                      },
                      "&:disabled": {
                        backgroundColor: "#f44336",
                        color: "white",
                        opacity: 0.5,
                      },
                      transition: "all 0.2s ease",
                      width: "36px",
                      height: "36px",
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip
                title={
                  <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                      🎯 Raccourcis de sélection :
                    </div>
                    <div>
                      • <strong>Clic simple</strong> : Sélectionner une cellule
                    </div>
                    <div>
                      • <strong>Ctrl + clic</strong> : Ajouter/supprimer de la
                      sélection
                    </div>
                    <div>
                      • <strong>Shift + clic</strong> : Sélectionner une plage
                    </div>
                    <div>
                      • <strong>Double-clic</strong> : Sélection rapide + modal
                    </div>
                  </div>
                }
                arrow
                placement="top"
              >
                <IconButton
                  size="small"
                  sx={{
                    color: "#1976d2",
                    "&:hover": {
                      backgroundColor: "rgba(25, 118, 210, 0.1)",
                    },
                  }}
                >
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
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
                    <td className="hour-cell">{formatHourDisplay(hour)}</td>
                    {daysOfWeek.map((day) => {
                      // Détermination de l'événement pour la cellule
                      // Utiliser la fonction utilitaire pour gérer correctement les semaines qui chevauchent les années
                      const startOfWeek = getWeekStartDate(selectedWeek, selectedYear).startOf("isoWeek");
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
                          onMouseDown={(e) => handleCellMouseDown(hour, day, e)}
                          onMouseUp={(e) => handleCellMouseUp(hour, day, e)}
                          onDoubleClick={(e) =>
                            handleCellDoubleClick(hour, day, e)
                          }
                          className={`schedule-cell ${
                            selectedCells.some(
                              (cell) => cell.hour === hour && cell.day === day
                            )
                              ? "selected"
                              : ""
                          }`}
                          style={{
                            backgroundColor: getCellStyle(
                              hour,
                              day,
                              schedule[selectedAgentId]
                            ),
                            fontWeight: cellEvent ? "bold" : "normal",
                            color: cellEvent ? "#222" : undefined,
                            textAlign: "center",
                            border: selectedCells.some(
                              (cell) => cell.hour === hour && cell.day === day
                            )
                              ? "3px solid #1976d2"
                              : "1px solid #ddd",
                            boxShadow: selectedCells.some(
                              (cell) => cell.hour === hour && cell.day === day
                            )
                              ? "0 0 8px rgba(25, 118, 210, 0.5)"
                              : "none",
                            cursor: "pointer",
                          }}
                        >
                          {cellEvent
                            ? getEventInitials(cellEvent)
                            : (() => {
                                // Ne pas afficher le nom du chantier dans les heures de pause
                                if (isPauseHour(hour)) {
                                  return "";
                                }

                                const cellData =
                                  schedule[selectedAgentId]?.[hour]?.[day];
                                if (!cellData) return "";

                                // Si c'est un objet (nouveau format)
                                if (typeof cellData === "object") {
                                  // Vérifier que les chantiers sont chargés avant d'afficher le nom
                                  if (!chantiers || chantiers.length === 0) {
                                    return "Chargement...";
                                  }
                                  return (
                                    <span>
                                      {cellData.chantierName}
                                      {cellData.isSav && (
                                        <span
                                          style={{
                                            marginLeft: "4px",
                                            fontSize: "12px",
                                            color: "#ff5722",
                                            fontWeight: "bold",
                                          }}
                                        >
                                          ⚠️
                                        </span>
                                      )}
                                      {cellData.overtimeHours > 0 && (
                                        <div
                                          style={{
                                            marginTop: "2px",
                                            fontSize: "12px",
                                            color: "#ffffff",
                                            fontWeight: "bold",
                                            backgroundColor: "#ff5722",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            border: "2px solid #d32f2f",
                                            textAlign: "center",
                                            boxShadow: "0 2px 4px rgba(255, 87, 34, 0.3)",
                                          }}
                                        >
                                          ⏰ +{cellData.overtimeHours}h SUP
                                        </div>
                                      )}
                                    </span>
                                  );
                                }

                                // Si c'est une chaîne (ancien format pour compatibilité)
                                return cellData;
                              })()}
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
                const chantier = chantiers.find((c) => c.id === selectedId);
                setSelectedChantier(chantier);
              }}
            >
              <option value="">--Sélectionner un chantier--</option>
              {chantiers
                .filter(
                  (chantier) =>
                    chantier.state_chantier !== "Terminé" &&
                    chantier.state_chantier !== "En attente"
                )
                .map((chantier) => (
                  <option key={chantier.id} value={chantier.id}>
                    {chantier.chantier_name}
                  </option>
                ))}
            </select>

            {/* Champ Heures Supplémentaires */}
            <div
              style={{
                marginTop: "20px",
                marginBottom: "15px",
                padding: "16px",
                backgroundColor: "#f0f8ff",
                borderRadius: "12px",
                border: "2px solid #2196f3",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#1976d2",
                  marginBottom: "8px",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "18px" }}>⏰</span>
                <span>Heures supplémentaires (+25%)</span>
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "8px",
                }}
              >
                <input
                  type="number"
                  min="0"
                  max="12"
                  step="0.5"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(parseFloat(e.target.value) || 0)}
                  style={{
                    width: "80px",
                    padding: "8px 12px",
                    border: "2px solid #2196f3",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    textAlign: "center",
                    backgroundColor: "white",
                    color: "#1976d2",
                  }}
                  placeholder="0"
                />
                <span
                  style={{
                    fontSize: "14px",
                    color: "#1976d2",
                    fontWeight: "500",
                  }}
                >
                  heure(s)
                </span>
                {overtimeHours > 0 && (
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: "600",
                      backgroundColor: "#4caf50",
                      color: "white",
                    }}
                  >
                    +25% = {(overtimeHours * 1.25).toFixed(2)}h payées
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox SAV Modernisée */}
            <div
              style={{
                marginTop: "10px",
                marginBottom: "20px",
                padding: "16px",
                backgroundColor: isSav ? "#fff3e0" : "#f8f9fa",
                borderRadius: "12px",
                border: `2px solid ${isSav ? "#ff9800" : "#e0e0e0"}`,
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              onClick={() => setIsSav(!isSav)}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "4px",
                      border: `2px solid ${isSav ? "#ff9800" : "#ccc"}`,
                      backgroundColor: isSav ? "#ff9800" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    {isSav && (
                      <span
                        style={{
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: isSav ? "#e65100" : "#333",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>⚠️</span>
                      <span>SAV (Service Après-Vente)</span>
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: isSav ? "#bf360c" : "#666",
                        marginTop: "2px",
                        marginLeft: "26px",
                      }}
                    >
                      Marquer cette intervention comme du service après-vente
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "600",
                    backgroundColor: isSav ? "#ff9800" : "#e0e0e0",
                    color: isSav ? "white" : "#666",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isSav ? "ACTIVÉ" : "DÉSACTIVÉ"}
                </div>
              </div>
            </div>

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
