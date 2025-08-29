import { Button, FormControlLabel, Switch } from "@mui/material";
import React, { useState } from "react";

/**
 * ALTERNATIVES DE SÉLECTION POUR LE PLANNING HEBDO
 *
 * Ce fichier contient les différentes alternatives de sélection que vous pouvez utiliser
 * dans votre composant PlanningHebdoAgent.js
 */

// ============================================================================
// ALTERNATIVE 1: Sélection par clic avec modificateurs (IMPLÉMENTÉE)
// ============================================================================
/**
 * FONCTIONNEMENT:
 * - Clic simple : Sélectionne une cellule unique
 * - Ctrl/Cmd + clic : Ajoute/supprime une cellule de la sélection
 * - Shift + clic : Sélectionne une plage entre la dernière cellule et la cellule cliquée
 * - Double-clic : Sélectionne la cellule et ouvre immédiatement le modal
 *
 * AVANTAGES:
 * - Familier pour les utilisateurs d'ordinateur
 * - Précis et prévisible
 * - Permet sélections multiples complexes
 *
 * INCONVÉNIENTS:
 * - Nécessite connaissance des raccourcis clavier
 * - Peut être moins intuitif sur mobile
 */

// ============================================================================
// ALTERNATIVE 2: Mode sélection avec bouton toggle
// ============================================================================

export const SelectionModeToggle = ({
  isSelectionMode,
  setIsSelectionMode,
  selectedCells,
  setSelectedCells,
  onValidateSelection,
}) => {
  const handleCellClick = (hour, day) => {
    if (!isSelectionMode) return;

    const newCell = { hour, day };
    setSelectedCells((prev) => {
      const exists = prev.some(
        (cell) => cell.hour === newCell.hour && cell.day === newCell.day
      );
      if (exists) {
        return prev.filter(
          (cell) => !(cell.hour === newCell.hour && cell.day === newCell.day)
        );
      } else {
        return [...prev, newCell];
      }
    });
  };

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: isSelectionMode ? "#e3f2fd" : "#f5f5f5",
        borderRadius: "12px",
        marginBottom: "15px",
        border: `2px solid ${isSelectionMode ? "#1976d2" : "#e0e0e0"}`,
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        <FormControlLabel
          control={
            <Switch
              checked={isSelectionMode}
              onChange={(e) => setIsSelectionMode(e.target.checked)}
              color="primary"
            />
          }
          label={
            <span
              style={{
                fontWeight: "600",
                color: isSelectionMode ? "#1976d2" : "#666",
              }}
            >
              🎯 Mode Sélection {isSelectionMode ? "ACTIVÉ" : "DÉSACTIVÉ"}
            </span>
          }
        />

        {isSelectionMode && (
          <>
            <span style={{ color: "#1976d2", fontWeight: "500" }}>
              Cellules: {selectedCells.length}
            </span>
            <Button
              variant="contained"
              size="small"
              onClick={onValidateSelection}
              disabled={selectedCells.length === 0}
            >
              Assigner
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedCells([])}
              disabled={selectedCells.length === 0}
            >
              Effacer
            </Button>
          </>
        )}
      </div>

      {isSelectionMode && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "13px",
            color: "#1976d2",
            backgroundColor: "rgba(25, 118, 210, 0.1)",
            padding: "8px 12px",
            borderRadius: "8px",
          }}
        >
          💡 Cliquez sur les cellules pour les sélectionner/désélectionner
        </div>
      )}
    </div>
  );
};

/**
 * FONCTIONNEMENT ALTERNATIVE 2:
 * - Bouton toggle pour activer/désactiver le mode sélection
 * - En mode actif, chaque clic ajoute/retire une cellule
 * - Interface visuelle claire du mode actuel
 *
 * AVANTAGES:
 * - Très clair visuellement
 * - Pas besoin de connaître les raccourcis
 * - Fonctionne parfaitement sur mobile
 * - Mode explicite (on/off)
 *
 * INCONVÉNIENTS:
 * - Nécessite une étape supplémentaire (activer le mode)
 * - Moins rapide pour les utilisateurs expérimentés
 */

// ============================================================================
// ALTERNATIVE 3: Sélection par rectangle drag moderne
// ============================================================================

