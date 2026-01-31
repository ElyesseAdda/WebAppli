import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  MdTrendingUp,
  MdAttachMoney,
  MdStorefront,
  MdReceipt,
  MdCalendarMonth,
  MdDateRange,
  MdPublic,
  MdEmojiEvents,
  MdChevronRight,
} from "react-icons/md";
import { useIsMobile } from "../../hooks/useIsMobile";

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const StatsTab = ({ onOpenDistributeur }) => {
  const isMobile = useIsMobile();
  const now = new Date();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("annuel"); // "mois" | "annuel" | "global"
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [openPeriodModal, setOpenPeriodModal] = useState(false);
  const [openMeilleursProduitsModal, setOpenMeilleursProduitsModal] = useState(false);
  const [topProduits, setTopProduits] = useState([]);
  const [chartDistributeurId, setChartDistributeurId] = useState(null); // null = tous
  const [monthlyData, setMonthlyData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [openChartDistributeurModal, setOpenChartDistributeurModal] = useState(false);

  const [stats, setStats] = useState({
    beneficeTotal: 0,
    totalFrais: 0,
    nbDistributeurs: 0,
    totalCA: 0,
  });
  const [perDistributeur, setPerDistributeur] = useState([]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const distributeursRes = await axios.get("/api/distributeurs/");
      const distributeurs = distributeursRes.data || [];
      if (distributeurs.length === 0) {
        setStats({
          beneficeTotal: 0,
          totalFrais: 0,
          nbDistributeurs: 0,
          totalCA: 0,
        });
        setPerDistributeur([]);
        setTopProduits([]);
        return;
      }

      let totalBenefice = 0;
      let totalFrais = 0;
      let totalCA = 0;
      const byDist = [];

      for (const dist of distributeurs) {
        try {
          const params = {};
          if (period === "mois") {
            params.year = year;
            params.month = month;
          } else if (period === "annuel") {
            params.year = year;
          }
          const resumeRes = await axios.get(
            `/api/distributeurs/${dist.id}/resume/`,
            { params }
          );
          const d = resumeRes.data;
          const benefice = Number(d.benefice_total ?? d.benefice ?? 0);
          const frais = Number(d.total_frais ?? 0);
          totalBenefice += benefice;
          totalFrais += frais;
          byDist.push({
            id: dist.id,
            nom: dist.nom || `Distributeur #${dist.id}`,
            emplacement: dist.emplacement,
            benefice_total: benefice,
            total_frais: frais,
          });
        } catch (err) {
          console.error(`Erreur resume distributeur ${dist.id}:`, err);
          byDist.push({
            id: dist.id,
            nom: dist.nom || `Distributeur #${dist.id}`,
            emplacement: dist.emplacement,
            benefice_total: 0,
            total_frais: 0,
          });
        }
      }

      byDist.sort((a, b) => b.benefice_total - a.benefice_total);

      // Meilleures ventes + CA total : resume_produits par distributeur (fusion par nom + somme CA)
      const byProduct = {};
      for (const dist of distributeurs) {
        const params = {};
        if (period === "mois") {
          params.year = year;
          params.month = month;
        } else if (period === "annuel") {
          params.year = year;
        }
        try {
          const res = await axios.get(
            `/api/distributeurs/${dist.id}/resume_produits/`,
            { params }
          );
          const produits = res.data.produits || [];
          const caDist = produits.reduce((acc, p) => acc + Number(p.ca_ventes || 0), 0);
          totalCA += caDist;
          for (const p of produits) {
            const nom = (p.nom_produit || "").trim() || "Sans nom";
            if (!byProduct[nom]) {
              byProduct[nom] = { nom_produit: nom, benefice: 0, quantite_vendue: 0, ca_ventes: 0 };
            }
            byProduct[nom].benefice += Number(p.benefice || 0);
            byProduct[nom].quantite_vendue += Number(p.quantite_vendue || 0);
            byProduct[nom].ca_ventes += Number(p.ca_ventes || 0);
          }
        } catch (err) {
          console.error(`Erreur resume_produits distributeur ${dist.id}:`, err);
        }
      }
      const topProduitsList = Object.values(byProduct)
        .filter((p) => p.benefice > 0 || p.quantite_vendue > 0)
        .sort((a, b) => b.benefice - a.benefice)
        .map((p) => ({
          ...p,
          benefice: Math.round(p.benefice * 100) / 100,
          ca_ventes: Math.round(p.ca_ventes * 100) / 100,
        }));

      setStats({
        beneficeTotal: Math.round(totalBenefice * 100) / 100,
        totalFrais: Math.round(totalFrais * 100) / 100,
        nbDistributeurs: distributeurs.length,
        totalCA: Math.round(totalCA * 100) / 100,
      });
      setPerDistributeur(byDist);
      setTopProduits(topProduitsList);
    } catch (error) {
      console.error("Erreur chargement stats:", error);
      setStats({
        beneficeTotal: 0,
        totalFrais: 0,
        nbDistributeurs: 0,
        totalCA: 0,
      });
      setPerDistributeur([]);
      setTopProduits([]);
    } finally {
      setLoading(false);
    }
  }, [period, year, month]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchMonthlyEvolution = useCallback(async () => {
    try {
      setLoadingChart(true);
      const params = { year };
      if (chartDistributeurId) params.distributeur_id = chartDistributeurId;
      const res = await axios.get("/api/distributeurs/monthly_evolution/", { params });
      setMonthlyData(res.data.months || []);
    } catch (err) {
      console.error("Erreur chargement évolution:", err);
      setMonthlyData([]);
    } finally {
      setLoadingChart(false);
    }
  }, [year, chartDistributeurId]);

  useEffect(() => {
    fetchMonthlyEvolution();
  }, [fetchMonthlyEvolution]);

  const periodLabel =
    period === "mois"
      ? `${MOIS_LABELS[month - 1]} ${year}`
      : period === "annuel"
      ? `Année ${year}`
      : "Toute la période";

  const maxBenefice = Math.max(
    ...perDistributeur.map((d) => d.benefice_total),
    1
  );

  const chartDistributeurLabel =
    chartDistributeurId == null
      ? "Tous les distributeurs"
      : perDistributeur.find((d) => d.id === chartDistributeurId)?.nom || "Distributeur";

  // Courbe : dimensions et échelles (SVG)
  const chartWidth = 280;
  const chartHeight = 180;
  const pad = { left: 36, right: 12, top: 12, bottom: 28 };
  const innerW = chartWidth - pad.left - pad.right;
  const innerH = chartHeight - pad.top - pad.bottom;
  const allVals = monthlyData.flatMap((m) => [m.ca, m.benefice]);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(0, ...monthlyData.map((m) => m.benefice));
  const rangeY = maxVal - minVal || 1;
  const scaleY = (v) => pad.top + innerH - ((v - minVal) / rangeY) * innerH;
  const scaleX = (i) => pad.left + (i / 11) * innerW;
  const pathCA =
    monthlyData.length === 12
      ? monthlyData.map((m, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(m.ca)}`).join(" ")
      : "";
  const pathBenefice =
    monthlyData.length === 12
      ? monthlyData.map((m, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(m.benefice)}`).join(" ")
      : "";

  if (loading && perDistributeur.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          pb: isMobile ? "120px" : 4,
        }}
      >
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
          Chargement des statistiques...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100%",
        pb: isMobile ? "120px" : 6,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          pb: 2,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.5px",
            color: "text.primary",
          }}
        >
          Vue globale
        </Typography>
      </Box>

      {/* Cartes globales */}
      <Box sx={{ px: 2, pt: 2 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <Paper
              elevation={0}
              onClick={() => setOpenPeriodModal(true)}
              sx={{
                p: 3,
                borderRadius: "28px",
                bgcolor: "primary.main",
                color: "white",
                boxShadow: "0 12px 32px rgba(25, 118, 210, 0.3)",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:active": { transform: "scale(0.97)" },
                "&:hover": { bgcolor: "primary.dark", boxShadow: "0 16px 40px rgba(25, 118, 210, 0.4)" },
              }}
            >
              <Box sx={{ position: "absolute", right: -20, top: -20, opacity: 0.15, transform: "rotate(-15deg)" }}>
                <MdAttachMoney size={140} />
              </Box>
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Bénéfice net — {periodLabel}
                    </Typography>
                    <Typography variant="h2" sx={{ fontWeight: 950, my: 1, letterSpacing: "-2px", textShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
                      {stats.beneficeTotal.toFixed(2)} €
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1, borderRadius: "12px", bgcolor: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
                    <MdCalendarMonth size={20} />
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2, alignItems: "center" }}>
                  <Box sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 0.5, 
                    bgcolor: "rgba(244, 67, 54, 0.25)", 
                    px: 1.5, 
                    py: 0.6, 
                    borderRadius: "10px",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    <Typography variant="caption" sx={{ color: "#ffcdd2", fontWeight: 900, fontSize: "0.7rem" }}>
                      Frais : -{stats.totalFrais.toFixed(2)} €
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 0.5, 
                    bgcolor: "rgba(255,255,255,0.2)", 
                    px: 1.5, 
                    py: 0.6, 
                    borderRadius: "10px",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    <Typography variant="caption" sx={{ color: "white", fontWeight: 800, fontSize: "0.7rem" }}>
                      {stats.nbDistributeurs} Distributeurs
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 600 }}>
                    Tapez pour changer la période
                  </Typography>
                  <MdChevronRight size={18} style={{ opacity: 0.7 }} />
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={6}>
            <Paper
              elevation={0}
              onClick={() => setOpenMeilleursProduitsModal(true)}
              sx={{
                p: 2.5,
                borderRadius: "24px",
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                transition: "all 0.2s",
                "&:active": { transform: "scale(0.96)", bgcolor: "grey.50" }
              }}
            >
              <Box sx={{ p: 1, borderRadius: "12px", bgcolor: "primary.50", color: "primary.main", alignSelf: "flex-start" }}>
                <MdTrendingUp size={24} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1 }}>Top Produits</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Analyse détaillée</Typography>
            </Paper>
          </Grid>

          <Grid item xs={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: "24px",
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                transition: "all 0.2s"
              }}
            >
              <Box sx={{ p: 1, borderRadius: "12px", bgcolor: "success.50", color: "success.main", alignSelf: "flex-start" }}>
                <MdAttachMoney size={24} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1 }}>CA Total</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "success.main" }}>{stats.totalCA.toFixed(2)} €</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Évolution CA & Bénéfice — courbe + sélecteur distributeur au clic */}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            color: "text.secondary",
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: "1px",
            mb: 1.5,
          }}
        >
          Évolution CA & Bénéfice — {year}
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: "20px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Paper
            elevation={0}
            onClick={() => setOpenChartDistributeurModal(true)}
            sx={{
              py: 1.5,
              px: 2,
              mb: 2,
              borderRadius: "14px",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "grey.50",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              "&:active": { bgcolor: "grey.200" },
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
              Distributeur : {chartDistributeurLabel}
            </Typography>
            <MdChevronRight size={22} color="#999" />
          </Paper>

          {loadingChart ? (
            <Box sx={{ height: chartHeight, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CircularProgress size={32} />
            </Box>
          ) : monthlyData.length === 0 ? (
            <Box
              sx={{
                height: chartHeight,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "grey.50",
                borderRadius: "16px",
                border: "2px dashed",
                borderColor: "divider",
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Aucune donnée pour {year}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: "auto", "&::-webkit-scrollbar": { height: 6 } }}>
              <svg width={chartWidth} height={chartHeight} style={{ display: "block" }}>
                <defs>
                  <linearGradient id="gradCaStats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1976d2" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1976d2" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBeneficeStats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2e7d32" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2e7d32" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {/* Grille Y */}
                {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                  <line
                    key={t}
                    x1={pad.left}
                    y1={pad.top + innerH - t * innerH}
                    x2={chartWidth - pad.right}
                    y2={pad.top + innerH - t * innerH}
                    stroke="grey.200"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                  />
                ))}
                {/* Labels mois */}
                {MOIS_LABELS.map((label, i) => (
                  <text
                    key={i}
                    x={scaleX(i)}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#666"
                    fontWeight="600"
                  >
                    {label.slice(0, 3)}
                  </text>
                ))}
                {/* Ligne 0 */}
                {minVal < 0 && (
                  <line
                    x1={pad.left}
                    y1={scaleY(0)}
                    x2={chartWidth - pad.right}
                    y2={scaleY(0)}
                    stroke="grey.400"
                    strokeWidth={1}
                  />
                )}
                {/* Courbe CA */}
                {pathCA && (
                  <>
                    <path
                      d={`${pathCA} L ${scaleX(11)} ${pad.top + innerH} L ${pad.left} ${pad.top + innerH} Z`}
                      fill="url(#gradCa)"
                    />
                    <path
                      d={pathCA}
                      fill="none"
                      stroke="#1976d2"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
                {/* Courbe Bénéfice */}
                {pathBenefice && (
                  <>
                    <path
                      d={`${pathBenefice} L ${scaleX(11)} ${scaleY(0)} L ${pad.left} ${scaleY(0)} Z`}
                      fill="url(#gradBeneficeStats)"
                    />
                    <path
                      d={pathBenefice}
                      fill="none"
                      stroke="#2e7d32"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </svg>
              <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mt: 1, flexWrap: "wrap" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 3, borderRadius: 1, bgcolor: "primary.main" }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                    CA
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 3, borderRadius: 1, bgcolor: "success.main" }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                    Bénéfice
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Paper>

        {/* Par distributeur — classement */}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            color: "text.secondary",
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: "1px",
            mb: 2,
          }}
        >
          Par distributeur
        </Typography>

        {perDistributeur.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: "20px",
              border: "2px dashed",
              borderColor: "divider",
              bgcolor: "grey.50",
            }}
          >
            <MdStorefront size={48} style={{ color: "#ccc", marginBottom: 12 }} />
            <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
              Aucun distributeur
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {perDistributeur.map((d, index) => {
              const rank = index + 1;
              const pct = maxBenefice > 0 ? (d.benefice_total / maxBenefice) * 100 : 0;
              return (
                <Card
                  key={d.id}
                  elevation={0}
                  onClick={() => onOpenDistributeur?.(d.id)}
                  onKeyDown={(e) => {
                    if (onOpenDistributeur && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onOpenDistributeur(d.id);
                    }
                  }}
                  role={onOpenDistributeur ? "button" : undefined}
                  tabIndex={onOpenDistributeur ? 0 : undefined}
                  sx={{
                    borderRadius: "20px",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    overflow: "hidden",
                    transition: "all 0.2s",
                    cursor: onOpenDistributeur ? "pointer" : "default",
                    "&:hover": onOpenDistributeur ? { borderColor: "primary.main", bgcolor: "action.hover" } : {},
                    "&:active": isMobile ? { transform: "scale(0.98)" } : {},
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          bgcolor: rank === 1 ? "#ffd70022" : rank === 2 ? "#c0c0c022" : rank === 3 ? "#cd7f3222" : "grey.100",
                          color: rank === 1 ? "#ffd700" : rank === 2 ? "#9e9e9e" : rank === 3 ? "#cd7f32" : "text.secondary",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: "1rem",
                          flexShrink: 0,
                          border: rank <= 3 ? "1px solid" : "none",
                          borderColor: "inherit"
                        }}
                      >
                        {rank <= 3 ? <MdEmojiEvents size={22} /> : rank}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 800,
                            lineHeight: 1.2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {d.nom}
                        </Typography>
                        {d.emplacement && (
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            {d.emplacement}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 900,
                            color: d.benefice_total >= 0 ? "success.main" : "error.main",
                          }}
                        >
                          {d.benefice_total >= 0 ? "+" : ""}{d.benefice_total.toFixed(2)} €
                        </Typography>
                        {d.total_frais > 0 && (
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            Frais: -{d.total_frais.toFixed(2)} €
                          </Typography>
                        )}
                      </Box>
                      <MdChevronRight size={22} color="#ccc" />
                    </Box>
                    {maxBenefice > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(pct, 0)}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: "grey.100",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 3,
                            bgcolor: d.benefice_total >= 0 ? "success.main" : "error.main",
                          },
                        }}
                      />
                    )}
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Modal période (au clic sur la carte bénéfice) */}
      <Dialog
        open={openPeriodModal}
        onClose={() => setOpenPeriodModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: isMobile ? "24px 24px 0 0" : "28px",
            position: isMobile ? "fixed" : "relative",
            bottom: isMobile ? 0 : "auto",
            m: isMobile ? 0 : 2,
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: 800,
            pt: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          {isMobile && (
            <Box
              sx={{
                width: 40,
                height: 4,
                bgcolor: "grey.300",
                borderRadius: 2,
                mb: 2,
              }}
            />
          )}
          Période d'affichage
        </DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Paper
              elevation={0}
              onClick={() => setPeriod("mois")}
              sx={{
                p: 2,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: period === "mois" ? "primary.main" : "divider",
                bgcolor: period === "mois" ? "primary.50" : "background.paper",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: period === "mois" ? 2 : 0 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "12px",
                    bgcolor: period === "mois" ? "primary.main" : "grey.100",
                    color: period === "mois" ? "white" : "grey.600",
                  }}
                >
                  <MdCalendarMonth size={24} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                  Par mois
                </Typography>
                {period === "mois" && (
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "primary.main" }} />
                )}
              </Box>
              {period === "mois" && (
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Mois</InputLabel>
                    <Select
                      value={month}
                      label="Mois"
                      onChange={(e) => setMonth(Number(e.target.value))}
                      sx={{ borderRadius: "10px" }}
                    >
                      {MOIS_LABELS.map((label, i) => (
                        <MenuItem key={i} value={i + 1}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Année</InputLabel>
                    <Select
                      value={year}
                      label="Année"
                      onChange={(e) => setYear(Number(e.target.value))}
                      sx={{ borderRadius: "10px" }}
                    >
                      {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <MenuItem key={y} value={y}>{y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Paper>

            <Paper
              elevation={0}
              onClick={() => setPeriod("annuel")}
              sx={{
                p: 2,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: period === "annuel" ? "primary.main" : "divider",
                bgcolor: period === "annuel" ? "primary.50" : "background.paper",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: period === "annuel" ? 2 : 0 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "12px",
                    bgcolor: period === "annuel" ? "primary.main" : "grey.100",
                    color: period === "annuel" ? "white" : "grey.600",
                  }}
                >
                  <MdDateRange size={24} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                  Année complète
                </Typography>
                {period === "annuel" && (
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "primary.main" }} />
                )}
              </Box>
              {period === "annuel" && (
                <FormControl fullWidth size="small">
                  <InputLabel>Année</InputLabel>
                  <Select
                    value={year}
                    label="Année"
                    onChange={(e) => setYear(Number(e.target.value))}
                    sx={{ borderRadius: "10px" }}
                  >
                    {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Paper>

            <Paper
              elevation={0}
              onClick={() => setPeriod("global")}
              sx={{
                p: 2,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: period === "global" ? "primary.main" : "divider",
                bgcolor: period === "global" ? "primary.50" : "background.paper",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: "12px",
                    bgcolor: period === "global" ? "primary.main" : "grey.100",
                    color: period === "global" ? "white" : "grey.600",
                  }}
                >
                  <MdPublic size={24} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                  Vue globale
                </Typography>
                {period === "global" && (
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "primary.main" }} />
                )}
              </Box>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setOpenPeriodModal(false)}
            sx={{
              borderRadius: "14px",
              py: 1.5,
              fontWeight: 700,
              textTransform: "none",
            }}
          >
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Meilleures ventes — liste complète */}
      <Dialog
        open={openMeilleursProduitsModal}
        onClose={() => setOpenMeilleursProduitsModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: isMobile ? "32px 32px 0 0" : "28px",
            position: isMobile ? "fixed" : "relative",
            bottom: isMobile ? 0 : "auto",
            m: isMobile ? 0 : 2,
            maxHeight: "92vh",
            bgcolor: "grey.50"
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: 900,
            pt: 3,
            pb: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {isMobile && (
            <Box sx={{ width: 40, height: 5, bgcolor: "grey.300", borderRadius: 3, mb: 2 }} />
          )}
          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.5px" }}>Performance Produits</Typography>
          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 800, bgcolor: "primary.50", px: 2, py: 0.5, borderRadius: "10px", mt: 1 }}>
            {periodLabel}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 4, px: 2, pt: 2 }}>
          {topProduits.length === 0 ? (
            <Box sx={{ py: 8, textAlign: "center", opacity: 0.6 }}>
              <Box sx={{ p: 2, bgcolor: "white", borderRadius: "50%", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <MdHistory size={40} color="#ccc" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "text.secondary" }}>
                Aucune vente enregistrée
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              {(() => {
                // % = part du bénéfice total représentée par ce produit
                const totalBenefice = topProduits.reduce((acc, x) => acc + Number(x.benefice || 0), 0);
                
                return topProduits.map((p, index) => {
                  const rank = index + 1;
                  const pct = totalBenefice > 0 ? (Number(p.benefice || 0) / totalBenefice) * 100 : 0;
                  const isTop3 = rank <= 3;
                  
                  return (
                    <Paper 
                      key={`${p.nom_produit}-${index}`}
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        borderRadius: "20px", 
                        bgcolor: "white",
                        border: "1px solid",
                        borderColor: isTop3 ? "primary.light" : "divider",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
                      {isTop3 && (
                        <Box sx={{ 
                          position: "absolute", 
                          right: -10, 
                          top: -10, 
                          p: 2, 
                          bgcolor: rank === 1 ? "#ffd70022" : rank === 2 ? "#c0c0c022" : "#cd7f3222",
                          borderRadius: "50%"
                        }}>
                          <MdEmojiEvents size={32} color={rank === 1 ? "#ffd700" : rank === 2 ? "#9e9e9e" : "#cd7f32"} />
                        </Box>
                      )}
                      
                      <Box sx={{ position: "relative", zIndex: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                          <Box sx={{ flex: 1, pr: 4 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "text.primary", fontSize: "0.95rem", lineHeight: 1.2 }}>
                              {rank}. {p.nom_produit}
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, bgcolor: "grey.100", px: 1, py: 0.2, borderRadius: "6px" }}>
                                {p.quantite_vendue} unités
                              </Typography>
                              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 800 }}>
                                +{p.benefice.toFixed(2)} €
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 950, color: "primary.main", opacity: 0.8 }}>
                            {pct.toFixed(1)}%
                          </Typography>
                        </Box>
                        
                        <Box sx={{ position: "relative", height: 8, bgcolor: "grey.100", borderRadius: 4, overflow: "hidden" }}>
                          <Box 
                            sx={{ 
                              position: "absolute", 
                              left: 0, 
                              top: 0, 
                              height: "100%", 
                              width: `${Math.max(pct, 2)}%`, 
                              bgcolor: isTop3 ? "primary.main" : "primary.light",
                              borderRadius: 4,
                              transition: "width 1s ease-out"
                            }} 
                          />
                        </Box>
                      </Box>
                    </Paper>
                  );
                });
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setOpenMeilleursProduitsModal(false)}
            sx={{ 
              borderRadius: "16px", 
              py: 1.8, 
              fontWeight: 800, 
              textTransform: "none",
              boxShadow: "0 8px 20px rgba(0,0,0,0.1)"
            }}
          >
            Fermer l'analyse
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog choix distributeur pour la courbe */}
      <Dialog
        open={openChartDistributeurModal}
        onClose={() => setOpenChartDistributeurModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: isMobile ? "24px 24px 0 0" : "28px",
            position: isMobile ? "fixed" : "relative",
            bottom: isMobile ? 0 : "auto",
            m: isMobile ? 0 : 2,
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle sx={{ textAlign: "center", fontWeight: 800, pt: 3 }}>
          {isMobile && (
            <Box sx={{ width: 40, height: 4, bgcolor: "grey.300", borderRadius: 2, mb: 2, mx: "auto" }} />
          )}
          Courbe — choisir le distributeur
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2, pb: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
            <Paper
              elevation={0}
              onClick={() => {
                setChartDistributeurId(null);
                setOpenChartDistributeurModal(false);
              }}
              sx={{
                p: 2,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: chartDistributeurId === null ? "primary.main" : "divider",
                bgcolor: chartDistributeurId === null ? "primary.50" : "background.paper",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <MdStorefront size={24} color={chartDistributeurId === null ? "#1976d2" : "#666"} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Tous les distributeurs
                </Typography>
              </Box>
              {chartDistributeurId === null && (
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "primary.main" }} />
              )}
            </Paper>
            {perDistributeur.map((d) => (
              <Paper
                key={d.id}
                elevation={0}
                onClick={() => {
                  setChartDistributeurId(d.id);
                  setOpenChartDistributeurModal(false);
                }}
                sx={{
                  p: 2,
                  borderRadius: "16px",
                  border: "2px solid",
                  borderColor: chartDistributeurId === d.id ? "primary.main" : "divider",
                  bgcolor: chartDistributeurId === d.id ? "primary.50" : "background.paper",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                  <MdStorefront size={24} color={chartDistributeurId === d.id ? "#1976d2" : "#666"} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.nom}
                    </Typography>
                    {d.emplacement && (
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        {d.emplacement}
                      </Typography>
                    )}
                  </Box>
                </Box>
                {chartDistributeurId === d.id && (
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />
                )}
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setOpenChartDistributeurModal(false)}
            sx={{ borderRadius: "14px", py: 1.5, fontWeight: 700, textTransform: "none" }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StatsTab;
