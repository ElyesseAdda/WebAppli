import {
  Box,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const TableauSuivi = () => {
  const [chantiers, setChantiers] = useState([]);
  const [selectedChantierId, setSelectedChantierId] = useState("");
  const [chantier, setChantier] = useState(null);
  const [situations, setSituations] = useState([]);
  const [devis, setDevis] = useState(null);
  const [avenants, setAvenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger la liste des chantiers
  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        const response = await axios.get("/api/chantier/");
        setChantiers(response.data);
        if (response.data.length > 0) {
          setSelectedChantierId(response.data[0].id); // Sélectionner le premier chantier par défaut
        }
      } catch (error) {
        console.error("Erreur lors du chargement des chantiers:", error);
      }
    };
    fetchChantiers();
  }, []);

  // Charger les données du chantier sélectionné
  useEffect(() => {
    if (selectedChantierId) {
      setLoading(true);
      Promise.all([
        axios.get(`/api/chantier/${selectedChantierId}/`),
        axios.get(`/api/chantier/${selectedChantierId}/situations/`),
        axios.get(`/api/devis-structure/${selectedChantierId}/structure/`),
        axios.get(`/api/avenant_chantier/${selectedChantierId}/avenants/`),
      ])
        .then(([chantierRes, situationsRes, devisRes, avenantsRes]) => {
          setChantier(chantierRes.data);
          setSituations(situationsRes.data);
          setDevis(devisRes.data);
          if (avenantsRes.data.success) {
            setAvenants(avenantsRes.data.avenants);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des données:", error);
          setLoading(false);
        });
    }
  }, [selectedChantierId]);

  const renderTableauRappel = () => {
    const formatNumber = (value) => {
      const number = parseFloat(value) || 0;
      return (
        <Typography
          sx={{
            color: number !== 0 ? "rgba(27, 120, 188, 1)" : "inherit",
            fontWeight: number !== 0 ? "bold" : "normal",
          }}
        >
          {number.toFixed(2)} €
        </Typography>
      );
    };

    return (
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "rgba(27, 120, 188, 1)" }}>
              <TableCell
                sx={{
                  color: "white",
                  width: "50px",
                  borderRight: "1px solid rgba(224, 224, 224, 1)",
                }}
              >
                N°
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  width: "100px",
                  borderRight: "2px solid rgba(224, 224, 224, 1)",
                }}
              >
                MONTANT HT
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  width: "50px",
                  borderRight: "1px solid rgba(224, 224, 224, 1)",
                }}
              >
                N°
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  width: "100px",
                  borderRight: "2px solid rgba(224, 224, 224, 1)",
                }}
              >
                MONTANT HT
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  width: "50px",
                  borderRight: "1px solid rgba(224, 224, 224, 1)",
                }}
              >
                N°
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  width: "100px",
                }}
              >
                MONTANT HT
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(6)].map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell
                  sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}
                >
                  {rowIndex === 0
                    ? "MARCHÉ"
                    : `AVENANT ${String(rowIndex).padStart(2, "0")}`}
                </TableCell>
                <TableCell
                  sx={{ borderRight: "2px solid rgba(224, 224, 224, 1)" }}
                >
                  {rowIndex === 0
                    ? formatNumber(chantier?.montant_ht)
                    : formatNumber(avenants[rowIndex - 1]?.montant_total)}
                </TableCell>
                <TableCell
                  sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}
                >
                  {`AVENANT ${String(rowIndex + 5).padStart(2, "0")}`}
                </TableCell>
                <TableCell
                  sx={{ borderRight: "2px solid rgba(224, 224, 224, 1)" }}
                >
                  {formatNumber(avenants[rowIndex + 4]?.montant_total)}
                </TableCell>
                <TableCell
                  sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}
                >
                  {`AVENANT ${String(rowIndex + 10).padStart(2, "0")}`}
                </TableCell>
                <TableCell>
                  {formatNumber(avenants[rowIndex + 9]?.montant_total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderTableauFacturation = () => {
    // Fonction helper pour extraire le numéro de situation
    const extractSituationNumber = (numeroSituation) => {
      if (!numeroSituation) return "-";
      const match = numeroSituation.match(/n°(\d+)/);
      return match ? parseInt(match[1]) : numeroSituation;
    };

    // Trier les situations par numéro
    const situationsTriees = [...situations].sort((a, b) => {
      const numA = extractSituationNumber(a.numero_situation);
      const numB = extractSituationNumber(b.numero_situation);
      return numA - numB;
    });

    // Fonction helper pour formater les montants avec la couleur
    const formatMontant = (montant, forceNegative = false, type = null) => {
      const valeur = parseFloat(montant) || 0;
      const isNegatif = forceNegative || valeur < 0 || type === "deduction";
      const couleur = isNegatif ? "error.main" : "rgb(0, 168, 42)";

      return (
        <Typography sx={{ color: couleur }}>
          {isNegatif ? "-" : ""}
          {Math.abs(valeur).toFixed(2)} €
        </Typography>
      );
    };

    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{ backgroundColor: "rgba(27, 120, 188, 1)", color: "white" }}
            >
              <TableCell sx={{ color: "white" }}>Mois</TableCell>
              <TableCell sx={{ color: "white" }}>N° Situation</TableCell>
              <TableCell sx={{ color: "white" }}>
                Montant HT Situation
              </TableCell>
              <TableCell sx={{ color: "white" }}>RG</TableCell>
              {situations[0]?.lignes_supplementaires?.map((ligne) => (
                <TableCell sx={{ color: "white" }} key={ligne.id}>
                  {ligne.description.length > 20
                    ? ligne.description.substring(0, 20) + "..."
                    : ligne.description}
                </TableCell>
              ))}
              <TableCell sx={{ color: "white" }}>Net à payer</TableCell>
              <TableCell sx={{ color: "white" }}>Situation Cumul HT</TableCell>
              <TableCell sx={{ color: "white" }}>Date d'envoi</TableCell>
              <TableCell sx={{ color: "white" }}>Actions</TableCell>
              <TableCell sx={{ color: "white" }}>Montant cumul HT</TableCell>
              <TableCell sx={{ color: "white" }}>Réservé 1</TableCell>
              <TableCell sx={{ color: "white" }}>Réservé 2</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {situationsTriees.map((situation, index) => {
              const cumulHT = situationsTriees
                .slice(0, index + 1)
                .reduce(
                  (sum, s) => sum + (parseFloat(s.montant_total) || 0),
                  0
                );

              return (
                <TableRow
                  key={situation.id}
                  sx={{
                    "&:nth-of-type(odd)": { backgroundColor: "#f5f5f5" },
                    "&:nth-of-type(even)": { backgroundColor: "#ffffff" },
                    "&:hover": { backgroundColor: "#f5f5f5" },
                  }}
                >
                  <TableCell>{`${situation.mois}/${situation.annee}`}</TableCell>
                  <TableCell>
                    {extractSituationNumber(situation.numero_situation)}
                  </TableCell>
                  <TableCell>
                    {formatMontant(
                      parseFloat(situation.montant_apres_retenues) || 0
                    )}
                  </TableCell>
                  <TableCell>
                    {formatMontant(situation.retenue_garantie, true)}
                  </TableCell>
                  {situation.lignes_supplementaires?.map((ligne) => (
                    <TableCell key={ligne.id}>
                      {formatMontant(ligne.montant, false, ligne.type)}
                    </TableCell>
                  ))}
                  <TableCell>
                    {formatMontant(
                      (parseFloat(situation.montant_apres_retenues) || 0) +
                        (parseFloat(situation.tva) || 0)
                    )}
                  </TableCell>

                  <TableCell>{situation.cumul_precedent || 0}</TableCell>
                  <TableCell>{situation.date_envoi || "-"}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{formatMontant(cumulHT)}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Ajouter le sélecteur de chantier en haut du composant
  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontFamily: "Merriweather, serif" }}
        >
          Tableau de suivi
        </Typography>
        <Select
          value={selectedChantierId}
          onChange={(e) => setSelectedChantierId(e.target.value)}
          variant="standard"
          sx={{
            minWidth: 200,
            color: "rgba(27, 120, 188, 1)",
            backgroundColor: "white",
          }}
        >
          {chantiers.map((chantier) => (
            <MenuItem key={chantier.id} value={chantier.id}>
              {chantier.chantier_name}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <Typography>Chargement...</Typography>
      ) : (
        <>
          {renderTableauRappel()}
          {renderTableauFacturation()}
        </>
      )}
    </Box>
  );
};

export default TableauSuivi;
