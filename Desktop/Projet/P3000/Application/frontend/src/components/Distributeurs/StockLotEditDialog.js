import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
} from "@mui/material";
import { MdClose, MdEdit, MdCheck, MdCancel } from "react-icons/md";

/**
 * Dialog pour lister et modifier les lots d'un produit (prix unitaire, quantité restante).
 * Permet de corriger les erreurs (ex: 2€ au lieu de 0,20€).
 */
const StockLotEditDialog = ({ open, onClose, product, onSaved }) => {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingLotId, setEditingLotId] = useState(null);
  const [editPrix, setEditPrix] = useState("");
  const [editQuantite, setEditQuantite] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLots = async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      const response = await axios.get("/api/stock-lots/", {
        params: { produit_id: product.id },
      });
      const data = response.data.results || response.data;
      setLots(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur chargement lots:", error);
      setLots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && product?.id) fetchLots();
    if (!open) {
      setEditingLotId(null);
      setEditPrix("");
      setEditQuantite("");
    }
  }, [open, product?.id]);

  const startEdit = (lot) => {
    setEditingLotId(lot.id);
    setEditPrix(String(lot.prix_achat_unitaire ?? ""));
    setEditQuantite(String(lot.quantite_restante ?? ""));
  };

  const cancelEdit = () => {
    setEditingLotId(null);
    setEditPrix("");
    setEditQuantite("");
  };

  const saveEdit = async () => {
    if (!editingLotId) return;
    const prixNum = parseFloat(String(editPrix).replace(",", "."));
    const qteNum = parseInt(editQuantite, 10);
    if (isNaN(prixNum) || prixNum < 0) {
      return;
    }
    if (isNaN(qteNum) || qteNum < 0) {
      return;
    }
    setSaving(true);
    try {
      await axios.patch(`/api/stock-lots/${editingLotId}/`, {
        prix_achat_unitaire: prixNum,
        quantite_restante: qteNum,
      });
      await fetchLots();
      cancelEdit();
      if (onSaved) onSaved();
    } catch (error) {
      console.error("Erreur mise à jour lot:", error);
      alert(error.response?.data?.detail || error.response?.data?.prix_achat_unitaire?.[0] || "Erreur lors de la mise à jour du lot.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "20px" } }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Lots — {product?.nom || "Produit"}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ borderRadius: "12px" }}>
          <MdClose size={22} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Corrigez le prix unitaire ou la quantité restante en cas d'erreur (ex: 2€ au lieu de 0,20€).
        </Typography>
        {loading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">Chargement…</Typography>
          </Box>
        ) : lots.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">Aucun lot pour ce produit.</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Qté restante</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Prix unitaire (€)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lots.map((lot) => (
                  <TableRow key={lot.id} hover>
                    <TableCell>{formatDate(lot.date_achat)}</TableCell>
                    {editingLotId === lot.id ? (
                      <>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={editQuantite}
                            onChange={(e) => setEditQuantite(e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{ width: 80, "& input": { textAlign: "right" } }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={editPrix}
                            onChange={(e) => setEditPrix(e.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">€</InputAdornment>,
                            }}
                            sx={{ width: 100, "& input": { textAlign: "right" } }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={saveEdit} disabled={saving} sx={{ color: "success.main" }}>
                            <MdCheck size={20} />
                          </IconButton>
                          <IconButton size="small" onClick={cancelEdit} disabled={saving}>
                            <MdCancel size={20} />
                          </IconButton>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell align="right">{lot.quantite_restante}</TableCell>
                        <TableCell align="right">{Number(lot.prix_achat_unitaire).toFixed(2)} €</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => startEdit(lot)} sx={{ color: "primary.main" }}>
                            <MdEdit size={18} />
                          </IconButton>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: "12px" }}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockLotEditDialog;
