import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  CircularProgress,
  InputBase,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

const STORAGE_KEY = "tableau_pointage_values";

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) =>
  `${toNumber(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

const formatHours = (value) =>
  toNumber(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const headerCellSx = {
  fontWeight: 700,
  backgroundColor: "#1976d2",
  color: "#fff",
  textAlign: "center",
};

const compactNumberColumnSx = {
  ...headerCellSx,
  width: 130,
  minWidth: 130,
  maxWidth: 130,
};

const commonBodyCellStyle = {
  padding: "6px 8px",
  whiteSpace: "normal",
  wordWrap: "break-word",
  textAlign: "center",
  verticalAlign: "middle",
};

const tableInputSx = {
  width: 120,
  px: 0.75,
  py: 0.5,
  border: "1px solid",
  borderColor: "#cfd8dc",
  borderRadius: 0,
  backgroundColor: "#fff",
  fontSize: "0.82rem",
  lineHeight: 1.2,
  "&:hover": {
    borderColor: "#b0bec5",
  },
  "&.Mui-focused, &:focus-within": {
    borderColor: "#1976d2",
    boxShadow: "inset 0 0 0 1px #1976d2",
  },
};

const tableCommentInputSx = {
  width: 200,
  px: 0.75,
  py: 0.5,
  border: "1px solid",
  borderColor: "#cfd8dc",
  borderRadius: 0,
  backgroundColor: "#fff",
  fontSize: "0.82rem",
  lineHeight: 1.2,
  "&:hover": {
    borderColor: "#b0bec5",
  },
  "&.Mui-focused, &:focus-within": {
    borderColor: "#1976d2",
    boxShadow: "inset 0 0 0 1px #1976d2",
  },
};

const getMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const sumAgentPrimesForMonth = (agent, monthKey) => {
  const monthPrimes = agent?.primes?.[monthKey];
  if (!Array.isArray(monthPrimes)) return 0;
  return monthPrimes.reduce((acc, prime) => acc + toNumber(prime?.montant), 0);
};

const TableauPointagePage = () => {
  const [agents, setAgents] = useState([]);
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [manualValues, setManualValues] = useState({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setManualValues(parsed || {});
      }
    } catch {
      setManualValues({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualValues));
  }, [manualValues]);

  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [agentsRes, presencesRes] = await Promise.all([
          axios.get("/api/agent/"),
          axios.get("/api/presence/"),
        ]);
        if (isCancelled) return;
        setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
        setPresences(Array.isArray(presencesRes.data) ? presencesRes.data : []);
      } catch {
        if (!isCancelled) {
          setError("Impossible de charger les données du tableau de pointage.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    return agents
      .filter((agent) => agent?.is_active !== false)
      .map((agent) => {
        const agentId = String(agent.id);
        const monthlyPresenceHours = presences
          .filter(
            (presence) =>
              String(presence.agent) === agentId &&
              String(presence.date || "").startsWith(monthKey)
          )
          .reduce((acc, presence) => acc + toNumber(presence.heures_travail), 0);

        const computedInitialSalary =
          agent.type_paiement === "journalier"
            ? (monthlyPresenceHours / 8) * toNumber(agent.taux_journalier)
            : monthlyPresenceHours * toNumber(agent.taux_Horaire);

        const monthValues = manualValues?.[monthKey]?.[agentId] || {};
        const initialSalary = toNumber(
          monthValues.salaireInitial ?? computedInitialSalary
        );
        const accompte = toNumber(monthValues.accompte);
        const paiement = toNumber(monthValues.paiement);
        const prime = toNumber(
          monthValues.prime ?? sumAgentPrimesForMonth(agent, monthKey)
        );

        return {
          id: agent.id,
          prenom: agent.name || "-",
          nom: agent.surname || "-",
          email: agent.email || "-",
          totalHeures: monthlyPresenceHours,
          salaireInitial: initialSalary,
          accompte,
          paiement,
          prime,
        };
      });
  }, [agents, manualValues, monthKey, presences]);

  const totals = useMemo(() => {
    const totalNetVerseSalaries = rows.reduce(
      (acc, row) => acc + row.accompte + row.paiement,
      0
    );
    const totalNetVerseEmployeur = rows.reduce(
      (acc, row) => acc + row.salaireInitial + row.prime,
      0
    );
    const cumulMensuelCharges = rows.reduce(
      (acc, row) => acc + row.salaireInitial + row.prime,
      0
    );
    const totalVerse = totalNetVerseSalaries + rows.reduce((acc, row) => acc + row.prime, 0);

    return {
      totalNetVerseSalaries,
      totalNetVerseEmployeur,
      cumulMensuelCharges,
      totalVerse,
    };
  }, [rows]);

  const handleCellChange = (agentId, field, value) => {
    setManualValues((prev) => ({
      ...prev,
      [monthKey]: {
        ...(prev[monthKey] || {}),
        [agentId]: {
          ...(prev[monthKey]?.[agentId] || {}),
          [field]: value,
        },
      },
    }));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
          Tableau de pointage des agents
        </Typography>
        <TextField
          label="Mois"
          type="month"
          size="small"
          value={monthKey}
          onChange={(e) => setMonthKey(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{
            "& .MuiInputLabel-root": { color: "#fff" },
            "& .MuiInputBase-input": { color: "#fff" },
          }}
        />
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              maxWidth: "100%",
              overflowX: "auto",
              width: "100%",
              height: "auto",
              maxHeight: "none",
              overflowY: "visible",
              position: "relative",
            }}
          >
            <Table
              size="small"
              sx={{
                tableLayout: "auto",
                width: "100%",
              }}
            >
              <TableHead
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  backgroundColor: "rgba(27, 120, 188, 1)",
                }}
              >
                <TableRow>
                  <TableCell sx={compactNumberColumnSx}>
                    Salaire net initiale hors prime
                  </TableCell>
                  <TableCell sx={compactNumberColumnSx}>Accompte</TableCell>
                  <TableCell sx={compactNumberColumnSx}>Paiement</TableCell>
                  <TableCell sx={headerCellSx}>Prenom</TableCell>
                  <TableCell sx={headerCellSx}>Nom</TableCell>
                  <TableCell sx={compactNumberColumnSx}>Prime</TableCell>
                  <TableCell sx={headerCellSx}>Adresse mail</TableCell>
                  <TableCell sx={headerCellSx}>Commentaire</TableCell>
                  <TableCell align="right" sx={headerCellSx}>
                    Total heures
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      "&:nth-of-type(odd)": { backgroundColor: "#f5f5f5" },
                      "&:nth-of-type(even)": { backgroundColor: "#ffffff" },
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                  >
                    <TableCell sx={commonBodyCellStyle}>
                      <InputBase
                        type="number"
                        value={row.salaireInitial}
                        onChange={(e) =>
                          handleCellChange(String(row.id), "salaireInitial", e.target.value)
                        }
                        inputProps={{ min: 0, step: "0.01", max: 999999 }}
                        sx={tableInputSx}
                      />
                    </TableCell>
                    <TableCell sx={commonBodyCellStyle}>
                      <InputBase
                        type="number"
                        value={row.accompte}
                        onChange={(e) =>
                          handleCellChange(String(row.id), "accompte", e.target.value)
                        }
                        inputProps={{ min: 0, step: "0.01", max: 999999 }}
                        sx={tableInputSx}
                      />
                    </TableCell>
                    <TableCell sx={commonBodyCellStyle}>
                      <InputBase
                        type="number"
                        value={row.paiement}
                        onChange={(e) =>
                          handleCellChange(String(row.id), "paiement", e.target.value)
                        }
                        inputProps={{ min: 0, step: "0.01", max: 999999 }}
                        sx={tableInputSx}
                      />
                    </TableCell>
                    <TableCell sx={commonBodyCellStyle}>{row.prenom}</TableCell>
                    <TableCell sx={commonBodyCellStyle}>{row.nom}</TableCell>
                    <TableCell sx={commonBodyCellStyle}>
                      <InputBase
                        type="number"
                        value={row.prime}
                        onChange={(e) =>
                          handleCellChange(String(row.id), "prime", e.target.value)
                        }
                        inputProps={{ min: 0, step: "0.01", max: 999999 }}
                        sx={tableInputSx}
                      />
                    </TableCell>
                    <TableCell sx={commonBodyCellStyle}>{row.email}</TableCell>
                    <TableCell sx={commonBodyCellStyle}>
                      <InputBase
                        value={manualValues?.[monthKey]?.[String(row.id)]?.commentaire || ""}
                        onChange={(e) =>
                          handleCellChange(String(row.id), "commentaire", e.target.value)
                        }
                        placeholder="Commentaire"
                        sx={tableCommentInputSx}
                      />
                    </TableCell>
                    <TableCell align="right" sx={commonBodyCellStyle}>
                      {formatHours(row.totalHeures)} h
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              backgroundColor: "rgba(27, 120, 188, 0.1)",
              border: "2px solid rgba(27, 120, 188, 0.3)",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 1.5, fontWeight: 700, color: "rgba(27, 120, 188, 1)" }}
            >
              Récapitulatif pointage
            </Typography>
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                  Total Net verse au salaries
                </Typography>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: "bold", color: "rgba(46, 125, 50, 1)" }}>
                  {formatCurrency(totals.totalNetVerseSalaries)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                  Total Net verse par l'employeur
                </Typography>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}>
                  {formatCurrency(totals.totalNetVerseEmployeur)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                  Cumul mensuel charges du personnel
                </Typography>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}>
                  {formatCurrency(totals.cumulMensuelCharges)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                  Total verse
                </Typography>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: "bold", color: "rgba(46, 125, 50, 1)" }}>
                  {formatCurrency(totals.totalVerse)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default TableauPointagePage;

