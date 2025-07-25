import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FilterCell, StyledTextField } from "../styles/tableStyles";

const ExpenseTypes = {
  FIXED: "fixed",
  PUNCTUAL: "punctual",
};

const AgencyExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    type: ExpenseTypes.FIXED,
    date: new Date(),
    end_date: null,
    category: "Salaire", // Par défaut
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filters, setFilters] = useState({
    description: "",
    category: "Tous",
    type: "Tous",
    date: "",
    end_date: "",
    amount: "",
  });
  const [originalExpenses, setOriginalExpenses] = useState([]);

  // Catégories de dépenses
  const categories = [
    "Salaire",
    "Loyer",
    "Fournitures",
    "Équipement",
    "Assurance",
    "Services",
    "Autres",
  ];

  // Charger les dépenses au montage du composant
  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, selectedYear]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/agency-expenses/monthly_summary/?month=${
          selectedMonth + 1
        }&year=${selectedYear}`
      );
      const fetchedExpenses = response.data.expenses || [];
      setOriginalExpenses(fetchedExpenses); // Stockez les dépenses originales
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error("Erreur lors du chargement des dépenses:", error);
      alert("Erreur lors du chargement des dépenses");
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
      const expenseData = {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date.toISOString().split("T")[0],
        end_date: newExpense.end_date
          ? newExpense.end_date.toISOString().split("T")[0]
          : null,
      };

      await axios.post("/api/agency-expenses/", expenseData);
      setOpenDialog(false);
      fetchExpenses();

      setNewExpense({
        description: "",
        amount: "",
        type: ExpenseTypes.FIXED,
        date: new Date(),
        end_date: null,
        category: "salaire",
      });
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
      await axios.delete(`/api/agency-expenses/${id}/`);
      fetchExpenses(); // Recharger les dépenses
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression de la dépense");
    } finally {
      setLoading(false);
    }
  };

  const handleEditExpense = (expense) => {
    // Préparer les données d'édition avec les valeurs actuelles ou modifiées
    const currentDescription = expense.current_override
      ? expense.current_override.description
      : expense.description;
    const currentAmount = expense.current_override
      ? expense.current_override.amount
      : expense.amount;

    setEditingExpense({
      ...expense,
      monthlyOverride: {
        description: currentDescription,
        amount: currentAmount,
        month: selectedMonth + 1,
        year: selectedYear,
      },
    });
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleSaveExpense = async () => {
    if (isEditing) {
      try {
        setLoading(true);
        const overrideData = {
          description: editingExpense.monthlyOverride.description,
          amount: parseFloat(editingExpense.monthlyOverride.amount),
          month: selectedMonth + 1,
          year: selectedYear,
        };

        await axios.post(
          `/api/agency-expenses/${editingExpense.id}/monthly_override/`,
          overrideData
        );
        setOpenDialog(false);
        fetchExpenses();
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

  const calculateMonthlyTotal = () => {
    return expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        const targetDate = new Date(selectedYear, selectedMonth);

        // Pour les dépenses fixes, vérifier si la date de début est avant ou égale au mois sélectionné
        if (expense.type === ExpenseTypes.FIXED) {
          const startDate = new Date(expense.date);
          const endDate = expense.end_date ? new Date(expense.end_date) : null;

          return startDate <= targetDate && (!endDate || endDate >= targetDate);
        }

        // Pour les dépenses ponctuelles, vérifier le mois exact
        return (
          expenseDate.getMonth() === selectedMonth &&
          expenseDate.getFullYear() === selectedYear
        );
      })
      .reduce((total, expense) => {
        const amount = expense.current_override
          ? expense.current_override.amount
          : expense.amount;
        return total + parseFloat(amount);
      }, 0);
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

      if (
        newFilters.type &&
        newFilters.type !== "Tous" &&
        expense.type !== newFilters.type
      ) {
        return false;
      }

      if (newFilters.date) {
        const filterDate = new Date(newFilters.date)
          .toISOString()
          .split("T")[0];
        const expenseDate = new Date(expense.date).toISOString().split("T")[0];
        if (filterDate !== expenseDate) {
          return false;
        }
      }

      if (newFilters.end_date && expense.end_date) {
        const filterEndDate = new Date(newFilters.end_date)
          .toISOString()
          .split("T")[0];
        const expenseEndDate = new Date(expense.end_date)
          .toISOString()
          .split("T")[0];
        if (filterEndDate !== expenseEndDate) {
          return false;
        }
      }

      if (newFilters.amount) {
        const expenseAmount = expense.current_override
          ? expense.current_override.amount
          : expense.amount;
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
          Dépenses de l'Agence
        </Typography>
        <Button variant="contained" onClick={() => setOpenDialog(true)}>
          Ajouter une dépense
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
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
          onChange={(e) => setSelectedYear(e.target.value)}
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
                  {categories.map((cat) => (
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
                  select
                  size="small"
                  fullWidth
                  value={filters.type}
                  sx={{
                    "& .MuiInputBase-input": {
                      textAlign: "center",
                    },
                  }}
                  onChange={handleFilterChange("type")}
                >
                  <MenuItem sx={{ textAlign: "center" }} value="Tous">
                    Tous
                  </MenuItem>
                  <MenuItem
                    sx={{ textAlign: "center" }}
                    value={ExpenseTypes.FIXED}
                  >
                    Mensuel fixe
                  </MenuItem>
                  <MenuItem
                    sx={{ textAlign: "center" }}
                    value={ExpenseTypes.PUNCTUAL}
                  >
                    Ponctuel
                  </MenuItem>
                </StyledTextField>
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  type="date"
                  size="small"
                  sx={{
                    "& .MuiInputBase-input": {
                      textAlign: "center",
                    },
                  }}
                  fullWidth
                  value={filters.date}
                  onChange={handleFilterChange("date")}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  type="date"
                  size="small"
                  sx={{
                    "& .MuiInputBase-input": {
                      textAlign: "center",
                    },
                  }}
                  fullWidth
                  value={filters.end_date}
                  onChange={handleFilterChange("end_date")}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
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
            {expenses
              .filter((expense) => {
                const expenseDate = new Date(expense.date);
                const targetDate = new Date(selectedYear, selectedMonth);

                // Pour les dépenses fixes, vérifier si la date de début est avant ou égale au mois sélectionné
                if (expense.type === ExpenseTypes.FIXED) {
                  const startDate = new Date(expense.date);
                  const endDate = expense.end_date
                    ? new Date(expense.end_date)
                    : null;

                  return (
                    startDate <= targetDate &&
                    (!endDate || endDate >= targetDate)
                  );
                }

                // Pour les dépenses ponctuelles, vérifier le mois exact
                return (
                  expenseDate.getMonth() === selectedMonth &&
                  expenseDate.getFullYear() === selectedYear
                );
              })
              .map((expense, index) => (
                <TableRow
                  key={expense.id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f5f5f5",
                    "&:hover": {
                      backgroundColor: "rgba(27, 120, 188, 0.1)",
                    },
                  }}
                >
                  <TableCell
                    sx={{
                      textAlign: "left",
                      fontWeight: "bold",
                      color: "rgba(27, 120, 188, 1)",
                    }}
                  >
                    {expense.current_override
                      ? expense.current_override.description
                      : expense.description}
                  </TableCell>
                  <TableCell align="center">{expense.category}</TableCell>
                  <TableCell align="center">
                    {expense.type === ExpenseTypes.FIXED
                      ? "Mensuel"
                      : "Ponctuel"}
                  </TableCell>
                  <TableCell align="center">
                    {new Date(expense.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    {expense.end_date
                      ? new Date(expense.end_date).toLocaleDateString()
                      : expense.type === ExpenseTypes.FIXED
                      ? "Indéfini"
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {parseFloat(
                      expense.current_override
                        ? expense.current_override.amount
                        : expense.amount
                    ).toFixed(2)}{" "}
                    €
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditExpense(expense)}
                        disabled={loading}
                      >
                        <FaEdit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteExpense(expense.id)}
                        disabled={loading}
                      >
                        <FaTrash />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell colSpan={5} sx={{ fontWeight: "bold" }}>
                Total Mensuel
              </TableCell>
              <TableCell
                align="right"
                sx={{ fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}
              >
                {calculateMonthlyTotal().toFixed(2)} €
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog pour ajouter/modifier une dépense */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {isEditing
            ? `Modifier la dépense pour ${new Date(
                selectedYear,
                selectedMonth
              ).toLocaleString("default", { month: "long" })} ${selectedYear}`
            : "Ajouter une nouvelle dépense"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              label="Description"
              value={
                isEditing
                  ? editingExpense.monthlyOverride.description
                  : newExpense.description
              }
              onChange={(e) =>
                isEditing
                  ? setEditingExpense({
                      ...editingExpense,
                      monthlyOverride: {
                        ...editingExpense.monthlyOverride,
                        description: e.target.value,
                      },
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
              disabled={isEditing} // Désactiver le changement de catégorie en mode édition
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
              value={
                isEditing
                  ? editingExpense.monthlyOverride.amount
                  : newExpense.amount
              }
              onChange={(e) =>
                isEditing
                  ? setEditingExpense({
                      ...editingExpense,
                      monthlyOverride: {
                        ...editingExpense.monthlyOverride,
                        amount: e.target.value,
                      },
                    })
                  : setNewExpense({ ...newExpense, amount: e.target.value })
              }
              fullWidth
              InputProps={{
                startAdornment: "€",
              }}
            />
            {/* Les autres champs sont désactivés en mode édition car on ne modifie que pour le mois en cours */}
            {!isEditing && (
              <>
                <Select
                  value={newExpense.type}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, type: e.target.value })
                  }
                  fullWidth
                  label="Type de dépense"
                >
                  <MenuItem value={ExpenseTypes.FIXED}>Mensuel fixe</MenuItem>
                  <MenuItem value={ExpenseTypes.PUNCTUAL}>Ponctuel</MenuItem>
                </Select>
                <TextField
                  label="Date de début"
                  type="date"
                  value={
                    newExpense.date
                      ? new Date(newExpense.date).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      date: new Date(e.target.value),
                    })
                  }
                  fullWidth
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                {newExpense.type === ExpenseTypes.FIXED && (
                  <TextField
                    label="Date de fin (optionnel)"
                    type="date"
                    value={
                      newExpense.end_date
                        ? new Date(newExpense.end_date)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        end_date: e.target.value
                          ? new Date(e.target.value)
                          : null,
                      })
                    }
                    fullWidth
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenDialog(false);
              setIsEditing(false);
              setEditingExpense(null);
            }}
          >
            Annuler
          </Button>
          <Button onClick={handleSaveExpense} variant="contained">
            {isEditing ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AgencyExpenses;
