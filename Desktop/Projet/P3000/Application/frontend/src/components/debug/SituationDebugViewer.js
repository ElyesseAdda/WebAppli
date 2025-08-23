import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Paper,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const SituationDebugViewer = () => {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Charger les logs au montage
    loadLogs();

    // Recharger les logs toutes les 2 secondes si le composant est ouvert
    const interval = setInterval(() => {
      if (expanded) {
        loadLogs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [expanded]);

  const loadLogs = () => {
    const debugLogs = JSON.parse(
      localStorage.getItem("situationDebugLogs") || "[]"
    );
    setLogs(debugLogs.reverse()); // Plus récents en premier
  };

  const clearLogs = () => {
    localStorage.removeItem("situationDebugLogs");
    setLogs([]);
  };

  const exportLogs = () => {
    const allLogs = JSON.parse(
      localStorage.getItem("situationDebugLogs") || "[]"
    );
    const dataStr = JSON.stringify(allLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `situation-debug-logs-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryColor = (category) => {
    const colors = {
      MODAL_STATE: "primary",
      CALCULS_MODAL: "success",
      API_REQUEST: "warning",
      API_RESPONSE: "info",
      COMPARISON: "error",
    };
    return colors[category] || "default";
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString("fr-FR");
  };

  if (logs.length === 0 && !expanded) {
    return null; // Ne pas afficher si pas de logs
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 400,
      }}
    >
      <Paper elevation={6} sx={{ borderRadius: 2 }}>
        <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6">🔍 Debug Logs</Typography>
              <Chip label={logs.length} color="primary" size="small" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ maxHeight: 400, overflow: "auto" }}>
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <Button
                  size="small"
                  onClick={clearLogs}
                  color="error"
                  variant="outlined"
                >
                  Vider
                </Button>
                <Button size="small" onClick={exportLogs} variant="outlined">
                  Exporter
                </Button>
                <Button size="small" onClick={loadLogs} variant="outlined">
                  Actualiser
                </Button>
              </Box>

              {logs.map((log, index) => (
                <Accordion key={index} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        width: "100%",
                      }}
                    >
                      <Chip
                        label={log.category}
                        color={getCategoryColor(log.category)}
                        size="small"
                      />
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {log.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(log.timestamp).split(" ")[1]}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      sx={{
                        backgroundColor: "#f5f5f5",
                        p: 1,
                        borderRadius: 1,
                        maxHeight: 300,
                        overflow: "auto",
                      }}
                    >
                      <pre
                        style={{
                          fontSize: "10px",
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                        }}
                      >
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}

              {logs.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                >
                  Aucun log disponible
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Box>
  );
};

export default SituationDebugViewer;
