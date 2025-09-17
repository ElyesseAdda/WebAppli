import frLocale from "@fullcalendar/core/locales/fr";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import { MenuItem, Select } from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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

// Styles de la modale avec Emotion - Version moderne
const ModalStyle = styled(Box)({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 450,
  maxHeight: "90vh",
  overflowY: "auto",
  background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
  border: "none",
  borderRadius: "20px",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.15)",
  padding: "30px",
  color: "#2c3e50",
  fontSize: "16px",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",

  "& h2": {
    color: "#2c3e50",
    fontSize: "24px",
    fontWeight: "700",
    marginBottom: "8px",
    textAlign: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },

  "& p": {
    color: "#6c757d",
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "24px",
    fontWeight: "500",
  },

  "& .MuiTextField-root": {
    marginBottom: "16px",
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      transition: "all 0.3s ease",
      "&:hover": {
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.15)",
      },
      "&.Mui-focused": {
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.25)",
      },
    },
  },

  "& .MuiSelect-root": {
    borderRadius: "12px",
  },

  "& .MuiFormControl-root": {
    marginBottom: "16px",
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      transition: "all 0.3s ease",
      "&:hover": {
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.15)",
      },
      "&.Mui-focused": {
        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.25)",
      },
    },
  },
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
    const eventData = { ...event };
    if (event.status === "M") {
      eventData.chantier = event.chantier; // Inclure le chantier
    }
    await axios.post("/api/events/", eventData);
    // Recharger les agents pour mettre à jour les heures mensuelles
    refreshAgents();
  } catch (error) {
    console.error("Erreur lors de la création de l'événement", error);
  }
};

