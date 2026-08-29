import { Box, Typography } from "@mui/material";
import React, { useMemo } from "react";
import { calculerLayout, doitAfficherDuree, formatDateFr } from "./ganttLayout";

const LARGEUR_LIBELLES = 260;
const HAUTEUR_LIGNE = 34;

/**
 * Rendu visuel d'un diagramme : colonne de libellés à gauche, grille de
 * périodes et barres colorées à droite.
 *
 * Composant de présentation pur. L'édition est gérée par le parent, qui passe
 * `onSelectionLigne` pour rendre les lignes cliquables.
 */
const GanttTimeline = ({
  elements = [],
  echelle = "semaine",
  onSelectionLigne,
  ligneSelectionnee = null,
  compact = false,
  onBasculerDuree,
}) => {
  const { axe, lignes } = useMemo(
    () => calculerLayout(elements, echelle),
    [elements, echelle]
  );

  const hauteurLigne = compact ? 26 : HAUTEUR_LIGNE;

  if (!axe.periodes.length) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: "center",
          color: "text.secondary",
          border: "1px dashed #ccc",
          borderRadius: 1,
        }}
      >
        <Typography variant="body2">
          Aucune ligne datée pour le moment. Ajoutez une ligne avec une date de
          début et une date de fin pour voir apparaître le diagramme.
        </Typography>
      </Box>
    );
  }

  const largeurPeriode = 100 / axe.periodes.length;

  return (
    <Box
      sx={{
        border: "1px solid #e0e0e0",
        borderRadius: 1,
        overflowX: "auto",
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ minWidth: axe.periodes.length > 18 ? 900 : "100%" }}>
        {/* En-tête : groupes (mois ou année) puis périodes */}
        <Box sx={{ display: "flex", borderBottom: "1px solid #e0e0e0" }}>
          <Box
            sx={{
              width: LARGEUR_LIBELLES,
              minWidth: LARGEUR_LIBELLES,
              borderRight: "1px solid #e0e0e0",
              backgroundColor: "#f5f7fa",
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", backgroundColor: "#f5f7fa" }}>
              {axe.groupes.map((groupe, index) => (
                <Box
                  key={`${groupe.libelle}-${index}`}
                  sx={{
                    width: `${groupe.nbPeriodes * largeurPeriode}%`,
                    borderRight: "1px solid #e0e0e0",
                    px: 0.5,
                    py: 0.5,
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textTransform: "capitalize",
                  }}
                >
                  {groupe.libelle}
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", backgroundColor: "#fafbfc" }}>
              {axe.periodes.map((periode) => (
                <Box
                  key={periode.cle}
                  sx={{
                    width: `${largeurPeriode}%`,
                    borderRight: "1px solid #eee",
                    py: 0.25,
                    fontSize: 11,
                    color: "text.secondary",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  }}
                >
                  {periode.libelle}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Corps */}
        {lignes.map((ligne) => {
          const estSelectionnee = ligneSelectionnee === ligne.id;
          const afficherDuree = doitAfficherDuree(ligne);
          const barreCliquable = Boolean(onBasculerDuree && ligne.barre);
          return (
            <Box
              key={`${ligne.type_element}-${ligne.id}`}
              onClick={
                onSelectionLigne ? () => onSelectionLigne(ligne) : undefined
              }
              sx={{
                display: "flex",
                minHeight: hauteurLigne,
                borderBottom: "1px solid #f0f0f0",
                backgroundColor: estSelectionnee
                  ? "rgba(25, 118, 210, 0.08)"
                  : ligne.estTitre
                  ? "#f5f7fa"
                  : "transparent",
                cursor: onSelectionLigne ? "pointer" : "default",
                "&:hover": onSelectionLigne
                  ? { backgroundColor: "rgba(25, 118, 210, 0.04)" }
                  : {},
              }}
            >
              <Box
                sx={{
                  width: LARGEUR_LIBELLES,
                  minWidth: LARGEUR_LIBELLES,
                  borderRight: "1px solid #e0e0e0",
                  display: "flex",
                  alignItems: "center",
                  px: 1,
                  pl: ligne.indente ? 3 : 1,
                  fontSize: 13,
                  fontWeight: ligne.estTitre ? 700 : 400,
                  color: ligne.estTitre ? "#1a2b4c" : "inherit",
                }}
                title={ligne.libelle}
              >
                <Box
                  component="span"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ligne.libelle || "(sans désignation)"}
                </Box>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {/* Trame verticale */}
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    pointerEvents: "none",
                  }}
                >
                  {axe.periodes.map((periode) => (
                    <Box
                      key={periode.cle}
                      sx={{
                        width: `${largeurPeriode}%`,
                        borderRight: "1px solid #f2f2f2",
                      }}
                    />
                  ))}
                </Box>

                {ligne.barre && (
                  <Box
                    onClick={
                      barreCliquable
                        ? (event) => {
                            event.stopPropagation();
                            onBasculerDuree(ligne);
                          }
                        : undefined
                    }
                    sx={{
                      position: "absolute",
                      left: `${ligne.barre.gauche}%`,
                      width: `${ligne.barre.largeur}%`,
                      height:
                        ligne.estTitre && !afficherDuree
                          ? 8
                          : hauteurLigne - 14,
                      backgroundColor: ligne.couleur || "#1976d2",
                      borderRadius: ligne.estTitre ? "2px" : "3px",
                      opacity: ligne.estTitre && !afficherDuree ? 0.55 : 1,
                      display: "flex",
                      alignItems: "center",
                      px: 0.75,
                      boxSizing: "border-box",
                      cursor: barreCliquable ? "pointer" : "default",
                    }}
                    title={
                      barreCliquable
                        ? `${ligne.libelle} : ${formatDateFr(
                            ligne.date_debut
                          )} au ${formatDateFr(ligne.date_fin)} — Cliquer pour ${
                            afficherDuree ? "masquer" : "afficher"
                          } la durée`
                        : `${ligne.libelle} : ${formatDateFr(
                            ligne.date_debut
                          )} au ${formatDateFr(ligne.date_fin)}`
                    }
                  >
                    {afficherDuree && (
                      <Box
                        component="span"
                        sx={{
                          fontSize: 11,
                          color: "#fff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                          pointerEvents: "none",
                        }}
                      >
                        {ligne.barre.duree} j
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default GanttTimeline;
