import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Fade,
  LinearProgress,
  alpha,
} from "@mui/material";
import { MdAdd, MdCompareArrows } from "react-icons/md";
import { FaBalanceScale } from "react-icons/fa";
import axios from "axios";

import { PALETTE, FOURNISSEUR_COLORS } from "./theme";
import FournisseurSelector from "./FournisseurSelector";
import ComparaisonRow from "./ComparaisonRow";
import StatsPanel from "./StatsPanel";

// Generateur d'ID unique pour les lignes
let rowIdCounter = 0;
const generateRowId = () => `row_${++rowIdCounter}_${Date.now()}`;

const ComparateurFournisseur = () => {
  // === State ===
  const [fournisseurs, setFournisseurs] = useState([]);
  const [selectedFournisseurs, setSelectedFournisseurs] = useState([]);
  const [productsByFournisseur, setProductsByFournisseur] = useState({});
  const [loadingFournisseurs, setLoadingFournisseurs] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState({});
  // Lignes de comparaison : [{ id, products: { [fournisseurName]: product | null } }]
  const [comparaisonRows, setComparaisonRows] = useState([]);

  // === Charger la liste des fournisseurs ===
  useEffect(() => {
    const fetchFournisseurs = async () => {
      try {
        setLoadingFournisseurs(true);
        const response = await axios.get("/api/fournisseurs/");
        setFournisseurs(response.data);
      } catch (error) {
        console.error("Erreur chargement fournisseurs:", error);
      } finally {
        setLoadingFournisseurs(false);
      }
    };
    fetchFournisseurs();
  }, []);

  // === Charger les produits d'un fournisseur ===
  const fetchProducts = useCallback(async (fournisseurName) => {
    setLoadingProducts((prev) => ({ ...prev, [fournisseurName]: true }));
    try {
      const response = await axios.get("/api/products-by-fournisseur/", {
        params: { fournisseur: fournisseurName },
      });
      setProductsByFournisseur((prev) => ({
        ...prev,
        [fournisseurName]: response.data,
      }));
    } catch (error) {
      console.error(
        `Erreur chargement produits pour ${fournisseurName}:`,
        error
      );
      setProductsByFournisseur((prev) => ({
        ...prev,
        [fournisseurName]: [],
      }));
    } finally {
      setLoadingProducts((prev) => ({ ...prev, [fournisseurName]: false }));
    }
  }, []);

  // === Quand la selection change ===
  const handleFournisseurChange = useCallback(
    (newSelection) => {
      const prevNames = selectedFournisseurs.map((f) => f.name);
      const newNames = newSelection.map((f) => f.name);

      setSelectedFournisseurs(newSelection);

      // Charger les produits des nouveaux fournisseurs
      newSelection.forEach((f) => {
        if (
          !productsByFournisseur[f.name] &&
          !loadingProducts[f.name]
        ) {
          fetchProducts(f.name);
        }
      });

      // Nettoyer les produits des fournisseurs retires
      const removedNames = prevNames.filter((n) => !newNames.includes(n));
      if (removedNames.length > 0) {
        setProductsByFournisseur((prev) => {
          const cleaned = { ...prev };
          removedNames.forEach((n) => delete cleaned[n]);
          return cleaned;
        });

        // Nettoyer les produits selectionnes dans les lignes pour les fournisseurs retires
        setComparaisonRows((prev) =>
          prev.map((row) => {
            const newProducts = { ...row.products };
            removedNames.forEach((n) => delete newProducts[n]);
            return { ...row, products: newProducts };
          })
        );
      }
    },
    [selectedFournisseurs, productsByFournisseur, loadingProducts, fetchProducts]
  );

  // === Couleurs fournisseurs ===
  const fournisseurColors = useMemo(() => {
    const map = {};
    selectedFournisseurs.forEach((f, i) => {
      map[f.name] = FOURNISSEUR_COLORS[i % FOURNISSEUR_COLORS.length];
    });
    return map;
  }, [selectedFournisseurs]);

  // === Ajouter une ligne de comparaison ===
  const addRow = useCallback(() => {
    setComparaisonRows((prev) => [
      ...prev,
      { id: generateRowId(), products: {} },
    ]);
  }, []);

  // === Supprimer une ligne ===
  const removeRow = useCallback((rowId) => {
    setComparaisonRows((prev) => prev.filter((r) => r.id !== rowId));
  }, []);

  // === Selectionner un produit dans une ligne pour un fournisseur ===
  const handleProductSelect = useCallback((rowId, fournisseurName, product) => {
    setComparaisonRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          products: {
            ...row.products,
            [fournisseurName]: product,
          },
        };
      })
    );
  }, []);

  const isAnyLoading = Object.values(loadingProducts).some(Boolean);

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        maxWidth: "100%",
        overflow: "hidden",
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
      }}
    >
      {/* ===== HEADER ===== */}
      <Fade in timeout={600}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${PALETTE.gradientStart}, ${PALETTE.gradientEnd})`,
              boxShadow: `0 4px 14px ${alpha(PALETTE.primary, 0.3)}`,
            }}
          >
            <FaBalanceScale size={22} color="#fff" />
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: PALETTE.text,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Comparateur Fournisseurs
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: PALETTE.textMuted, mt: 0.3 }}
            >
              Recherchez et comparez les produits de vos fournisseurs
            </Typography>
          </Box>
        </Box>
      </Fade>

      {/* ===== SELECTEUR FOURNISSEURS ===== */}
      <Fade in timeout={800}>
        <div>
          <FournisseurSelector
            fournisseurs={fournisseurs}
            selectedFournisseurs={selectedFournisseurs}
            onSelectionChange={handleFournisseurChange}
            loading={loadingFournisseurs}
            fournisseurColors={fournisseurColors}
          />
        </div>
      </Fade>

      {/* ===== LOADING ===== */}
      {isAnyLoading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            sx={{
              borderRadius: 2,
              height: 4,
              backgroundColor: alpha(PALETTE.primary, 0.1),
              "& .MuiLinearProgress-bar": {
                borderRadius: 2,
                background: `linear-gradient(90deg, ${PALETTE.primary}, ${PALETTE.primaryLight})`,
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: PALETTE.textMuted, mt: 1, display: "block" }}
          >
            Chargement des catalogues produits...
          </Typography>
        </Box>
      )}

      {/* ===== EMPTY STATE ===== */}
      {selectedFournisseurs.length === 0 && !loadingFournisseurs && (
        <Fade in timeout={600}>
          <Box sx={{ textAlign: "center", py: 10, px: 3 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${alpha(
                  PALETTE.primary,
                  0.1
                )}, ${alpha(PALETTE.primaryLight, 0.08)})`,
                mx: "auto",
                mb: 3,
              }}
            >
              <MdCompareArrows size={36} color={PALETTE.primaryLight} />
            </Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: PALETTE.text, mb: 1 }}
            >
              Commencez votre comparaison
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: PALETTE.textMuted, maxWidth: 460, mx: "auto" }}
            >
              Selectionnez au moins deux fournisseurs ci-dessus, puis ajoutez
              des lignes de comparaison pour rechercher et comparer les produits
              un par un.
            </Typography>
          </Box>
        </Fade>
      )}

      {/* ===== ZONE DE COMPARAISON ===== */}
      {selectedFournisseurs.length >= 2 && !isAnyLoading && (
        <Fade in timeout={500}>
          <Box>
            {/* Statistiques */}
            <StatsPanel
              comparaisonRows={comparaisonRows}
              selectedFournisseurs={selectedFournisseurs}
              fournisseurColors={fournisseurColors}
            />

            {/* En-tete colonnes fournisseurs */}
            <Box
              sx={{
                display: "flex",
                alignItems: "stretch",
                gap: 0,
                mb: 1.5,
                borderRadius: 3,
                overflow: "hidden",
                border: `1px solid ${PALETTE.border}`,
                backgroundColor: "#f8fafc",
              }}
            >
              {/* Espace pour le numero de ligne */}
              <Box
                sx={{
                  width: 48,
                  minWidth: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRight: `1px solid ${PALETTE.borderLight}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: PALETTE.textMuted,
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                  }}
                >
                  N°
                </Typography>
              </Box>
              {/* Noms des fournisseurs */}
              <Box sx={{ flex: 1, display: "flex", gap: 0 }}>
                {selectedFournisseurs.map((f, idx) => {
                  const color = fournisseurColors[f.name];
                  const productCount = productsByFournisseur[f.name]?.length || 0;
                  return (
                    <Box
                      key={f.id}
                      sx={{
                        flex: 1,
                        px: 1.5,
                        py: 1.2,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        borderLeft:
                          idx > 0
                            ? `1px solid ${PALETTE.borderLight}`
                            : "none",
                        borderBottom: `3px solid ${color}`,
                        backgroundColor: alpha(color, 0.04),
                      }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: color,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: color,
                            fontSize: "0.82rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {f.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: PALETTE.textMuted,
                            fontSize: "0.65rem",
                          }}
                        >
                          {productCount} produit{productCount > 1 ? "s" : ""}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              {/* Colonne ecart header */}
              <Box
                sx={{
                  width: 90,
                  minWidth: 90,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderLeft: `1px solid ${PALETTE.borderLight}`,
                  backgroundColor: alpha(PALETTE.warning, 0.04),
                  borderBottom: `3px solid ${PALETTE.warning}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    color: PALETTE.warning,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Ecart
                </Typography>
              </Box>
            </Box>

            {/* Lignes de comparaison */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {comparaisonRows.map((row, idx) => (
                <ComparaisonRow
                  key={row.id}
                  rowIndex={idx}
                  rowData={row}
                  selectedFournisseurs={selectedFournisseurs}
                  productsByFournisseur={productsByFournisseur}
                  loadingProducts={loadingProducts}
                  fournisseurColors={fournisseurColors}
                  onProductSelect={(fournisseurName, product) =>
                    handleProductSelect(row.id, fournisseurName, product)
                  }
                  onRemoveRow={() => removeRow(row.id)}
                />
              ))}
            </Box>

            {/* Bouton ajouter une ligne */}
            <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
              <Button
                variant="outlined"
                startIcon={<MdAdd size={18} />}
                onClick={addRow}
                sx={{
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  px: 3,
                  py: 1,
                  borderColor: alpha(PALETTE.primary, 0.3),
                  color: PALETTE.primary,
                  backgroundColor: alpha(PALETTE.primary, 0.04),
                  borderStyle: "dashed",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: PALETTE.primary,
                    backgroundColor: alpha(PALETTE.primary, 0.08),
                    borderStyle: "dashed",
                  },
                }}
              >
                Ajouter une ligne de comparaison
              </Button>
            </Box>

            {/* Aide contextuelle */}
            {comparaisonRows.length === 0 && (
              <Fade in timeout={600}>
                <Box
                  sx={{
                    textAlign: "center",
                    py: 5,
                    px: 3,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: PALETTE.textMuted,
                      maxWidth: 480,
                      mx: "auto",
                      lineHeight: 1.6,
                    }}
                  >
                    Cliquez sur <strong>"Ajouter une ligne de comparaison"</strong>{" "}
                    pour commencer. Chaque ligne vous permet de rechercher un
                    produit dans chaque fournisseur pour les comparer cote a
                    cote, meme si les designations sont differentes.
                  </Typography>
                </Box>
              </Fade>
            )}
          </Box>
        </Fade>
      )}

      {/* Etat: un seul fournisseur selectionne */}
      {selectedFournisseurs.length === 1 && !isAnyLoading && (
        <Fade in timeout={400}>
          <Box
            sx={{
              textAlign: "center",
              py: 6,
              px: 3,
              borderRadius: 3,
              border: `1px dashed ${alpha(PALETTE.primary, 0.3)}`,
              backgroundColor: alpha(PALETTE.primary, 0.02),
            }}
          >
            <Typography
              variant="body1"
              sx={{ color: PALETTE.textSecondary, fontWeight: 500 }}
            >
              Selectionnez au moins un deuxieme fournisseur pour lancer la
              comparaison.
            </Typography>
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default ComparateurFournisseur;
