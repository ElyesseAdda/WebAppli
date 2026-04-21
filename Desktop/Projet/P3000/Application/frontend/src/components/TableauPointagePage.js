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

const formatMoneyInput = (value) =>
  toNumber(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseMoneyInput = (rawValue) => {
  const sanitized = String(rawValue || "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatWorkedTime = (hoursValue, agentTypePaiement) => {
  const hours = toNumber(hoursValue);
  if (agentTypePaiement === "journalier") {
    const days = hours / 8;
    return `${days.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} j`;
  }
  return `${formatHours(hours)} h`;
};

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
  width: 105,
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
  "& .MuiInputBase-input": {
    textAlign: "right",
    paddingRight: "6px",
  },
};

const currencyAdornmentSx = {
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "text.secondary",
  pr: 0.5,
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

const tableEmailInputSx = {
  width: 190,
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

const TableauPointagePage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [draftByAgent, setDraftByAgent] = useState({});
  const [hoursByAgent, setHoursByAgent] = useState({});
  const [primeByAgent, setPrimeByAgent] = useState({});
  const [savingEmailAgentId, setSavingEmailAgentId] = useState(null);
  const [savingPointageKey, setSavingPointageKey] = useState("");

  const monthDate = `${monthKey}-01`;

  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [agentsRes, pointagesRes, scheduleSummaryRes, agentPrimesRes] = await Promise.all([
          axios.get("/api/agent/"),
          axios.get(`/api/pointages-mensuels/?month=${monthKey}`),
          axios.get(`/api/schedule/monthly_summary/?month=${monthKey}`).catch(() => ({ data: [] })),
          axios.get("/api/agent-primes/", {
            params: {
              mois: Number(monthKey.split("-")[1]),
              annee: Number(monthKey.split("-")[0]),
            },
          }).catch(() => ({ data: [] })),
        ]);
        if (isCancelled) return;
        setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
        const loadedPointages = Array.isArray(pointagesRes.data) ? pointagesRes.data : [];
        const scheduleSummary = Array.isArray(scheduleSummaryRes.data) ? scheduleSummaryRes.data : [];

        const aggregatedHours = {};
        scheduleSummary.forEach((chantier) => {
          const details = Array.isArray(chantier?.details) ? chantier.details : [];
          details.forEach((detail) => {
            const agentId = String(detail?.agent_id || "");
            if (!agentId) return;
            const totalHoursForDetail =
              toNumber(detail?.heures_normal) +
              toNumber(detail?.heures_samedi) +
              toNumber(detail?.heures_dimanche) +
              toNumber(detail?.heures_ferie) +
              toNumber(detail?.heures_overtime);
            aggregatedHours[agentId] = toNumber(aggregatedHours[agentId]) + totalHoursForDetail;
          });
        });
        setHoursByAgent(aggregatedHours);
        const primes = Array.isArray(agentPrimesRes.data) ? agentPrimesRes.data : [];
        const aggregatedPrimes = {};
        primes.forEach((prime) => {
          const agentId = String(prime?.agent || "");
          if (!agentId) return;
          aggregatedPrimes[agentId] = toNumber(aggregatedPrimes[agentId]) + toNumber(prime?.montant);
        });
        setPrimeByAgent(aggregatedPrimes);

        const initialDraft = {};
        loadedPointages.forEach((p) => {
          initialDraft[String(p.agent)] = {
            id: p.id,
            salaireInitial: p.salaire_net_initial_hors_prime ?? 0,
            accompte: p.accompte ?? 0,
            paiement: p.paiement ?? 0,
            commentaire: p.commentaire || "",
            salaireOverridden: Boolean(p.salaire_overridden),
          };
        });
        setDraftByAgent(initialDraft);
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
  }, [monthKey]);

  const getMonthlyHours = (agent) => {
    const fromScheduleSummary = toNumber(hoursByAgent[String(agent?.id)]);
    if (fromScheduleSummary > 0) return fromScheduleSummary;

    const monthlyHours = Array.isArray(agent?.monthly_hours) ? agent.monthly_hours : [];
    const found = monthlyHours.find((item) =>
      String(item?.month || "").startsWith(monthKey)
    );
    return toNumber(found?.hours);
  };

  const rows = useMemo(() => {
    return agents
      .filter((agent) => agent?.is_active !== false)
      .map((agent) => {
        const agentId = String(agent.id);
        const draft = draftByAgent[agentId] || {};
        const prime = toNumber(primeByAgent[agentId]);
        const totalHeures = getMonthlyHours(agent);

        return {
          id: agent.id,
          prenom: agent.name || "-",
          nom: agent.surname || "-",
          email: agent.email || "",
          totalHeures,
          salaireInitial: toNumber(draft.salaireInitial),
          accompte: toNumber(draft.accompte),
          paiement: toNumber(draft.paiement),
          commentaire: draft.commentaire || "",
          pointageId: draft.id || null,
          salaireOverridden: Boolean(draft.salaireOverridden),
          prime,
        };
      });
  }, [agents, draftByAgent, hoursByAgent, monthKey, primeByAgent]);

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
    setDraftByAgent((prev) => ({
      ...prev,
      [agentId]: {
        ...(prev[agentId] || {}),
        [field]: value,
      },
    }));
  };

  const savePointageField = async (agentId, field, value, isSalaryField = false) => {
    const key = `${agentId}-${field}`;
    try {
      setSavingPointageKey(key);
      const agentDraft = draftByAgent[String(agentId)] || {};
      const payload = {};
      if (field === "commentaire") {
        payload.commentaire = String(value || "");
      } else {
        payload[field] = toNumber(value);
      }
      if (isSalaryField) {
        payload.salaire_overridden = true;
      }

      if (agentDraft.id) {
        const { data } = await axios.patch(`/api/pointages-mensuels/${agentDraft.id}/`, payload);
        setDraftByAgent((prev) => ({
          ...prev,
          [String(agentId)]: {
            ...(prev[String(agentId)] || {}),
            id: data.id,
            salaireInitial: data.salaire_net_initial_hors_prime,
            accompte: data.accompte,
            paiement: data.paiement,
            commentaire: data.commentaire || "",
            salaireOverridden: Boolean(data.salaire_overridden),
          },
        }));
      } else {
        const createPayload = {
          agent: agentId,
          month: monthDate,
          salaire_net_initial_hors_prime: toNumber(agentDraft.salaireInitial),
          accompte: toNumber(agentDraft.accompte),
          paiement: toNumber(agentDraft.paiement),
          commentaire: String(agentDraft.commentaire || ""),
          salaire_overridden: Boolean(agentDraft.salaireOverridden),
          ...payload,
        };
        const { data } = await axios.post("/api/pointages-mensuels/", createPayload);
        setDraftByAgent((prev) => ({
          ...prev,
          [String(agentId)]: {
            ...(prev[String(agentId)] || {}),
            id: data.id,
            salaireInitial: data.salaire_net_initial_hors_prime,
            accompte: data.accompte,
            paiement: data.paiement,
            commentaire: data.commentaire || "",
            salaireOverridden: Boolean(data.salaire_overridden),
          },
        }));
      }
    } catch {
      setError("Erreur lors de la sauvegarde du pointage mensuel.");
    } finally {
      setSavingPointageKey("");
    }
  };

  const handleEmailChange = (agentId, value) => {
    setAgents((prev) =>
      prev.map((agent) =>
        String(agent.id) === String(agentId) ? { ...agent, email: value } : agent
      )
    );
  };

  const handleEmailBlur = async (agentId, value) => {
    const trimmedEmail = String(value || "").trim();
    try {
      setSavingEmailAgentId(agentId);
      await axios.patch(`/api/agent/${agentId}/`, {
        email: trimmedEmail || null,
      });
    } catch {
      setError("Erreur lors de la sauvegarde de l'adresse mail de l'agent.");
    } finally {
      setSavingEmailAgentId(null);
    }
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
                        type="text"
                        value={formatMoneyInput(row.salaireInitial)}
                        onChange={(e) =>
                          handleCellChange(
                            String(row.id),
                            "salaireInitial",
                            parseMoneyInput(e.target.value)
                          )
                        }
                        onBlur={(e) => {
                          handleCellChange(String(row.id), "salaireOverridden", true);
                          savePointageField(
                            row.id,
                            "salaire_net_initial_hors_prime",
                            e.target.value,
                            true
                          );
                        }}
                        inputProps={{ inputMode: "decimal" }}
                        sx={tableInputSx}
                        disabled={savingPointageKey === `${row.id}-salaire_net_initial_hors_prime`}
                        endAdornment={<Typography component="span" sx={currencyAdornmentSx}>€</Typography>}
                      />
                    </TableCell>
                    <TableCell sx={commonBodyCellStyle}>
                      <InputBase
                        type="text"
                        value={formatMoneyInput(row.accompte)}
                        onChange={(e) =>
                          handleCellChange(
                            String(row.id),
                            "accompte",
                            parseMoneyInput(e.target.value)
                          )
                        }
                        onBlur={(e) =>
                          savePointageField(row.id, "accompte", e.target.value)
                        }
                        inputProps={{ inputMode: "decimal" }}
                        sx={tableInputSx}
                        disabled={savingPointageKey === `${row.id}-accompte`}
                        endAdornment={<Typography component="span" sx={currencyAdornmentSx}>€</Typography>}
                      />
                    </TableCell>
                    <TableCell sx={commonBodyCellStyle}>
                      <InputBase
                        type="text"
                        value={formatMoneyInput(row.paiement)}
                        onChange={(e) =>
                          handleCellChange(
                            String(row.id),
                            "paiement",
                            parseMoneyInput(e.target.value)
                          )
                        }
                        onBlur={(e) =>
                          savePointageField(row.id, "paiement", e.target.value)
                        }
                        inputProps={{ inputMode: "decimal" }}
                        sx={tableInputSx}
                        disabled={savingPointageKey === `${row.id}-paiement`}
                        endAdornment={<Typography component="span" sx={currencyAdornmentSx}>€</Typography>}
                      />
                    </TableCell>
                    <TableCell sx={commonBodyCellStyle}>{row.prenom}</TableCell>
                    <TableCell sx={commonBodyCellStyle}>{row.nom}</TableCell>
                    <TableCell sx={commonBodyCellStyle}>
                      {formatCurrency(row.prime)}
                    </TableCell>
                    <TableCell sx={commonBodyCellStyle}>
                      <InputBase
                        type="email"
                        value={row.email === "-" ? "" : row.email}
                        onChange={(e) => handleEmailChange(row.id, e.target.value)}
                        onBlur={(e) => handleEmailBlur(row.id, e.target.value)}
                        placeholder="Adresse mail"
                        sx={tableEmailInputSx}
                        disabled={savingEmailAgentId === row.id}
                      />
                    </TableCell>
                    <TableCell sx={commonBodyCellStyle}>
                      <InputBase
                        value={row.commentaire}
                        onChange={(e) =>
                          handleCellChange(String(row.id), "commentaire", e.target.value)
                        }
                        onBlur={(e) =>
                          savePointageField(row.id, "commentaire", e.target.value)
                        }
                        placeholder="Commentaire"
                        sx={tableCommentInputSx}
                        disabled={savingPointageKey === `${row.id}-commentaire`}
                      />
                    </TableCell>
                    <TableCell align="right" sx={commonBodyCellStyle}>
                      {formatWorkedTime(row.totalHeures, agents.find((a) => a.id === row.id)?.type_paiement)}
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

