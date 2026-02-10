import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  CircularProgress,
  Popper,
  ClickAwayListener,
  alpha,
  Chip,
} from "@mui/material";
import { MdSearch } from "react-icons/md";
import { PALETTE } from "./theme";

const ProductSearchBar = ({
  fournisseurName,
  fournisseurColor,
  products,     // liste complete des produits du fournisseur
  loading,
  selectedProduct,
  onProductSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef(null);

  // Filtrer les produits par la recherche
  const filteredProducts = useMemo(() => {
    if (!products || !searchTerm.trim()) return products || [];
    const lower = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.designation?.toLowerCase().includes(lower) ||
        p.code_produit?.toLowerCase().includes(lower)
    );
  }, [products, searchTerm]);

  // Limiter l'affichage a 50 resultats max
  const displayProducts = useMemo(
    () => filteredProducts.slice(0, 50),
    [filteredProducts]
  );

  // Quand on tape, ouvrir le dropdown
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      setIsOpen(true);
    }
  }, [searchTerm]);

  const handleSelect = (product) => {
    onProductSelect(product);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleClear = () => {
    onProductSelect(null);
    setSearchTerm("");
  };

  // Si un produit est selectionne, afficher un chip
  if (selectedProduct) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          minWidth: 0,
          flex: 1,
        }}
      >
        <Chip
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.68rem",
                  opacity: 0.7,
                }}
              >
                {selectedProduct.code_produit || "—"}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 200,
                }}
              >
                {selectedProduct.designation}
              </Typography>
            </Box>
          }
          onDelete={handleClear}
          sx={{
            height: 34,
            backgroundColor: alpha(fournisseurColor, 0.1),
            color: PALETTE.text,
            border: `1px solid ${alpha(fournisseurColor, 0.25)}`,
            borderRadius: 2,
            maxWidth: "100%",
            "& .MuiChip-deleteIcon": {
              color: alpha(fournisseurColor, 0.5),
              "&:hover": { color: fournisseurColor },
            },
          }}
        />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: fournisseurColor,
              fontSize: "0.85rem",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {selectedProduct.prix_unitaire?.toFixed(2)} €
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: PALETTE.textMuted,
              fontSize: "0.7rem",
              px: 0.6,
              py: 0.1,
              borderRadius: 1,
              backgroundColor: "#f1f5f9",
            }}
          >
            {selectedProduct.unite || "—"}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <ClickAwayListener onClickAway={() => setIsOpen(false)}>
      <Box sx={{ position: "relative", minWidth: 0, flex: 1 }}>
        <TextField
          ref={anchorRef}
          size="small"
          fullWidth
          placeholder={`Rechercher dans ${fournisseurName}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.trim() && setIsOpen(true)}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              fontSize: "0.82rem",
              backgroundColor: alpha(fournisseurColor, 0.04),
              borderColor: alpha(fournisseurColor, 0.2),
              "&:hover": { backgroundColor: alpha(fournisseurColor, 0.07) },
              "&.Mui-focused": {
                backgroundColor: "#fff",
                "& fieldset": {
                  borderColor: fournisseurColor,
                },
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? (
                  <CircularProgress size={16} sx={{ color: fournisseurColor }} />
                ) : (
                  <MdSearch size={16} color={PALETTE.textMuted} />
                )}
              </InputAdornment>
            ),
          }}
        />

        {/* Dropdown resultats */}
        <Popper
          open={isOpen && displayProducts.length > 0}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          style={{ zIndex: 1300, width: anchorRef.current?.offsetWidth || 300 }}
        >
          <Paper
            elevation={8}
            sx={{
              mt: 0.5,
              maxHeight: 280,
              overflow: "auto",
              borderRadius: 2.5,
              border: `1px solid ${PALETTE.border}`,
              "&::-webkit-scrollbar": { width: 5 },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#cbd5e1",
                borderRadius: 3,
              },
            }}
          >
            {filteredProducts.length > 50 && (
              <Box
                sx={{
                  px: 1.5,
                  py: 0.8,
                  backgroundColor: alpha(PALETTE.warning, 0.08),
                  borderBottom: `1px solid ${PALETTE.borderLight}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: PALETTE.textSecondary, fontSize: "0.7rem" }}
                >
                  {filteredProducts.length} resultats — affichage des 50
                  premiers. Affinez votre recherche.
                </Typography>
              </Box>
            )}
            {displayProducts.map((product) => (
              <Box
                key={product.id}
                onClick={() => handleSelect(product)}
                sx={{
                  px: 1.5,
                  py: 1,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                  borderBottom: `1px solid ${PALETTE.borderLight}`,
                  transition: "background-color 0.12s",
                  "&:hover": {
                    backgroundColor: alpha(fournisseurColor, 0.06),
                  },
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.8 }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "0.68rem",
                        color: PALETTE.textMuted,
                        flexShrink: 0,
                      }}
                    >
                      {product.code_produit || "—"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        fontSize: "0.8rem",
                        color: PALETTE.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {product.designation}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: fournisseurColor,
                      fontSize: "0.78rem",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {product.prix_unitaire?.toFixed(2)} €
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: PALETTE.textMuted,
                      fontSize: "0.65rem",
                      px: 0.5,
                      py: 0.1,
                      borderRadius: 1,
                      backgroundColor: "#f1f5f9",
                    }}
                  >
                    {product.unite || "—"}
                  </Typography>
                </Box>
              </Box>
            ))}
            {displayProducts.length === 0 && searchTerm && (
              <Box sx={{ px: 2, py: 2, textAlign: "center" }}>
                <Typography
                  variant="body2"
                  sx={{ color: PALETTE.textMuted, fontSize: "0.8rem" }}
                >
                  Aucun produit trouve
                </Typography>
              </Box>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default ProductSearchBar;
