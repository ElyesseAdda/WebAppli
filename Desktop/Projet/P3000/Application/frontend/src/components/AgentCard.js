// AgentCard.js
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { styled } from "@mui/system";
import axios from "axios";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [openPrimeModal, setOpenPrimeModal] = useState(false);
  const [newPrime, setNewPrime] = useState({ description: "", montant: "" });
  const [primes, setPrimes] = useState([]);

  // Fonction pour formater le mois-année pour l'API
  const getMonthYearString = () => {
    const month = (selectedMonth + 1).toString().padStart(2, "0");
    return `${selectedYear}-${month}`;
  };

  // Charger les primes pour le mois sélectionné
  const loadPrimes = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/agents/${agent.id}/primes/?month_year=${getMonthYearString()}`
      );
      setPrimes(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des primes:", error);
    }
  }, [agent.id, selectedMonth, selectedYear]);

  // Charger les primes quand le mois change ou l'agent change
  useEffect(() => {
    loadPrimes();
  }, [loadPrimes, agent.id, selectedMonth, selectedYear]);

  const handleAddPrime = async () => {
    if (!newPrime.description || !newPrime.montant) return;

    try {
      await axios.post(`/api/agents/${agent.id}/primes/`, {
        description: newPrime.description,
        montant: parseFloat(newPrime.montant),
        month_year: getMonthYearString(),
      });

      loadPrimes(); // Recharger les primes
      setNewPrime({ description: "", montant: "" });
      setOpenPrimeModal(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout de la prime:", error);
      alert("Erreur lors de l'ajout de la prime");
    }
  };

  const handleDeletePrime = async (index) => {
    try {
      await axios.delete(
        `/api/agents/${
          agent.id
        }/primes/${index}/?month_year=${getMonthYearString()}`
      );
      loadPrimes(); // Recharger les primes
    } catch (error) {
      console.error("Erreur lors de la suppression de la prime:", error);
      alert("Erreur lors de la suppression de la prime");
    }
  };

  // Calcul du total des primes pour le mois sélectionné
  const totalPrimes = primes.reduce((acc, prime) => acc + prime.montant, 0);

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

      <div className="primes-section">
        <div className="primes-header">
          <h3>
            Primes{" "}
            {new Date(selectedYear, selectedMonth).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <button
            onClick={() => setOpenPrimeModal(true)}
            className="icon-button add-prime-button"
          >
            <FaPlus />
          </button>
        </div>

        <div className="primes-list">
          {primes.map((prime, index) => (
            <div key={index} className="prime-item">
              <span>
                {prime.description}: {prime.montant.toFixed(2)} €
              </span>
              <button
                onClick={() => handleDeletePrime(index)}
                className="icon-button delete-prime-button"
              >
                <FaTrash />
              </button>
            </div>
          ))}
          {primes.length === 0 && (
            <div className="no-primes">Aucune prime pour ce mois</div>
          )}
        </div>

        <div className="primes-total">
          <strong>Total des primes:</strong> {totalPrimes.toFixed(2)} €
        </div>
      </div>

      <Dialog open={openPrimeModal} onClose={() => setOpenPrimeModal(false)}>
        <DialogTitle>Ajouter une prime</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Description"
            fullWidth
            value={newPrime.description}
            onChange={(e) =>
              setNewPrime({ ...newPrime, description: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Montant (€)"
            type="number"
            fullWidth
            value={newPrime.montant}
            onChange={(e) =>
              setNewPrime({ ...newPrime, montant: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPrimeModal(false)}>Annuler</Button>
          <Button onClick={handleAddPrime} variant="contained">
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

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
