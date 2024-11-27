import frLocale from "@fullcalendar/core/locales/fr";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { green, orange, red } from "@mui/material/colors";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import { styled } from "@mui/system";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/fr"; // Importer la locale française
import React, { useEffect, useState } from "react";
import "./../../static/css/calendrierAgent.css";

// Configurer dayjs pour utiliser la locale française
dayjs.locale("fr");

// Styles de la modale avec Emotion
const ModalStyle = styled(Box)({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
  color: "rgba(27, 120, 188, 1)",
  fontSize: "18px",
});

const fetchEvents = async () => {
  try {
    const response = await axios.get("/api/events/");
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des événements", error);
  }
};

// Fonction pour créer un nouvel événement
const createEvent = async (event) => {
  try {
    await axios.post("/api/events/", event);
    // Recharger les agents pour mettre à jour les heures mensuelles
    refreshAgents();
  } catch (error) {
    console.error("Erreur lors de la création de l'événement", error);
  }
};

// Fonction pour supprimer les événements existants pour un agent donné sur une période donnée
const deleteEventsByAgentAndPeriod = async (agentId, startDate, endDate) => {
  try {
    console.log(
      `Suppression des événements pour l'agent ${agentId} entre ${startDate} et ${endDate}`
    );
    await axios.delete("/api/delete_events_by_agent_and_period/", {
      params: {
        agent: agentId,
        start_date: startDate,
        end_date: endDate,
      },
    });
  } catch (error) {
    console.error(
      "Erreur lors de la suppression des événements par période",
      error
    );
  }
};

