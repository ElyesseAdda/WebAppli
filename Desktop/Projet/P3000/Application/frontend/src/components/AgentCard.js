// AgentCard.js
import {
  Box,
  Card,
  CardContent,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { styled } from "@mui/system";
import dayjs from "dayjs";
import React, { useState } from "react";

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
const StyledCard = styled(Card)(() => ({
  minWidth: 400,
  maxWidth: 600,
  margin: "0 auto",
  marginBottom: 20,
  marginTop: 100,
  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
  borderRadius: 12,
  overflow: "hidden",
  padding: "16px",
  minHeight: 400,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "left",
  backgroundColor: "#f9f9f9",
}));

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
    <StyledCard>
      <CardContent>
        <Typography
          variant="h5"
          component="div"
          align="left"
          sx={{ color: "rgb(22, 94, 145)", fontWeight: "bold", mb: 2 }}
        >
          {`${agent.name} ${agent.surname}`}
        </Typography>

        {/* Sélecteur de mois */}
        <MonthSelector value={selectedMonth} onChange={handleMonthChange}>
          {Array.from({ length: 12 }, (_, index) => (
            <MenuItem key={index} value={index}>
              {new Date(0, index)
                .toLocaleString("fr-FR", { month: "long" })
                .charAt(0)
                .toUpperCase() +
                new Date(0, index)
                  .toLocaleString("fr-FR", { month: "long" })
                  .slice(1)}
            </MenuItem>
          ))}
        </MonthSelector>

        {filteredMonthlyHours.length > 0 ? (
          filteredMonthlyHours.map((monthlyHour) => (
            <Typography
              key={monthlyHour.month}
              sx={{ mb: 1.5, color: "rgb(22, 94, 145)", fontWeight: "bold" }}
            >
              {`${capitalizeFirstLetter(
                new Date(monthlyHour.month).toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })
              )},
               ${monthlyHour.hours}H`}
            </Typography>
          ))
        ) : (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Pas d'heures mensuelles disponibles pour ce mois
          </Typography>
        )}

        {/* Affichage du coût mensuel */}
        <Typography sx={{ mt: 2, mb: 1 }} color="text.secondary">
          <strong>Coût mensuel:</strong> {monthlyCost.toFixed(2)} €
        </Typography>

        <Typography sx={{ mt: 2, mb: 1 }} color="text.secondary">
          <strong>Résumé des événements:</strong>
        </Typography>
        <EventsContainer>
          {eventSummary.length > 0 ? (
            eventSummary.map((event, index) => (
              <Typography
                key={index}
                sx={{
                  mb: 0.5,
                  color: getColorByStatus(event.split(" ")[0]),
                  fontWeight: "bold",
                }}
              >
                {event}
              </Typography>
            ))
          ) : (
            <Typography color="text.secondary">
              Aucun événement disponible
            </Typography>
          )}
        </EventsContainer>
      </CardContent>
    </StyledCard>
  );
};

export default AgentCard;
