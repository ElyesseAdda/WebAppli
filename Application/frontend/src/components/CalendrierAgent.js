import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import frLocale from '@fullcalendar/core/locales/fr';
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Styles pour les notifications
import './../../static/css/app.css';
import './../../static/css/CalendrierAgent.css';
import './../../static/css/daygrid.css';
import './../../static/css/timegrid.css';
import './../../static/css/resource-timeline.css';

Modal.setAppElement('#app'); // Pour la compatibilité avec les lecteurs d'écran

const CalendrierAgent = () => {
  const [filter, setFilter] = useState('all');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '', backgroundColor: '' });
  const [events, setEvents] = useState([
    { title: 'Présence', start: '2024-10-10T10:00:00', end: '2024-10-10T12:00:00', resourceId: '1', backgroundColor: 'green', borderColor: 'green' },
    { title: 'Absence complète', start: '2024-10-11T09:00:00', end: '2024-10-11T17:00:00', resourceId: '2', backgroundColor: 'red', borderColor: 'red' },
    { title: 'Changement horaire', start: '2024-10-12T09:00:00', end: '2024-10-12T11:00:00', resourceId: '3', backgroundColor: 'orange', borderColor: 'orange' },
    { title: 'Congé', start: '2024-10-13T09:00:00', end: '2024-10-13T17:00:00', resourceId: '1', backgroundColor: 'violet', borderColor: 'violet' }
  ]);

  let clickTimeout = null; // Variable pour gérer le délai entre deux clics

  // Fonction pour filtrer les événements selon leur type
  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'presence' && event.backgroundColor === 'green') return true;
    if (filter === 'absence' && event.backgroundColor === 'red') return true;
    if (filter === 'congé' && event.backgroundColor === 'violet') return true;
    return false;
  });

  // Fonction pour formater la date pour le champ datetime-local (format attendu: YYYY-MM-DDTHH:MM)
  const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Fonction pour gérer le double-clic (logique de détection du double clic)
  const handleDateClick = (dateInfo) => {
    if (clickTimeout) {
      // Double-clic détecté, ouvre la modale
      clearTimeout(clickTimeout); // Réinitialise le timer
      clickTimeout = null;
      const clickedDate = formatDateForInput(dateInfo.date); // Formate la date cliquée

      // Ouvre la modale avec la date cliquée préremplie dans "start" et "end"
      setModalIsOpen(true); 
      setNewEvent({ ...newEvent, start: clickedDate, end: clickedDate });
    } else {
      // Premier clic, démarre le timer pour attendre un deuxième clic
      clickTimeout = setTimeout(() => {
        clickTimeout = null; // Si aucun second clic, réinitialise
      }, 300); // Définit un délai de 300ms pour détecter un double-clic
    }
  };

  // Fonction pour soumettre le formulaire
  const handleFormSubmit = (e) => {
    e.preventDefault();
    // Ajouter l'événement au calendrier
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);

    toast.success("Événement ajouté avec succès !");
    setModalIsOpen(false); // Fermer la modale
  };

  return (
    <div className="calendar-container">
      {/* Boutons de filtre */}
      <div className="filters">
        <button onClick={() => setFilter('all')}>Tous</button>
        <button onClick={() => setFilter('presence')}>Présence</button>
        <button onClick={() => setFilter('absence')}>Absence</button>
        <button onClick={() => setFilter('congé')}>Congé</button>
      </div>

      {/* Modale pour créer/modifier un événement */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        style={{
          overlay: {
            zIndex: 1000 // Assure que la modale passe au-dessus du calendrier
          },
          content: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1001 // Met le contenu de la modale en avant-plan
          }
        }}
      >
        <button
          onClick={() => setModalIsOpen(false)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          X
        </button>
        <form onSubmit={handleFormSubmit}>
          <h2>Ajouter un événement</h2>
          <label>Titre de l'événement</label>
          <input
            type="text"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            required
          />
          <label>Date de début</label>
          <input
            type="datetime-local"
            value={newEvent.start}
            onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
            required
          />
          <label>Date de fin</label>
          <input
            type="datetime-local"
            value={newEvent.end}
            onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
            required
          />
          <label>Type d'événement</label>
          <select onChange={(e) => setNewEvent({ ...newEvent, backgroundColor: e.target.value })} required>
            <option value="">Sélectionnez</option>
            <option value="green">Présence</option>
            <option value="red">Absence</option>
            <option value="violet">Congé</option>
          </select>
          <button type="submit">Ajouter</button>
        </form>
      </Modal>

      {/* Composant FullCalendar */}
      <div style={{ minHeight: '800px', height: 'auto' }}>
        <FullCalendar
            locale={frLocale}
            firstDay={1}
            slotLabelFormat={[
            {
                weekday: 'short',
            },
            {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }
            ]}
            headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'resourceTimelineDay,resourceTimelineMonth'
            }}
            views={{
            resourceTimelineDay: {
                buttonText: 'Jour'
            },
            resourceTimelineMonth: {
                buttonText: 'Mois',
                slotLabelFormat: [{ day: 'numeric' }]
            }
            }}
            initialView="resourceTimelineDay"
            events={filteredEvents}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, resourceTimelinePlugin]}
            resources={[
            { id: '1', title: 'Belaoued Amine' },
            { id: '2', title: 'Majri Adel' },
            { id: '3', title: 'Majri Amara' },
            ]}
            editable={true}
            selectable={true}
            dateClick={handleDateClick}
            minHeight="800px" // S'adapte automatiquement à la hauteur du contenu
            resourceAreaHeaderContent="Nom Agent" // Remplace "Resources" par "Agent"
            resourceAreaWidth="200px" // Définit une largeur pour la section des ressources
        />
</div>

    </div>
  );
};

export default CalendrierAgent;
