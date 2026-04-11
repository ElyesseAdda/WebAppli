import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const formatMontant = (v) =>
  Number(v || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const openPreview = (url) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

/**
 * Panneau latéral du récap « Dépenses » : documents liés à la catégorie sélectionnée
 * (BC pour matériel, contrats & avenants ST pour sous-traitant).
 */
const RecapDepenseDocumentsPanel = ({ chantierId, category }) => {
  const [loading, setLoading] = useState(true);
  const [bonsCommande, setBonsCommande] = useState([]);
  const [contrats, setContrats] = useState([]);
  /** Onglet sous-traitant (un onglet = une entreprise ST, comme les onglets fournisseur pour les BC) */
  const [stSousTraitantTab, setStSousTraitantTab] = useState(0);
  /** Onglet fournisseur sélectionné */
  const [bcFournisseurTab, setBcFournisseurTab] = useState(0);

  const load = useCallback(async () => {
    if (!chantierId) return;
    setLoading(true);
    try {
      const [bcRes, ctRes] = await Promise.all([
        axios.get("/api/bons-commande/"),
        axios.get(`/api/contrats-sous-traitance/?chantier_id=${chantierId}`),
      ]);
      const listBc = Array.isArray(bcRes.data)
        ? bcRes.data.filter((bc) => Number(bc.chantier) === Number(chantierId))
        : [];
      setBonsCommande(listBc);
      setContrats(Array.isArray(ctRes.data) ? ctRes.data : []);
    } catch {
      setBonsCommande([]);
      setContrats([]);
    } finally {
      setLoading(false);
    }
  }, [chantierId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Contrats du chantier regroupés par sous-traitant (id stable) */
  const contratsParSousTraitant = useMemo(() => {
    const map = new Map();
    for (const c of contrats) {
      const stId = c.sous_traitant != null ? c.sous_traitant : "sans-st";
      const stName =
        c.sous_traitant_details?.entreprise ||
        c.sous_traitant_details?.representant ||
        (c.sous_traitant != null ? `Sous-traitant #${c.sous_traitant}` : "Sous-traitant non renseigné");
      if (!map.has(stId)) {
        map.set(stId, { stId, stName, contrats: [] });
      }
      map.get(stId).contrats.push(c);
    }
    const groups = [...map.values()].map((g) => ({
      ...g,
      contrats: [...g.contrats].sort((a, b) => (a.id || 0) - (b.id || 0)),
    }));
    groups.sort((a, b) => a.stName.localeCompare(b.stName, "fr", { sensitivity: "base" }));
    return groups;
  }, [contrats]);

  const titreCategorie = useMemo(() => {
    const m = {
      materiel: "Matériel",
      main_oeuvre: "Main d'œuvre",
      sous_traitant: "Sous-traitant",
    };
    return m[category] || category;
  }, [category]);

  /** BC du chantier regroupés par fournisseur (libellé lisible, sans troncature) */
  const bonsParFournisseur = useMemo(() => {
    const map = new Map();
    for (const bc of bonsCommande) {
      const raw = (bc.fournisseur || "").trim();
      const label = raw || "Sans fournisseur";
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(bc);
    }
    const sections = [...map.entries()].map(([fournisseur, list]) => ({
      fournisseur,
      items: [...list].sort((a, b) =>
        String(a.numero || a.id).localeCompare(String(b.numero || b.id), "fr", { numeric: true })
      ),
    }));
    sections.sort((a, b) => a.fournisseur.localeCompare(b.fournisseur, "fr", { sensitivity: "base" }));
    return sections;
  }, [bonsCommande]);

  useEffect(() => {
    setBcFournisseurTab((prev) =>
      bonsParFournisseur.length === 0 ? 0 : Math.min(prev, bonsParFournisseur.length - 1)
    );
  }, [bonsParFournisseur.length]);

  useEffect(() => {
    setStSousTraitantTab((prev) =>
      contratsParSousTraitant.length === 0
        ? 0
        : Math.min(prev, contratsParSousTraitant.length - 1)
    );
  }, [contratsParSousTraitant.length]);

  const renderBonCommandeCards = () => {
    if (!bonsCommande.length) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Aucun bon de commande pour ce chantier.
        </Typography>
      );
    }
    const selected = bonsParFournisseur[bcFournisseurTab];
    const items = selected?.items || [];

    return (
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Tabs
          value={bcFournisseurTab}
          onChange={(_, v) => setBcFournisseurTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 48,
            mb: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": { minHeight: 48 },
          }}
        >
          {bonsParFournisseur.map(({ fournisseur, items: list }) => (
            <Tab
              key={fournisseur}
              label={
                <Box sx={{ textAlign: "center", py: 0.25, px: 0.25, maxWidth: 152 }}>
                  <Typography
                    variant="caption"
                    component="span"
                    sx={{
                      fontWeight: 700,
                      display: "block",
                      lineHeight: 1.25,
                      textTransform: "none",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                      fontSize: "0.72rem",
                    }}
                  >
                    {fournisseur}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.65rem", display: "block", mt: 0.25, lineHeight: 1.2 }}
                  >
                    {list.length} BC{list.length > 1 ? "s" : ""}
                  </Typography>
                </Box>
              }
              sx={{ minWidth: 80, maxWidth: 168, px: 0.75 }}
            />
          ))}
        </Tabs>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 360, overflowY: "auto", pr: 0.5 }}>
          {items.map((bc) => (
            <Card key={bc.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardActionArea
                onClick={() => openPreview(`/api/preview-saved-bon-commande/${bc.id}/`)}
              >
                <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <DescriptionOutlinedIcon color="action" fontSize="small" />
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}
                    >
                      BC {bc.numero || bc.id}
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      color="primary.main"
                      sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      {formatMontant(bc.montant_total)} €
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
    );
  };

  /** Contrats + avenants du sous-traitant sélectionné (cartes typées Contrat / Avenant) */
  const renderSousTraitantDocuments = () => {
    if (!contrats.length) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Aucun contrat de sous-traitance pour ce chantier.
        </Typography>
      );
    }
    const group = contratsParSousTraitant[stSousTraitantTab];
    if (!group) {
      return null;
    }

    const docRows = [];
    for (const c of group.contrats) {
      docRows.push({ kind: "contrat", key: `c-${c.id}`, c });
      const avenants = [...(c.avenants || [])].sort(
        (a, b) => (Number(a.numero) || 0) - (Number(b.numero) || 0) || (a.id || 0) - (b.id || 0)
      );
      for (const av of avenants) {
        docRows.push({ kind: "avenant", key: `av-${av.id}`, c, av });
      }
    }

    if (docRows.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Aucun document pour ce sous-traitant.
        </Typography>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 360, overflowY: "auto", pr: 0.5 }}>
        {docRows.map((row) => {
          if (row.kind === "contrat") {
            const { c } = row;
            const titre = c.nom_operation?.trim() || `Contrat #${c.id}`;
            return (
              <Card key={row.key} variant="outlined" sx={{ borderRadius: 2, borderLeft: 3, borderLeftColor: "success.main" }}>
                <CardActionArea onClick={() => openPreview(`/api/preview-contrat/${c.id}/`)}>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <Box display="flex" alignItems="flex-start" gap={1}>
                      <DescriptionOutlinedIcon color="action" sx={{ mt: 0.2 }} fontSize="small" />
                      <Box flex={1} minWidth={0}>
                        <Typography
                          variant="overline"
                          sx={{ display: "block", lineHeight: 1.2, fontWeight: 700, color: "success.dark", letterSpacing: "0.08em" }}
                        >
                          Contrat
                        </Typography>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          sx={{ wordBreak: "break-word", overflowWrap: "anywhere", lineHeight: 1.35 }}
                        >
                          {titre}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" fontWeight={800} color="success.main" sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                        {formatMontant(c.montant_operation)} €
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          }
          const { c, av } = row;
          const titreContrat = c.nom_operation?.trim() || `Contrat #${c.id}`;
          return (
            <Card key={row.key} variant="outlined" sx={{ borderRadius: 2, borderLeft: 3, borderLeftColor: "success.light" }}>
              <CardActionArea onClick={() => openPreview(`/api/preview-avenant/${av.id}/`)}>
                <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                  <Box display="flex" alignItems="flex-start" gap={1}>
                    <DescriptionOutlinedIcon color="action" sx={{ mt: 0.2 }} fontSize="small" />
                    <Box flex={1} minWidth={0}>
                      <Typography
                        variant="overline"
                        sx={{ display: "block", lineHeight: 1.2, fontWeight: 700, color: "text.secondary", letterSpacing: "0.08em" }}
                      >
                        Avenant
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ wordBreak: "break-word", overflowWrap: "anywhere", lineHeight: 1.35 }}
                      >
                        Avenant n°{av.numero ?? av.id}
                        {av.description?.trim() ? ` — ${av.description.trim()}` : ""}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, wordBreak: "break-word" }}>
                        Contrat : {titreContrat}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" fontWeight={800} color="success.dark" sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                      {formatMontant(av.montant)} €
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    );
  };

  let body;
  if (!category) {
    body = (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        Aucune catégorie de dépense à afficher.
      </Typography>
    );
  } else if (loading) {
    body = (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={28} />
      </Box>
    );
  } else if (category === "materiel") {
    body = (
      <>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}>
          Bons de commande du chantier
        </Typography>
        {renderBonCommandeCards()}
      </>
    );
  } else if (category === "sous_traitant") {
    body = (
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {contrats.length > 0 ? (
          <Tabs
            value={stSousTraitantTab}
            onChange={(_, v) => setStSousTraitantTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 48,
              mb: 1.5,
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": { minHeight: 48 },
            }}
          >
            {contratsParSousTraitant.map((g) => {
              const nbAv = g.contrats.reduce((acc, c) => acc + (c.avenants?.length || 0), 0);
              const nbC = g.contrats.length;
              return (
                <Tab
                  key={String(g.stId)}
                  label={
                    <Box sx={{ textAlign: "center", py: 0.25, px: 0.25, maxWidth: 160 }}>
                      <Typography
                        variant="caption"
                        component="span"
                        sx={{
                          fontWeight: 700,
                          display: "block",
                          lineHeight: 1.25,
                          textTransform: "none",
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                          fontSize: "0.72rem",
                        }}
                      >
                        {g.stName}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.65rem", display: "block", mt: 0.25, lineHeight: 1.2 }}
                      >
                        {nbC} contrat{nbC > 1 ? "s" : ""}
                        {nbAv > 0 ? ` · ${nbAv} avenant${nbAv > 1 ? "s" : ""}` : ""}
                      </Typography>
                    </Box>
                  }
                  sx={{ minWidth: 88, maxWidth: 176, px: 0.75 }}
                />
              );
            })}
          </Tabs>
        ) : null}
        {renderSousTraitantDocuments()}
      </Box>
    );
  } else if (category === "main_oeuvre") {
    body = (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2, lineHeight: 1.6 }}>
        Les dépenses main d&apos;œuvre ne sont pas reliées ici à un document unique. Utilisez le planning, les
        fiches de pointage ou les tableaux de coûts du chantier pour le détail.
      </Typography>
    );
  } else {
    body = null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        height: "100%",
        minHeight: 320,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ mb: 0.5 }}>
        Documents
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        Liés à : <strong>{titreCategorie}</strong> — clic pour ouvrir l&apos;aperçu PDF dans un nouvel onglet.
      </Typography>
      {body}
    </Paper>
  );
};

export default RecapDepenseDocumentsPanel;
