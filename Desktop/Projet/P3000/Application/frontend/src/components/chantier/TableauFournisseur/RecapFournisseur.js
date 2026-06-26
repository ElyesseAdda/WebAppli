import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon, Search as SearchIcon } from "@mui/icons-material";
import React, { useMemo, useState } from "react";

/** Clé de regroupement : "FOURNISSEUR - 0233322" → "FOURNISSEUR" */
const getFournisseurGroupKey = (name) => {
  const idx = name.indexOf(" - ");
  return idx === -1 ? name.trim() : name.slice(0, idx).trim();
};

const RecapFournisseur = ({ selectedAnnee, organized, moisSorted }) => {
  const [recapSearch, setRecapSearch] = useState("");
  const [recapSort, setRecapSort] = useState("montant");
  const [recapSortDir, setRecapSortDir] = useState("desc");

  const getMoisName = (mois) => {
    const moisNames = {
      1: "Janvier",
      2: "Février",
      3: "Mars",
      4: "Avril",
      5: "Mai",
      6: "Juin",
      7: "Juillet",
      8: "Août",
      9: "Septembre",
      10: "Octobre",
      11: "Novembre",
      12: "Décembre",
    };
    return moisNames[mois] || mois.toString().padStart(2, "0");
  };

  const formatNumber = (num) => {
    return Number(num ?? 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const colorForAmount = (value) => {
    const n = Number(value ?? 0);
    if (Math.abs(n) < 0.01) return "text.primary";
    return n < 0 ? "rgba(211, 47, 47, 1)" : "rgba(27, 120, 188, 1)";
  };

  const colorForEcart = () => "rgba(211, 47, 47, 1)";

  const trierMois = (moisArray) => {
    return [...moisArray].sort((a, b) => {
      const [moisA, anneeA] = a.split("/").map(Number);
      const [moisB, anneeB] = b.split("/").map(Number);
      if (anneeA !== anneeB) return anneeA - anneeB;
      return moisA - moisB;
    });
  };

  const recapTotaux = useMemo(() => {
    let globalAPayer = 0;
    let globalPaye = 0;
    let globalEcart = 0;
    let globalAPayerTTC = 0;
    const parFournisseur = {};

    moisSorted.forEach((mois) => {
      const fournisseurs = organized[mois] || {};
      Object.keys(fournisseurs).forEach((fournisseur) => {
        if (!parFournisseur[fournisseur]) {
          parFournisseur[fournisseur] = {
            totalAPayer: 0,
            totalPaye: 0,
            totalEcart: 0,
            totalAPayerTTC: 0,
            mois: {},
          };
        }
        const chantiers = fournisseurs[fournisseur];
        chantiers.forEach((item) => {
          const ap = item.a_payer || 0;
          const apTTC = item.a_payer_ttc || 0;
          const p = item.paye || 0;
          const e = item.ecart || 0;
          globalAPayer += ap;
          globalPaye += p;
          globalEcart += e;
          globalAPayerTTC += apTTC;
          parFournisseur[fournisseur].totalAPayer += ap;
          parFournisseur[fournisseur].totalPaye += p;
          parFournisseur[fournisseur].totalEcart += e;
          parFournisseur[fournisseur].totalAPayerTTC += apTTC;
          if (!parFournisseur[fournisseur].mois[mois]) {
            parFournisseur[fournisseur].mois[mois] = {
              totalAPayer: 0,
              totalPaye: 0,
              totalEcart: 0,
              totalAPayerTTC: 0,
            };
          }
          parFournisseur[fournisseur].mois[mois].totalAPayer += ap;
          parFournisseur[fournisseur].mois[mois].totalPaye += p;
          parFournisseur[fournisseur].mois[mois].totalEcart += e;
          parFournisseur[fournisseur].mois[mois].totalAPayerTTC += apTTC;
        });
      });
    });

    return {
      global: { totalAPayer: globalAPayer, totalPaye: globalPaye, totalEcart: globalEcart, totalAPayerTTC: globalAPayerTTC },
      parFournisseur,
      sorted: Object.keys(parFournisseur).sort(),
    };
  }, [organized, moisSorted]);

  const getDefaultRecapSortDir = (sort) => (sort === "alphabetique" ? "asc" : "desc");

  const handleRecapSortChange = (_, value) => {
    if (value === null) {
      setRecapSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
      return;
    }
    setRecapSort(value);
    setRecapSortDir(getDefaultRecapSortDir(value));
  };

  const getRecapSortLabel = (sort) => {
    if (recapSort !== sort) {
      if (sort === "montant") return "Plus gros montants";
      if (sort === "avancement") return "% d'avancement";
      return "Ordre alphabétique";
    }
    if (sort === "montant") {
      return recapSortDir === "desc" ? "Plus gros montants" : "Plus petits montants";
    }
    if (sort === "avancement") {
      return recapSortDir === "desc" ? "% avancement ↓" : "% avancement ↑";
    }
    return recapSortDir === "asc" ? "A → Z" : "Z → A";
  };

  const recapFournisseursSorted = useMemo(() => {
    const { parFournisseur, sorted } = recapTotaux;

    const groupsMap = {};
    sorted.forEach((fournisseur) => {
      const groupKey = getFournisseurGroupKey(fournisseur);
      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = {
          groupKey,
          displayName: groupKey,
          variants: [],
          totalAPayer: 0,
          totalPaye: 0,
          totalEcart: 0,
          totalAPayerTTC: 0,
        };
      }
      const totaux = parFournisseur[fournisseur];
      groupsMap[groupKey].variants.push({ name: fournisseur, totaux });
      groupsMap[groupKey].totalAPayer += totaux.totalAPayer || 0;
      groupsMap[groupKey].totalPaye += totaux.totalPaye || 0;
      groupsMap[groupKey].totalEcart += totaux.totalEcart || 0;
      groupsMap[groupKey].totalAPayerTTC += totaux.totalAPayerTTC || 0;
    });

    let list = Object.values(groupsMap).map((g) => ({
      ...g,
      isGrouped: g.variants.length > 1,
      variants: [...g.variants].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    }));

    const q = recapSearch.trim().toLowerCase();
    if (q) {
      list = list
        .filter((g) => {
          const groupMatch = g.displayName.toLowerCase().includes(q);
          const variantMatch = g.variants.some((v) => v.name.toLowerCase().includes(q));
          return groupMatch || variantMatch;
        })
        .map((g) => {
          const groupMatch = g.displayName.toLowerCase().includes(q);
          const filteredVariants = groupMatch
            ? g.variants
            : g.variants.filter((v) => v.name.toLowerCase().includes(q));
          return { ...g, filteredVariants };
        });
    } else {
      list = list.map((g) => ({ ...g, filteredVariants: g.variants }));
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (recapSort === "alphabetique") {
        cmp = a.displayName.localeCompare(b.displayName, "fr");
      } else if (recapSort === "montant") {
        cmp = (a.totalAPayer || 0) - (b.totalAPayer || 0);
      } else if (recapSort === "avancement") {
        const pctA = a.totalAPayer ? (a.totalPaye / a.totalAPayer) * 100 : 0;
        const pctB = b.totalAPayer ? (b.totalPaye / b.totalAPayer) * 100 : 0;
        cmp = pctA - pctB;
      }
      return recapSortDir === "asc" ? cmp : -cmp;
    });
  }, [recapTotaux, recapSearch, recapSort, recapSortDir]);

  const renderRecapVariantTable = (totaux) => {
    const moisFournisseur = trierMois(Object.keys(totaux.mois));
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "rgba(27, 120, 188, 0.1)" }}>
              <TableCell sx={{ fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}>Mois</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}>Montant à payer HT</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}>Montant à payer TTC</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}>Montant payé</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}>Écart</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {moisFournisseur.map((mois) => {
              const [moisNum, annee2digits] = mois.split("/").map(Number);
              const moisName = getMoisName(moisNum);
              const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
              const totauxMois = totaux.mois[mois];
              return (
                <TableRow key={mois} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 500, color: "text.primary" }}>
                      {moisName} {anneeComplete}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: colorForAmount(totauxMois.totalAPayer), fontWeight: 500 }}>
                      {formatNumber(totauxMois.totalAPayer)} €
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: colorForAmount(totauxMois.totalAPayerTTC), fontWeight: 500 }}>
                      {formatNumber(totauxMois.totalAPayerTTC)} €
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: colorForAmount(totauxMois.totalPaye), fontWeight: 500 }}>
                      {formatNumber(totauxMois.totalPaye)} €
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ color: colorForEcart(), fontWeight: 500 }}>
                      {formatNumber(totauxMois.totalEcart)} €
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow sx={{ backgroundColor: "rgba(27, 120, 188, 0.05)", borderTop: "2px solid rgba(27, 120, 188, 0.3)" }}>
              <TableCell>
                <Typography sx={{ fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}>TOTAL</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ fontWeight: "bold", color: colorForAmount(totaux.totalAPayer) }}>
                  {formatNumber(totaux.totalAPayer)} €
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ fontWeight: "bold", color: colorForAmount(totaux.totalAPayerTTC) }}>
                  {formatNumber(totaux.totalAPayerTTC)} €
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ fontWeight: "bold", color: colorForAmount(totaux.totalPaye) }}>
                  {formatNumber(totaux.totalPaye)} €
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography sx={{ fontWeight: "bold", color: colorForEcart() }}>
                  {formatNumber(totaux.totalEcart)} €
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const { global: totauxGlobaux } = recapTotaux;

  return (
    <Box sx={{ width: "100%", mt: 3 }}>
      <Typography
        variant="h6"
        sx={{
          fontFamily: "Merriweather, serif",
          color: "white",
          fontWeight: "bold",
          mb: 2,
        }}
      >
        RÉCAPITULATIF ANNÉE {selectedAnnee}
      </Typography>

      <Paper
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: "rgba(27, 120, 188, 0.1)",
          border: "2px solid rgba(27, 120, 188, 0.3)",
        }}
      >
        <Typography variant="h6" sx={{ color: "rgba(27, 120, 188, 1)", fontWeight: "bold", mb: 2 }}>
          Totaux Globaux
        </Typography>
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <Box>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>Montant à payer HT</Typography>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: "bold", color: colorForAmount(totauxGlobaux.totalAPayer) }}>
              {formatNumber(totauxGlobaux.totalAPayer)} €
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>Montant à payer TTC</Typography>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: "bold", color: colorForAmount(totauxGlobaux.totalAPayerTTC) }}>
              {formatNumber(totauxGlobaux.totalAPayerTTC)} €
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>Montant payé</Typography>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: "bold", color: colorForAmount(totauxGlobaux.totalPaye) }}>
              {formatNumber(totauxGlobaux.totalPaye)} €
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>Écart</Typography>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: "bold", color: colorForEcart() }}>
              {formatNumber(totauxGlobaux.totalEcart)} €
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper
        sx={{
          p: 2,
          mb: 2,
          backgroundColor: "white",
          border: "1px solid rgba(27, 120, 188, 0.25)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TextField
            placeholder="Rechercher par nom ou client (ex. LEROY MERLIN, 0233322)…"
            value={recapSearch}
            onChange={(e) => setRecapSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "rgba(27, 120, 188, 0.7)" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              flex: 1,
              minWidth: 240,
              "& .MuiOutlinedInput-root": { backgroundColor: "#fafafa" },
            }}
          />
          <ToggleButtonGroup
            value={recapSort}
            exclusive
            onChange={handleRecapSortChange}
            size="small"
            sx={{
              flexWrap: "wrap",
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontSize: "0.8rem",
                px: 1.5,
                borderColor: "rgba(27, 120, 188, 0.4)",
                color: "rgba(27, 120, 188, 1)",
                "&.Mui-selected": {
                  backgroundColor: "rgba(27, 120, 188, 1)",
                  color: "white",
                  "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.85)" },
                },
              },
            }}
          >
            <ToggleButton value="montant">{getRecapSortLabel("montant")}</ToggleButton>
            <ToggleButton value="avancement">{getRecapSortLabel("avancement")}</ToggleButton>
            <ToggleButton value="alphabetique">{getRecapSortLabel("alphabetique")}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {recapSearch.trim() && (
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 1.5 }}>
            {recapFournisseursSorted.length} groupe{recapFournisseursSorted.length > 1 ? "s" : ""} affiché
            {recapFournisseursSorted.length > 1 ? "s" : ""}
            {` pour « ${recapSearch.trim()} »`}
          </Typography>
        )}
      </Paper>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {recapFournisseursSorted.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">
              Aucun fournisseur ne correspond à votre recherche.
            </Typography>
          </Paper>
        ) : (
          recapFournisseursSorted.map((groupe) => {
            const totaux = groupe;
            const isPayeComplet = Math.abs(totaux.totalAPayer - totaux.totalPaye) < 0.01;
            const pctCA = totauxGlobaux.totalAPayer
              ? ((totaux.totalAPayer / totauxGlobaux.totalAPayer) * 100).toFixed(1)
              : "0.0";
            const pctPaye = totaux.totalAPayer
              ? Math.min((totaux.totalPaye / totaux.totalAPayer) * 100, 100)
              : 0;
            const searchActive = !!recapSearch.trim();

            return (
              <Accordion
                key={groupe.groupKey}
                defaultExpanded={searchActive}
                sx={{
                  backgroundColor: "white",
                  "&:before": { display: "none" },
                  boxShadow: 2,
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: isPayeComplet
                      ? "rgba(46, 125, 50, 0.1)"
                      : "rgba(27, 120, 188, 0.1)",
                    "&:hover": {
                      backgroundColor: isPayeComplet
                        ? "rgba(46, 125, 50, 0.15)"
                        : "rgba(27, 120, 188, 0.15)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", width: "100%", pr: 2, gap: 0.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                        <Typography
                          sx={{
                            fontWeight: "bold",
                            fontSize: "1rem",
                            color: isPayeComplet ? "rgba(46, 125, 50, 1)" : "rgba(27, 120, 188, 1)",
                          }}
                        >
                          {groupe.displayName}
                        </Typography>
                        {groupe.isGrouped && (
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              backgroundColor: "rgba(27, 120, 188, 0.12)",
                              borderRadius: "12px",
                              px: 1.2,
                              py: 0.2,
                              border: "1px solid rgba(27, 120, 188, 0.3)",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "rgba(27, 120, 188, 1)",
                                lineHeight: 1.4,
                              }}
                            >
                              {groupe.variants.length} ligne{groupe.variants.length > 1 ? "s" : ""}
                            </Typography>
                          </Box>
                        )}
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            backgroundColor: isPayeComplet
                              ? "rgba(46, 125, 50, 0.15)"
                              : "rgba(27, 120, 188, 0.15)",
                            borderRadius: "12px",
                            px: 1.2,
                            py: 0.2,
                            border: `1px solid ${isPayeComplet ? "rgba(46, 125, 50, 0.3)" : "rgba(27, 120, 188, 0.3)"}`,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              color: isPayeComplet ? "rgba(46, 125, 50, 1)" : "rgba(27, 120, 188, 1)",
                              lineHeight: 1.4,
                            }}
                          >
                            {pctCA}%
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", gap: 3 }}>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>À payer</Typography>
                          <Typography sx={{ fontSize: "0.9rem", fontWeight: "bold", color: colorForAmount(totaux.totalAPayer) }}>
                            {formatNumber(totaux.totalAPayer)} €
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Payé</Typography>
                          <Typography sx={{ fontSize: "0.9rem", fontWeight: "bold", color: colorForAmount(totaux.totalPaye) }}>
                            {formatNumber(totaux.totalPaye)} €
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Écart</Typography>
                          <Typography sx={{ fontSize: "0.9rem", fontWeight: "bold", color: colorForEcart() }}>
                            {formatNumber(totaux.totalEcart)} €
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pctPaye}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: isPayeComplet ? "rgba(46, 125, 50, 0.12)" : "rgba(27, 120, 188, 0.12)",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 2,
                          backgroundColor: isPayeComplet ? "rgba(46, 125, 50, 0.7)" : "rgba(27, 120, 188, 0.7)",
                        },
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {groupe.isGrouped ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}>
                      {groupe.filteredVariants.map((variant) => {
                        const vTotaux = variant.totaux;
                        const vPayeComplet = Math.abs(vTotaux.totalAPayer - vTotaux.totalPaye) < 0.01;
                        const vPctPaye = vTotaux.totalAPayer
                          ? Math.min((vTotaux.totalPaye / vTotaux.totalAPayer) * 100, 100)
                          : 0;
                        return (
                          <Accordion
                            key={variant.name}
                            defaultExpanded={searchActive && groupe.filteredVariants.length === 1}
                            sx={{
                              backgroundColor: "#fafafa",
                              "&:before": { display: "none" },
                              boxShadow: 1,
                            }}
                          >
                            <AccordionSummary
                              expandIcon={<ExpandMoreIcon />}
                              sx={{
                                backgroundColor: vPayeComplet
                                  ? "rgba(46, 125, 50, 0.08)"
                                  : "rgba(27, 120, 188, 0.06)",
                                minHeight: 48,
                                "& .MuiAccordionSummary-content": { my: 1 },
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  width: "100%",
                                  pr: 2,
                                  gap: 2,
                                  flexWrap: "wrap",
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.9rem",
                                    color: vPayeComplet ? "rgba(46, 125, 50, 1)" : "rgba(27, 120, 188, 1)",
                                  }}
                                >
                                  {variant.name}
                                </Typography>
                                <Box sx={{ display: "flex", gap: 2 }}>
                                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: colorForAmount(vTotaux.totalAPayer) }}>
                                    {formatNumber(vTotaux.totalAPayer)} €
                                  </Typography>
                                  <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                                    {vPctPaye.toFixed(0)}% payé
                                  </Typography>
                                </Box>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                              {renderRecapVariantTable(vTotaux)}
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </Box>
                  ) : (
                    renderRecapVariantTable(groupe.filteredVariants[0].totaux)
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default RecapFournisseur;
