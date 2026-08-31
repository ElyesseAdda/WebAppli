import { Box, Typography } from "@mui/material";
import React, { useMemo } from "react";
import { calculerLayout, cheminEnchainement, formatDateFr, libelleDatesPlage, modeDatesBarre } from "./ganttLayout";
import { sxBarreGantt } from "./ganttBarStyles";

const LARGEUR_LIBELLES = 220;
const LARGEUR_DUREE = 40;
const HAUTEUR_LIGNE = 52;
const HAUTEUR_BARRE = 14;

const stylesColonneFixe = {
  borderRight: "1px solid #e0e0e0",
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
};

const stylesColonneDuree = (largeur) => ({
  ...stylesColonneFixe,
  width: largeur,
  minWidth: largeur,
  maxWidth: largeur,
  px: 0,
  justifyContent: "center",
  textAlign: "center",
});

/**
 * Rendu visuel d'un diagramme : libellés, dates, puis grille de périodes et barres.
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
}) => {
  const { axe, lignes, enchainements } = useMemo(
    () => calculerLayout(elements, echelle),
    [elements, echelle]
  );

  const hauteurLigne = compact ? 32 : HAUTEUR_LIGNE;
  const hauteurBarre = compact ? 10 : HAUTEUR_BARRE;
  const largeurDuree = compact ? 36 : LARGEUR_DUREE;
  const largeurLibelles = compact ? 200 : LARGEUR_LIBELLES;

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
      <Box sx={{ minWidth: axe.periodes.length > 18 ? 900 + largeurDuree : "100%" }}>
        {/* En-tête : groupes (mois ou année) puis périodes */}
        <Box sx={{ display: "flex", borderBottom: "1px solid #e0e0e0" }}>
          <Box
            sx={{
              ...stylesColonneFixe,
              width: largeurLibelles,
              minWidth: largeurLibelles,
              backgroundColor: "#f5f7fa",
              px: 1,
              fontSize: 12,
              fontWeight: 600,
              color: "#1a2b4c",
            }}
          >
            Désignation
          </Box>
          <Box
            sx={{
              ...stylesColonneDuree(largeurDuree),
              backgroundColor: "#f5f7fa",
              fontSize: 10,
              fontWeight: 600,
              color: "#1a2b4c",
            }}
          >
            Durée
          </Box>
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
        <Box sx={{ position: "relative" }}>
          {enchainements.length > 0 && (
            <Box
              sx={{
                position: "absolute",
                left: largeurLibelles + largeurDuree,
                right: 0,
                top: 0,
                bottom: 0,
                pointerEvents: "none",
                zIndex: 3,
              }}
            >
              <Box
                component="svg"
                viewBox={`0 0 100 ${lignes.length * 100}`}
                preserveAspectRatio="none"
                sx={{ width: "100%", height: "100%", display: "block" }}
              >
                <defs>
                  <marker
                    id="gantt-fleche"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="#8a94a6" />
                  </marker>
                </defs>
                {enchainements.map((lien, index) => (
                  <path
                    key={`${lien.indexDe}-${lien.indexVers}-${index}`}
                    d={cheminEnchainement(lien)}
                    fill="none"
                    stroke="#8a94a6"
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                    markerEnd="url(#gantt-fleche)"
                  />
                ))}
              </Box>
            </Box>
          )}

          {lignes.map((ligne) => {
          const estSelectionnee = ligneSelectionnee === ligne.id;
          const texteDates = libelleDatesPlage(ligne);
          const affichageDates = ligne.barre
            ? modeDatesBarre(
                ligne.barre.largeur,
                ligne.date_debut,
                ligne.date_fin
              )
            : { mode: "none" };

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
                overflow: "visible",
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
                  ...stylesColonneFixe,
                  width: largeurLibelles,
                  minWidth: largeurLibelles,
                  px: 1,
                  pl: ligne.indente ? 3 : 1,
                  fontSize: compact ? 12 : 13,
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
                  ...stylesColonneDuree(largeurDuree),
                  fontSize: compact ? 10 : 11,
                  color: texteDates ? "text.secondary" : "transparent",
                  fontWeight: ligne.estTitre ? 600 : 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
                title={texteDates}
              >
                {texteDates || "—"}
              </Box>

              <Box
                sx={{
                  flex: 1,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  overflow: "visible",
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
                  <>
                    <Box
                      sx={{
                        position: "absolute",
                        left: `${ligne.barre.gauche}%`,
                        width: `${ligne.barre.largeur}%`,
                        top: 0,
                        bottom: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        overflow: "visible",
                        pointerEvents: "none",
                        zIndex: 1,
                      }}
                      title={`${ligne.libelle} : ${formatDateFr(
                        ligne.date_debut
                      )} au ${formatDateFr(ligne.date_fin)}`}
                    >
                      <Box
                        component="span"
                        sx={{
                          fontSize: compact ? 9 : 10,
                          lineHeight: 1.15,
                          color: ligne.estTitre ? "#1a2b4c" : "text.secondary",
                          fontWeight: ligne.estTitre ? 700 : 500,
                          whiteSpace: "nowrap",
                          width: "max-content",
                          maxWidth: "none",
                          overflow: "visible",
                          mb: 0.25,
                          position: "relative",
                          zIndex: 2,
                        }}
                      >
                        {ligne.libelle || "(sans désignation)"}
                      </Box>
                      <Box
                        sx={{
                          width: "100%",
                          height: ligne.estTitre ? 6 : hauteurBarre,
                          flexShrink: 0,
                          ...sxBarreGantt(
                            ligne.couleur,
                            ligne.style_barre || "plein",
                            ligne.estTitre
                          ),
                        }}
                      />
                    </Box>
                    {affichageDates.mode !== "none" && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: compact ? 2 : 4,
                          overflow: "visible",
                          pointerEvents: "none",
                          zIndex: 2,
                          height: compact ? 10 : 12,
                          ...(affichageDates.mode === "separees"
                            ? {
                                left: `${ligne.barre.gauche}%`,
                                width: `${ligne.barre.largeur}%`,
                              }
                            : {
                                left: `${ligne.barre.centre}%`,
                                transform: "translateX(-50%)",
                                width: "max-content",
                                maxWidth: "none",
                              }),
                        }}
                      >
                        {(affichageDates.mode === "combinee" ||
                          affichageDates.mode === "unique") && (
                          <Box
                            component="span"
                            sx={{
                              fontSize: compact ? 8 : 9,
                              color: "text.secondary",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {affichageDates.texte}
                          </Box>
                        )}
                        {affichageDates.mode === "separees" && (
                          <>
                            <Box
                              component="span"
                              sx={{
                                position: "absolute",
                                left: 0,
                                top: 0,
                                fontSize: compact ? 8 : 9,
                                color: "text.secondary",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                width: "max-content",
                              }}
                            >
                              {affichageDates.debut}
                            </Box>
                            <Box
                              component="span"
                              sx={{
                                position: "absolute",
                                right: 0,
                                top: 0,
                                fontSize: compact ? 8 : 9,
                                color: "text.secondary",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                width: "max-content",
                              }}
                            >
                              {affichageDates.fin}
                            </Box>
                          </>
                        )}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Box>
          );
        })}
        </Box>
      </Box>
    </Box>
  );
};

export default GanttTimeline;
