import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  CircularProgress,
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
import PointageRecapCards from "./PointageRecapCards";
import PointageEditDialog from "./PointageEditDialog";

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) =>
  `${toNumber(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

const formatCurrencyInTable = (value) => {
  const number = toNumber(value);
  return number === 0 ? "-" : formatCurrency(number);
};

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

const clickableValueSx = {
  cursor: "pointer",
  px: 1,
  py: 0.75,
  borderRadius: 1,
  border: "1px solid transparent",
  "&:hover": {
    backgroundColor: "rgba(27, 120, 188, 0.08)",
    borderColor: "rgba(27, 120, 188, 0.3)",
  },
};

const readOnlyValueSx = {
  px: 1,
  py: 0.75,
  borderRadius: 1,
};

const amountTextSx = {
  textAlign: "right",
  fontWeight: 500,
  fontSize: "0.8rem",
  lineHeight: 1.2,
};

const getPaiementCellSx = (paiementValue) => {
  const hasValue = toNumber(paiementValue) > 0;
  return {
    ...clickableValueSx,
    backgroundColor: hasValue ? "rgba(46, 125, 50, 0.12)" : "rgba(211, 47, 47, 0.12)",
    borderColor: hasValue ? "rgba(46, 125, 50, 0.35)" : "rgba(211, 47, 47, 0.35)",
    "&:hover": {
      backgroundColor: hasValue ? "rgba(46, 125, 50, 0.2)" : "rgba(211, 47, 47, 0.2)",
      borderColor: hasValue ? "rgba(46, 125, 50, 0.5)" : "rgba(211, 47, 47, 0.5)",
    },
  };
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
  const [brutByAgent, setBrutByAgent] = useState({});
  const [primeByAgent, setPrimeByAgent] = useState({});
  const [savingEmailAgentId, setSavingEmailAgentId] = useState(null);
  const [savingPointageKey, setSavingPointageKey] = useState("");
  const [editorState, setEditorState] = useState({
    open: false,
    agentId: null,
    field: "",
    label: "",
    value: "",
    inputType: "text",
    isCurrency: false,
  });

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
        const aggregatedBrut = {};
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

            const totalMontantForDetail =
              toNumber(detail?.montant_normal) +
              toNumber(detail?.montant_samedi) +
              toNumber(detail?.montant_dimanche) +
              toNumber(detail?.montant_ferie) +
              toNumber(detail?.montant_overtime);
            aggregatedBrut[agentId] =
              toNumber(aggregatedBrut[agentId]) + totalMontantForDetail;
          });
        });
        setHoursByAgent(aggregatedHours);
        setBrutByAgent(aggregatedBrut);
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
            montantCharge: p.montant_charge ?? 0,
            montantBrut: p.montant_brut ?? 0,
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
        const brutCalcule = toNumber(brutByAgent[agentId]);
        const brutPointage = toNumber(draft.montantBrut);
        const montantBrutAffiche = brutCalcule > 0 ? brutCalcule : brutPointage;

        return {
          id: agent.id,
          prenom: agent.name || "-",
          nom: agent.surname || "-",
          typePaiement: agent.type_paiement || "horaire",
          email: agent.email || "",
          totalHeures,
          salaireInitial: toNumber(draft.salaireInitial),
          montantCharge: toNumber(draft.montantCharge),
          montantBrut: montantBrutAffiche,
          accompte: toNumber(draft.accompte),
          paiement: toNumber(draft.paiement),
          commentaire: draft.commentaire || "",
          pointageId: draft.id || null,
          salaireOverridden: Boolean(draft.salaireOverridden),
          prime,
        };
      });
  }, [agents, brutByAgent, draftByAgent, hoursByAgent, monthKey, primeByAgent]);

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

  const groupedRows = useMemo(() => {
    const sortByPrenom = (a, b) =>
      String(a.prenom || "").localeCompare(String(b.prenom || ""), "fr", {
        sensitivity: "base",
      });

    const journaliers = rows
      .filter((row) => row.typePaiement === "journalier")
      .sort(sortByPrenom);
    const horaires = rows
      .filter((row) => row.typePaiement !== "journalier")
      .sort(sortByPrenom);
    return [
      { key: "horaire", label: "Agents horaires", items: horaires },
      { key: "journalier", label: "Agents journaliers", items: journaliers },
    ];
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
            montantCharge: data.montant_charge,
            montantBrut: data.montant_brut,
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
          montant_charge: toNumber(agentDraft.montantCharge),
          montant_brut: toNumber(agentDraft.montantBrut),
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
            montantCharge: data.montant_charge,
            montantBrut: data.montant_brut,
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

  const handleEmailBlur = async (agentId, value) => {
    const trimmedEmail = String(value || "").trim();
    try {
      setSavingEmailAgentId(agentId);
      await axios.patch(`/api/agent/${agentId}/`, {
        email: trimmedEmail || null,
      });
      setAgents((prev) =>
        prev.map((agent) =>
          String(agent.id) === String(agentId)
            ? { ...agent, email: trimmedEmail }
            : agent
        )
      );
    } catch {
      setError("Erreur lors de la sauvegarde de l'adresse mail de l'agent.");
    } finally {
      setSavingEmailAgentId(null);
    }
  };

  const openEditor = (row, field) => {
    const config = {
      salaireInitial: {
        field: "salaire_net_initial_hors_prime",
        label: "Salaire net initiale hors prime",
        value: row.salaireInitial,
        inputType: "text",
        isCurrency: true,
      },
      accompte: {
        field: "accompte",
        label: "Accompte",
        value: row.accompte,
        inputType: "text",
        isCurrency: true,
      },
      montantCharge: {
        field: "montant_charge",
        label: "Montant charge",
        value: row.montantCharge,
        inputType: "text",
        isCurrency: true,
      },
      paiement: {
        field: "paiement",
        label: "Paiement",
        value: row.paiement,
        inputType: "text",
        isCurrency: true,
      },
      email: {
        field: "email",
        label: "Adresse mail",
        value: row.email || "",
        inputType: "email",
        isCurrency: false,
      },
      commentaire: {
        field: "commentaire",
        label: "Commentaire",
        value: row.commentaire || "",
        inputType: "text",
        isCurrency: false,
      },
    };
    const next = config[field];
    if (!next) return;
    setEditorState({
      open: true,
      agentId: row.id,
      ...next,
      value: next.isCurrency ? formatMoneyInput(next.value) : next.value,
    });
  };

  const closeEditor = () => {
    setEditorState((prev) => ({ ...prev, open: false }));
  };

  const saveEditor = async () => {
    const { agentId, field, value, isCurrency } = editorState;
    if (!agentId || !field) return;
    if (field === "email") {
      await handleEmailBlur(agentId, value);
      closeEditor();
      return;
    }
    const normalizedValue = isCurrency ? parseMoneyInput(value) : value;
    if (field === "salaire_net_initial_hors_prime") {
      handleCellChange(String(agentId), "salaireInitial", normalizedValue);
      handleCellChange(String(agentId), "salaireOverridden", true);
      await savePointageField(agentId, field, normalizedValue, true);
    } else if (
      field === "accompte" ||
      field === "paiement" ||
      field === "commentaire" ||
      field === "montant_charge" ||
      field === "montant_brut"
    ) {
      handleCellChange(
        String(agentId),
        field === "commentaire"
          ? "commentaire"
          : field === "montant_charge"
          ? "montantCharge"
          : field === "montant_brut"
          ? "montantBrut"
          : field,
        normalizedValue
      );
      await savePointageField(agentId, field, normalizedValue);
    }
    closeEditor();
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
          <PointageRecapCards totals={totals} formatCurrency={formatCurrency} />

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
                  <TableCell sx={headerCellSx}>Prenom</TableCell>
                  <TableCell sx={headerCellSx}>Nom</TableCell>
                  <TableCell sx={compactNumberColumnSx}>
                    Salaire net initiale hors prime
                  </TableCell>
                  <TableCell sx={compactNumberColumnSx}>Paiement</TableCell>
                  <TableCell sx={compactNumberColumnSx}>Montant brut</TableCell>
                  <TableCell sx={compactNumberColumnSx}>Montant charge</TableCell>
                  <TableCell sx={compactNumberColumnSx}>Accompte</TableCell>
                  <TableCell sx={compactNumberColumnSx}>Prime</TableCell>
                  <TableCell sx={headerCellSx}>Adresse mail</TableCell>
                  <TableCell sx={headerCellSx}>Commentaire</TableCell>
                  <TableCell align="right" sx={headerCellSx}>
                    Total heures
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedRows.map((group) => (
                  <React.Fragment key={group.key}>
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        sx={{
                          backgroundColor: "rgba(27, 120, 188, 0.12)",
                          color: "rgba(27, 120, 188, 1)",
                          fontWeight: 700,
                          textAlign: "left",
                        }}
                      >
                        {group.label} ({group.items.length})
                      </TableCell>
                    </TableRow>
                    {group.items.map((row) => (
                      <TableRow
                        key={`${group.key}-${row.id}`}
                        hover
                        sx={{
                          "&:nth-of-type(odd)": { backgroundColor: "#f5f5f5" },
                          "&:nth-of-type(even)": { backgroundColor: "#ffffff" },
                          "&:hover": { backgroundColor: "#f5f5f5" },
                        }}
                      >
                        <TableCell sx={commonBodyCellStyle}>{row.prenom}</TableCell>
                        <TableCell sx={commonBodyCellStyle}>{row.nom}</TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={clickableValueSx} onClick={() => openEditor(row, "salaireInitial")}>
                            <Typography sx={amountTextSx}>
                              {formatCurrencyInTable(row.salaireInitial)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={getPaiementCellSx(row.paiement)} onClick={() => openEditor(row, "paiement")}>
                            <Typography sx={amountTextSx}>
                              {formatCurrencyInTable(row.paiement)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={readOnlyValueSx}>
                            <Typography sx={amountTextSx}>
                              {formatCurrencyInTable(row.montantBrut)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={clickableValueSx} onClick={() => openEditor(row, "montantCharge")}>
                            <Typography sx={amountTextSx}>
                              {formatCurrencyInTable(row.montantCharge)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={clickableValueSx} onClick={() => openEditor(row, "accompte")}>
                            <Typography sx={amountTextSx}>
                              {formatCurrencyInTable(row.accompte)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          {formatCurrencyInTable(row.prime)}
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={clickableValueSx} onClick={() => openEditor(row, "email")}>
                            <Typography sx={{ textAlign: "left" }}>
                              {row.email || "-"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={clickableValueSx} onClick={() => openEditor(row, "commentaire")}>
                            <Typography sx={{ textAlign: "left" }}>
                              {row.commentaire || "-"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={commonBodyCellStyle}>
                          {formatWorkedTime(row.totalHeures, agents.find((a) => a.id === row.id)?.type_paiement)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      <PointageEditDialog
        editorState={editorState}
        setEditorState={setEditorState}
        closeEditor={closeEditor}
        saveEditor={saveEditor}
        savingPointageKey={savingPointageKey}
        savingEmailAgentId={savingEmailAgentId}
      />
    </Box>
  );
};

export default TableauPointagePage;