const CalendrierAgent = ({ agents }) => {
  const [events, setEvents] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedAgentName, setSelectedAgentName] = useState(null);

  const fetchAgentsWithWorkDays = async () => {
    try {
      const response = await axios.get("/api/agents-with-work-days/"); // Ajustez l'URL selon votre configuration
      return response.data;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des agents avec leurs jours de travail:",
        error
      );
      return [];
    }
  };

  const loadEvents = async () => {
    const loadedEvents = await fetchEvents();
    const agentsWithWorkDays = await fetchAgentsWithWorkDays();
    let adaptedEvents = [];

    if (loadedEvents && loadedEvents.length > 0) {
      adaptedEvents = loadedEvents.map((event) => ({
        id: event.id,
        resourceId: event.agent.toString(),
        start: event.start_date,
        end: event.end_date,
        title: event.status === "M" ? `${event.hours_modified}H` : event.status,
        color: getColorByStatus(event.status),
      }));
    }

    if (agentsWithWorkDays.length > 0) {
      const dayMapping = {
        lundi: 1,
        mardi: 2,
        mercredi: 3,
        jeudi: 4,
        vendredi: 5,
        samedi: 6,
        dimanche: 0,
      };

      agentsWithWorkDays.forEach((agent) => {
        const workDays = agent.jours_travail
          ? agent.jours_travail
              .split(",")
              .map((day) => dayMapping[day.trim().toLowerCase()])
          : [1, 2, 3, 4, 5];

        const currentYear = dayjs().year();
        const nextYear = currentYear + 1;

        [currentYear, nextYear].forEach((year) => {
          for (let month = 0; month < 12; month++) {
            const daysInMonth = dayjs().year(year).month(month).daysInMonth();
            const monthDays = Array.from({ length: daysInMonth }, (_, i) =>
              dayjs()
                .year(year)
                .month(month)
                .date(i + 1)
            );

            monthDays.forEach((date) => {
              const dayOfWeek = date.day();
              const formattedDate = date.format("YYYY-MM-DD");

              const eventExists = adaptedEvents.some(
                (event) =>
                  event.resourceId === agent.id.toString() &&
                  event.start === formattedDate
              );

              if (!eventExists) {
                const isWorkDay = workDays.includes(dayOfWeek);

                adaptedEvents.push({
                  id: `${agent.id}-${formattedDate}`,
                  resourceId: agent.id.toString(),
                  start: formattedDate,
                  end: formattedDate,
                  title: isWorkDay ? "P" : " ",
                  color: isWorkDay ? "green" : "grey",
                });
              }
            });
          }
        });
      });
    }

    setEvents(adaptedEvents);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleResourceClick = (agentId, agentName) => {
    setSelectedAgent(agentId);
    setSelectedAgentName(agentName);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const addEvent = async (status, hours = 0) => {
    if (!selectedDate || !selectedAgent) {
      console.error("La date ou l'agent sélectionné est manquant");
      return;
    }

    const startDate = dayjs(selectedDate).format("YYYY-MM-DD");
    const endDate = dayjs(selectedEndDate || selectedDate).format("YYYY-MM-DD");

    await deleteEventsByAgentAndPeriod(selectedAgent, startDate, endDate);

    setEvents((prevEvents) =>
      prevEvents.filter(
        (event) =>
          !(
            event.resourceId === selectedAgent.toString() &&
            dayjs(event.start).isBetween(startDate, endDate, null, "[]")
          )
      )
    );

    const colorMap = {
      P: "green",
      A: "red",
      C: "purple",
      M: "orange",
    };

    let currentDate = dayjs(startDate);
    const finalDate = dayjs(endDate);
    const newEvents = [];

    while (
      currentDate.isBefore(finalDate, "day") ||
      currentDate.isSame(finalDate, "day")
    ) {
      const formattedDate = currentDate.format("YYYY-MM-DD");

      const newEvent = {
        agent: selectedAgent,
        start_date: formattedDate,
        end_date: formattedDate,
        status: status,
        hours_modified: status === "M" ? hours : 0,
      };

      await createEvent(newEvent);

      if (status === "P") {
        await axios.post("/api/update_days_present/", {
          agent_id: selectedAgent,
          month: formattedDate,
          increment: true,
        });
      }

      newEvents.push({
        id: `${newEvent.agent}-${newEvent.start_date}`,
        resourceId: newEvent.agent.toString(),
        start: newEvent.start_date,
        end: newEvent.end_date,
        title: status === "M" ? `${hours}H` : status, // Corrigez ici pour afficher la lettre correspondante
        color: colorMap[status],
      });

      currentDate = currentDate.add(1, "day");
    }

    // Recalculer les heures mensuelles après la création des événements
    await axios.post("/api/recalculate_monthly_hours/", {
      agent_id: selectedAgent,
      month: startDate,
    });

    setEvents((prevEvents) => [...prevEvents, ...newEvents]);
    closeModal();
  };

  const handleDateChange = (newValue, isEndDate = false) => {
    if (isEndDate) {
      setSelectedEndDate(dayjs(newValue));
    } else {
      setSelectedDate(dayjs(newValue));
    }
  };

  const getColorByStatus = (status) => {
    const colorMap = {
      P: "green",
      A: "red",
      C: "purple",
      M: "orange",
    };
    return colorMap[status] || "grey"; // Par défaut, gris
  };

  const style = {
    bgcolor: "white",
    padding: "20px",
  };

  return (
    <>
      <FullCalendar
        plugins={[resourceTimelinePlugin]}
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        initialView="resourceTimelineMonth"
        locale={frLocale}
        resources={
          agents.length > 0
            ? agents.map((agent) => ({
                id: agent.id.toString(),
                title: `${agent.name} ${agent.surname}`,
              }))
            : []
        }
        events={events}
        editable={true}
        selectable={true}
        select={handleResourceClick}
        resourceAreaWidth="300px"
        height="auto"
        resourceLabelContent={(arg) => (
          <div
            style={{ position: "relative", width: "100%", height: "100%" }}
            onClick={() =>
              handleResourceClick(arg.resource.id, arg.resource.title)
            }
          >
            <span>{arg.resource.title}</span>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                cursor: "pointer",
                backgroundColor: "transparent",
              }}
            />
          </div>
        )}
      />

      <Modal open={modalIsOpen} onClose={closeModal}>
        <ModalStyle sx={style}>
          <h2>Modifier la période</h2>
          <p>Agent : {selectedAgentName}</p>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date de début"
              value={selectedDate}
              onChange={(newValue) => handleDateChange(newValue)}
              inputFormat="DD-MM-YYYY"
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
            <DatePicker
              label="Date de fin"
              value={selectedEndDate}
              onChange={(newValue) => handleDateChange(newValue, true)}
              inputFormat="DD-MM-YYYY"
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </LocalizationProvider>
          <Button
            variant="contained"
            sx={{ bgcolor: green[500] }}
            color="primary"
            onClick={() => addEvent("P")}
          >
            Présent
          </Button>
          <Button
            variant="contained"
            sx={{ bgcolor: red[500] }}
            onClick={() => addEvent("A")}
          >
            Absent
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => addEvent("C")}
          >
            Congé
          </Button>
          <Button
            variant="contained"
            sx={{ bgcolor: orange[500] }}
            onClick={() =>
              addEvent("M", prompt("Combien d'heures à modifier ?"))
            }
          >
            Horaire Modifié
          </Button>
          <Button onClick={closeModal}>Fermer</Button>
        </ModalStyle>
      </Modal>
    </>
  );
};

export default CalendrierAgent;
