import {
  Box,
  Button,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Modal,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const MOIS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
];

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxHeight: "90vh",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  overflow: "auto",
};

// Composant pour une ligne de partie
const PartieRow = ({ partie, handlePourcentageChange }) => {
  const [open, setOpen] = useState(false);

  // Calculer le pourcentage moyen et le montant de la partie directement
  let moyennePartie = 0;
  let montantPartie = 0;

  if (partie.sous_parties.length > 0) {
    let totalPourcentage = 0;
    partie.sous_parties.forEach((sousPartie) => {
      if (sousPartie.lignes.length > 0) {
        const pourcentageSousPartie =
          sousPartie.lignes.reduce(
            (acc, ligne) => acc + (ligne.pourcentage_actuel || 0),
            0
          ) / sousPartie.lignes.length;
        totalPourcentage += pourcentageSousPartie;

        montantPartie += sousPartie.lignes.reduce(
          (acc, ligne) =>
            acc + (ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100,
          0
        );
      }
    });
    moyennePartie = totalPourcentage / partie.sous_parties.length;
  }

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: "rgba(27, 120, 188, 1)",
          "& td": { color: "white", padding: "8px" },
        }}
      >
        <TableCell>
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ color: "white" }}
          >
            {open ? <FaChevronUp /> : <FaChevronDown />}
          </IconButton>
        </TableCell>
        <TableCell>{partie.titre}</TableCell>
        <TableCell align="center"></TableCell>
        <TableCell align="center"></TableCell>
        <TableCell align="center"></TableCell>
        <TableCell align="right">{moyennePartie.toFixed(2)}%</TableCell>
        <TableCell align="right">
          {montantPartie.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box>
              {partie.sous_parties.map((sousPartie) => (
                <SousPartieTable
                  key={sousPartie.id}
                  sousPartie={sousPartie}
                  handlePourcentageChange={handlePourcentageChange}
                />
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// Composant pour une sous-partie
const SousPartieTable = ({ sousPartie, handlePourcentageChange }) => {
  const [open, setOpen] = useState(false);

  // Calculer le pourcentage moyen et le montant de la sous-partie directement
  let moyenneSousPartie = 0;
  let montantSousPartie = 0;

  if (sousPartie.lignes.length > 0) {
    moyenneSousPartie =
      sousPartie.lignes.reduce(
        (acc, ligne) => acc + (ligne.pourcentage_actuel || 0),
        0
      ) / sousPartie.lignes.length;

    montantSousPartie = sousPartie.lignes.reduce(
      (acc, ligne) =>
        acc + (ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100,
      0
    );
  }

  return (
    <Box>
      <Table>
        <TableBody>
          <TableRow
            sx={{
              backgroundColor: "rgb(157, 197, 226)",
              "& td": { padding: "8px" },
            }}
          >
            <TableCell>
              <IconButton size="small" onClick={() => setOpen(!open)}>
                {open ? <FaChevronUp /> : <FaChevronDown />}
              </IconButton>
            </TableCell>
            <TableCell>{sousPartie.description}</TableCell>
            <TableCell align="right"></TableCell>
            <TableCell align="right"></TableCell>
            <TableCell align="right"></TableCell>
            <TableCell align="right">{moyenneSousPartie.toFixed(2)}%</TableCell>
            <TableCell align="right">
              {montantSousPartie
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
              €
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Table>
          <TableBody>
            {sousPartie.lignes.map((ligne, index) => (
              <TableRow
                key={ligne.id}
                sx={{
                  backgroundColor:
                    index % 2 === 0 ? "white" : "rgba(0, 0, 0, 0.05)",
                  "& td": { padding: "8px" },
                }}
              >
                <TableCell></TableCell>
                <TableCell>{ligne.description}</TableCell>
                <TableCell align="right">{ligne.quantite}</TableCell>
                <TableCell align="right">{ligne.prix_unitaire} €</TableCell>
                <TableCell align="right">{ligne.total_ht} €</TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    value={ligne.pourcentage_actuel || 0}
                    onChange={(e) =>
                      handlePourcentageChange(
                        ligne.id,
                        parseFloat(e.target.value)
                      )
                    }
                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                    size="small"
                  />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color:
                      (ligne.pourcentage_actuel || 0) > 0
                        ? "rgb(16, 190, 0)"
                        : "rgba(27, 120, 188, 1)",
                    fontWeight: "bold",
                    transition: "color 0.3s ease",
                  }}
                >
                  {((ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100)
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Collapse>
    </Box>
  );
};

const CreationSituation = ({ open, onClose, devis, chantier }) => {
  const [structure, setStructure] = useState([]);
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [commentaire, setCommentaire] = useState("");
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [totalHT, setTotalHT] = useState(0);
  const [totalAvancement, setTotalAvancement] = useState(0);

  useEffect(() => {
    if (devis?.id) {
      axios
        .get(`/api/devis-structure/${devis.id}/structure/`)
        .then((response) => {
          setStructure(response.data);
        })
        .catch((error) => {
          console.error("Erreur lors du chargement de la structure:", error);
          alert("Erreur lors du chargement des données");
        });

      // Charger le chantier si nécessaire
      if (devis.chantier && !chantier) {
        axios
          .get(`/api/chantier/${devis.chantier}/`)
          .then((response) => {
            setSelectedChantier(response.data);
          })
          .catch((error) => {
            console.error("Erreur lors du chargement du chantier:", error);
          });
      }

      // Utiliser price_ht au lieu de montant_ht
      setTotalHT(devis.price_ht || 0);
    }
  }, [devis]);

  // Calculer l'avancement chaque fois que la structure change
  useEffect(() => {
    if (structure.length > 0 && totalHT > 0) {
      let sommeMontantsLignes = 0;
      structure.forEach((partie) => {
        partie.sous_parties.forEach((sousPartie) => {
          sousPartie.lignes.forEach((ligne) => {
            sommeMontantsLignes +=
              (ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100;
          });
        });
      });

      const pourcentageAvancement = (sommeMontantsLignes / totalHT) * 100;
      setTotalAvancement(pourcentageAvancement);
    }
  }, [structure, totalHT]);

  const handlePourcentageChange = (ligneId, value) => {
    const newValue = Math.min(Math.max(0, value), 100);
    const newStructure = [...structure];

    // Parcourir toutes les parties et leurs sous-parties pour trouver la ligne
    newStructure.forEach((partie) => {
      partie.sous_parties.forEach((sousPartie) => {
        const ligne = sousPartie.lignes.find((l) => l.id === ligneId);
        if (ligne) {
          ligne.pourcentage_actuel = newValue;
          ligne.montant = (ligne.total_ht * newValue) / 100;
        }
      });
    });

    setStructure(newStructure);
  };

  const handleSubmit = async () => {
    try {
      const situationData = {
        chantier: chantier.id,
        devis: devis.id,
        mois: parseInt(mois),
        annee: parseInt(annee),
        commentaire,
        lignes: structure.map((partie) => ({
          ligne_devis: partie.id,
          pourcentage_actuel: partie.pourcentage_actuel,
        })),
      };

      await axios.post("/api/situations/", situationData);
      alert("Situation créée avec succès");
      onClose();
    } catch (error) {
      console.error("Erreur lors de la création de la situation:", error);
      alert(
        error.response?.data?.error ||
          "Erreur lors de la création de la situation"
      );
    }
  };

  if (!open || !devis || !chantier) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" component="h2">
            Création d'une situation - {chantier.chantier_name}
          </Typography>
          <Box
            sx={{
              border: "1px solid rgba(0, 0, 0, 0.23)",
              borderRadius: 1,
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              Montant HT:{" "}
              {totalHT.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              Avancement: {totalAvancement.toFixed(2)}%
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Mois</InputLabel>
            <Select
              value={mois}
              onChange={(e) => setMois(e.target.value)}
              label="Mois"
            >
              {MOIS.map((mois) => (
                <MenuItem key={mois.value} value={mois.value}>
                  {mois.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Année"
            type="number"
            value={annee}
            onChange={(e) => setAnnee(e.target.value)}
          />
        </Box>

        <TableContainer
          component={Paper}
          sx={{
            boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.1)",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Description</TableCell>
                <TableCell align="right">Quantité</TableCell>
                <TableCell align="center">Prix unitaire</TableCell>
                <TableCell align="right">Total HT</TableCell>
                <TableCell align="right">% Avancement</TableCell>
                <TableCell align="right">Montant</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {structure.map((partie) => (
                <PartieRow
                  key={partie.id}
                  partie={partie}
                  handlePourcentageChange={handlePourcentageChange}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Commentaire"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button onClick={onClose} variant="outlined">
            Annuler
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Créer la situation
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default CreationSituation;
