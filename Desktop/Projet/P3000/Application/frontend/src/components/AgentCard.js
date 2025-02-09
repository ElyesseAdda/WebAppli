// AgentCard.js
import { Box, MenuItem, Select } from "@mui/material";
import { styled } from "@mui/system";
import dayjs from "dayjs";
import React, { useState } from "react";
import "./../../static/css/agentCard.css";

// Function to capitalize the first letter
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Fonction pour regrouper les événements
const groupEvents = (events) => {
  if (!events || events.length === 0) return [];

  // Trier les événements par date
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start_date) - new Date(b.start_date)
  );

  const grouped = [];
  let currentGroup = {
    status: sortedEvents[0].status,
    hours_modified: sortedEvents[0].hours_modified || 0,
    startDate: sortedEvents[0].start_date,
    endDate: sortedEvents[0].end_date,
  };

  for (let i = 1; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const prevEvent = sortedEvents[i - 1];
    const isConsecutive =
      dayjs(event.start_date).diff(dayjs(prevEvent.end_date), "day") === 1;

    // Déterminez si l'événement peut être ajouté au groupe courant
    let canGroup = false;
    if (currentGroup.status === event.status) {
      if (event.status === "M") {
        // Pour les événements "M", vérifier également `hours_modified`
        canGroup = currentGroup.hours_modified === (event.hours_modified || 0);
      } else {
        canGroup = true;
      }
    }

    if (isConsecutive && canGroup) {
      // Étendre le groupe courant
      currentGroup.endDate = event.end_date;
    } else {
      // Ajouter le groupe courant à la liste et démarrer un nouveau groupe
      grouped.push({ ...currentGroup });
      currentGroup = {
        status: event.status,
        hours_modified: event.hours_modified || 0,
        startDate: event.start_date,
        endDate: event.end_date,
      };
    }
  }

  // Ajouter le dernier groupe
  grouped.push({ ...currentGroup });

  return grouped;
};

// Fonction pour formater les événements pour l'affichage
const formatEvents = (events) => {
  const groupedEvents = groupEvents(events);
  return groupedEvents.map((group) => {
    const startDateFormatted = dayjs(group.startDate).format("DD/MM/YYYY");
    const endDateFormatted = dayjs(group.endDate).format("DD/MM/YYYY");

    if (group.status === "M") {
      // Déplacer `hours_modified` à la fin de la chaîne
      return `${group.status} ${startDateFormatted}${
        startDateFormatted !== endDateFormatted ? ` - ${endDateFormatted}` : ""
      } / ${group.hours_modified}H`;
    } else if (group.startDate === group.endDate) {
      // Si la date de début et la date de fin sont identiques, afficher uniquement la date de début
      return `${group.status} ${startDateFormatted}`;
    } else {
      // Sinon, afficher le format avec date de début et date de fin
      return `${group.status} ${startDateFormatted} ${endDateFormatted}`;
    }
  });
};

// Function to get color by status
const getColorByStatus = (status) => {
  const colorMap = {
    P: "green",
    A: "red",
    C: "purple",
    M: "orange",
  };
  return colorMap[status] || "grey";
};

// Styled Card component

// Ajout d'un style pour le conteneur des événements
const EventsContainer = styled(Box)(() => ({
  maxHeight: 200, // Hauteur maximale pour le conteneur des événements
  overflowY: "auto", // Permet le défilement vertical
  width: "100%", // S'assurer que le conteneur prend toute la largeur
}));

const MonthSelector = styled(Select)(() => ({
  marginBottom: "16px",
  width: "100%",
}));

const AgentCard = ({ agent, events }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // Mois par défaut : mois actuel

  // Fonction pour gérer le changement de mois
  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  // Filtrer les événements en fonction du mois sélectionné
  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.start_date);
    return eventDate.getMonth() === selectedMonth; // Comparer le mois de l'événement avec le mois sélectionné
  });

  // Formater les événements pour l'affichage
  const eventSummary =
    filteredEvents.length > 0 ? formatEvents(filteredEvents) : [];

  // Filtrer les heures mensuelles pour le mois sélectionné
  const filteredMonthlyHours = agent.monthly_hours.filter((monthlyHour) => {
    const monthDate = new Date(monthlyHour.month);
    return (
      monthDate.getMonth() === selectedMonth &&
      monthDate.getFullYear() === new Date().getFullYear()
    ); // Comparer le mois et l'année
  });

  // Calculer le coût mensuel
  const monthlyCost = filteredMonthlyHours.reduce((total, monthlyHour) => {
    return total + monthlyHour.hours * agent.taux_Horaire; // Coût = heures * taux horaire
  }, 0);

  console.log(agent); // Vérifiez que les données de l'agent sont correctes

  return (
    <div className="agent-card">
      <div className="agent-header">
        <h2 className="agent-name">{`${agent.name} ${agent.surname}`}</h2>
      </div>

      <Select
        className="month-selector"
        value={selectedMonth}
        onChange={handleMonthChange}
        fullWidth
      >
        {Array.from({ length: 12 }, (_, index) => (
          <MenuItem key={index} value={index}>
            {new Date(0, index)
              .toLocaleString("fr-FR", { month: "long" })
              .toUpperCase()}
          </MenuItem>
        ))}
      </Select>

      {filteredMonthlyHours.length > 0 ? (
        filteredMonthlyHours.map((monthlyHour) => (
          <div key={monthlyHour.month} className="monthly-hours">
            {`${capitalizeFirstLetter(
              new Date(monthlyHour.month).toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })
            )}, ${monthlyHour.hours}H`}
          </div>
        ))
      ) : (
        <div className="no-events">
          Pas d'heures mensuelles disponibles pour ce mois
        </div>
      )}

      <div className="monthly-cost">
        <strong>Coût mensuel:</strong> {monthlyCost.toFixed(2)} €
      </div>

      <div className="events-container">
        {eventSummary.length > 0 ? (
          eventSummary.map((event, index) => (
            <div
              key={index}
              className={`event-item ${getEventClass(event.split(" ")[0])}`}
            >
              {event}
            </div>
          ))
        ) : (
          <div className="no-events">Aucun événement disponible</div>
        )}
      </div>
    </div>
  );
};

// Fonction utilitaire pour déterminer la classe CSS de l'événement
const getEventClass = (status) => {
  const classMap = {
    P: "present",
    A: "absent",
    C: "conge",
    M: "modified",
  };
  return classMap[status] || "";
};

export default AgentCard;
