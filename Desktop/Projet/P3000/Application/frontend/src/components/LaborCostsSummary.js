import React, { useEffect } from "react";
import "./../../static/css/laborCostSummary.css";

const LaborCostsSummary = ({
  schedule,
  selectedAgentId,
  isOpen,
  onClose,
  tauxHoraire,
  onCostsCalculated,
}) => {
  useEffect(() => {
    if (schedule && selectedAgentId && onCostsCalculated) {
      const hoursPerChantier = {};

      // Calcul des heures par chantier
      Object.entries(schedule[selectedAgentId] || {}).forEach(
        ([hour, dayData]) => {
          Object.entries(dayData).forEach(([day, chantierName]) => {
            if (chantierName) {
              hoursPerChantier[chantierName] =
                (hoursPerChantier[chantierName] || 0) + 1;
            }
          });
        }
      );

      // Préparation des données pour l'API
      const laborCosts = Object.entries(hoursPerChantier).map(
        ([chantierName, hours]) => ({
          chantier_name: chantierName,
          hours: hours,
          cost: hours * tauxHoraire,
        })
      );

      // Envoi des données au parent
      onCostsCalculated(laborCosts);
    }
  }, [schedule, selectedAgentId, tauxHoraire, onCostsCalculated]);

  if (!isOpen) return null;

  // Gestionnaire de clic sur l'overlay
  const handleOverlayClick = (e) => {
    if (e.target.className === "modal-overlay") {
      onClose();
    }
  };

  if (!schedule || !selectedAgentId) {
    return <div>Aucune donnée de planning disponible.</div>;
  }

  // Calculer les heures par chantier
  const hoursPerChantier = {};

  Object.entries(schedule[selectedAgentId] || {}).forEach(([hour, dayData]) => {
    Object.entries(dayData).forEach(([day, chantierName]) => {
      if (chantierName) {
        hoursPerChantier[chantierName] =
          (hoursPerChantier[chantierName] || 0) + 1;
      }
    });
  });

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Résumé des Heures par Chantier</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Chantier</th>
                <th>Heures Totales</th>
                <th>Coût Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(hoursPerChantier).map(([chantierName, hours]) => (
                <tr key={chantierName}>
                  <td>{chantierName}</td>
                  <td>{hours}</td>
                  <td>{(hours * tauxHoraire).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LaborCostsSummary;
