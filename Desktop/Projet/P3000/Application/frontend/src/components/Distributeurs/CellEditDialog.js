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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import { MdClose } from "react-icons/md";

const CellEditDialog = ({
  open,
  onClose,
  cell,
  distributeurId,
  rowIndex,
  colIndex,
  onSave,
}) => {
  const [nomProduit, setNomProduit] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePosition, setImagePosition] = useState("center");
  const [prixVente, setPrixVente] = useState("");
  const [stockProductId, setStockProductId] = useState(null);
  const [stockProducts, setStockProducts] = useState([]);
  const [openChangeProductFlow, setOpenChangeProductFlow] = useState(false);
  const [oldRemainingQty, setOldRemainingQty] = useState("");
  const [remainingAction, setRemainingAction] = useState("restock");
  const [previousLevel, setPreviousLevel] = useState(0);
  const [niveauInfo, setNiveauInfo] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState({ open: false, title: "", message: "" });
  const [openDeleteWarning, setOpenDeleteWarning] = useState(false);
  const [emptyMode, setEmptyMode] = useState(false);

  useEffect(() => {
    if (open) {
      axios.get("/api/stock-products/").then((res) => setStockProducts(res.data.results || res.data || [])).catch(() => setStockProducts([]));
    }
  }, [open]);

  useEffect(() => {
    if (cell) {
      setNomProduit(cell.nom_produit || "");
      setImageUrl(cell.image_display_url || cell.image_url || "");
      setImagePosition(cell.image_position || "center");
      setPrixVente(cell.prix_vente != null && cell.prix_vente !== "" ? String(cell.prix_vente) : "");
      setStockProductId(cell.stock_product ?? null);
    } else {
      setNomProduit("");
      setImageUrl("");
      setImagePosition("center");
      setPrixVente("");
      setStockProductId(null);
    }
  }, [cell, open]);

  const handleSave = async () => {
    if (!stockProductId) {
      setFeedbackModal({
        open: true,
        title: "Validation requise",
        message: "Veuillez sélectionner un produit du stock.",
      });
      return;
    }
    const p = stockProducts.find((x) => x.id === stockProductId);
    const hasNom = !!nomProduit.trim();
    const hasImage = !!imageUrl.trim();
    const cellData = {
      distributeur: parseInt(distributeurId),
      row_index: parseInt(rowIndex),
      col_index: parseInt(colIndex),
      nom_produit: hasNom ? nomProduit.trim() : (p ? (p.nom || p.nom_produit) : null),
      image_url: hasImage ? imageUrl.trim() : (p ? (p.image_display_url || p.image_url) : null),
      image_s3_key: null,
      image_position: imagePosition || "center",
      prix_vente: prixVente.trim() !== "" && !isNaN(parseFloat(prixVente)) && parseFloat(prixVente) >= 0
        ? parseFloat(prixVente)
        : null,
      stock_product: stockProductId,
    };
    Object.keys(cellData).forEach(key => {
      if (cellData[key] === null || cellData[key] === "") {
        if (!["nom_produit", "image_url", "image_s3_key", "prix_vente", "stock_product"].includes(key)) {
          delete cellData[key];
        }
      }
    });
    const isRealProductChange =
      cell &&
      cell.id &&
      cell.stock_product != null &&
      stockProductId != null &&
      Number(cell.stock_product) !== Number(stockProductId);

    if (isRealProductChange) {
      try {
        const res = await axios.get(`/api/distributeur-cells/${cell.id}/niveau/`);
        const level = Number(res.data?.previous_level || 0);
        setPreviousLevel(level);
        setNiveauInfo(res.data || null);
        if (level > 0) {
          setOldRemainingQty("");
          setRemainingAction("restock");
          setOpenChangeProductFlow(true);
          return;
        }
      } catch (error) {
        setFeedbackModal({
          open: true,
          title: "Erreur",
          message: "Impossible de lire le stock restant dans cette case.",
        });
        return;
      }
    }

    onSave(cellData);
    onClose();
  };

  const handleConfirmChangeProductFlow = () => {
    const parsedRemaining = parseInt(oldRemainingQty, 10);
    if (isNaN(parsedRemaining) || parsedRemaining < 0) {
      setFeedbackModal({
        open: true,
        title: "Valeur invalide",
        message: "Veuillez saisir une quantité restante valide (0 ou plus).",
      });
      return;
    }
    if (parsedRemaining > previousLevel) {
      setFeedbackModal({
        open: true,
        title: "Valeur invalide",
        message: `Le dernier chargement est de ${previousLevel}. Le reste ne peut pas le dépasser.`,
      });
      return;
    }
    const p = stockProducts.find((x) => x.id === stockProductId);
    const hasNom = !!nomProduit.trim();
    const hasImage = !!imageUrl.trim();
    const cellData = {
      distributeur: parseInt(distributeurId),
      row_index: parseInt(rowIndex),
      col_index: parseInt(colIndex),
      nom_produit: hasNom ? nomProduit.trim() : (p ? (p.nom || p.nom_produit) : null),
      image_url: hasImage ? imageUrl.trim() : (p ? (p.image_display_url || p.image_url) : null),
      image_s3_key: null,
      image_position: imagePosition || "center",
      prix_vente: prixVente.trim() !== "" && !isNaN(parseFloat(prixVente)) && parseFloat(prixVente) >= 0
        ? parseFloat(prixVente)
        : null,
      stock_product: stockProductId,
    };
    onSave(cellData, {
      changeWorkflow: {
        old_remaining_qty: parsedRemaining,
        remaining_action: remainingAction,
      },
    });
    setOpenChangeProductFlow(false);
    onClose();
  };

  const viderCase = async (remainingQty, action) => {
    const resp = await axios.post(`/api/distributeur-cells/${cell.id}/vider/`, {
      old_remaining_qty: remainingQty,
      remaining_action: action,
    });
    const d = resp.data || {};
    const actionLabel = d.remaining_action === "loss" ? "perte au prix d'achat" : "remis en stock";
    const cout = d.montant_achat_reliquat != null && Number(d.remaining_qty) > 0
      ? ` (${Number(d.montant_achat_reliquat).toFixed(2)} € au prix d'achat)`
      : "";
    onSave(null, {
      message: Number(d.previous_level) > 0
        ? `Case vidée : vendu ${d.sold_qty ?? 0}, non vendu ${d.remaining_qty ?? 0} ${actionLabel}${cout}.`
        : "Case vidée.",
    });
    setOpenChangeProductFlow(false);
    setEmptyMode(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!cell || !cell.id) return;
    try {
      const res = await axios.get(`/api/distributeur-cells/${cell.id}/niveau/`);
      const level = Number(res.data?.previous_level || 0);
      setPreviousLevel(level);
      setNiveauInfo(res.data || null);
      if (level > 0) {
        setEmptyMode(true);
        setOldRemainingQty("");
        setRemainingAction("restock");
        setOpenChangeProductFlow(true);
        return;
      }
      setOpenDeleteWarning(true);
    } catch (error) {
      setFeedbackModal({
        open: true,
        title: "Erreur",
        message: "Impossible de lire le dernier chargement de cette case.",
      });
    }
  };

  const handleConfirmEmpty = async () => {
    const parsedRemaining = parseInt(oldRemainingQty, 10);
    if (isNaN(parsedRemaining) || parsedRemaining < 0) {
      setFeedbackModal({
        open: true,
        title: "Valeur invalide",
        message: "Veuillez saisir une quantité restante valide (0 ou plus).",
      });
      return;
    }
    if (parsedRemaining > previousLevel) {
      setFeedbackModal({
        open: true,
        title: "Valeur invalide",
        message: `Le dernier chargement est de ${previousLevel}. Le reste ne peut pas le dépasser.`,
      });
      return;
    }
    try {
      await viderCase(parsedRemaining, remainingAction);
    } catch (err) {
      const data = err.response?.data;
      setFeedbackModal({
        open: true,
        title: "Erreur",
        message: (data && (data.error || JSON.stringify(data))) || "Impossible de vider la case.",
      });
    }
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={window.innerWidth < 600}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Éditer la case L{rowIndex + 1}C{colIndex + 1}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <MdClose />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <FormControl fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}>
              <InputLabel>Produit lié au stock</InputLabel>
              <Select
                value={stockProductId ?? ""}
                label="Produit lié au stock"
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setStockProductId(id);
                  if (id) {
                    const p = stockProducts.find((x) => x.id === id);
                    if (p) {
                      setNomProduit(p.nom || p.nom_produit || nomProduit);
                      setImageUrl(p.image_display_url || p.image_url || imageUrl);
                    }
                  }
                }}
              >
                <MenuItem value="">Aucun</MenuItem>
                {stockProducts.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nom || p.nom_produit || `Produit #${p.id}`}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "text.secondary" }}>
                Même liste que l'onglet Stock. Créez les produits dans l'onglet Stock.
              </Typography>
            </FormControl>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Vue d'ensemble de la case (nom et image du produit lié au stock).
            </Typography>
            <Box
              sx={{
                p: 2.5,
                borderRadius: "20px",
                border: "2px solid",
                borderColor: stockProductId ? "primary.light" : "divider",
                bgcolor: stockProductId ? "primary.50" : "grey.50",
                display: "flex",
                alignItems: "center",
                gap: 2.5,
                transition: "all 0.3s ease",
                boxShadow: stockProductId ? "0 4px 12px rgba(25, 118, 210, 0.1)" : "none"
              }}
            >
              <Box
                sx={{
                  width: 90,
                  height: 90,
                  borderRadius: "18px",
                  bgcolor: "white",
                  border: "1px solid",
                  borderColor: stockProductId ? "primary.main" : "divider",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={nomProduit || "Produit"}
                    style={{
                      width: "85%",
                      height: "85%",
                      objectFit: "contain",
                      objectPosition: imagePosition || "center",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 950, color: "primary.main", opacity: 0.8 }}
                  >
                    {nomProduit
                      ? nomProduit
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "—"}
                  </Typography>
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 800, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.5px" }}>
                  Aperçu du produit
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: "text.primary", lineHeight: 1.2, mt: 0.5 }}>
                  {nomProduit || "Sélectionnez un produit"}
                </Typography>
                {stockProductId && (
                  <Box sx={{ mt: 1, display: "inline-flex", px: 1, py: 0.2, bgcolor: "success.50", color: "success.main", borderRadius: "6px" }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, fontSize: "0.6rem" }}>LIÉ AU STOCK</Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <TextField
              label="Prix de vente (€)"
              placeholder="Ex: 1.50"
              type="number"
              value={prixVente}
              onChange={(e) => setPrixVente(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
              helperText="Utilisé pour calculer le bénéfice (vs coûts d'achat StockLot)"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
          </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, justifyContent: "space-between" }}>
        <Button
          onClick={handleDelete}
          color="error"
          disabled={!cell || !cell.id}
          sx={{ borderRadius: "12px" }}
        >
          Vider la case
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose} sx={{ borderRadius: "12px" }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!stockProductId}
            sx={{ borderRadius: "12px", minHeight: 44 }}
          >
            Enregistrer
          </Button>
        </Box>
      </DialogActions>
    </Dialog>

    <Dialog
      open={openDeleteWarning}
      onClose={() => setOpenDeleteWarning(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 800, color: "error.main" }}>
        Vider la case ?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Cette action supprimera toutes les informations relatives à ce produit pour ce distributeur.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 700 }}>
          Cette action est irréversible et ne pourra pas être annulée.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pour modifier simplement le produit présent dans la case, utilisez la barre de sélection du produit en haut du formulaire.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={() => setOpenDeleteWarning(false)}>
          Annuler
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            setOpenDeleteWarning(false);
            viderCase(0, "restock").catch((err) => {
              const data = err.response?.data;
              setFeedbackModal({
                open: true,
                title: "Erreur",
                message: (data && (data.error || JSON.stringify(data))) || "Impossible de vider la case.",
              });
            });
          }}
        >
          Oui, vider la case
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={openChangeProductFlow}
      onClose={() => setOpenChangeProductFlow(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 800 }}>
        {emptyMode ? "Vider la case" : "Changement de produit"}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Dernier chargement de {niveauInfo?.nom_produit || "cette case"} : {previousLevel} unité{previousLevel > 1 ? "s" : ""}.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Prix de vente de la case : {Number(niveauInfo?.prix_vente || 0).toFixed(2)} €. Coût d'achat : {Number(niveauInfo?.cout_unitaire || 0).toFixed(2)} €. La marge vendue = prix de la case − coût d'achat.
        </Typography>
        <TextField
          fullWidth
          type="number"
          label="Unités encore dans la case (non vendues)"
          value={oldRemainingQty}
          onChange={(e) => setOldRemainingQty(e.target.value)}
          inputProps={{ min: 0, max: previousLevel }}
          sx={{ mb: 1 }}
        />
        <Typography variant="body2" sx={{ mb: 2, fontWeight: 700 }}>
          {Number.isNaN(parseInt(oldRemainingQty, 10))
            ? "Saisissez le reste pour voir le nombre vendu."
            : `Vendu : ${Math.max(previousLevel - parseInt(oldRemainingQty, 10), 0)} · Non vendu : ${parseInt(oldRemainingQty, 10)}`}
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Traitement du reliquat</InputLabel>
          <Select
            value={remainingAction}
            label="Traitement du reliquat"
            onChange={(e) => setRemainingAction(e.target.value)}
          >
            <MenuItem value="restock">Remettre le reliquat en stock</MenuItem>
            <MenuItem value="loss">Considérer le reliquat comme perte</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ mt: 1.5, display: "block", color: "text.secondary" }}>
          {remainingAction === "loss"
            ? "Le non-vendu est une perte : seul le prix d'achat est compté, pas le prix de vente."
            : "Le non-vendu revient en stock, au coût d'achat. Le vendu reste la marge de la case."}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={() => { setOpenChangeProductFlow(false); setEmptyMode(false); }}>Annuler</Button>
        <Button variant="contained" onClick={emptyMode ? handleConfirmEmpty : handleConfirmChangeProductFlow}>
          {emptyMode ? "Vider la case" : "Valider le changement"}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={feedbackModal.open}
      onClose={() => setFeedbackModal((s) => ({ ...s, open: false }))}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 800 }}>{feedbackModal.title || "Information"}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {feedbackModal.message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button
          variant="contained"
          onClick={() => setFeedbackModal((s) => ({ ...s, open: false }))}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default CellEditDialog;
