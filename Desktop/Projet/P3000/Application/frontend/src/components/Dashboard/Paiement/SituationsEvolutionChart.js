import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDashboardFilters } from "../DashboardFiltersContext";

const formatNumber = (number) => {
  if (number == null) return "";
  const formatted = parseFloat(number).toFixed(2);
  return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const SituationsEvolutionChart = () => {
  const { selectedYear } = useDashboardFilters();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedYear]);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/situations-monthly-evolution/", {
        params: {
          year: selectedYear,
        },
      });
      setMonthlyData(response.data);
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError("Impossible de charger les données");
    } finally {
      setLoading(false);
    }
  };

  // Calculer les dimensions du graphique
  const chartWidth = 1200;
  const chartHeight = 400;
  const padding = { top: 60, right: 80, bottom: 60, left: 80 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Calculer les valeurs min et max pour l'échelle
  const maxMontant = Math.max(...monthlyData.map((d) => d.montant_total), 0);
  const minMontant = Math.min(...monthlyData.map((d) => d.montant_total), 0);
  const range = maxMontant - minMontant || 1; // Éviter la division par zéro

  // Générer les points de la courbe (points principaux)
  const points = monthlyData.map((data, index) => {
    const divisor = monthlyData.length > 1 ? monthlyData.length - 1 : 1;
    const x = padding.left + (index / divisor) * graphWidth;
    const y =
      padding.top +
      graphHeight -
      ((data.montant_total - minMontant) / range) * graphHeight;
    return { x, y, ...data };
  });

  // Créer le path SVG pour la courbe avec lissage (courbes de Bézier qui passent par les points)
  const createSmoothPath = (points) => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      
      if (i === 0) {
        // Premier segment : ligne droite ou courbe vers le deuxième point
        const cp1x = current.x + (next.x - current.x) / 3;
        const cp1y = current.y;
        const cp2x = current.x + (next.x - current.x) * 2 / 3;
        const cp2y = next.y;
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
      } else if (i === points.length - 2) {
        // Dernier segment
        const prev = points[i - 1];
        const cp1x = current.x + (next.x - prev.x) / 6;
        const cp1y = current.y;
        const cp2x = next.x - (next.x - current.x) / 3;
        const cp2y = next.y;
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
      } else {
        // Segments intermédiaires : courbes de Bézier lisses
        const prev = points[i - 1];
        const afterNext = points[i + 2];
        
        // Points de contrôle pour une courbe lisse qui passe par le point actuel
        const cp1x = current.x + (next.x - prev.x) / 6;
        const cp1y = current.y;
        const cp2x = next.x - (afterNext.x - current.x) / 6;
        const cp2y = next.y;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
      }
    }
    
    return path;
  };

  const pathData = createSmoothPath(points);

  // Gérer le survol de la souris
  const handleMouseMove = (event, point) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipData(point);
    setTooltipPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  if (loading) {
    return (
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
          
        }}
      >
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: "white",
        borderRadius: "16px",
        border: "1px solid #f1f5f9",
        boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        width: "1360px",
        overflow: "visible",
      }}
    >
      {/* En-tête avec icône et titre */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 2,
        }}
      >
        <CreditCardIcon
          sx={{
            fontSize: 32,
            color: "#1976d2",
          }}
        />
        <Box>
          <Typography
            variant="h6"
            component="h3"
            sx={{
              color: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              mb: 0.5,
            }}
          >
            Suivi des Situations
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#94a3b8",
              fontWeight: 500,
            }}
          >
            Evolution des montants total facturé (Situation Emise)
          </Typography>
        </Box>
        
        {/* Légende en haut à droite */}
        <Box
          sx={{
            ml: "auto",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: "#1976d2",
              borderRadius: "4px",
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            Montant total facturé
          </Typography>
        </Box>
      </Box>

      {/* Graphique SVG */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          overflowX: "auto",
          overflowY: "visible",
        }}
      >
        <svg
          width={chartWidth}
          height={chartHeight}
          style={{ display: "block" }}
        >
          {/* Axes */}
          {/* Axe Y (montants) */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + graphHeight}
            stroke="#e2e8f0"
            strokeWidth="2"
          />
          
          {/* Axe X (mois) */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={padding.left + graphWidth}
            y2={padding.top + graphHeight}
            stroke="#e2e8f0"
            strokeWidth="2"
          />

          {/* Grille horizontale */}
          {[0, 1, 2, 3, 4].map((i) => {
            const value = minMontant + (range * i) / 4;
            const y = padding.top + graphHeight - (graphHeight * i) / 4;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + graphWidth}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#94a3b8"
                >
                  {formatNumber(value)} €
                </text>
              </g>
            );
          })}

          {/* Labels des mois sur l'axe X */}
          {points.map((point, index) => (
            <text
              key={index}
              x={point.x}
              y={padding.top + graphHeight + 25}
              textAnchor="middle"
              fontSize="12"
              fill="#64748b"
            >
              {point.label}
            </text>
          ))}

          {/* Zone sous la courbe (dégradé) */}
          {points.length > 1 && (
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1976d2" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#1976d2" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          )}
          
          {points.length > 1 && (
            <path
              d={`${pathData} L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`}
              fill="url(#areaGradient)"
            />
          )}

          {/* Ligne de la courbe */}
          <path
            d={pathData}
            fill="none"
            stroke="#1976d2"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Lignes en pointillés depuis les axes vers le point survolé */}
          {tooltipData && (
            <g>
              {/* Ligne verticale depuis l'axe X vers le point */}
              <line
                x1={tooltipData.x}
                y1={padding.top + graphHeight}
                x2={tooltipData.x}
                y2={tooltipData.y}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.6"
              />
              {/* Ligne horizontale depuis l'axe Y vers le point */}
              <line
                x1={padding.left}
                y1={tooltipData.y}
                x2={tooltipData.x}
                y2={tooltipData.y}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.6"
              />
            </g>
          )}

          {/* Points sur la courbe avec zones cliquables */}
          {points.map((point, index) => {
            const isHovered = tooltipData && tooltipData.month === point.month && tooltipData.year === point.year;
            return (
              <g key={index}>
                {/* Zone invisible pour le hover (plus grande que le point) */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="15"
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onMouseMove={(e) => handleMouseMove(e, point)}
                  onMouseLeave={handleMouseLeave}
                />
                {/* Point visible */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? "6" : "5"}
                  fill="#1976d2"
                  stroke="white"
                  strokeWidth={isHovered ? "3" : "2"}
                  style={{ pointerEvents: "none", transition: "r 0.2s, stroke-width 0.2s" }}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip sur l'axe Y */}
        {tooltipData && (
          <Box
            sx={{
              position: "absolute",
              left: `${padding.left - 0}px`, // À gauche de l'axe Y
              top: `${tooltipData.y - 25}px`, // À la hauteur du point survolé
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              pointerEvents: "none",
              zIndex: 1000,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Box sx={{ mb: 0.5 }}>
              {tooltipData.label} {tooltipData.year}
            </Box>
            <Box>
              {formatNumber(tooltipData.montant_total)} €
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default SituationsEvolutionChart;

