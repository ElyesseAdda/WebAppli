import {
  Box,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  styled,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { FiEdit } from "react-icons/fi";
import EditStockModal from "./EditStockModal";

// Styles personnalisés pour les cellules d'en-tête
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: "rgba(27, 120, 188, 1)",
  color: "white",
  fontFamily: '"Roboto", sans-serif',
  fontWeight: "bold",
  fontSize: "0.9rem",
}));

// Styles personnalisés pour les lignes du tableau
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: "white",
  },
  "&:nth-of-type(even)": {
    backgroundColor: "#f5f5f5",
  },
  "&:hover": {
    backgroundColor: "#e3f2fd",
  },
  // Style pour toutes les cellules dans les lignes
  "& .MuiTableCell-root": {
    fontFamily: '"Roboto Slab", sans-serif',
  },
}));

const ListeStock = () => {
  const [stocks, setStocks] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [codeRangeFilter, setCodeRangeFilter] = useState(""); // Nouveau filtre par plage de codes
  const [totalItems, setTotalItems] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  // Charger les données
  const fetchStocks = async () => {
    try {
      const response = await axios.get("/api/stock/", {
        params: {
          page: page + 1,
          page_size: rowsPerPage,
        },
      });
      setStocks(response.data.results || response.data);
      setTotalItems(response.data.count || response.data.length);
    } catch (error) {
      console.error("Erreur lors du chargement des stocks:", error);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, [page, rowsPerPage]);

  // Exposer la fonction de rafraîchissement
  useEffect(() => {
    if (window.refreshStockList) {
      window.refreshStockList = fetchStocks;
    }
  }, []);

  // Gestion du changement de page
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Gestion du changement du nombre de lignes par page
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filtrer les stocks en fonction de la recherche et de la plage de codes
  const filteredStocks = stocks.filter((stock) => {
    const searchString = searchTerm.toLowerCase();
    const matchesSearch = (
      (stock.code_produit &&
        stock.code_produit.toLowerCase().includes(searchString)) ||
      (stock.designation &&
        stock.designation.toLowerCase().includes(searchString)) ||
      (stock.fournisseur &&
        stock.fournisseur.toLowerCase().includes(searchString))
    );

    // Nouveau filtre par plage de codes
    const matchesCodeRange = () => {
      if (codeRangeFilter === "") return true;
      
      const code = stock.code_produit || "";
      const isNumeric = /^\d+$/.test(code);
      
      if (!isNumeric && codeRangeFilter === "non-numeric") return true;
      if (!isNumeric) return false;
      
      const codeNum = parseInt(code);
      
      switch (codeRangeFilter) {
        case "0-99":
          return codeNum >= 0 && codeNum <= 99;
        case "100-199":
          return codeNum >= 100 && codeNum <= 199;
        case "200-299":
          return codeNum >= 200 && codeNum <= 299;
        case "300-399":
          return codeNum >= 300 && codeNum <= 399;
        case "400-499":
          return codeNum >= 400 && codeNum <= 499;
        case "500+":
          return codeNum >= 500;
        default:
          return true;
      }
    };

    return matchesSearch && matchesCodeRange();
  });

  // Gestion de la modification d'un stock
  const handleEdit = (stock) => {
    setSelectedStock(stock);
    setEditModalOpen(true);
  };

  // Ajoutez cette fonction pour gérer la mise à jour
  const handleStockUpdate = (updatedStock) => {
    setStocks((prevStocks) =>
      prevStocks.map((stock) =>
        stock.id === updatedStock.id ? updatedStock : stock
      )
    );
  };

  return (
    <Box sx={{ maxWidth: "1430px", width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          alignItems: "center",
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          sx={{
            fontFamily: '"Roboto", sans-serif',
            color: "white",
            fontWeight: "bold",
          }}
        >
          Liste des Stocks
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            label="Rechercher"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              width: 250,
              "& .MuiInputLabel-root": {
                fontFamily: '"Roboto", sans-serif',
              },
              "& .MuiInputBase-root": {
                fontFamily: '"Roboto Slab", sans-serif',
              },
            }}
          />
          <TextField
            select
            label="Plage de codes"
            variant="outlined"
            size="small"
            value={codeRangeFilter}
            onChange={(e) => setCodeRangeFilter(e.target.value)}
            sx={{
              width: 150,
              "& .MuiInputLabel-root": {
                fontFamily: '"Roboto", sans-serif',
              },
              "& .MuiInputBase-root": {
                fontFamily: '"Roboto Slab", sans-serif',
              },
            }}
          >
            <MenuItem value="">Tous les codes</MenuItem>
            <MenuItem value="0-99">0-99</MenuItem>
            <MenuItem value="100-199">100-199</MenuItem>
            <MenuItem value="200-299">200-299</MenuItem>
            <MenuItem value="300-399">300-399</MenuItem>
            <MenuItem value="400-499">400-499</MenuItem>
            <MenuItem value="500+">500+</MenuItem>
            <MenuItem value="non-numeric">Non-numérique</MenuItem>
          </TextField>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="dense table">
          <TableHead>
            <TableRow>
              <StyledTableCell>Code Produit</StyledTableCell>
              <StyledTableCell>Nom du Matériel</StyledTableCell>
              <StyledTableCell>Fournisseur</StyledTableCell>

              <StyledTableCell align="right">Prix Unitaire</StyledTableCell>
              <StyledTableCell align="center">Modifier</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStocks.map((stock) => (
              <StyledTableRow key={stock.id}>
                <TableCell sx={{ fontWeight: "bold" }}>
                  {stock.code_produit}
                </TableCell>
                <TableCell>{stock.designation}</TableCell>
                <TableCell>{stock.fournisseur || "N/A"}</TableCell>

                <TableCell align="right">{stock.prix_unitaire} €</TableCell>
                <TableCell align="center">
                  <Tooltip title="Modifier">
                    <IconButton size="small" onClick={() => handleEdit(stock)}>
                      <FiEdit
                        style={{
                          fontSize: "1.1rem",
                          color: "rgba(27, 120, 188, 1)",
                        }}
                      />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={totalItems}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Lignes par page"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} sur ${count}`
        }
        sx={{
          fontFamily: '"Roboto Slab", sans-serif',
          "& .MuiToolbar-root": {
            fontFamily: '"Roboto Slab", sans-serif',
          },
        }}
      />

      <EditStockModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        stock={selectedStock}
        onUpdate={handleStockUpdate}
      />
    </Box>
  );
};

export default ListeStock;
