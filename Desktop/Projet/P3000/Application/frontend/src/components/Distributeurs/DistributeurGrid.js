import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid as MuiGrid,
  Chip,
} from "@mui/material";
import {
  MdEdit,
  MdAdd,
  MdRemove,
  MdViewModule,
  MdSettings,
} from "react-icons/md";
import CellEditDialog from "./CellEditDialog";

const DistributeurGrid = ({ distributeur, onUpdateGrid }) => {
  const [openConfig, setOpenConfig] = useState(false);
  const [openCellEdit, setOpenCellEdit] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedRowCol, setSelectedRowCol] = useState({ row: null, col: null });
  const [cells, setCells] = useState({}); // { "row_col": cellData }
  const [rows, setRows] = useState(distributeur?.grid_rows || 3);
  const [columns, setColumns] = useState(
    distributeur?.grid_columns && 
    (Array.isArray(distributeur.grid_columns) ? distributeur.grid_columns.length > 0 : Object.keys(distributeur.grid_columns).length > 0)
      ? (Array.isArray(distributeur.grid_columns) ? distributeur.grid_columns : Object.values(distributeur.grid_columns))
      : [4, 4, 4] // Par défaut : 3 lignes de 4 colonnes
  );

  useEffect(() => {
    if (distributeur) {
      setRows(distributeur.grid_rows || 3);
      setColumns(
        distributeur.grid_columns && distributeur.grid_columns.length > 0
          ? distributeur.grid_columns
          : Array(distributeur.grid_rows || 3).fill(4)
      );
      fetchCells();
    }
  }, [distributeur]);

  const fetchCells = async () => {
    if (!distributeur?.id) return;
    try {
      const response = await axios.get("/api/distributeur-cells/", {
        params: { distributeur_id: distributeur.id },
      });
      const cellsMap = {};
      response.data.forEach((cell) => {
        const key = `${cell.row_index}_${cell.col_index}`;
        cellsMap[key] = cell;
      });
      setCells(cellsMap);
    } catch (error) {
      console.error("Erreur chargement cellules:", error);
    }
  };

  const handleCellClick = (rowIndex, colIndex) => {
    const key = `${rowIndex}_${colIndex}`;
    const cell = cells[key] || null;
    setSelectedCell(cell);
    setSelectedRowCol({ row: rowIndex, col: colIndex });
    setOpenCellEdit(true);
  };

  const handleSaveCell = async (cellData) => {
    if (!distributeur?.id) return;
    
    try {
      if (cellData === null) {
        // Cellule supprimée, recharger
        await fetchCells();
        return;
      }

      // S'assurer que les champs null sont bien envoyés comme null et non comme chaînes vides
      const cleanedData = {
        ...cellData,
        nom_produit: cellData.nom_produit && cellData.nom_produit.trim() ? cellData.nom_produit.trim() : null,
        image_url: cellData.image_url && cellData.image_url.trim() ? cellData.image_url.trim() : null,
        image_s3_key: cellData.image_s3_key || null,
        prix_vente: cellData.prix_vente != null && cellData.prix_vente !== "" ? cellData.prix_vente : null,
      };

      if (selectedCell && selectedCell.id) {
        // Mise à jour
        await axios.put(`/api/distributeur-cells/${selectedCell.id}/`, cleanedData);
      } else {
        // Création
        await axios.post("/api/distributeur-cells/", cleanedData);
      }
      await fetchCells();
    } catch (error) {
      console.error("Erreur sauvegarde cellule:", error);
      if (error.response?.data) {
        console.error("Détails de l'erreur:", error.response.data);
        alert(`Erreur: ${JSON.stringify(error.response.data)}`);
      }
    }
  };

  const handleSaveConfig = () => {
    // Ajuster le tableau de colonnes selon le nombre de lignes
    const newColumns = [];
    for (let i = 0; i < rows; i++) {
      newColumns[i] = columns[i] || 4;
    }
    setColumns(newColumns);
    
    if (onUpdateGrid) {
      onUpdateGrid({
        grid_rows: rows,
        grid_columns: newColumns,
      });
    }
    setOpenConfig(false);
  };

  const handleAddRow = () => {
    setRows(rows + 1);
    setColumns([...columns, 4]); // Nouvelle ligne avec 4 colonnes par défaut
  };

  const handleRemoveRow = (index) => {
    if (rows > 1) {
      setRows(rows - 1);
      const newColumns = columns.filter((_, i) => i !== index);
      setColumns(newColumns);
    }
  };

  const handleColumnChange = (index, value) => {
    const numValue = parseInt(value) || 1;
    if (numValue >= 1 && numValue <= 8) {
      const newColumns = [...columns];
      newColumns[index] = numValue;
      setColumns(newColumns);
    }
  };

  // Calculer le nombre total de cellules
  const totalCells = columns.reduce((sum, col) => sum + col, 0);

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: "24px",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                bgcolor: "primary.light",
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdViewModule size={24} />
            </Box>
            <Box>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 800, 
                  fontSize: "1rem",
                  lineHeight: 1.2
                }}
              >
                Plan de distribution
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ color: "text.secondary", fontWeight: 500 }}
              >
                Configuration des casiers
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setOpenConfig(true)}
            sx={{
              bgcolor: "action.hover",
              borderRadius: "14px",
              width: 44,
              height: 44,
              border: "1px solid",
              borderColor: "divider",
              transition: "all 0.2s",
              "&:active": { transform: "scale(0.92)" }
            }}
          >
            <MdSettings size={22} color="#666" />
          </IconButton>
        </Box>

        {/* Affichage de la grille - Design plus physique */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            p: 2,
            bgcolor: "grey.50",
            borderRadius: "20px",
            border: "1px solid",
            borderColor: "grey.200",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          {Array.from({ length: rows }).map((_, rowIndex) => {
            const colsInRow = columns[rowIndex] || 4;
            const getCellSize = () => {
              if (colsInRow <= 3) return { minHeight: 85, fontSize: "0.85rem" };
              if (colsInRow <= 4) return { minHeight: 75, fontSize: "0.75rem" };
              if (colsInRow <= 5) return { minHeight: 65, fontSize: "0.7rem" };
              if (colsInRow <= 6) return { minHeight: 55, fontSize: "0.65rem" };
              return { minHeight: 50, fontSize: "0.6rem" };
            };
            const cellStyle = getCellSize();
            
            return (
              <Box
                key={rowIndex}
                sx={{
                  display: "flex",
                  gap: 1,
                }}
              >
                {Array.from({ length: colsInRow }).map((_, colIndex) => {
                  const cellKey = `${rowIndex}_${colIndex}`;
                  const cell = cells[cellKey];
                  const hasContent = cell && (cell.nom_produit || cell.image_display_url || cell.image_url);
                  
                  return (
                    <Box
                      key={colIndex}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      sx={{
                        flex: 1,
                        aspectRatio: "1",
                        bgcolor: hasContent ? "primary.light" : "background.paper",
                        borderRadius: colsInRow > 5 ? "10px" : "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid",
                        borderColor: hasContent ? "primary.main" : "divider",
                        minHeight: cellStyle.minHeight,
                        maxHeight: cellStyle.minHeight,
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        cursor: "pointer",
                        "&:active": {
                          transform: "scale(0.95)",
                          borderColor: "primary.main",
                          bgcolor: "primary.50",
                        },
                      }}
                    >
                      {/* Petit badge pour le numéro */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 6,
                          left: 6,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          bgcolor: hasContent ? "primary.main" : "action.hover",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: hasContent ? "white" : "text.secondary",
                            fontWeight: 800,
                            fontSize: "0.55rem",
                          }}
                        >
                          {rowIndex * 10 + colIndex + 1}
                        </Typography>
                      </Box>
                      
                      {/* Contenu de la cellule */}
                      {cell?.image_display_url || cell?.image_url ? (
                        <img
                          src={cell.image_display_url || cell.image_url}
                          alt={cell.nom_produit || ""}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            objectPosition: cell.image_position || "center",
                            padding: "6px",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : cell?.nom_produit ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "primary.main",
                            fontWeight: 700,
                            fontSize: cellStyle.fontSize,
                            textAlign: "center",
                            px: 1,
                          }}
                        >
                          {cell.initiales || cell.nom_produit.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                        </Typography>
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.primary",
                            fontWeight: 700,
                            fontSize: cellStyle.fontSize,
                            mt: 1,
                            opacity: 0.3
                          }}
                        >
                          Vide
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
          <Chip 
            label={`${totalCells} Emplacements`} 
            size="small"
            sx={{ 
              fontWeight: 700, 
              bgcolor: "grey.100", 
              color: "grey.700",
              borderRadius: "8px",
              px: 1
            }}
          />
        </Box>
      </Paper>

      {/* Dialog de configuration - Format mobile sheet */}
      <Dialog
        open={openConfig}
        onClose={() => setOpenConfig(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            borderRadius: window.innerWidth < 600 ? "24px 24px 0 0" : "28px",
            maxHeight: "90vh"
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 800, 
          fontSize: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1
        }}>
          Configuration Grille
          <IconButton onClick={() => setOpenConfig(false)} size="small">
            <MdRemove size={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4, pt: 2 }}>
            {/* Nombre de lignes */}
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Nombre de lignes
                </Typography>
                <Chip 
                  label={`${rows} lignes`} 
                  color="primary" 
                  size="small" 
                  sx={{ fontWeight: 700, borderRadius: "8px" }}
                />
              </Box>
              <Box 
                sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 3,
                  bgcolor: "action.hover",
                  p: 1.5,
                  borderRadius: "20px",
                  justifyContent: "center"
                }}
              >
                <IconButton
                  onClick={() => setRows(Math.max(1, rows - 1))}
                  disabled={rows <= 1}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: "14px",
                    width: 52,
                    height: 52,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <MdRemove size={24} />
                </IconButton>
                
                <Typography variant="h4" sx={{ fontWeight: 900, minWidth: 40, textAlign: "center" }}>
                  {rows}
                </Typography>
                
                <IconButton
                  onClick={() => {
                    setRows(Math.min(10, rows + 1));
                    setColumns([...columns, 4]);
                  }}
                  disabled={rows >= 10}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: "14px",
                    width: 52,
                    height: 52,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  <MdAdd size={24} />
                </IconButton>
              </Box>
            </Box>

            {/* Colonnes par ligne */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 800 }}>
                Configuration des colonnes
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {Array.from({ length: rows }).map((_, index) => {
                  const currentCols = columns[index] || 4;
                  return (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 2,
                        borderRadius: "20px",
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                      }}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", minWidth: 80 }}>
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", fontSize: "0.65rem" }}
                        >
                          Ligne
                        </Typography>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 900, fontSize: "1.1rem" }}
                        >
                          {String.fromCharCode(65 + index)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, justifyContent: "flex-end" }}>
                        <IconButton
                          size="small"
                          onClick={() => currentCols > 1 && handleColumnChange(index, currentCols - 1)}
                          disabled={currentCols <= 1}
                          sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px" }}
                        >
                          <MdRemove size={20} />
                        </IconButton>
                        
                        <Box sx={{ minWidth: 40, textAlign: "center" }}>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>{currentCols}</Typography>
                        </Box>
                        
                        <IconButton
                          size="small"
                          onClick={() => currentCols < 8 && handleColumnChange(index, currentCols + 1)}
                          disabled={currentCols >= 8}
                          sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px" }}
                        >
                          <MdAdd size={20} />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            fullWidth
            variant="contained"
            onClick={handleSaveConfig}
            sx={{ 
              minHeight: 56, 
              borderRadius: "18px",
              textTransform: "none",
              fontSize: "1.1rem",
              fontWeight: 800,
              boxShadow: "0 8px 20px rgba(25, 118, 210, 0.3)"
            }}
          >
            Enregistrer le plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'édition de cellule */}
      <CellEditDialog
        open={openCellEdit}
        onClose={() => {
          setOpenCellEdit(false);
          setSelectedCell(null);
        }}
        cell={selectedCell}
        distributeurId={distributeur?.id}
        rowIndex={selectedRowCol.row}
        colIndex={selectedRowCol.col}
        onSave={handleSaveCell}
      />
    </>
  );
};

export default DistributeurGrid;