// Fonction pour supprimer les événements existants pour un agent donné sur une période donnée
const deleteEventsByAgentAndPeriod = async (agentId, startDate, endDate) => {
  try {
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

// Ajout des sous-types d'événements
const absenceSubtypes = [
  { value: "justifiee", label: "Justifiée" },
  { value: "injustifiee", label: "Injustifiée" },
  { value: "maladie", label: "Maladie" },
  { value: "rtt", label: "RTT" },
];

const congeSubtypes = [
  { value: "paye", label: "Payé" },
  { value: "sans_solde", label: "Sans solde" },
  { value: "parental", label: "Parental" },
  { value: "maternite", label: "Maternité" },
  { value: "paternite", label: "Paternité" },
];

const CalendrierAgent = ({ agents }) => {
  const [events, setEvents] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedAgentName, setSelectedAgentName] = useState(null);

  const [eventType, setEventType] = useState("");
  const [subtype, setSubtype] = useState("");

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
        title:
          event.event_type === "modification_horaire"
            ? `${event.hours_modified}H`
            : `${event.event_type}${
                event.subtype ? ` (${event.subtype})` : ""
              }`,
        color: getColorByStatus(event.event_type, event.subtype),
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

  const addEvent = async (hours = 0) => {
    try {
      if (!selectedDate || !selectedAgent || !eventType) {
        console.error("La date, l'agent ou le type d'événement est manquant");
        return;
      }
      if (
        (eventType === "absence" && !subtype) ||
        (eventType === "conge" && !subtype)
      ) {
        alert("Veuillez sélectionner un sous-type pour l'absence ou le congé.");
        return;
      }

      const startDate = dayjs(selectedDate).format("YYYY-MM-DD");
      const endDate = dayjs(selectedEndDate || selectedDate).format(
        "YYYY-MM-DD"
      );

      // Si c'est un événement A ou C, supprimer d'abord les schedules
      if (eventType === "absence" || eventType === "conge") {
        let currentDate = dayjs(startDate);
        const finalDate = dayjs(endDate);

        while (
          currentDate.isBefore(finalDate, "day") ||
          currentDate.isSame(finalDate, "day")
        ) {
          const weekNumber = currentDate.isoWeek();
          const year = currentDate.year();
          const dayName = currentDate.locale("fr").format("dddd");
          const dayNameCapitalized =
            dayName.charAt(0).toUpperCase() + dayName.slice(1);

          // Créer un tableau de toutes les heures à supprimer
          const deletions = Array.from({ length: 17 }, (_, i) => {
            const hour = `${i + 6}:00`;
            return {
              agentId: selectedAgent,
              week: weekNumber,
              year: year,
              day: dayNameCapitalized,
              hour: hour,
            };
          });


          try {
            // Appeler l'API pour supprimer les schedules
            await axios.post("/api/delete_schedule/", deletions);
          } catch (error) {
            console.error(
              "❌ Erreur lors de la suppression des schedules:",
              error
            );
          }

          currentDate = currentDate.add(1, "day");
        }
      }

      // Supprimer les événements existants de la base de données
      if (eventType === "presence") {
        // Pour les événements de présence, supprimer les événements existants
        // mais ne pas créer de nouvel événement en base
        await deleteEventsByAgentAndPeriod(selectedAgent, startDate, endDate);
      } else {
        // Pour les autres types d'événements, supprimer et créer
        await deleteEventsByAgentAndPeriod(selectedAgent, startDate, endDate);
      }

      // Supprimer les événements existants de l'affichage local
      setEvents((prevEvents) =>
        prevEvents.filter(
          (event) =>
            !(
              event.resourceId === selectedAgent.toString() &&
              dayjs(event.start).isBetween(startDate, endDate, null, "[]")
            )
        )
      );

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
          event_type: eventType,
          subtype: subtype || null,
          hours_modified: eventType === "modification_horaire" ? hours : 0,
          chantier: null,
        };

        try {
          if (eventType === "presence") {
            // Pour les événements de présence, ne pas créer d'événement
            // Juste mettre à jour les jours de présence
            await axios.post("/api/update_days_present/", {
              agent_id: selectedAgent,
              month: formattedDate,
              increment: true,
            });
            
            // Ajouter un événement "P" (Présence) par défaut
            newEvents.push({
              id: `${newEvent.agent}-${newEvent.start_date}`,
              resourceId: newEvent.agent.toString(),
              start: newEvent.start_date,
              end: newEvent.end_date,
              title: "P",
              color: getColorByStatus("presence", null),
            });
          } else {
            // Pour les autres types d'événements, créer l'événement normalement
            const response = await axios.post("/api/events/", newEvent);

            newEvents.push({
              id: `${newEvent.agent}-${newEvent.start_date}`,
              resourceId: newEvent.agent.toString(),
              start: newEvent.start_date,
              end: newEvent.end_date,
              title:
                eventType === "modification_horaire"
                  ? `${hours}H`
                  : `${eventType}${subtype ? ` (${subtype})` : ""}`,
              color: getColorByStatus(eventType, subtype),
            });
          }
        } catch (error) {
          console.error("Erreur lors de la création de l'événement:", error);
        }

        currentDate = currentDate.add(1, "day");
      }

      setEvents((prevEvents) => [...prevEvents, ...newEvents]);
      
      // Fermer le modal après l'ajout d'événements
      closeModal();
    } catch (error) {
      console.error("Erreur dans addEvent:", error);
    }
  };

  const handleDateChange = (newValue, isEndDate = false) => {
    if (isEndDate) {
      setSelectedEndDate(dayjs(newValue));
    } else {
      setSelectedDate(dayjs(newValue));
    }
  };

  const getColorByStatus = (eventType, subtype) => {
    if (eventType === "presence") return "green";
    if (eventType === "absence") {
      if (subtype === "justifiee") return "#fbc02d"; // jaune
      if (subtype === "injustifiee") return "#d32f2f"; // rouge foncé
      if (subtype === "maladie") return "#1976d2"; // bleu
      if (subtype === "rtt") return "#7b1fa2"; // violet
      return "red";
    }
    if (eventType === "conge") {
      if (subtype === "paye") return "#388e3c"; // vert foncé
      if (subtype === "sans_solde") return "#ffa000"; // orange
      if (subtype === "parental") return "#0288d1"; // bleu clair
      if (subtype === "maternite" || subtype === "paternite") return "#f06292"; // rose
      return "purple";
    }
    if (eventType === "modification_horaire") return "orange";
    return "grey";
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

          <Select
            label="Type d'événement"
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setSubtype(""); // reset subtype on type change
            }}
            fullWidth
            style={{ marginBottom: "16px" }}
            displayEmpty
          >
            <MenuItem value="">-- Sélectionner un type --</MenuItem>
            <MenuItem value="presence">Présence</MenuItem>
            <MenuItem value="absence">Absence</MenuItem>
            <MenuItem value="conge">Congé</MenuItem>
            <MenuItem value="modification_horaire">Horaire Modifié</MenuItem>
          </Select>

          {eventType === "absence" && (
            <Select
              label="Type d'absence"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              fullWidth
              style={{ marginBottom: "16px" }}
              displayEmpty
            >
              <MenuItem value="">-- Sélectionner un type d'absence --</MenuItem>
              {absenceSubtypes.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          )}

          {eventType === "conge" && (
            <Select
              label="Type de congé"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              fullWidth
              style={{ marginBottom: "16px" }}
              displayEmpty
            >
              <MenuItem value="">-- Sélectionner un type de congé --</MenuItem>
              {congeSubtypes.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          )}

          <Box
            sx={{ display: "flex", gap: 2, justifyContent: "center", mt: 3 }}
          >
            <Button
              variant="contained"
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "12px",
                padding: "12px 24px",
                fontWeight: "600",
                fontSize: "14px",
                textTransform: "none",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                transition: "all 0.3s ease",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
                },
                "&:disabled": {
                  background: "#e9ecef",
                  color: "#6c757d",
                  boxShadow: "none",
                },
              }}
              onClick={() =>
                addEvent(
                  eventType === "modification_horaire"
                    ? prompt("Combien d'heures à modifier ?")
                    : 0
                )
              }
              disabled={
                !eventType ||
                ((eventType === "absence" || eventType === "conge") && !subtype)
              }
            >
              ✅ Ajouter l'événement
            </Button>
            <Button
              variant="outlined"
              onClick={closeModal}
              sx={{
                borderRadius: "12px",
                padding: "12px 24px",
                fontWeight: "600",
                fontSize: "14px",
                textTransform: "none",
                borderColor: "#dee2e6",
                color: "#6c757d",
                transition: "all 0.3s ease",
                "&:hover": {
                  borderColor: "#adb5bd",
                  backgroundColor: "#f8f9fa",
                  transform: "translateY(-1px)",
                },
              }}
            >
              ❌ Fermer
            </Button>
          </Box>
        </ModalStyle>
      </Modal>
    </>
  );
};

export default CalendrierAgent;
