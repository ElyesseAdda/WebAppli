import React, { useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  alpha,
  Grow,
  TextField,
} from "@mui/material";
import { MdDelete } from "react-icons/md";
import ProductSearchBar from "./ProductSearchBar";
import { PALETTE } from "./theme";

const ComparaisonRow = ({
  rowIndex,
  rowData, // { id, products: { [fournisseurName]: product | null } }
  quantity = 1,
  selectedFournisseurs,
  productsByFournisseur,
  loadingProducts,
  fournisseurColors,
  onProductSelect,
  onQuantityChange,
  onRemoveRow,
}) => {
  // Calculer le meilleur et pire prix total (prix_unitaire * quantité) de la ligne
  const priceAnalysis = useMemo(() => {
    const entries = Object.entries(rowData.products).filter(
      ([, product]) => product != null
    );
    if (entries.length < 2) return { best: null, worst: null, ecart: null };

    const qty = Math.max(1, Number(quantity) || 1);
    let bestName = null;
    let bestPrice = Infinity;
    let worstName = null;
    let worstPrice = -Infinity;

    entries.forEach(([name, product]) => {
      const prixTotal = (product.prix_unitaire || 0) * qty;
      if (prixTotal < bestPrice) {
        bestPrice = prixTotal;
        bestName = name;
      }
      if (prixTotal > worstPrice) {
        worstPrice = prixTotal;
        worstName = name;
      }
    });

    return {
      best: bestName,
      worst: worstName,
      ecart: (worstPrice - bestPrice).toFixed(2),
      bestPrice,
      worstPrice,
    };
  }, [rowData.products, quantity]);

  // Combien de produits sont selectionnes dans cette ligne
  const selectedCount = Object.values(rowData.products).filter(
    (p) => p != null
  ).length;

  return (
    <Grow in timeout={300 + rowIndex * 50}>
      <Box
        sx={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          borderRadius: 3,
          border: `1px solid ${PALETTE.border}`,
          backgroundColor: PALETTE.surface,
          overflow: "hidden",
          transition: "all 0.2s",
          "&:hover": {
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            border: `1px solid ${alpha(PALETTE.primary, 0.2)}`,
          },
        }}
      >
        {/* Numero de ligne + actions */}
        <Box
          sx={{
            width: 48,
            minWidth: 48,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            backgroundColor: "#f8fafc",
            borderRight: `1px solid ${PALETTE.borderLight}`,
            py: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: PALETTE.textMuted,
              fontSize: "0.72rem",
            }}
          >
            #{rowIndex + 1}
          </Typography>
          <Tooltip title="Supprimer cette ligne" arrow>
            <IconButton
              size="small"
              onClick={onRemoveRow}
              sx={{
                width: 26,
                height: 26,
                color: PALETTE.textMuted,
                "&:hover": {
                  color: PALETTE.danger,
                  backgroundColor: alpha(PALETTE.danger, 0.08),
                },
              }}
            >
              <MdDelete size={14} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Quantite */}
        <Box
          sx={{
            width: 72,
            minWidth: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: `1px solid ${PALETTE.borderLight}`,
            backgroundColor: "#fafbfc",
            px: 0.5,
          }}
        >
          <TextField
            type="number"
            size="small"
            value={quantity}
            onChange={(e) => onQuantityChange?.(Number(e.target.value) || 1)}
            inputProps={{
              min: 1,
              max: 99999,
              step: 1,
              style: {
                textAlign: "center",
                fontSize: "0.85rem",
                fontWeight: 600,
                padding: "6px 4px",
              },
            }}
            sx={{
              width: 56,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: "#fff",
                "& fieldset": { borderColor: PALETTE.borderLight },
              },
            }}
          />
        </Box>

        {/* Colonnes fournisseurs */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            gap: 0,
            overflow: "hidden",
          }}
        >
          {selectedFournisseurs.map((f, fIdx) => {
            const product = rowData.products[f.name] || null;
            const color = fournisseurColors[f.name];
            const isBest = priceAnalysis.best === f.name && product != null;
            const isWorst = priceAnalysis.worst === f.name && product != null;
            return (
              <Box
                key={f.id}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  px: 1.5,
                  py: 1.2,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  borderLeft:
                    fIdx > 0
                      ? `1px solid ${PALETTE.borderLight}`
                      : "none",
                  backgroundColor: isBest
                    ? alpha(PALETTE.success, 0.04)
                    : isWorst
                    ? alpha(PALETTE.danger, 0.02)
                    : "transparent",
                  transition: "background-color 0.2s",
                }}
              >
                <ProductSearchBar
                  fournisseurName={f.name}
                  fournisseurColor={color}
                  products={productsByFournisseur[f.name] || []}
                  loading={loadingProducts[f.name] || false}
                  selectedProduct={product}
                  quantity={quantity}
                  onProductSelect={(p) => onProductSelect(f.name, p)}
                />
                {/* Badge meilleur / pire */}
                {isBest && selectedCount >= 2 && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.4,
                      mt: 0.5,
                      px: 0.8,
                      py: 0.15,
                      borderRadius: 1.5,
                      backgroundColor: alpha(PALETTE.success, 0.1),
                      alignSelf: "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: PALETTE.success,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.5rem",
                        color: "#fff",
                        fontWeight: 800,
                      }}
                    >
                      ✓
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        color: PALETTE.successDark,
                      }}
                    >
                      Meilleur prix
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Colonne ecart */}
        {selectedFournisseurs.length >= 2 && (
          <Box
            sx={{
              width: 90,
              minWidth: 90,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderLeft: `1px solid ${PALETTE.borderLight}`,
              backgroundColor:
                priceAnalysis.ecart && parseFloat(priceAnalysis.ecart) > 0
                  ? alpha(PALETTE.warning, 0.05)
                  : "#fafbfc",
              px: 1,
            }}
          >
            {priceAnalysis.ecart !== null ? (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color:
                      parseFloat(priceAnalysis.ecart) > 0
                        ? "#d97706"
                        : PALETTE.textMuted,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {parseFloat(priceAnalysis.ecart) > 0
                    ? `${priceAnalysis.ecart} €`
                    : "="}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.6rem",
                    color: PALETTE.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  ecart
                </Typography>
              </>
            ) : (
              <Typography
                variant="caption"
                sx={{ color: PALETTE.textMuted, fontSize: "0.75rem" }}
              >
                —
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Grow>
  );
};

export default ComparaisonRow;
