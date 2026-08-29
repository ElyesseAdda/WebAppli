import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HistoryIcon from "@mui/icons-material/History";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SaveIcon from "@mui/icons-material/Save";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Popover,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ColorPicker from "../Devis/LignesSpeciales/ColorPicker";
import GanttDesignationInput from "./GanttDesignationInput";
import GanttHistoriqueDrawer from "./GanttHistoriqueDrawer";
import GanttStatutBadge from "./GanttStatutBadge";
import GanttTimeline from "./GanttTimeline";
import { doitAfficherDuree } from "./ganttLayout";

const COULEUR_DEFAUT = "#1976d2";
const DELAI_AUTOSAVE = 1500;

const BOUTONS_BARRE = {
  historique: { bgcolor: "#546e7a", "&:hover": { bgcolor: "#455a64" } },
  apercu: { bgcolor: "#0288d1", "&:hover": { bgcolor: "#0277bd" } },
  pdf: { bgcolor: "#c62828", "&:hover": { bgcolor: "#b71c1c" } },
  drive: { bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } },
};

/**
 * Regroupe les éléments en blocs « titre + ses lignes » pour le réordonnancement.
 *
 * Le regroupement suit l'ordre d'affichage dans le tableau : les lignes qui
 * suivent un titre appartiennent à ce titre jusqu'au titre suivant. Les lignes
 * sans titre parent (en tête de liste ou entre deux blocs) forment un bloc
 * orphelin commun — indispensable pour que monter/descendre fonctionne entre
 * elles (l'ancienne logique créait un bloc par ligne orpheline).
 */
const construireBlocs = (elements) => {
  const blocs = [];

  elements.forEach((element) => {
    if (element.type_element === "titre") {
      blocs.push({ titre: element, lignes: [] });
      return;
    }

    const dernier = blocs[blocs.length - 1];
    if (dernier?.titre) {
      dernier.lignes.push(element);
    } else if (dernier && !dernier.titre) {
      dernier.lignes.push(element);
    } else {
      blocs.push({ titre: null, lignes: [element] });
    }
  });

  return blocs;
};

/** Reconstruit la liste à plat en réattribuant l'ordre d'affichage. */
const aplatirBlocs = (blocs) => {
  const resultat = [];
  blocs.forEach((bloc) => {
    if (bloc.titre) resultat.push(bloc.titre);
    bloc.lignes.forEach((ligne) => {
      resultat.push({
        ...ligne,
        parent: bloc.titre ? bloc.titre.id : null,
      });
    });
  });
  return resultat.map((element, index) => ({ ...element, ordre: index }));
};

/** Masque les lignes des sections repliées, en conservant les titres visibles. */
const filtrerElementsVisibles = (elements, titresReplies) => {
  if (!titresReplies?.size) return elements;

  const resultat = [];
  construireBlocs(elements).forEach((bloc) => {
    if (bloc.titre) {
      resultat.push(bloc.titre);
      if (!titresReplies.has(bloc.titre.id)) {
        resultat.push(...bloc.lignes);
      }
    } else {
      resultat.push(...bloc.lignes);
    }
  });
  return resultat;
};

/**
 * Reporte les identifiants attribués par le serveur sur l'état local, sans
 * écraser les valeurs saisies.
 *
 * Un remplacement pur de l'état ferait perdre le texte en cours de frappe si
 * l'enregistrement automatique aboutit pendant la saisie. Le rapprochement se
 * fait par `ordre`, que le serveur conserve tel qu'il l'a reçu.
 */
const fusionnerIdentifiants = (locaux, distants) => {
  const parOrdre = new Map(distants.map((element) => [element.ordre, element]));
  const correspondance = new Map();
  locaux.forEach((local) => {
    const distant = parOrdre.get(local.ordre);
    if (distant) correspondance.set(local.id, distant.id);
  });
  return locaux.map((local) => ({
    ...local,
    id: correspondance.has(local.id) ? correspondance.get(local.id) : local.id,
    parent:
      local.parent != null && correspondance.has(local.parent)
        ? correspondance.get(local.parent)
        : local.parent,
  }));
};

const GanttDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [diagramme, setDiagramme] = useState(null);
  const [elements, setElements] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [modifie, setModifie] = useState(false);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const [couleurCible, setCouleurCible] = useState(null);
  const [message, setMessage] = useState(null);
  const [erreur, setErreur] = useState(null);
  // Incrémentée à chaque modification : relance la temporisation d'autosave et
  // permet de savoir si l'utilisateur a encore édité pendant un enregistrement.
  const [revision, setRevision] = useState(0);
  const [titresReplies, setTitresReplies] = useState(() => new Set());

  const compteurTemporaire = useRef(-1);
  const compteurCle = useRef(0);
  const revisionRef = useRef(0);
  const sauvegardeEnCours = useRef(null);
  // Miroirs de l'état : la sauvegarde lit toujours les valeurs les plus
  // récentes, même si elle a dû attendre la fin d'un enregistrement précédent.
  const elementsRef = useRef([]);
  const diagrammeRef = useRef(null);

  const estTermine = diagramme?.statut === "termine";

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    diagrammeRef.current = diagramme;
  }, [diagramme]);

  const marquerModifie = () => {
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    setModifie(true);
  };

  /** Clé d'affichage stable, indépendante de l'identifiant en base.
   *
   * Indispensable : quand un identifiant temporaire est remplacé par celui
   * attribué par le serveur, une clé basée sur l'id démonterait la ligne et
   * ferait perdre le focus du champ en cours de saisie.
   */
  const nouvelleCle = () => {
    compteurCle.current += 1;
    return `ligne-${compteurCle.current}`;
  };

  const avecCles = (liste) =>
    liste.map((element) => ({ ...element, cle: nouvelleCle() }));

  const chargerDiagramme = useCallback(async () => {
    try {
      const res = await axios.get(`/api/gantt/diagrammes/${id}/`);
      setDiagramme(res.data);
      setElements(
        avecCles([...(res.data.elements || [])].sort((a, b) => a.ordre - b.ordre))
      );
      setModifie(false);
    } catch (e) {
      setErreur("Impossible de charger ce diagramme.");
    } finally {
      setChargement(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    chargerDiagramme();
    axios
      .get("/api/chantier/")
      .then((res) => setChantiers(res.data || []))
      .catch(() => setChantiers([]));
  }, [chargerDiagramme]);

  const enregistrer = useCallback(
    async (silencieux = false) => {
      // Deux PUT concurrents se marcheraient dessus : le second attend le premier.
      if (sauvegardeEnCours.current) {
        try {
          await sauvegardeEnCours.current;
        } catch (e) {
          // L'échec a déjà été signalé par l'appel précédent.
        }
      }

      const courant = diagrammeRef.current;
      if (!courant) return;

      const revisionEnvoi = revisionRef.current;
      setEnregistrement(true);
      const requete = axios.put(`/api/gantt/diagrammes/${id}/`, {
        nom: courant.nom,
        description: courant.description || "",
        chantier: courant.chantier,
        echelle: courant.echelle,
        elements: elementsRef.current.map((element) => ({
          id: element.id,
          type_element: element.type_element,
          parent: element.parent,
          libelle: element.libelle || "",
          date_debut: element.date_debut || null,
          date_fin: element.date_fin || null,
          couleur: element.couleur || COULEUR_DEFAUT,
          ordre: element.ordre,
          commentaire: element.commentaire || "",
          afficher_duree: element.afficher_duree ?? null,
        })),
      });
      sauvegardeEnCours.current = requete;

      try {
        const res = await requete;
        // Seules les métadonnées gérées par le serveur sont reprises : tout
        // remplacer écraserait une saisie en cours.
        setDiagramme((precedent) => ({
          ...precedent,
          statut: res.data.statut,
          date_modification: res.data.date_modification,
          modified_by_nom: res.data.modified_by_nom,
        }));
        setElements((precedents) =>
          fusionnerIdentifiants(precedents, res.data.elements || [])
        );
        // Si l'utilisateur a continué à éditer pendant la requête, le diagramme
        // reste marqué comme modifié pour déclencher un nouvel enregistrement.
        if (revisionRef.current === revisionEnvoi) setModifie(false);
        if (!silencieux) setMessage("Diagramme enregistré.");
      } catch (e) {
        setErreur(
          e.response?.data?.error || "Erreur lors de l'enregistrement."
        );
      } finally {
        sauvegardeEnCours.current = null;
        setEnregistrement(false);
      }
    },
    [id]
  );

  // Autosave réservé aux brouillons : sur un diagramme validé, chaque
  // enregistrement génère de l'historique et doit donc rester volontaire.
  useEffect(() => {
    if (!modifie || estTermine) return undefined;
    const timer = setTimeout(() => enregistrer(true), DELAI_AUTOSAVE);
    return () => clearTimeout(timer);
  }, [revision, modifie, estTermine, enregistrer]);

  const majDiagramme = (patch) => {
    setDiagramme((precedent) => ({ ...precedent, ...patch }));
    marquerModifie();
  };

  const majElement = (elementId, patch) => {
    setElements((precedents) =>
      precedents.map((element) =>
        element.id === elementId ? { ...element, ...patch } : element
      )
    );
    marquerModifie();
  };

  const ajouterTitre = () => {
    const nouvelId = compteurTemporaire.current--;
    setElements((precedents) => [
      ...precedents,
      {
        id: nouvelId,
        cle: nouvelleCle(),
        type_element: "titre",
        parent: null,
        libelle: "",
        date_debut: null,
        date_fin: null,
        couleur: "#455a64",
        ordre: precedents.length,
        commentaire: "",
      },
    ]);
    marquerModifie();
  };

  const ajouterLigne = (parentId = null) => {
    const nouvelId = compteurTemporaire.current--;
    const nouvelle = {
      id: nouvelId,
      cle: nouvelleCle(),
      type_element: "ligne",
      parent: parentId,
      libelle: "",
      date_debut: null,
      date_fin: null,
      couleur: COULEUR_DEFAUT,
      ordre: 0,
      commentaire: "",
    };
    setElements((precedents) => {
      if (!parentId) return aplatirBlocs(construireBlocs([...precedents, nouvelle]));
      // Insère la ligne juste après la dernière ligne de son titre
      const copie = [...precedents];
      let indexInsertion = copie.findIndex((e) => e.id === parentId) + 1;
      while (
        indexInsertion < copie.length &&
        copie[indexInsertion].type_element !== "titre"
      ) {
        indexInsertion += 1;
      }
      copie.splice(indexInsertion, 0, nouvelle);
      return aplatirBlocs(construireBlocs(copie));
    });
    marquerModifie();
  };

  const supprimerElement = (element) => {
    setElements((precedents) => {
      const restants =
        element.type_element === "titre"
          ? precedents.filter(
              (e) => e.id !== element.id && e.parent !== element.id
            )
          : precedents.filter((e) => e.id !== element.id);
      return aplatirBlocs(construireBlocs(restants));
    });
    marquerModifie();
  };

  const deplacer = (element, direction) => {
    setElements((precedents) => {
      const blocs = construireBlocs(precedents);

      if (element.type_element === "titre") {
        const index = blocs.findIndex(
          (b) => b.titre && b.titre.id === element.id
        );
        const cible = index + direction;
        if (index < 0 || cible < 0 || cible >= blocs.length) return precedents;
        [blocs[index], blocs[cible]] = [blocs[cible], blocs[index]];
        return aplatirBlocs(blocs);
      }

      const bloc = blocs.find((b) =>
        b.lignes.some((l) => l.id === element.id)
      );
      if (!bloc) return precedents;
      const index = bloc.lignes.findIndex((l) => l.id === element.id);
      const cible = index + direction;
      if (cible < 0 || cible >= bloc.lignes.length) return precedents;
      [bloc.lignes[index], bloc.lignes[cible]] = [
        bloc.lignes[cible],
        bloc.lignes[index],
      ];
      return aplatirBlocs(blocs);
    });
    marquerModifie();
  };

  const valider = async () => {
    if (modifie) await enregistrer(true);
    try {
      const res = await axios.post(`/api/gantt/diagrammes/${id}/valider/`);
      setDiagramme(res.data);
      setMessage(
        "Diagramme validé. Les modifications suivantes seront tracées dans l'historique."
      );
    } catch (e) {
      setErreur(e.response?.data?.error || "Validation impossible.");
    }
  };

  const rouvrir = async () => {
    try {
      const res = await axios.post(`/api/gantt/diagrammes/${id}/rouvrir/`);
      setDiagramme(res.data);
      setMessage("Diagramme rouvert en brouillon.");
    } catch (e) {
      setErreur(e.response?.data?.error || "Réouverture impossible.");
    }
  };

  const previsualiser = async () => {
    // L'onglet est ouvert avant l'await, sinon le navigateur bloque la popup.
    const onglet = window.open("", "_blank");
    if (modifie) await enregistrer(true);
    const url = `/api/preview-gantt/${id}/`;
    if (onglet) onglet.location.href = url;
    else window.open(url, "_blank");
  };

  const exporterPdf = async () => {
    if (modifie) await enregistrer(true);
    try {
      const res = await axios.get(`/api/gantt/diagrammes/${id}/pdf/`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const lien = document.createElement("a");
      lien.href = url;
      lien.setAttribute("download", `Gantt - ${diagramme.nom}.pdf`);
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErreur("Erreur lors de la génération du PDF.");
    }
  };

  const enregistrerDansDrive = async () => {
    if (modifie) await enregistrer(true);
    try {
      const res = await axios.get("/api/generate-gantt-pdf-drive/", {
        params: { diagramme_id: id },
      });
      if (res.data.success) setMessage("PDF enregistré dans le Drive.");
      else setErreur(res.data.error || "Enregistrement Drive impossible.");
    } catch (e) {
      setErreur("Erreur lors de l'enregistrement dans le Drive.");
    }
  };

  const chantierSelectionne = useMemo(
    () => chantiers.find((c) => c.id === diagramme?.chantier) || null,
    [chantiers, diagramme]
  );

  const blocs = useMemo(() => construireBlocs(elements), [elements]);

  const nbLignesParTitre = useMemo(() => {
    const map = new Map();
    blocs.forEach((bloc) => {
      if (bloc.titre) map.set(bloc.titre.id, bloc.lignes.length);
    });
    return map;
  }, [blocs]);

  const titresRepliables = useMemo(
    () => blocs.filter((b) => b.titre && b.lignes.length > 0).map((b) => b.titre.id),
    [blocs]
  );

  const elementsVisibles = useMemo(
    () => filtrerElementsVisibles(elements, titresReplies),
    [elements, titresReplies]
  );

  const basculerSection = (titreId) => {
    setTitresReplies((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(titreId)) suivant.delete(titreId);
      else suivant.add(titreId);
      return suivant;
    });
  };

  const toutReplier = () => setTitresReplies(new Set(titresRepliables));
  const toutDeplier = () => setTitresReplies(new Set());

  const basculerAfficherDuree = (ligne) => {
    if (!ligne.barre) return;
    majElement(ligne.id, { afficher_duree: !doitAfficherDuree(ligne) });
  };

  if (chargement) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!diagramme) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Diagramme introuvable.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}
      >
        <IconButton
          onClick={() => navigate("/gantt")}
          size="small"
          sx={{ color: "#fff" }}
        >
          <ArrowBackIcon />
        </IconButton>
        <TextField
          value={diagramme.nom}
          onChange={(e) => majDiagramme({ nom: e.target.value })}
          variant="standard"
          placeholder="Nom du diagramme"
          sx={{
            minWidth: 260,
            "& input": { fontSize: 20, fontWeight: 600, color: "#fff" },
            "& input::placeholder": { color: "rgba(255,255,255,0.65)", opacity: 1 },
            "& .MuiInput-underline:before": { borderBottomColor: "rgba(255,255,255,0.5)" },
            "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
              borderBottomColor: "#fff",
            },
            "& .MuiInput-underline:after": { borderBottomColor: "#fff" },
          }}
        />
        <GanttStatutBadge statut={diagramme.statut} variant="header" />
        {enregistrement && (
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)" }}>
            Enregistrement...
          </Typography>
        )}
        {!enregistrement && modifie && !estTermine && (
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)" }}>
            Modifications non enregistrées
          </Typography>
        )}

        <Box sx={{ flex: 1 }} />

        {estTermine && (
          <Button
            size="small"
            startIcon={<SaveIcon />}
            variant="contained"
            disabled={!modifie}
            onClick={() => enregistrer(false)}
          >
            Enregistrer
          </Button>
        )}
        <Button
          size="small"
          variant="contained"
          startIcon={<HistoryIcon />}
          onClick={() => setHistoriqueOuvert(true)}
          sx={{ color: "#fff", ...BOUTONS_BARRE.historique }}
        >
          Historique
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<VisibilityIcon />}
          onClick={previsualiser}
          sx={{ color: "#fff", ...BOUTONS_BARRE.apercu }}
        >
          Aperçu
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={exporterPdf}
          sx={{ color: "#fff", ...BOUTONS_BARRE.pdf }}
        >
          PDF
        </Button>
        {diagramme.chantier && (
          <Button
            size="small"
            variant="contained"
            onClick={enregistrerDansDrive}
            sx={{ color: "#fff", ...BOUTONS_BARRE.drive }}
          >
            Drive
          </Button>
        )}
        {estTermine ? (
          <Button
            size="small"
            color="warning"
            startIcon={<LockOpenIcon />}
            onClick={rouvrir}
          >
            Rouvrir
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<TaskAltIcon />}
            onClick={valider}
          >
            Valider
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Autocomplete
            size="small"
            sx={{ minWidth: 280 }}
            options={chantiers}
            value={chantierSelectionne}
            getOptionLabel={(option) => option.chantier_name || ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(event, option) =>
              majDiagramme({ chantier: option ? option.id : null })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Chantier lié (optionnel)"
                placeholder="Aucun chantier"
              />
            )}
          />
          <TextField
            select
            size="small"
            label="Échelle"
            value={diagramme.echelle}
            onChange={(e) => majDiagramme({ echelle: e.target.value })}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="jour">Jour</MenuItem>
            <MenuItem value="semaine">Semaine</MenuItem>
            <MenuItem value="mois">Mois</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="Description"
            value={diagramme.description || ""}
            onChange={(e) => majDiagramme({ description: e.target.value })}
            sx={{ flex: 1, minWidth: 240 }}
          />
        </Box>
      </Paper>

      <Paper sx={{ mb: 2, overflow: "hidden" }}>
        {titresRepliables.length > 0 && (
          <Box
            sx={{
              px: 1.5,
              py: 0.75,
              display: "flex",
              gap: 1,
              borderBottom: "1px solid #eee",
              backgroundColor: "#fafbfc",
            }}
          >
            <Button size="small" onClick={toutDeplier}>
              Tout déplier
            </Button>
            <Button size="small" onClick={toutReplier}>
              Tout replier
            </Button>
          </Box>
        )}
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f7fa" }}>
              <TableCell sx={{ width: 40 }} />
              <TableCell>Désignation</TableCell>
              <TableCell sx={{ width: 160 }}>Début</TableCell>
              <TableCell sx={{ width: 160 }}>Fin</TableCell>
              <TableCell sx={{ width: 70 }}>Couleur</TableCell>
              <TableCell sx={{ width: 130 }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {elementsVisibles.map((element) => {
              const estTitre = element.type_element === "titre";
              const estReplie = estTitre && titresReplies.has(element.id);
              const nbLignes = nbLignesParTitre.get(element.id) || 0;
              return (
                <TableRow
                  key={element.cle || element.id}
                  sx={{
                    backgroundColor: estTitre ? "#f5f7fa" : "inherit",
                  }}
                >
                  <TableCell
                    sx={{
                      width: 40,
                      borderLeft: `4px solid ${element.couleur || COULEUR_DEFAUT}`,
                    }}
                  />
                  <TableCell sx={{ pl: estTitre ? 1 : 4 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        fontWeight: estTitre ? 700 : 400,
                        "& input": estTitre ? { fontWeight: 700 } : {},
                      }}
                    >
                      {estTitre && nbLignes > 0 && (
                        <Tooltip title={estReplie ? "Déplier la section" : "Replier la section"}>
                          <IconButton
                            size="small"
                            onClick={() => basculerSection(element.id)}
                            sx={{ p: 0.25, flexShrink: 0 }}
                          >
                            {estReplie ? (
                              <ChevronRightIcon fontSize="small" />
                            ) : (
                              <ExpandMoreIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <GanttDesignationInput
                          valeur={element.libelle}
                          typeElement={element.type_element}
                          placeholder={estTitre ? "Titre de section" : "Désignation"}
                          onChange={(valeur) =>
                            majElement(element.id, { libelle: valeur })
                          }
                          onCouleurSuggeree={(couleur) =>
                            majElement(element.id, { couleur })
                          }
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {!estTitre && (
                      <TextField
                        type="date"
                        variant="standard"
                        size="small"
                        value={element.date_debut || ""}
                        onChange={(e) =>
                          majElement(element.id, {
                            date_debut: e.target.value || null,
                          })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {!estTitre && (
                      <TextField
                        type="date"
                        variant="standard"
                        size="small"
                        value={element.date_fin || ""}
                        onChange={(e) =>
                          majElement(element.id, {
                            date_fin: e.target.value || null,
                          })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box
                      onClick={(e) =>
                        setCouleurCible({
                          ancre: e.currentTarget,
                          element,
                        })
                      }
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        cursor: "pointer",
                        backgroundColor: element.couleur || COULEUR_DEFAUT,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Monter">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => deplacer(element, -1)}
                        >
                          <ArrowUpwardIcon fontSize="inherit" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Descendre">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => deplacer(element, 1)}
                        >
                          <ArrowDownwardIcon fontSize="inherit" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    {estTitre && (
                      <Tooltip title="Ajouter une ligne dans cette section">
                        <IconButton
                          size="small"
                          onClick={() => ajouterLigne(element.id)}
                        >
                          <AddIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip
                      title={
                        estTitre
                          ? "Supprimer le titre et ses lignes"
                          : "Supprimer la ligne"
                      }
                    >
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => supprimerElement(element)}
                      >
                        <DeleteOutlineIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {!elements.length && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Ce diagramme est vide. Commencez par ajouter un titre ou une
                    ligne.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
          <Button size="small" startIcon={<AddIcon />} onClick={ajouterTitre}>
            Ajouter un titre
          </Button>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => ajouterLigne(null)}
          >
            Ajouter une ligne
          </Button>
        </Box>
      </Paper>

      <GanttTimeline
        elements={elements}
        echelle={diagramme.echelle}
        onBasculerDuree={basculerAfficherDuree}
      />

      <Popover
        open={Boolean(couleurCible)}
        anchorEl={couleurCible?.ancre}
        onClose={() => setCouleurCible(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, width: 260 }}>
          <ColorPicker
            label="Couleur de la barre"
            value={couleurCible?.element?.couleur || COULEUR_DEFAUT}
            onChange={(couleur) => {
              if (couleurCible) {
                majElement(couleurCible.element.id, { couleur });
                setCouleurCible((precedent) => ({
                  ...precedent,
                  element: { ...precedent.element, couleur },
                }));
              }
            }}
          />
        </Box>
      </Popover>

      <GanttHistoriqueDrawer
        open={historiqueOuvert}
        onClose={() => setHistoriqueOuvert(false)}
        diagrammeId={id}
      />

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
      >
        <Alert severity="success" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(erreur)}
        autoHideDuration={6000}
        onClose={() => setErreur(null)}
      >
        <Alert severity="error" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GanttDetail;
