import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Card,
} from "@mui/material";
import { MdArrowBack, MdCheck, MdExpandLess, MdExpandMore, MdClose } from "react-icons/md";

const REAPPRO_STORAGE_KEY = "myp3000_reappro_en_cours";

const saveReapproToStorage = (distributeurId, sessionId) => {
  try {
    localStorage.setItem(
      REAPPRO_STORAGE_KEY,
      JSON.stringify({ distributeurId, sessionId })
    );
  } catch (e) {
    console.warn("localStorage save failed", e);
  }
};

const clearReapproFromStorage = () => {
  try {
    localStorage.removeItem(REAPPRO_STORAGE_KEY);
  } catch (e) {
    console.warn("localStorage clear failed", e);
  }
};

export function getReapproFromStorage() {
  try {
    const raw = localStorage.getItem(REAPPRO_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

const MouvementReapproPage = ({
  distributeur,
  sessionId,
  onClose,
  onTerminer,
}) => {
  const [cells, setCells] = useState({});
  const [session, setSession] = useState(null);
  const [openQuantiteDialog, setOpenQuantiteDialog] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedRowCol, setSelectedRowCol] = useState({ row: null, col: null });
  const [quantite, setQuantite] = useState("");
  const [loading, setLoading] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [resumeReduit, setResumeReduit] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, error: null, insuffisant: [] });
  const [confirmAnnuler, setConfirmAnnuler] = useState(false);
  const [annulating, setAnnulating] = useState(false);

  const rows = distributeur?.grid_rows || 3;
  const columns =
    distributeur?.grid_columns && distributeur.grid_columns.length > 0
      ? distributeur.grid_columns
      : Array(rows).fill(4);

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

  const fetchSession = async () => {
    if (!sessionId) return;
    try {
      const response = await axios.get(
        `/api/distributeur-reappro-sessions/${sessionId}/`
      );
      setSession(response.data);
    } catch (error) {
      console.error("Erreur chargement session:", error);
    }
  };

  useEffect(() => {
    fetchCells();
  }, [distributeur?.id]);

  useEffect(() => {
    if (sessionId) fetchSession();
  }, [sessionId]);

  useEffect(() => {
    if (sessionId && distributeur?.id) {
      saveReapproToStorage(distributeur.id, sessionId);
    }
  }, [sessionId, distributeur?.id]);

  const handleCellClick = (rowIndex, colIndex) => {
    const key = `${rowIndex}_${colIndex}`;
    const cell = cells[key] || null;
    if (!cell) return;
    setSelectedCell(cell);
    setSelectedRowCol({ row: rowIndex, col: colIndex });
    const existing = session?.lignes?.find((l) => l.cell === cell.id);
    setQuantite(existing ? String(existing.quantite) : "");
    setOpenQuantiteDialog(true);
  };

  const handleConfirmQuantite = async () => {
    if (!selectedCell || !quantite || parseInt(quantite, 10) <= 0) {
      alert("Veuillez entrer une quantité valide");
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `/api/distributeur-reappro-sessions/${sessionId}/add-ligne/`,
        { cell_id: selectedCell.id, quantite: parseInt(quantite, 10) }
      );
      setOpenQuantiteDialog(false);
      setSelectedCell(null);
      setQuantite("");
      await fetchSession();
    } catch (error) {
      console.error("Erreur ajout ligne:", error);
      alert(
        error.response?.data?.error ||
          "Erreur lors de l'ajout. Vérifiez que la case appartient au distributeur."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTerminer = async () => {
    setTerminating(true);
    try {
      await axios.post(
        `/api/distributeur-reappro-sessions/${sessionId}/terminer/`
      );
      if (onTerminer) onTerminer();
      onClose();
    } catch (error) {
      console.error("Erreur terminaison mouvement:", error);
      const data = error.response?.data;
      if (data?.insuffisant && Array.isArray(data.insuffisant)) {
        setErrorModal({
          open: true,
          error: data.error || "Stock insuffisant.",
          insuffisant: data.insuffisant,
        });
      } else {
        setErrorModal({
          open: true,
          error: data?.error || "Erreur lors de l'enregistrement",
          insuffisant: [],
        });
      }
    } finally {
      setTerminating(false);
    }
  };

  const handleAnnulerMouvement = async () => {
    setConfirmAnnuler(false);
    setAnnulating(true);
    try {
      await axios.delete(
        `/api/distributeur-reappro-sessions/${sessionId}/`
      );
      clearReapproFromStorage();
      onClose();
    } catch (error) {
      console.error("Erreur annulation mouvement:", error);
      setErrorModal({
        open: true,
        error: error.response?.data?.detail || error.response?.data?.error || "Erreur lors de l'annulation du mouvement.",
        insuffisant: [],
      });
    } finally {
      setAnnulating(false);
    }
  };

  const lignes = session?.lignes || [];
  const totalUnites = session?.total_unites ?? 0;
  const totalMontant = session?.total_montant ?? 0;

  // Réserve pour la navbar horizontale (hauteur barre + marge)
  const NAVBAR_RESERVE = 110;

  return (
    <Box
      sx={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        pb: `${NAVBAR_RESERVE}px`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <IconButton onClick={onClose} size="medium" sx={{ borderRadius: "12px" }}>
          <MdArrowBack size={24} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Réapprovisionnement
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {distributeur?.nom} — Cliquez sur une case pour définir les unités ajoutées
          </Typography>
        </Box>
      </Box>

      {/* Grille des cases */}
      <Paper
        elevation={0}
        sx={{
          m: 2,
          p: 2,
          borderRadius: "24px",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: "text.secondary" }}>
          Plan du distributeur — sélectionnez une case
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            p: 1.5,
            bgcolor: "grey.50",
            borderRadius: "16px",
            border: "1px solid",
            borderColor: "grey.200",
          }}
        >
          {Array.from({ length: rows }).map((_, rowIndex) => {
            const colsInRow = columns[rowIndex] || 4;
            const cellStyle = {
              minHeight: colsInRow <= 4 ? 72 : 60,
              fontSize: colsInRow <= 4 ? "0.75rem" : "0.65rem",
            };
            return (
              <Box key={rowIndex} sx={{ display: "flex", gap: 1 }}>
                {Array.from({ length: colsInRow }).map((_, colIndex) => {
                  const cellKey = `${rowIndex}_${colIndex}`;
                  const cell = cells[cellKey];
                  const hasContent = cell && (cell.nom_produit || cell.image_display_url || cell.image_url);
                  const ligneForCell = lignes.find((l) => l.cell === cell?.id);
                  const quantiteInLigne = ligneForCell?.quantite ?? 0;
                  return (
                    <Box
                      key={colIndex}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      sx={{
                        flex: 1,
                        aspectRatio: "1",
                        bgcolor: hasContent ? "grey.50" : "background.paper",
                        borderRadius: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid",
                        borderColor: quantiteInLigne > 0 ? "success.main" : hasContent ? "grey.300" : "divider",
                        minHeight: cellStyle.minHeight,
                        maxHeight: cellStyle.minHeight,
                        position: "relative",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:active": { transform: "scale(0.96)" },
                      }}
                    >
                      {quantiteInLigne > 0 && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            bgcolor: "success.main",
                            color: "white",
                            borderRadius: "8px",
                            px: 0.75,
                            py: 0.25,
                            fontSize: "0.65rem",
                            fontWeight: 800,
                          }}
                        >
                          +{quantiteInLigne}
                        </Box>
                      )}
                      {cell?.image_display_url || cell?.image_url ? (
                        <img
                          src={cell.image_display_url || cell.image_url}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            padding: 4,
                          }}
                        />
                      ) : cell?.nom_produit ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.primary",
                            fontWeight: 800,
                            fontSize: cellStyle.fontSize,
                            textAlign: "center",
                            px: 0.5,
                          }}
                        >
                          {cell.initiales ||
                            cell.nom_produit
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ opacity: 0.4, fontSize: cellStyle.fontSize }}>
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
      </Paper>

      {/* Résumé du mouvement — réductible */}
      <Paper
        elevation={0}
        sx={{
          m: 2,
          borderRadius: "20px",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        <Box
          onClick={() => setResumeReduit((r) => !r)}
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary" }}>
            Résumé du mouvement
            {lignes.length > 0 && (
              <Typography component="span" variant="body2" sx={{ ml: 1, color: "text.primary", fontWeight: 600 }}>
                — {totalUnites} u. · CA {Number(totalMontant).toFixed(2)} €
                {session?.total_benefice != null && (
                  <Typography component="span" variant="body2" sx={{ ml: 0.5, color: "success.main", fontWeight: 700 }}>
                    · Bénéfice {Number(session.total_benefice).toFixed(2)} €
                  </Typography>
                )}
              </Typography>
            )}
          </Typography>
          <IconButton size="small" sx={{ borderRadius: "10px" }} aria-label={resumeReduit ? "Développer" : "Réduire"}>
            {resumeReduit ? <MdExpandMore size={24} /> : <MdExpandLess size={24} />}
          </IconButton>
        </Box>
        {!resumeReduit && (
          <Box sx={{ px: 2, pb: 2 }}>
            {lignes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                Aucune case renseignée. Cliquez sur les cases pour ajouter les unités.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
                {lignes.map((ligne) => (
                  <Card
                    key={ligne.id}
                    elevation={0}
                    sx={{
                      borderRadius: "16px",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                    }}
                  >
                    <Box sx={{ p: 1.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {ligne.cell_nom_produit || `Case L${ligne.cell_row + 1}C${ligne.cell_col + 1}`}
                        </Typography>
                        <Box sx={{ 
                          px: 1, 
                          py: 0.3, 
                          borderRadius: "8px", 
                          bgcolor: "grey.100", 
                          color: "grey.900",
                          border: "1px solid",
                          borderColor: "divider"
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 900 }}>
                            {ligne.quantite}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                          {Number(ligne.prix_vente).toFixed(2)} €/u
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main" }}>
                          Total: {Number(ligne.montant_total).toFixed(2)} €
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
                
                <Box sx={{ 
                  mt: 1, 
                  p: 2, 
                  borderRadius: "16px", 
                  bgcolor: "primary.main", 
                  color: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700 }}>TOTAL RÉAPPRO</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{Number(totalMontant).toFixed(2)} €</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700 }}>UNITÉS</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{totalUnites}</Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Terminer / Annuler le mouvement */}
      <Box sx={{ px: 2, pt: 1, pb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<MdCheck size={22} />}
          onClick={handleTerminer}
          disabled={terminating}
          sx={{
            minHeight: 52,
            fontSize: "1rem",
            fontWeight: 700,
            borderRadius: "14px",
            textTransform: "none",
          }}
        >
          {terminating ? "Enregistrement…" : "Terminer et enregistrer le mouvement"}
        </Button>
        <Button
          variant="outlined"
          color="error"
          fullWidth
          startIcon={<MdClose size={20} />}
          onClick={() => setConfirmAnnuler(true)}
          disabled={terminating || annulating}
          sx={{
            minHeight: 44,
            borderRadius: "14px",
            textTransform: "none",
          }}
        >
          Annuler ce mouvement
        </Button>
      </Box>

      {/* Confirmation annulation mouvement */}
      <Dialog
        open={confirmAnnuler}
        onClose={() => setConfirmAnnuler(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Annuler ce mouvement ?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Les données saisies seront perdues et le mouvement sera supprimé. Vous pourrez en créer un nouveau plus tard.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmAnnuler(false)}>Non, garder</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleAnnulerMouvement}
            disabled={annulating}
          >
            {annulating ? "…" : "Oui, annuler"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog quantité */}
      <Dialog
        open={openQuantiteDialog}
        onClose={() => setOpenQuantiteDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Unités ajoutées — {selectedCell?.nom_produit || `L${(selectedRowCol.row ?? 0) + 1}C${(selectedRowCol.col ?? 0) + 1}`}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Nombre d'unités"
            type="number"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            inputProps={{ min: 1 }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenQuantiteDialog(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleConfirmQuantite}
            disabled={loading || !quantite || parseInt(quantite, 10) <= 0}
          >
            {loading ? "…" : "Valider"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal d'erreur (stock insuffisant) */}
      <Dialog
        open={errorModal.open}
        onClose={() => setErrorModal((e) => ({ ...e, open: false }))}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "error.main" }}>
          Stock insuffisant
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {errorModal.error}
          </Typography>
          {errorModal.insuffisant?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Détail par produit :
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {errorModal.insuffisant.map((i, idx) => (
                  <Typography component="li" key={idx} sx={{ mb: 0.5 }}>
                    <strong>{i.produit}</strong> — demandé : {i.requis}, disponible : {i.disponible}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary">
            Faites un achat (onglet Stock) avant de valider le mouvement.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => setErrorModal((e) => ({ ...e, open: false }))}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MouvementReapproPage;
