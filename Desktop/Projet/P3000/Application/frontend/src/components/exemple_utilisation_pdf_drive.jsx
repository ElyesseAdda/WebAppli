import React, { useState } from "react";
import {
  generateDevisMarchePDFDrive,
  generateDevisTravauxPDFDrive,
  generateMonthlyAgentsPDFDrive,
  generatePlanningHebdoDrive,
} from "./pdf_drive_functions";

/**
 * Exemple d'utilisation des nouvelles fonctions PDF Drive
 */
const ExempleUtilisationPDFDrive = () => {
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(35);
  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(8);

  /**
   * Générer le planning hebdomadaire vers le Drive
   */
  const handleGeneratePlanningHebdo = async () => {
    setLoading(true);
    try {
      const result = await generatePlanningHebdoDrive(currentWeek, currentYear);
      console.log("Planning généré:", result);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Générer le rapport mensuel des agents vers le Drive
   */
  const handleGenerateRapportMensuel = async () => {
    setLoading(true);
    try {
      const result = await generateMonthlyAgentsPDFDrive(
        currentMonth,
        currentYear
      );
      console.log("Rapport généré:", result);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Générer le devis de travaux vers le Drive
   */
  const handleGenerateDevisTravaux = async () => {
    setLoading(true);
    try {
      const result = await generateDevisTravauxPDFDrive("001", "Chantier Test");
      console.log("Devis travaux généré:", result);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Générer le devis de marché vers le Drive
   */
  const handleGenerateDevisMarche = async () => {
    setLoading(true);
    try {
      const result = await generateDevisMarchePDFDrive(
        "001",
        "Appel d'offres Test"
      );
      console.log("Devis marché généré:", result);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-drive-example">
      <h2>🚀 Gestion des PDFs avec Stockage Automatique dans le Drive</h2>

      <div className="controls">
        <div className="control-group">
          <label>Semaine:</label>
          <input
            type="number"
            value={currentWeek}
            onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
            min="1"
            max="53"
          />
        </div>

        <div className="control-group">
          <label>Mois:</label>
          <input
            type="number"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            min="1"
            max="12"
          />
        </div>

        <div className="control-group">
          <label>Année:</label>
          <input
            type="number"
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            min="2020"
            max="2030"
          />
        </div>
      </div>

      <div className="actions">
        <button
          onClick={handleGeneratePlanningHebdo}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading
            ? "⏳ Génération..."
            : "📅 Générer Planning Hebdomadaire → Drive"}
        </button>

        <button
          onClick={handleGenerateRapportMensuel}
          disabled={loading}
          className="btn btn-success"
        >
          {loading
            ? "⏳ Génération..."
            : "📊 Générer Rapport Mensuel Agents → Drive"}
        </button>

        <button
          onClick={handleGenerateDevisTravaux}
          disabled={loading}
          className="btn btn-warning"
        >
          {loading ? "⏳ Génération..." : "📋 Générer Devis Travaux → Drive"}
        </button>

        <button
          onClick={handleGenerateDevisMarche}
          disabled={loading}
          className="btn btn-info"
        >
          {loading ? "⏳ Génération..." : "📄 Générer Devis Marché → Drive"}
        </button>
      </div>

      <div className="info">
        <h3>ℹ️ Comment ça fonctionne :</h3>
        <ol>
          <li>
            ✅ <strong>Génération PDF</strong> : Puppeteer génère le PDF
          </li>
          <li>
            📁 <strong>Stockage automatique</strong> : Le PDF est stocké dans
            AWS S3
          </li>
          <li>
            🔗 <strong>Organisation automatique</strong> : Dossiers créés selon
            le type de document
          </li>
          <li>
            🎯 <strong>Redirection automatique</strong> : Vous êtes redirigé
            vers le Drive
          </li>
          <li>
            📥 <strong>Téléchargement optionnel</strong> : Possibilité de
            télécharger depuis le Drive
          </li>
        </ol>
      </div>

      <div className="paths">
        <h3>📁 Chemins de stockage automatiques :</h3>
        <ul>
          <li>
            <strong>Planning hebdomadaire</strong> :{" "}
            <code>Documents_Generaux/Société/Planning/</code>
          </li>
          <li>
            <strong>Rapport mensuel agents</strong> :{" "}
            <code>Documents_Generaux/Société/Documents/</code>
          </li>
          <li>
            <strong>Devis travaux</strong> :{" "}
            <code>Sociétés/Société/Chantier/Devis/</code>
          </li>
          <li>
            <strong>Devis marché</strong> :{" "}
            <code>Appels_Offres/Société/Appel_Offres/Devis_Marche/</code>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ExempleUtilisationPDFDrive;
