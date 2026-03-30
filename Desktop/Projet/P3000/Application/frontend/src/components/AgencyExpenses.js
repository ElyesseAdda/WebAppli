import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FilterCell, StyledTextField } from "../styles/tableStyles";

const AgencyExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "Salaire",
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filters, setFilters] = useState({
    description: "",
    category: "Tous",
    amount: "",
  });
  const [originalExpenses, setOriginalExpenses] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [yearlyTotal, setYearlyTotal] = useState(0);
  /** Totaux annuels par catégorie (dépenses saisies + planning agence sur 12 mois) */
  const [yearlyCategoryTotals, setYearlyCategoryTotals] = useState({});
  const [yearlyCategoryLoading, setYearlyCategoryLoading] = useState(false);
  const [planningAgence, setPlanningAgence] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceStart, setRecurrenceStart] = useState("");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");

  // Catégories de dépenses
  const categories = [
    "Salaire",
    "Prime",
    "Loyer",
    "Fournitures",
    "Fournisseur",
    "Équipement",
    "Assurance",
    "Services",
    "Formation",
    "Sous-traitant",
    "Autres",
  ];

  /** Uniquement pour le filtre du tableau (lignes issues du planning, non saisissables à la main) */
  const categoriesWithPlanning = [...categories, "Planning agence"];

  const fetchYearlyCategoryTotals = useCallback(async () => {
    setYearlyCategoryLoading(true);
    try {
      const monthResults = await Promise.all(
        Array.from({ length: 12 }, (_, monthIndex) => {
          const m = monthIndex + 1;
          const monthStr = `${selectedYear}-${String(m).padStart(2, "0")}`;
          return Promise.all([
            axios.get(
              `/api/agency-expenses-month/monthly_summary/?month=${m}&year=${selectedYear}`
            ),
            axios
              .get(
                `/api/schedule/monthly_summary/?month=${encodeURIComponent(monthStr)}&agence=1`
              )
              .catch(() => ({ data: {} })),
          ]);
        })
      );

      const merged = {};
      for (const [expRes, planRes] of monthResults) {
        const rows = expRes.data?.totals_by_category || [];
        rows.forEach(({ category, total }) => {
          const c = category || "Autres";
          merged[c] = (merged[c] || 0) + (Number(total) || 0);
        });
        const planning = Number(planRes.data?.total_montant) || 0;
        merged["Planning agence"] =
          (merged["Planning agence"] || 0) + planning;
      }

      setYearlyCategoryTotals(merged);
    } catch (e) {
      console.error("Erreur totaux annuels par catégorie:", e);
      setYearlyCategoryTotals({});
    } finally {
      setYearlyCategoryLoading(false);
    }
  }, [selectedYear]);

  // Charger les données à chaque changement de mois/année
  useEffect(() => {
    fetchMonthlyExpenses();
    updateYearlyTotal();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchYearlyCategoryTotals();
  }, [fetchYearlyCategoryTotals]);

  useEffect(() => {
    let cancelled = false;
    const loadPlanningAgence = async () => {
      try {
        const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
        const res = await axios.get(
          `/api/schedule/monthly_summary/?month=${encodeURIComponent(monthStr)}&agence=1`
        );
        if (!cancelled) setPlanningAgence(res.data);
      } catch (e) {
        console.error("Erreur chargement heures agence (planning):", e);
        if (!cancelled) setPlanningAgence(null);
      }
    };
    loadPlanningAgence();
    return () => {
      cancelled = true;
    };
  }, [selectedMonth, selectedYear]);

  const updateYearlyTotal = async () => {
    const total = await calculateYearlyTotal();
    setYearlyTotal(total);
  };

  const fetchMonthlyExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/agency-expenses-month/monthly_summary/?month=${
          selectedMonth + 1
        }&year=${selectedYear}`
      );
      const fetched = response.data?.expenses || [];
      setOriginalExpenses(fetched);
      setExpenses(fetched);
    } catch (error) {
      console.error("Erreur lors du chargement des dépenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      setLoading(true);

      // Extraire mois/année de la date de début (en gérant les fuseaux horaires)
      let startMonth, startYear;
      if (recurrenceStart) {
        // Parser la date YYYY-MM-DD directement sans conversion de fuseau horaire
        const [yearStr, monthStr] = recurrenceStart.split("-");
        startYear = parseInt(yearStr, 10);
        startMonth = parseInt(monthStr, 10) - 1; // 0-indexed pour JS
      } else {
        startMonth = selectedMonth;
        startYear = selectedYear;
      }

      // Normaliser les dates au premier du mois (format YYYY-MM-DD)
      const startDateNormalized = `${startYear}-${String(startMonth + 1).padStart(2, "0")}-01`;
      
      // Traiter la date de fin de la même manière
      let endDateNormalized = null;
      if (recurrenceEnd) {
        const [endYearStr, endMonthStr] = recurrenceEnd.split("-");
        const endYear = parseInt(endYearStr, 10);
        const endMonth = parseInt(endMonthStr, 10);
        endDateNormalized = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
      }

      // Si une date de fin est spécifiée, c'est automatiquement récurrent
      const effectiveIsRecurring = isRecurring || !!endDateNormalized;

      const expenseData = {
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        month: startMonth + 1,
        year: startYear,
        date_paiement: startDateNormalized,
        is_recurring_template: effectiveIsRecurring,
        recurrence_start: effectiveIsRecurring ? startDateNormalized : null,
        recurrence_end: effectiveIsRecurring && endDateNormalized ? endDateNormalized : null,
      };

      const response = await axios.post("/api/agency-expenses-month/", expenseData);

      // Générer les occurrences si c'est un template récurrent
      if (effectiveIsRecurring && response?.data?.id) {
        await axios.post(
          `/api/agency-expenses-month/${response.data.id}/recurring_generate/`,
          {
            horizon_months: 60, // 5 ans
          }
        );
      }

      setOpenDialog(false);
      await fetchMonthlyExpenses();
      await updateYearlyTotal();
      await fetchYearlyCategoryTotals();

      setNewExpense({
        description: "",
        amount: "",
        category: "Salaire",
      });
      setIsRecurring(false);
      setRecurrenceStart("");
      setRecurrenceEnd("");
    } catch (error) {
      console.error("Erreur lors de l'ajout de la dépense:", error);
      alert("Erreur lors de l'ajout de la dépense");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      setLoading(true);
      await axios.delete(`/api/agency-expenses-month/${id}/`);
      await fetchMonthlyExpenses();
      await updateYearlyTotal();
      await fetchYearlyCategoryTotals();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression de la dépense");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (expense) => {
    setExpenseToDelete(expense);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    await handleDeleteExpense(expenseToDelete.id);
    setConfirmDeleteOpen(false);
    setExpenseToDelete(null);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense({
      ...expense,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
    });
    setIsRecurring(false);
    setRecurrenceStart("");
    setRecurrenceEnd("");
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleSaveExpense = async () => {
    if (isEditing) {
      try {
        setLoading(true);

        const updateData = {
          description: editingExpense.description,
          amount: parseFloat(editingExpense.amount),
          category: editingExpense.category,
        };

        await axios.patch(
          `/api/agency-expenses-month/${editingExpense.id}/`,
          updateData
        );

        setOpenDialog(false);
        await fetchMonthlyExpenses();
        await updateYearlyTotal();
        await fetchYearlyCategoryTotals();
        setIsEditing(false);
        setEditingExpense(null);
      } catch (error) {
        console.error("Erreur lors de la modification:", error);
        alert("Erreur lors de la modification de la dépense");
      } finally {
        setLoading(false);
      }
    } else {
      handleAddExpense();
    }
  };

  const handleCloseRecurrence = async () => {
    const targetId =
      editingExpense?.recurrence_parent || editingExpense?.id || null;
    if (!targetId) {
      alert("Aucune récurrence associée à cette dépense.");
      return;
    }
    try {
      setLoading(true);
      // Normaliser au premier du mois sans problème de fuseau horaire
      const stopDate = `${editingExpense.year}-${String(editingExpense.month).padStart(2, "0")}-01`;
      await axios.post(
        `/api/agency-expenses-month/${targetId}/close_at_month/`,
        {
          stop_date: stopDate,
        }
      );
      setOpenDialog(false);
      setIsEditing(false);
      setEditingExpense(null);
      await fetchMonthlyExpenses();
      await updateYearlyTotal();
      await fetchYearlyCategoryTotals();
    } catch (error) {
      console.error("Erreur lors de l'arrêt de la récurrence:", error);
      alert("Erreur lors de l'arrêt de la récurrence");
    } finally {
      setLoading(false);
    }
  };

  const sumMontantPlanningAgent = (d) =>
    Number(d.montant_normal || 0) +
    Number(d.montant_samedi || 0) +
    Number(d.montant_dimanche || 0) +
    Number(d.montant_ferie || 0) +
    Number(d.montant_overtime || 0);

  const sumHeuresPlanningAgent = (d) =>
    Number(d.heures_normal || 0) +
    Number(d.heures_samedi || 0) +
    Number(d.heures_dimanche || 0) +
    Number(d.heures_ferie || 0) +
    Number(d.heures_overtime || 0);

  /** Même règle que LaborCostsSummary (Résumé des heures) : journalier → jours (÷8), horaire → h */
  const formatHeuresCommeResume = (heures, typePaiement) => {
    const h = Number(heures) || 0;
    if (typePaiement === "journalier") {
      const jours = h / 8;
      return jours === 1 ? "1j" : `${jours}j`;
    }
    return `${h.toFixed(2)} h`;
  };

  const planningRowsVirtual = useMemo(() => {
    if (!planningAgence?.details?.length) return [];
    return planningAgence.details.map((row) => ({
      id: `planning-agence-${row.agent_id}`,
      description: `${row.agent_nom} — planning agence (${formatHeuresCommeResume(
        sumHeuresPlanningAgent(row),
        row.type_paiement
      )})`,
      category: "Planning agence",
      amount: sumMontantPlanningAgent(row),
      isPlanningRow: true,
    }));
  }, [planningAgence]);

  const planningRowsFiltered = useMemo(() => {
    return planningRowsVirtual.filter((row) => {
      if (
        filters.description &&
        !row.description.toLowerCase().includes(filters.description.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.category &&
        filters.category !== "Tous" &&
        row.category !== filters.category
      ) {
        return false;
      }
      if (filters.amount) {
        const expenseAmount = String(row.amount);
        const filterAmount = filters.amount;
        if (!expenseAmount.includes(filterAmount.toString())) return false;
      }
      return true;
    });
  }, [planningRowsVirtual, filters]);

  const tableRowsCombined = useMemo(
    () => [...expenses, ...planningRowsFiltered],
    [expenses, planningRowsFiltered]
  );

  /** Catégories avec montant annuel > 0, ordre fixe puis catégories « extra » triées */
  const yearlyCategoryDisplayRows = useMemo(() => {
    const rows = [];
    const seen = new Set();
    for (const cat of categoriesWithPlanning) {
      const total = Number(yearlyCategoryTotals[cat]) || 0;
      if (total > 0) {
        rows.push({ cat, total });
        seen.add(cat);
      }
    }
    Object.keys(yearlyCategoryTotals)
      .filter((k) => !seen.has(k))
      .sort((a, b) => a.localeCompare(b, "fr"))
      .forEach((cat) => {
        const total = Number(yearlyCategoryTotals[cat]) || 0;
        if (total > 0) rows.push({ cat, total });
      });
    return rows;
  }, [yearlyCategoryTotals]);

  const calculateMonthlyTotal = () => {
    return tableRowsCombined.reduce((total, row) => {
      return total + parseFloat(row.amount || 0);
    }, 0);
  };

  const calculateYearlyTotal = async () => {
    if (!selectedYear) return 0;

    try {
      const monthlyTotals = await Promise.all(
        Array.from({ length: 12 }, async (_, monthIndex) => {
          const m = monthIndex + 1;
          const monthStr = `${selectedYear}-${String(m).padStart(2, "0")}`;
          try {
            const [expRes, planRes] = await Promise.all([
              axios.get(
                `/api/agency-expenses-month/monthly_summary/?month=${m}&year=${selectedYear}`
              ),
              axios
                .get(
                  `/api/schedule/monthly_summary/?month=${encodeURIComponent(monthStr)}&agence=1`
                )
                .catch(() => ({ data: {} })),
            ]);
            const depenses = Number(expRes.data?.total) || 0;
            const planning = Number(planRes.data?.total_montant) || 0;
            return depenses + planning;
          } catch (error) {
            console.error(`Erreur pour le mois ${m}:`, error);
            return 0;
          }
        })
      );

      return monthlyTotals.reduce((sum, monthTotal) => sum + monthTotal, 0);
    } catch (error) {
      console.error("Erreur lors du calcul du total annuel:", error);
      return 0;
    }
  };

  const getExpenseCommentaire = (expense) => {
    if (expense.category === "Prime" && expense.description) {
      const parts = expense.description.split(" - ");
      if (parts.length >= 3) {
        let description = parts.slice(2).join(" - ");
        description = description
          .replace(/\s*\[(PRIME_)?ID:\d+\]\s*$/g, "")
          .trim();
        return description || "-";
      }
    }
    return "-";
  };

  const getExpenseDescriptionCourte = (expense) => {
    if (expense.category === "Prime" && expense.description) {
      const parts = expense.description.split(" - ");
      if (parts.length >= 2) {
        return `${parts[0]} - ${parts[1]}`;
      }
    }
    return expense.description;
  };

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);

    const filtered = originalExpenses.filter((expense) => {
      if (
        newFilters.description &&
        !expense.description
          .toLowerCase()
          .includes(newFilters.description.toLowerCase())
      ) {
        return false;
      }

      if (
        newFilters.category &&
        newFilters.category !== "Tous" &&
        expense.category !== newFilters.category
      ) {
        return false;
      }

      if (newFilters.amount) {
        const expenseAmount = expense.amount;
        const filterAmount = newFilters.amount;
        return expenseAmount.toString().includes(filterAmount.toString());
      }

      return true;
    });

    setExpenses(filtered);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography sx={{ fontWeight: "bold", color: "white" }} variant="h5">
          Dépenses de l'Agence (Système Mensuel)
        </Typography>
        <Button variant="contained" onClick={() => setOpenDialog(true)}>
          Ajouter une dépense
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          sx={{
            minWidth: 150,
            backgroundColor: "rgba(27, 120, 188, 1)",
            color: "white",
            "& .MuiSvgIcon-root": {
              color: "white",
            },
          }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <MenuItem key={i} value={i}>
              {new Date(2000, i)
                .toLocaleString("default", { month: "long" })
                .charAt(0)
                .toUpperCase() +
                new Date(2000, i)
                  .toLocaleString("default", { month: "long" })
                  .slice(1)}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          sx={{
            minWidth: 100,
            backgroundColor: "rgba(27, 120, 188, 1)",
            color: "white",
            "& .MuiSvgIcon-root": {
              color: "white",
            },
          }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <MenuItem key={i} value={new Date().getFullYear() - 2 + i}>
              {new Date().getFullYear() - 2 + i}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <FilterCell>
                <StyledTextField
                  size="small"
                  fullWidth
                  value={filters.description}
                  onChange={handleFilterChange("description")}
                  placeholder="Description..."
                />
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  select
                  size="small"
                  fullWidth
                  value={filters.category}
                  onChange={handleFilterChange("category")}
                  sx={{
                    "& .MuiInputBase-input": {
                      textAlign: "center",
                    },
                  }}
                >
                  <MenuItem sx={{ textAlign: "center" }} value="Tous">
                    Tous
                  </MenuItem>
                  {categoriesWithPlanning.map((cat) => (
                    <MenuItem
                      sx={{ textAlign: "center" }}
                      key={cat}
                      value={cat}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </MenuItem>
                  ))}
                </StyledTextField>
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  type="number"
                  size="small"
                  sx={{
                    "& .MuiInputBase-input": {
                      textAlign: "center",
                    },
                  }}
                  fullWidth
                  value={filters.amount}
                  onChange={handleFilterChange("amount")}
                  placeholder="Montant..."
                />
              </FilterCell>
              <FilterCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {tableRowsCombined.map((row, index) => (
              <TableRow
                key={row.id}
                sx={{
                  backgroundColor:
                    row.isPlanningRow
                      ? "rgba(123, 31, 162, 0.06)"
                      : index % 2 === 0
                        ? "#ffffff"
                        : "#f5f5f5",
                  "&:hover": {
                    backgroundColor: "rgba(27, 120, 188, 0.1)",
                  },
                }}
              >
                <TableCell
                  sx={{
                    textAlign: "left",
                    fontWeight: "bold",
                    color: row.isPlanningRow ? "#6a1b9a" : "rgba(27, 120, 188, 1)",
                  }}
                >
                  {row.isPlanningRow
                    ? row.description
                    : getExpenseDescriptionCourte(row)}
                </TableCell>
                <TableCell align="center">{row.category}</TableCell>
                <TableCell align="center">
                  {parseFloat(row.amount).toFixed(2)} €
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {row.isPlanningRow ? (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#666",
                          fontStyle: "italic",
                          padding: "8px",
                        }}
                      >
                        Planning hebdo
                      </Typography>
                    ) : row.category === "Prime" ? (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#666",
                          fontStyle: "italic",
                          padding: "8px",
                        }}
                      >
                        Gérer via "Gérer les Primes"
                      </Typography>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditExpense(row)}
                          disabled={loading}
                        >
                          <FaEdit />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openDeleteConfirm(row)}
                          disabled={loading}
                        >
                          <FaTrash />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell colSpan={2} sx={{ fontWeight: "bold" }}>
                Total Mensuel
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}
              >
                {calculateMonthlyTotal().toFixed(2)} €
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={2} sx={{ mt: 2, width: "100%" }}>
        {/* Total annuel */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "rgba(27, 120, 188, 0.28)",
            background:
              "linear-gradient(180deg, rgba(27, 120, 188, 0.1) 0%, #ffffff 50%)",
          }}
        >
          <Box
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 2,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 1,
                  color: "text.secondary",
                  fontWeight: 600,
                  display: "block",
                }}
              >
                Total annuel
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.35 }}>
                Dépenses saisies + planning agence (12 mois)
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Typography
                variant="h4"
                component="span"
                sx={{
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  color: "rgba(27, 120, 188, 1)",
                  lineHeight: 1.15,
                }}
              >
                {yearlyTotal.toFixed(2)} €
              </Typography>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.35,
                  borderRadius: 1,
                  bgcolor: "rgba(27, 120, 188, 0.14)",
                  border: "1px solid rgba(27, 120, 188, 0.3)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)" }}
                >
                  {selectedYear}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Coûts annuels par catégorie (12 mois + planning agence) */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "rgba(27, 120, 188, 0.2)",
            background:
              "linear-gradient(145deg, rgba(27, 120, 188, 0.06) 0%, #fff 42%, #fafbfc 100%)",
            maxWidth: 640,
          }}
        >
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: "1px solid rgba(27, 120, 188, 0.12)",
            background: "rgba(27, 120, 188, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)", letterSpacing: 0.2 }}
            >
              Coût annuel par catégorie
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.35 }}>
              Synthèse sur les 12 mois (dépenses saisies + planning agence)
            </Typography>
          </Box>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: "rgba(27, 120, 188, 0.12)",
              border: "1px solid rgba(27, 120, 188, 0.25)",
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)", letterSpacing: 0.5 }}
            >
              {selectedYear}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          {yearlyCategoryLoading ? (
            <Typography color="text.secondary" sx={{ py: 1 }}>
              Chargement…
            </Typography>
          ) : yearlyCategoryDisplayRows.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ py: 1.5, fontStyle: "italic" }}
            >
              Aucune dépense pour cette année (toutes les catégories sont à 0 €).
            </Typography>
          ) : (
            <Stack spacing={0}>
              {yearlyCategoryDisplayRows.map(({ cat, total }, index) => (
                <Box
                  key={cat}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    py: 1.35,
                    px: 1.5,
                    borderRadius: 1,
                    transition: "background-color 0.15s ease",
                    borderBottom:
                      index < yearlyCategoryDisplayRows.length - 1
                        ? "1px solid rgba(0, 0, 0, 0.06)"
                        : "none",
                    "&:hover": {
                      backgroundColor: "rgba(27, 120, 188, 0.06)",
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "text.primary",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: "rgba(27, 120, 188, 1)",
                      whiteSpace: "nowrap",
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: "rgba(27, 120, 188, 0.08)",
                    }}
                  >
                    {total.toFixed(2)} €
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Paper>
      </Stack>

      {/* Dialog pour ajouter/modifier une dépense */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {isEditing
            ? "Modifier la dépense"
            : "Ajouter une nouvelle dépense"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              label="Description"
              value={
                isEditing ? editingExpense.description : newExpense.description
              }
              onChange={(e) =>
                isEditing
                  ? setEditingExpense({
                      ...editingExpense,
                      description: e.target.value,
                    })
                  : setNewExpense({
                      ...newExpense,
                      description: e.target.value,
                    })
              }
              fullWidth
            />
            <Select
              value={isEditing ? editingExpense.category : newExpense.category}
              onChange={(e) =>
                isEditing
                  ? setEditingExpense({
                      ...editingExpense,
                      category: e.target.value,
                    })
                  : setNewExpense({ ...newExpense, category: e.target.value })
              }
              fullWidth
              label="Catégorie"
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label="Montant"
              type="number"
              value={isEditing ? editingExpense.amount : newExpense.amount}
              onChange={(e) =>
                isEditing
                  ? setEditingExpense({
                      ...editingExpense,
                      amount: e.target.value,
                    })
                  : setNewExpense({ ...newExpense, amount: e.target.value })
              }
              fullWidth
              inputProps={{ step: "0.01", min: "0" }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  disabled={isEditing}
                />
              }
              label="Dépense récurrente"
            />
            <TextField
              label="Date de début"
              type="date"
              disabled={isEditing}
              value={
                isEditing
                  ? `${editingExpense.year}-${String(editingExpense.month).padStart(2, "0")}-01`
                  : recurrenceStart ||
                    `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`
              }
              onChange={(e) => setRecurrenceStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Date de fin (optionnelle)"
              type="date"
              disabled={isEditing}
              value={
                isEditing
                  ? editingExpense.recurrence_end || ""
                  : recurrenceEnd
              }
              onChange={(e) => setRecurrenceEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenDialog(false);
              setIsEditing(false);
              setEditingExpense(null);
              setIsRecurring(false);
              setRecurrenceStart("");
              setRecurrenceEnd("");
            }}
          >
            Annuler
          </Button>
          {isEditing && editingExpense?.recurrence_parent && (
            <Button
              onClick={handleCloseRecurrence}
              color="warning"
              disabled={loading}
            >
              Arrêter la récurrence à ce mois
            </Button>
          )}
          <Button onClick={handleSaveExpense} variant="contained">
            {isEditing ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer cette dépense pour le mois de{" "}
            {new Date(selectedYear, selectedMonth)
              .toLocaleString("default", { month: "long" })
              .charAt(0)
              .toUpperCase() +
              new Date(selectedYear, selectedMonth)
                .toLocaleString("default", { month: "long" })
                .slice(1)}{" "}
            {selectedYear} ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Annuler</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AgencyExpenses;