export const RectangleSelection = ({
  selectedCells,
  setSelectedCells,
  hours,
  daysOfWeek,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

  const handleMouseDown = (hour, day, event) => {
    event.preventDefault();
    setIsDragging(true);
    setDragStart({ hour, day });
    setDragEnd({ hour, day });
    setSelectedCells([]);
  };

  const handleMouseEnter = (hour, day) => {
    if (isDragging) {
      setDragEnd({ hour, day });
      // Calculer le rectangle de sélection
      const selection = calculateRectangleSelection(dragStart, { hour, day });
      setSelectedCells(selection);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const calculateRectangleSelection = (start, end) => {
    if (!start || !end) return [];

    const startHourIndex = hours.indexOf(start.hour);
    const endHourIndex = hours.indexOf(end.hour);
    const startDayIndex = daysOfWeek.indexOf(start.day);
    const endDayIndex = daysOfWeek.indexOf(end.day);

    const minHour = Math.min(startHourIndex, endHourIndex);
    const maxHour = Math.max(startHourIndex, endHourIndex);
    const minDay = Math.min(startDayIndex, endDayIndex);
    const maxDay = Math.max(startDayIndex, endDayIndex);

    const selection = [];
    for (let h = minHour; h <= maxHour; h++) {
      for (let d = minDay; d <= maxDay; d++) {
        selection.push({ hour: hours[h], day: daysOfWeek[d] });
      }
    }
    return selection;
  };

  return {
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    isDragging,
    dragStart,
    dragEnd,
  };
};

/**
 * FONCTIONNEMENT ALTERNATIVE 3:
 * - Glisser-déposer pour créer un rectangle de sélection
 * - Feedback visuel en temps réel du rectangle
 * - Amélioration de votre système actuel
 *
 * AVANTAGES:
 * - Très intuitif visuellement
 * - Rapide pour sélectionner de grandes zones
 * - Feedback visuel immédiat
 *
 * INCONVÉNIENTS:
 * - Plus complexe à implémenter
 * - Peut être moins précis sur mobile
 * - Difficile de faire des sélections non-rectangulaires
 */

// ============================================================================
// ALTERNATIVE 4: Sélection par ligne/colonne
// ============================================================================

export const LineColumnSelection = ({
  selectedCells,
  setSelectedCells,
  hours,
  daysOfWeek,
}) => {
  const selectEntireRow = (hour) => {
    const rowCells = daysOfWeek.map((day) => ({ hour, day }));
    setSelectedCells((prev) => {
      // Vérifier si toute la ligne est déjà sélectionnée
      const allSelected = rowCells.every((cell) =>
        prev.some(
          (selected) => selected.hour === cell.hour && selected.day === cell.day
        )
      );

      if (allSelected) {
        // Désélectionner la ligne
        return prev.filter((selected) => selected.hour !== hour);
      } else {
        // Sélectionner la ligne
        const filtered = prev.filter((selected) => selected.hour !== hour);
        return [...filtered, ...rowCells];
      }
    });
  };

  const selectEntireColumn = (day) => {
    const columnCells = hours.map((hour) => ({ hour, day }));
    setSelectedCells((prev) => {
      // Vérifier si toute la colonne est déjà sélectionnée
      const allSelected = columnCells.every((cell) =>
        prev.some(
          (selected) => selected.hour === cell.hour && selected.day === cell.day
        )
      );

      if (allSelected) {
        // Désélectionner la colonne
        return prev.filter((selected) => selected.day !== day);
      } else {
        // Sélectionner la colonne
        const filtered = prev.filter((selected) => selected.day !== day);
        return [...filtered, ...columnCells];
      }
    });
  };

  return {
    selectEntireRow,
    selectEntireColumn,
  };
};

/**
 * FONCTIONNEMENT ALTERNATIVE 4:
 * - Boutons pour sélectionner des lignes/colonnes entières
 * - Clic sur en-tête de ligne/colonne pour sélection rapide
 *
 * AVANTAGES:
 * - Très rapide pour sélections par créneaux horaires
 * - Parfait pour assigner un agent à un jour complet
 * - Interface familière (comme Excel)
 *
 * INCONVÉNIENTS:
 * - Limité aux sélections rectangulaires
 * - Moins flexible pour sélections précises
 */

export default {
  SelectionModeToggle,
  RectangleSelection,
  LineColumnSelection,
};
