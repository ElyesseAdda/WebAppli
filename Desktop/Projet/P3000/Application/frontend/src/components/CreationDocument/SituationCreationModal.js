import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
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
import { FaChevronDown, FaChevronUp, FaTrash } from "react-icons/fa";
import { generatePDFDrive } from "../../utils/universalDriveGenerator";

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
const PartieRow = ({ partie, handlePourcentageChange, lignesSpeciales }) => {
  const [open, setOpen] = useState(false);

  // Calculer le pourcentage moyen, le montant et le total HT de la partie
  let moyennePartie = 0;
  let montantPartie = 0;
  let totalHTPartie = 0;

  if (partie.sous_parties && partie.sous_parties.length > 0) {
    partie.sous_parties.forEach((sousPartie) => {
      if (sousPartie.lignes && sousPartie.lignes.length > 0) {
        montantPartie += sousPartie.lignes.reduce(
          (acc, ligne) =>
            acc +
            (parseFloat(ligne.total_ht || 0) *
              (parseFloat(ligne.pourcentage_actuel) || 0)) /
              100,
          0
        );

        // Calculer le total HT de base (somme des total_ht des lignes)
        totalHTPartie += sousPartie.lignes.reduce(
          (acc, ligne) => acc + parseFloat(ligne.total_ht || 0),
          0
        );
      }
    });

    // Calculer le pourcentage basé sur Montant / Total HT
    moyennePartie =
      totalHTPartie > 0 ? (montantPartie / totalHTPartie) * 100 : 0;
  }

  // Filtrer les lignes spéciales de cette partie
  const lignesSpecialesPartie = lignesSpeciales.filter(
    (ligne) =>
      ligne.niveau === "partie" && ligne.partie_id === partie.id.toString()
  );

  // Vérifier si la partie a une seule sous-partie "Lignes directes"
  const hasOnlyLignesDirectes =
    partie.sous_parties &&
    partie.sous_parties.length === 1 &&
    partie.sous_parties[0].description === "Lignes directes";

  // Fonction pour obtenir la couleur de comparaison
  const getComparisonColor = (current, previous) => {
    if (current < previous) return "error.main"; // Rouge
    if (current > previous) return "rgb(0, 223, 56)"; // Vert personnalisé
    return "text.primary"; // Noir
  };

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: "rgba(27, 120, 188, 1)",
          "& td": { color: "white", padding: "8px" },
        }}
      >
        <TableCell sx={{ width: "50px", padding: "8px" }}>
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ color: "white" }}
          >
            {open ? <FaChevronUp /> : <FaChevronDown />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ width: "300px", padding: "8px" }}>
          {partie.numero && !partie.numero.startsWith('?') ? `${partie.numero} - ` : ""}{partie.titre}
        </TableCell>
        <TableCell
          sx={{ width: "100px", padding: "8px" }}
          align="right"
        ></TableCell>
        <TableCell
          sx={{ width: "120px", padding: "8px" }}
          align="right"
        ></TableCell>
        <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
          {(totalHTPartie || 0)
            .toFixed(2)
            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
          €
        </TableCell>
        <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
          {(moyennePartie || 0).toFixed(2)}%
        </TableCell>
        <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
          {(montantPartie || 0)
            .toFixed(2)
            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
          €
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box>
              {partie.sous_parties.map((sousPartie) =>
                hasOnlyLignesDirectes ? (
                  // Si c'est une seule sous-partie "Lignes directes", afficher directement les lignes
                  <Table key={sousPartie.id}>
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
                          <TableCell
                            sx={{ width: "50px", padding: "8px" }}
                          ></TableCell>
                          <TableCell sx={{ width: "300px", padding: "8px" }}>
                            {ligne.description}
                          </TableCell>
                          <TableCell
                            sx={{ width: "100px", padding: "8px" }}
                            align="right"
                          >
                            {ligne.quantite}
                          </TableCell>
                          <TableCell
                            sx={{ width: "120px", padding: "8px" }}
                            align="right"
                          >
                            {ligne.prix_unitaire} €
                          </TableCell>
                          <TableCell
                            sx={{ width: "120px", padding: "8px" }}
                            align="right"
                          >
                            {parseFloat(ligne.total_ht)
                              .toFixed(2)
                              .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                            €
                          </TableCell>
                          <TableCell
                            sx={{ width: "120px", padding: "8px" }}
                            align="right"
                          >
                            <TextField
                              type="number"
                              value={ligne.pourcentage_actuel || 0}
                              onChange={(e) =>
                                handlePourcentageChange(
                                  ligne.id,
                                  e.target.value
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              InputProps={{
                                inputProps: {
                                  min: 0,
                                  max: 100,
                                  step: "any",
                                },
                              }}
                              size="small"
                              sx={{
                                width: "100px",
                                "& input": {
                                  textAlign: "right",
                                  color: getComparisonColor(
                                    ligne.pourcentage_actuel || 0,
                                    ligne.pourcentage_precedent || 0
                                  ),
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              width: "120px",
                              padding: "8px",
                              color: getComparisonColor(
                                ligne.pourcentage_actuel || 0,
                                ligne.pourcentage_precedent || 0
                              ),
                              fontWeight: "bold",
                            }}
                            align="right"
                          >
                            {(
                              (ligne.total_ht *
                                (ligne.pourcentage_actuel || 0)) /
                              100
                            )
                              .toFixed(2)
                              .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                            €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  // Sinon, utiliser le composant SousPartieTable normal
                  <SousPartieTable
                    key={sousPartie.id}
                    sousPartie={sousPartie}
                    handlePourcentageChange={handlePourcentageChange}
                    lignesSpeciales={lignesSpeciales}
                  />
                )
              )}
              {/* Lignes spéciales de la partie - Trier par index_global si disponible */}
              {lignesSpecialesPartie
                .sort((a, b) => (a.index_global || 0) - (b.index_global || 0))
                .map((ligne, index) => {
                  // ✅ Appliquer les styles de la ligne spéciale
                  const ligneStyles = ligne.styles || {};
                  return (
                    <TableRow
                      key={ligne.id}
                      sx={{
                        backgroundColor:
                          index % 2 === 0 ? "white" : "rgba(0, 0, 0, 0.05)",
                        "& td": { padding: "8px" },
                      }}
                    >
                      <TableCell sx={{ width: "50px", padding: "8px" }}></TableCell>
                      <TableCell 
                        sx={{ 
                          width: "300px", 
                          padding: "8px",
                          // ✅ Appliquer les styles de la ligne spéciale
                          fontWeight: ligneStyles.fontWeight || 'normal',
                          fontStyle: ligneStyles.fontStyle || 'normal',
                          textDecoration: ligneStyles.textDecoration || 'none',
                          color: ligneStyles.color || 'inherit',
                          backgroundColor: ligneStyles.backgroundColor || 'transparent',
                          textAlign: ligneStyles.textAlign || 'left',
                        }}
                      >
                        {ligne.description}
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ color: "text.secondary" }}
                        >
                          Ligne spéciale partie
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{ width: "100px", padding: "8px" }}
                        align="right"
                      ></TableCell>
                      <TableCell
                        sx={{ width: "120px", padding: "8px" }}
                        align="right"
                      ></TableCell>
                      <TableCell
                        sx={{ 
                          width: "120px", 
                          padding: "8px",
                          fontWeight: ligneStyles.fontWeight || 'normal',
                          color: ligneStyles.color || 'inherit',
                        }}
                        align="right"
                      >
                        {ligne.type === "reduction" ? "-" : ""}
                        {parseFloat(ligne.montant_ht)
                          .toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                        €
                      </TableCell>
                      <TableCell
                        sx={{ width: "120px", padding: "8px" }}
                        align="right"
                      >
                        <TextField
                          type="number"
                          value={ligne.pourcentage_actuel || 0}
                          onChange={(e) =>
                            handlePourcentageChange(
                              ligne.id,
                              e.target.value,
                              "special"
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          InputProps={{
                            inputProps: {
                              min: 0,
                              max: 100,
                              step: "any",
                            },
                          }}
                          size="small"
                          sx={{
                            width: "100px",
                            "& input": {
                              textAlign: "right",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{ 
                          width: "120px", 
                          padding: "8px",
                          fontWeight: ligneStyles.fontWeight || 'bold',
                          color: ligneStyles.color || 'inherit',
                        }}
                        align="right"
                      >
                        {ligne.type === "reduction" ? "-" : ""}
                        {(
                          (ligne.montant_ht * (ligne.pourcentage_actuel || 0)) /
                          100
                        )
                          .toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                        €
                      </TableCell>
                    </TableRow>
                  );
                })}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// Composant pour une sous-partie
const SousPartieTable = ({
  sousPartie,
  handlePourcentageChange,
  lignesSpeciales,
}) => {
  const [open, setOpen] = useState(false);

  // Calculer le pourcentage moyen, le montant et le total HT de la sous-partie
  let moyenneSousPartie = 0;
  let montantSousPartie = 0;
  let totalHTSousPartie = 0;

  if (sousPartie.lignes && sousPartie.lignes.length > 0) {
    montantSousPartie = sousPartie.lignes.reduce(
      (acc, ligne) =>
        acc +
        (parseFloat(ligne.total_ht || 0) *
          (parseFloat(ligne.pourcentage_actuel) || 0)) /
          100,
      0
    );

    // Calculer le total HT de base (somme des total_ht des lignes)
    totalHTSousPartie = sousPartie.lignes.reduce(
      (acc, ligne) => acc + parseFloat(ligne.total_ht || 0),
      0
    );

    // Calculer le pourcentage basé sur Montant / Total HT
    moyenneSousPartie =
      totalHTSousPartie > 0 ? (montantSousPartie / totalHTSousPartie) * 100 : 0;
  }

  // Filtrer les lignes spéciales de cette sous-partie
  const lignesSpecialesSousPartie = lignesSpeciales.filter(
    (ligne) =>
      ligne.niveau === "sous_partie" &&
      ligne.sous_partie_id === sousPartie.id.toString()
  );

  const getComparisonColor = (current, previous) => {
    if (current < previous) return "error.main"; // Rouge
    if (current > previous) return "rgb(0, 223, 56)"; // Vert personnalisé
    return "text.primary"; // Noir
  };

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
            <TableCell sx={{ width: "50px", padding: "8px" }}>
              <IconButton size="small" onClick={() => setOpen(!open)}>
                {open ? <FaChevronUp /> : <FaChevronDown />}
              </IconButton>
            </TableCell>
            <TableCell sx={{ width: "300px", padding: "8px" }}>
              {sousPartie.numero ? `${sousPartie.numero} ` : ""}{sousPartie.description}
            </TableCell>
            <TableCell
              sx={{ width: "100px", padding: "8px" }}
              align="right"
            ></TableCell>
            <TableCell
              sx={{ width: "120px", padding: "8px" }}
              align="right"
            ></TableCell>
            <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
              {(totalHTSousPartie || 0)
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
              €
            </TableCell>
            <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
              {(moyenneSousPartie || 0).toFixed(2)}%
            </TableCell>
            <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
              {(montantSousPartie || 0)
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
                <TableCell sx={{ width: "50px", padding: "8px" }}></TableCell>
                <TableCell sx={{ width: "300px", padding: "8px" }}>
                  {ligne.description}
                </TableCell>
                <TableCell
                  sx={{ width: "100px", padding: "8px" }}
                  align="right"
                >
                  {ligne.quantite}
                </TableCell>
                <TableCell
                  sx={{ width: "120px", padding: "8px" }}
                  align="right"
                >
                  {ligne.prix_unitaire} €
                </TableCell>
                <TableCell
                  sx={{ width: "120px", padding: "8px" }}
                  align="right"
                >
                  {parseFloat(ligne.total_ht)
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
                <TableCell
                  sx={{ width: "120px", padding: "8px" }}
                  align="right"
                >
                  <TextField
                    type="number"
                    value={ligne.pourcentage_actuel || 0}
                    onChange={(e) =>
                      handlePourcentageChange(ligne.id, e.target.value)
                    }
                    onFocus={(e) => e.target.select()}
                    InputProps={{
                      inputProps: {
                        min: 0,
                        max: 100,
                        step: "any",
                      },
                    }}
                    size="small"
                    sx={{
                      width: "100px",
                      "& input": {
                        textAlign: "right",
                        color: getComparisonColor(
                          ligne.pourcentage_actuel || 0,
                          ligne.pourcentage_precedent || 0
                        ),
                      },
                    }}
                  />
                </TableCell>
                <TableCell
                  sx={{
                    width: "120px",
                    padding: "8px",
                    color: getComparisonColor(
                      ligne.pourcentage_actuel || 0,
                      ligne.pourcentage_precedent || 0
                    ),
                    fontWeight: "bold",
                  }}
                  align="right"
                >
                  {((ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100)
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>
            ))}
            {/* Lignes spéciales de la sous-partie - Trier par index_global si disponible */}
            {lignesSpecialesSousPartie
              .sort((a, b) => (a.index_global || 0) - (b.index_global || 0))
              .map((ligne, index) => {
                // ✅ Appliquer les styles de la ligne spéciale
                const ligneStyles = ligne.styles || {};
                return (
                  <TableRow
                    key={ligne.id}
                    sx={{
                      backgroundColor:
                        index % 2 === 0 ? "white" : "rgba(0, 0, 0, 0.05)",
                      "& td": { padding: "8px" },
                    }}
                  >
                    <TableCell sx={{ width: "50px", padding: "8px" }}></TableCell>
                    <TableCell 
                      sx={{ 
                        width: "300px", 
                        padding: "8px",
                        // ✅ Appliquer les styles de la ligne spéciale
                        fontWeight: ligneStyles.fontWeight || 'normal',
                        fontStyle: ligneStyles.fontStyle || 'normal',
                        textDecoration: ligneStyles.textDecoration || 'none',
                        color: ligneStyles.color || 'inherit',
                        backgroundColor: ligneStyles.backgroundColor || 'transparent',
                        textAlign: ligneStyles.textAlign || 'left',
                      }}
                    >
                      {ligne.description}
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ color: "text.secondary" }}
                      >
                        Ligne spéciale sous-partie
                      </Typography>
                    </TableCell>
                    <TableCell
                      sx={{ width: "100px", padding: "8px" }}
                      align="right"
                    ></TableCell>
                    <TableCell
                      sx={{ width: "120px", padding: "8px" }}
                      align="right"
                    ></TableCell>
                    <TableCell
                      sx={{ 
                        width: "120px", 
                        padding: "8px",
                        fontWeight: ligneStyles.fontWeight || 'normal',
                        color: ligneStyles.color || 'inherit',
                      }}
                      align="right"
                    >
                      {ligne.type === "reduction" ? "-" : ""}
                      {parseFloat(ligne.montant_ht)
                        .toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                      €
                    </TableCell>
                    <TableCell
                      sx={{ width: "120px", padding: "8px" }}
                      align="right"
                    >
                      <TextField
                        type="number"
                        value={ligne.pourcentage_actuel || 0}
                        onChange={(e) =>
                          handlePourcentageChange(
                            ligne.id,
                            e.target.value,
                            "special"
                          )
                        }
                        onFocus={(e) => e.target.select()}
                        InputProps={{
                          inputProps: {
                            min: 0,
                            max: 100,
                            step: "any",
                          },
                        }}
                        size="small"
                        sx={{
                          width: "100px",
                          "& input": {
                            textAlign: "right",
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{ 
                        width: "120px", 
                        padding: "8px",
                        fontWeight: ligneStyles.fontWeight || 'bold',
                        color: ligneStyles.color || 'inherit',
                      }}
                      align="right"
                    >
                      {ligne.type === "reduction" ? "-" : ""}
                      {((ligne.montant_ht * (ligne.pourcentage_actuel || 0)) / 100)
                        .toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                      €
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </Collapse>
    </Box>
  );
};

// Composant pour une sous-partie Avenant
const AvenantSousPartieTable = ({ avenant, handlePourcentageChange }) => {
  const [open, setOpen] = useState(false);

  // Calculer le pourcentage moyen et le montant de l'avenant
  let moyenneSousPartie = 0;
  let montantSousPartie = 0;

  if (avenant.factures_ts && avenant.factures_ts.length > 0) {
    moyenneSousPartie =
      avenant.factures_ts.reduce(
        (acc, ts) => acc + (ts.pourcentage_actuel || 0),
        0
      ) / avenant.factures_ts.length;

    montantSousPartie = avenant.factures_ts.reduce(
      (acc, ts) => acc + (ts.montant_ht * (ts.pourcentage_actuel || 0)) / 100,
      0
    );
  }

  const getComparisonColor = (current, previous) => {
    if (current < previous) return "error.main"; // Rouge
    if (current > previous) return "rgb(0, 223, 56)"; // Vert personnalisé
    return "text.primary"; // Noir
  };

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
            <TableCell sx={{ width: "50px", padding: "8px" }}>
              <IconButton size="small" onClick={() => setOpen(!open)}>
                {open ? <FaChevronUp /> : <FaChevronDown />}
              </IconButton>
            </TableCell>
            <TableCell sx={{ width: "300px", padding: "8px" }}>
              Avenant n°{avenant.numero}
            </TableCell>
            <TableCell
              sx={{ width: "100px", padding: "8px" }}
              align="right"
            ></TableCell>
            <TableCell
              sx={{ width: "120px", padding: "8px" }}
              align="right"
            ></TableCell>
            <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
              {avenant.montant_total} €
            </TableCell>
            <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
              {moyenneSousPartie.toFixed(2)}%
            </TableCell>
            <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
              {montantSousPartie
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
              €
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ padding: 0 }} colSpan={7}>
              <Collapse in={open} timeout="auto" unmountOnExit>
                <Table>
                  <TableBody>
                    {avenant.factures_ts.map((ts, index) => (
                      <TableRow
                        key={ts.id}
                        sx={{
                          backgroundColor:
                            index % 2 === 0 ? "white" : "rgba(0, 0, 0, 0.05)",
                          "& td": { padding: "8px" },
                        }}
                      >
                        <TableCell
                          sx={{ width: "50px", padding: "8px" }}
                        ></TableCell>
                        <TableCell sx={{ width: "300px", padding: "8px" }}>
                          {ts.devis_numero ||
                            `TS n°${String(ts.numero_ts).padStart(3, "0")}`}
                          {ts.designation}
                        </TableCell>
                        <TableCell
                          sx={{ width: "100px", padding: "8px" }}
                          align="right"
                        ></TableCell>
                        <TableCell
                          sx={{ width: "120px", padding: "8px" }}
                          align="right"
                        ></TableCell>
                        <TableCell
                          sx={{ width: "120px", padding: "8px" }}
                          align="right"
                        >
                          {ts.montant_ht} €
                        </TableCell>
                        <TableCell
                          sx={{ width: "120px", padding: "8px" }}
                          align="right"
                        >
                          <TextField
                            type="number"
                            value={ts.pourcentage_actuel || 0}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              handlePourcentageChange(
                                ts.id,
                                newValue,
                                "avenant"
                              );
                            }}
                            onFocus={(e) => e.target.select()}
                            InputProps={{
                              inputProps: {
                                min: 0,
                                max: 100,
                                step: "any",
                              },
                            }}
                            size="small"
                            sx={{
                              width: "100px",
                              "& input": {
                                textAlign: "right",
                                color: getComparisonColor(
                                  ts.pourcentage_actuel || 0,
                                  ts.pourcentage_precedent || 0
                                ),
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            width: "120px",
                            padding: "8px",
                            color: getComparisonColor(
                              ts.pourcentage_actuel || 0,
                              ts.pourcentage_precedent || 0
                            ),
                            fontWeight: "bold",
                          }}
                          align="right"
                        >
                          {(
                            (ts.montant_ht * (ts.pourcentage_actuel || 0)) /
                            100
                          )
                            .toFixed(2)
                            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                          €
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Collapse>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
};

// Composant pour la partie Avenants
const AvenantsPartieRow = ({ avenants, handlePourcentageChange }) => {
  const [open, setOpen] = useState(false);

  // Calculer le pourcentage moyen et le montant total des avenants
  let moyennePartie = 0;
  let montantPartie = 0;

  if (avenants && avenants.length > 0) {
    let totalPourcentage = 0;
    let nombreAvenantsAvecTS = 0;
    avenants.forEach((avenant) => {
      if (avenant.factures_ts && avenant.factures_ts.length > 0) {
        const pourcentageAvenant =
          avenant.factures_ts.reduce(
            (acc, ts) => acc + (ts.pourcentage_actuel || 0),
            0
          ) / avenant.factures_ts.length;
        totalPourcentage += pourcentageAvenant;
        nombreAvenantsAvecTS++;

        montantPartie += avenant.factures_ts.reduce(
          (acc, ts) =>
            acc + (ts.montant_ht * (ts.pourcentage_actuel || 0)) / 100,
          0
        );
      }
    });
    // Éviter la division par zéro
    moyennePartie = nombreAvenantsAvecTS > 0 ? totalPourcentage / nombreAvenantsAvecTS : 0;
  }

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: "rgba(27, 120, 188, 1)",
          "& td": { color: "white", padding: "8px" },
        }}
      >
        <TableCell sx={{ width: "50px", padding: "8px" }}>
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ color: "white" }}
          >
            {open ? <FaChevronUp /> : <FaChevronDown />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ width: "300px", padding: "8px" }}>Avenants</TableCell>
        <TableCell
          sx={{ width: "100px", padding: "8px" }}
          align="right"
        ></TableCell>
        <TableCell
          sx={{ width: "120px", padding: "8px" }}
          align="right"
        ></TableCell>
        <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
          {avenants
            ?.reduce((acc, av) => acc + parseFloat(av.montant_total), 0)
            .toFixed(2)
            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
          €
        </TableCell>
        <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
          {moyennePartie.toFixed(2)}%
        </TableCell>
        <TableCell sx={{ width: "120px", padding: "8px" }} align="right">
          {montantPartie.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box>
              {avenants
                ?.filter((avenant) => avenant.factures_ts && avenant.factures_ts.length > 0)
                .map((avenant) => (
                  <AvenantSousPartieTable
                    key={avenant.id}
                    avenant={avenant}
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

const SituationCreationModal = ({
  open,
  onClose,
  devis,
  chantier,
  onCreated,
}) => {
  const [structure, setStructure] = useState([]);
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [commentaire, setCommentaire] = useState("");
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [totalHT, setTotalHT] = useState(0);
  const [totalAvancement, setTotalAvancement] = useState(0);
  const [avenants, setAvenants] = useState([]);
  const [montantTotalAvenants, setMontantTotalAvenants] = useState(0);
  const [tauxProrata, setTauxProrata] = useState(2.5);
  const [tauxRetenueGarantie, setTauxRetenueGarantie] = useState(5.0);
  const [montantHTMois, setMontantHTMois] = useState(0);
  const [lastSituation, setLastSituation] = useState(null);
  const [lignesSupplementaires, setLignesSupplementaires] = useState([]);
  const [lignesSpeciales, setLignesSpeciales] = useState([]);
  const [retenueCIE, setRetenueCIE] = useState(0);
  const [typeRetenueCIE, setTypeRetenueCIE] = useState('deduction');
  const [facturesCIE, setFacturesCIE] = useState([]);
  const [calculatedValues, setCalculatedValues] = useState(null);
  const [existingSituation, setExistingSituation] = useState(null);
  const [numeroSituation, setNumeroSituation] = useState("");
  const [dateCreation, setDateCreation] = useState("");
  const [tvaRate, setTvaRate] = useState(20); // Taux de TVA par défaut à 20%

  // ✅ Détecter si le devis vient de DevisAvance.js via parties_metadata
  const isFromDevisAvance = devis?.parties_metadata && 
    devis.parties_metadata.selectedParties && 
    devis.parties_metadata.selectedParties.length > 0;

  // Fonction pour construire la structure depuis les items unifiés (DevisAvance)
  const buildStructureFromUnifiedItems = (items, devisLignes = []) => {
    // Trier tous les items par index_global
    const sortedItems = [...items].sort((a, b) => 
      (a.index_global || 0) - (b.index_global || 0)
    );

    const structureMap = new Map();
    const lignesSpecialesList = [];

    // Créer un map pour accéder rapidement aux lignes du devis par ligne_detail_id
    const lignesDevisMap = new Map();
    devisLignes.forEach(ligne => {
      // ligne.ligne_detail peut être un ID (number) ou un objet avec un id
      const ligneDetailId = typeof ligne.ligne_detail === 'object' 
        ? ligne.ligne_detail?.id 
        : ligne.ligne_detail;
      if (ligneDetailId) {
        lignesDevisMap.set(ligneDetailId, ligne);
      }
    });
    
    // Créer aussi un map par ID de DevisLigne pour accès direct
    const devisLignesByIdMap = new Map();
    devisLignes.forEach(ligne => {
      if (ligne.id) {
        devisLignesByIdMap.set(ligne.id, ligne);
      }
    });

    sortedItems.forEach(item => {
      if (item.type === 'partie') {
        structureMap.set(item.id, {
          id: item.id,
          titre: item.titre,
          type_activite: item.type_activite,
          index_global: item.index_global,
          // ✅ Convertir le numéro en chaîne si présent
          numero: item.numero !== null && item.numero !== undefined && item.numero !== '' 
            ? String(item.numero) 
            : null,
          sous_parties: []
        });
      } else if (item.type === 'sous_partie') {
        const partie = structureMap.get(item.partie_id);
        if (partie) {
          partie.sous_parties.push({
            id: item.id,
            description: item.description,
            index_global: item.index_global,
            // ✅ Convertir le numéro en chaîne si présent
            numero: item.numero !== null && item.numero !== undefined && item.numero !== '' 
              ? String(item.numero) 
              : null,
            lignes: []
          });
        }
      } else if (item.type === 'ligne_detail') {
        // Trouver la partie et sous-partie correspondantes
        const sousPartieItem = sortedItems.find(i => 
          i.type === 'sous_partie' && i.id === item.sous_partie_id
        );
        if (sousPartieItem) {
          const partie = structureMap.get(sousPartieItem.partie_id);
          if (partie) {
            const sousPartie = partie.sous_parties.find(sp => sp.id === item.sous_partie_id);
            if (sousPartie) {
              // Récupérer les données complètes de la ligne depuis DevisLigne
              const ligneDevis = lignesDevisMap.get(item.id);
              
              // Si aucune ligne n'est trouvée, chercher dans toutes les lignes du devis
              let ligneDevisFinale = ligneDevis;
              if (!ligneDevisFinale) {
                // Chercher une ligne qui correspond à cette LigneDetail
                ligneDevisFinale = devisLignes.find(l => {
                  const ligneDetailId = typeof l.ligne_detail === 'object' 
                    ? l.ligne_detail?.id 
                    : l.ligne_detail;
                  return ligneDetailId === item.id;
                });
              }
              
              const quantite = ligneDevisFinale ? parseFloat(ligneDevisFinale.quantite || 0) : parseFloat(item.quantite || 0);
              const prixUnitaire = ligneDevisFinale ? parseFloat(ligneDevisFinale.prix_unitaire || 0) : parseFloat(item.prix || 0);
              const totalHT = ligneDevisFinale ? parseFloat(ligneDevisFinale.total_ht || 0) : (quantite * prixUnitaire);
              
              // S'assurer qu'on a bien une DevisLigne avec un ID avant d'ajouter la ligne
              if (ligneDevisFinale && ligneDevisFinale.id) {
                sousPartie.lignes.push({
                  id: ligneDevisFinale.id, // ✅ Toujours utiliser l'ID de DevisLigne
                  description: item.description,
                  quantite: quantite,
                  prix_unitaire: prixUnitaire,
                  total_ht: totalHT,
                  ligne_detail_id: item.id,
                  index_global: ligneDevisFinale.index_global || item.index_global || 0,
                  pourcentage_actuel: 0,
                  pourcentage_precedent: 0
                });
              } else {
                console.warn(`⚠️ Aucune DevisLigne trouvée pour LigneDetail ID ${item.id}. Cette ligne sera ignorée.`, {
                  item,
                  ligneDevis,
                  ligneDevisFinale,
                  devisLignes: devisLignes.map(l => ({
                    id: l.id,
                    ligne_detail: l.ligne_detail
                  }))
                });
              }
            }
          }
        }
      } else if (item.type === 'ligne_speciale') {
        // Déterminer le niveau et les IDs de contexte depuis les données de la ligne spéciale
        // Les lignes spéciales peuvent avoir context_type et context_id dans les items
        let niveau = 'global';
        let partie_id = null;
        let sous_partie_id = null;
        
        // Si context_type et context_id sont présents dans l'item
        if (item.context_type) {
          niveau = item.context_type;
          if (item.context_type === 'partie' && item.context_id) {
            partie_id = item.context_id.toString();
          } else if (item.context_type === 'sous_partie' && item.context_id) {
            sous_partie_id = item.context_id.toString();
            // Trouver la partie parente
            const sousPartieItem = sortedItems.find(i => 
              i.type === 'sous_partie' && i.id === item.context_id
            );
            if (sousPartieItem) {
              partie_id = sousPartieItem.partie_id?.toString() || null;
            }
          }
        }
        
        // Calculer le montant HT
        let montantHT = 0;
        if (item.value_type === 'percentage') {
          // Pour les pourcentages, on a besoin du montant de base
          // On utilisera le price_ht du devis comme base par défaut
          montantHT = (devis.price_ht * parseFloat(item.value || 0)) / 100;
        } else {
          montantHT = parseFloat(item.value || 0);
        }
        
        // Ajouter les lignes spéciales avec leurs styles et index_global
        lignesSpecialesList.push({
          id: item.id,
          description: item.description,
          type: item.type_speciale || 'display',
          value: parseFloat(item.value || 0),
          valueType: item.value_type || 'fixed',
          niveau: niveau,
          partie_id: partie_id,
          sous_partie_id: sous_partie_id,
          pourcentage_actuel: 0,
          pourcentage_precedent: 0,
          montant_ht: montantHT,
          styles: item.styles || {}, // ✅ Inclure les styles
          index_global: item.index_global || 0,
          base_calculation: item.base_calculation || null
        });
      }
    });

    // Convertir la map en array et trier par index_global
    const structureArray = Array.from(structureMap.values())
      .sort((a, b) => (a.index_global || 0) - (b.index_global || 0));

    // Trier les sous-parties et lignes par index_global
    structureArray.forEach(partie => {
      partie.sous_parties.sort((a, b) => (a.index_global || 0) - (b.index_global || 0));
      partie.sous_parties.forEach(sp => {
        sp.lignes.sort((a, b) => (a.index_global || 0) - (b.index_global || 0));
      });
    });

    return { structure: structureArray, lignesSpeciales: lignesSpecialesList };
  };

  // Fonction pour convertir les lignes spéciales depuis le format legacy vers le format du modal
  const convertLignesSpecialesFromLegacy = (lignesSpecialesLegacy, devisPriceHT, structure = []) => {
    const lignesSpecialesList = [];
    
    if (!lignesSpecialesLegacy) {
      return lignesSpecialesList;
    }
    
    // Créer un map pour trouver rapidement la partie parente d'une sous-partie
    const sousPartieToPartieMap = new Map();
    structure.forEach(partie => {
      partie.sous_parties.forEach(sp => {
        sousPartieToPartieMap.set(sp.id.toString(), partie.id.toString());
      });
    });
    
    // Lignes spéciales globales
    if (lignesSpecialesLegacy.global && Array.isArray(lignesSpecialesLegacy.global)) {
      lignesSpecialesLegacy.global.forEach((ligne, index) => {
        if (ligne.type !== 'display') {
          const montantHT = ligne.montant_calcule || 
            (ligne.valueType === 'percentage' 
              ? (devisPriceHT * parseFloat(ligne.value || 0)) / 100 
              : parseFloat(ligne.value || 0));
          
          lignesSpecialesList.push({
            id: `global_${index}`,
            description: ligne.description,
            type: ligne.type,
            value: parseFloat(ligne.value || 0),
            valueType: ligne.valueType || 'fixed',
            niveau: 'global',
            partie_id: null,
            sous_partie_id: null,
            pourcentage_actuel: 0,
            pourcentage_precedent: 0,
            montant_ht: montantHT,
            styles: ligne.styles || {},
            index_global: ligne.index_global || 0
          });
        }
      });
    }
    
    // Lignes spéciales des parties
    if (lignesSpecialesLegacy.parties) {
      Object.keys(lignesSpecialesLegacy.parties).forEach((partieId) => {
        const lignesPartie = lignesSpecialesLegacy.parties[partieId];
        if (Array.isArray(lignesPartie)) {
          lignesPartie.forEach((ligne, index) => {
            if (ligne.type !== 'display') {
              const montantHT = ligne.montant_calcule || 
                (ligne.valueType === 'percentage' 
                  ? (devisPriceHT * parseFloat(ligne.value || 0)) / 100 
                  : parseFloat(ligne.value || 0));
              
              lignesSpecialesList.push({
                id: `partie_${partieId}_${index}`,
                description: ligne.description,
                type: ligne.type,
                value: parseFloat(ligne.value || 0),
                valueType: ligne.valueType || 'fixed',
                niveau: 'partie',
                partie_id: partieId.toString(),
                sous_partie_id: null,
                pourcentage_actuel: 0,
                pourcentage_precedent: 0,
                montant_ht: montantHT,
                styles: ligne.styles || {},
                index_global: ligne.index_global || 0
              });
            }
          });
        }
      });
    }
    
    // Lignes spéciales des sous-parties
    if (lignesSpecialesLegacy.sousParties) {
      Object.keys(lignesSpecialesLegacy.sousParties).forEach((sousPartieId) => {
        const lignesSousPartie = lignesSpecialesLegacy.sousParties[sousPartieId];
        if (Array.isArray(lignesSousPartie)) {
          lignesSousPartie.forEach((ligne, index) => {
            if (ligne.type !== 'display') {
              const montantHT = ligne.montant_calcule || 
                (ligne.valueType === 'percentage' 
                  ? (devisPriceHT * parseFloat(ligne.value || 0)) / 100 
                  : parseFloat(ligne.value || 0));
              
              // Trouver la partie parente depuis la structure
              const partieId = sousPartieToPartieMap.get(sousPartieId.toString());
              
              lignesSpecialesList.push({
                id: `souspartie_${sousPartieId}_${index}`,
                description: ligne.description,
                type: ligne.type,
                value: parseFloat(ligne.value || 0),
                valueType: ligne.valueType || 'fixed',
                niveau: 'sous_partie',
                partie_id: partieId || null,
                sous_partie_id: sousPartieId.toString(),
                pourcentage_actuel: 0,
                pourcentage_precedent: 0,
                montant_ht: montantHT,
                styles: ligne.styles || {},
                index_global: ligne.index_global || 0
              });
            }
          });
        }
      });
    }
    
    return lignesSpecialesList;
  };

  useEffect(() => {
    if (devis?.id) {
      if (isFromDevisAvance) {
        // ✅ NOUVEAU SYSTÈME : Charger depuis le serializer qui retourne les items avec index_global
        // Le ViewSet est enregistré sous 'devisa' dans le router
        axios
          .get(`/api/devisa/${devis.id}/`)
          .then((response) => {
            const devisData = response.data;
            const devisLignes = devisData.lignes || []; // Les lignes sont incluses dans le serializer
            
            // ✅ Charger le taux de TVA du devis
            if (devisData.tva_rate !== undefined && devisData.tva_rate !== null) {
              setTvaRate(parseFloat(devisData.tva_rate));
            }
            
            // Le serializer retourne 'items' avec tous les éléments triés par index_global
            if (devisData.items && devisData.items.length > 0) {
              const { structure: newStructure, lignesSpeciales: newLignesSpeciales } = 
                buildStructureFromUnifiedItems(devisData.items, devisLignes);
              
              // ✅ Charger les lignes spéciales depuis devisData.lignes_speciales si disponible
              let finalLignesSpeciales = newLignesSpeciales;
              if (devisData.lignes_speciales) {
                const lignesSpecialesFromLegacy = convertLignesSpecialesFromLegacy(
                  devisData.lignes_speciales,
                  devisData.price_ht || devis.price_ht || 0,
                  newStructure // Passer la structure pour déterminer les partie_id des sous-parties
                );
                
                // Fusionner avec les lignes spéciales des items (priorité aux items)
                const mergedLignesSpeciales = [...newLignesSpeciales];
                lignesSpecialesFromLegacy.forEach(ls => {
                  // Vérifier si la ligne n'existe pas déjà
                  if (!mergedLignesSpeciales.find(existing => existing.id === ls.id)) {
                    mergedLignesSpeciales.push(ls);
                  }
                });
                
                // Trier par index_global
                finalLignesSpeciales = mergedLignesSpeciales.sort((a, b) => 
                  (a.index_global || 0) - (b.index_global || 0)
                );
              } else {
                // Si pas de lignes spéciales dans devisData.lignes_speciales, utiliser celles des items
                finalLignesSpeciales = newLignesSpeciales.sort((a, b) => 
                  (a.index_global || 0) - (b.index_global || 0)
                );
              }
              
              // ✅ Enrichir la structure avec les numéros depuis parties_metadata si disponible
              if (devisData.parties_metadata && devisData.parties_metadata.selectedParties) {
                const enrichStructureWithNumeros = (structure, partiesMetadata) => {
                  return structure.map(partie => {
                    const partieMeta = partiesMetadata.selectedParties.find(p => p.id === partie.id);
                    if (partieMeta) {
                      return {
                        ...partie,
                        numero: partieMeta.numero !== null && partieMeta.numero !== undefined && partieMeta.numero !== '' 
                          ? String(partieMeta.numero) 
                          : partie.numero,
                        sous_parties: partie.sous_parties.map(sp => {
                          const spMeta = partieMeta.sousParties.find(spm => spm.id === sp.id);
                          if (spMeta && spMeta.numero) {
                            return {
                              ...sp,
                              numero: String(spMeta.numero)
                            };
                          }
                          return sp;
                        })
                      };
                    }
                    return partie;
                  });
                };
                
                const enrichedStructure = enrichStructureWithNumeros(newStructure, devisData.parties_metadata);
                setStructure(enrichedStructure);
              } else {
                setStructure(newStructure);
              }
              setLignesSpeciales(finalLignesSpeciales);
            } else {
              // Fallback : utiliser l'ancien endpoint
              axios
                .get(`/api/devis-structure/${devis.id}/structure/`)
                .then((response) => {
                  setStructure(response.data);
                })
                .catch((error) => {
                  console.error("Erreur lors du chargement de la structure:", error);
                  alert("Erreur lors du chargement des données");
                });
            }
          })
          .catch((error) => {
            console.error("Erreur lors du chargement du devis:", error);
            // Fallback vers l'ancien système
            axios
              .get(`/api/devis-structure/${devis.id}/structure/`)
              .then((response) => {
                setStructure(response.data);
              })
              .catch((error) => {
                console.error("Erreur lors du chargement de la structure:", error);
                alert("Erreur lors du chargement des données");
              });
          });
      } else {
        // ✅ ANCIEN SYSTÈME : Construire depuis parties_metadata si disponible
        if (devis.parties_metadata && devis.parties_metadata.selectedParties) {
          // Construire la structure depuis parties_metadata pour avoir les numéros
          const buildStructureFromPartiesMetadata = (partiesMetadata, structureFromAPI) => {
            const structureMap = new Map();
            
            // Créer un map pour accéder rapidement aux données de l'API par ID
            const apiStructureMap = new Map();
            structureFromAPI.forEach(partie => {
              apiStructureMap.set(partie.id, partie);
            });
            
            partiesMetadata.selectedParties.forEach(partieMeta => {
              const partieAPI = apiStructureMap.get(partieMeta.id);
              if (partieAPI) {
                structureMap.set(partieMeta.id, {
                  id: partieMeta.id,
                  titre: partieMeta.titre,
                  // ✅ Convertir le numéro en chaîne si présent
                  numero: partieMeta.numero !== null && partieMeta.numero !== undefined && partieMeta.numero !== '' 
                    ? String(partieMeta.numero) 
                    : null,
                  sous_parties: partieMeta.sousParties.map(spMeta => {
                    const spAPI = partieAPI.sous_parties.find(sp => sp.id === spMeta.id);
                    // ✅ Convertir le numéro en chaîne si présent (depuis parties_metadata)
                    const numero = spMeta.numero !== null && spMeta.numero !== undefined && spMeta.numero !== '' 
                      ? String(spMeta.numero) 
                      : null;
                    return {
                      id: spMeta.id,
                      description: spMeta.description,
                      numero: numero, // ✅ Récupérer le numéro depuis parties_metadata
                      lignes: spAPI ? spAPI.lignes : (spMeta.lignesDetails ? [] : []) // Utiliser lignesDetails si spAPI n'existe pas
                    };
                  })
                });
              }
            });
            
            return Array.from(structureMap.values());
          };
          
          // Charger la structure depuis l'API puis enrichir avec les numéros
          axios
            .get(`/api/devis-structure/${devis.id}/structure/`)
            .then((response) => {
              const structureWithNumeros = buildStructureFromPartiesMetadata(
                devis.parties_metadata,
                response.data
              );
              setStructure(structureWithNumeros);
            })
            .catch((error) => {
              console.error("Erreur lors du chargement de la structure:", error);
              alert("Erreur lors du chargement des données");
            });
        } else {
          // Fallback : utiliser l'endpoint classique sans numéros
          axios
            .get(`/api/devis-structure/${devis.id}/structure/`)
            .then((response) => {
              setStructure(response.data);
            })
            .catch((error) => {
              console.error("Erreur lors du chargement de la structure:", error);
              alert("Erreur lors du chargement des données");
            });
        }
      }

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

      // ✅ Charger les lignes spéciales du devis (exclure les lignes display)
      // Seulement pour l'ancien système (pas pour DevisAvance qui les charge déjà)
      if (!isFromDevisAvance && devis.lignes_speciales) {
        const specialLines = [];

        // Lignes spéciales globales
        if (devis.lignes_speciales.global) {
          devis.lignes_speciales.global.forEach((ligne, index) => {
            if (ligne.type !== "display") {
              specialLines.push({
                id: `global_${index}`,
                description: ligne.description,
                value: ligne.montant_calcule || ligne.value, // Utiliser le montant calculé si disponible
                valueType: ligne.montant_calcule ? "fixed" : ligne.valueType, // Forcer en fixe si montant calculé
                type: ligne.type,
                niveau: "global",
                pourcentage_actuel: 0,
                pourcentage_precedent: 0,
                montant_ht:
                  ligne.montant_calcule ||
                  (ligne.valueType === "percentage"
                    ? (devis.price_ht * ligne.value) / 100
                    : ligne.value),
                // ✅ Ajouter les styles et index_global si disponibles
                styles: ligne.styles || {},
                index_global: ligne.index_global || 0,
              });
            }
          });
        }

        // Lignes spéciales des parties
        if (devis.lignes_speciales.parties) {
          Object.keys(devis.lignes_speciales.parties).forEach((partieId) => {
            devis.lignes_speciales.parties[partieId].forEach((ligne, index) => {
              if (ligne.type !== "display") {
                specialLines.push({
                  id: `partie_${partieId}_${index}`,
                  description: ligne.description,
                  value: ligne.montant_calcule || ligne.value, // Utiliser le montant calculé si disponible
                  valueType: ligne.montant_calcule ? "fixed" : ligne.valueType, // Forcer en fixe si montant calculé
                  type: ligne.type,
                  niveau: "partie",
                  partie_id: partieId,
                  pourcentage_actuel: 0,
                  pourcentage_precedent: 0,
                  montant_ht:
                    ligne.montant_calcule ||
                    (ligne.valueType === "percentage"
                      ? (devis.price_ht * ligne.value) / 100
                      : ligne.value),
                  // ✅ Ajouter les styles et index_global si disponibles
                  styles: ligne.styles || {},
                  index_global: ligne.index_global || 0,
                });
              }
            });
          });
        }

        // Lignes spéciales des sous-parties
        if (devis.lignes_speciales.sousParties) {
          Object.keys(devis.lignes_speciales.sousParties).forEach(
            (sousPartieId) => {
              devis.lignes_speciales.sousParties[sousPartieId].forEach(
                (ligne, index) => {
                  if (ligne.type !== "display") {
                    specialLines.push({
                      id: `souspartie_${sousPartieId}_${index}`,
                      description: ligne.description,
                      value: ligne.montant_calcule || ligne.value, // Utiliser le montant calculé si disponible
                      valueType: ligne.montant_calcule
                        ? "fixed"
                        : ligne.valueType, // Forcer en fixe si montant calculé
                      type: ligne.type,
                      niveau: "sous_partie",
                      sous_partie_id: sousPartieId,
                      pourcentage_actuel: 0,
                      pourcentage_precedent: 0,
                      montant_ht:
                        ligne.montant_calcule ||
                        (ligne.valueType === "percentage"
                          ? (devis.price_ht * ligne.value) / 100
                          : ligne.value),
                      // ✅ Ajouter les styles et index_global si disponibles
                      styles: ligne.styles || {},
                      index_global: ligne.index_global || 0,
                    });
                  }
                }
              );
            }
          );
        }

        setLignesSpeciales(specialLines);
      }
    }
    
    // ✅ Charger le taux de TVA depuis le devis (pour l'ancien système)
    if (devis?.tva_rate !== undefined && devis?.tva_rate !== null) {
      setTvaRate(parseFloat(devis.tva_rate));
    }
  }, [devis]);

  // Charger les avenants - Recharger à chaque ouverture du modal et quand le chantier change
  useEffect(() => {
    if (open && chantier?.id) {
      axios
        .get(`/api/avenant_chantier/${chantier.id}/avenants/`)
        .then((response) => {
          if (response.data.success) {
            // Filtrer les avenants qui ont encore des factures_ts (éviter les avenants vides)
            const avenantsAvecTS = response.data.avenants.filter(
              (avenant) => avenant.factures_ts && avenant.factures_ts.length > 0
            );
            setAvenants(avenantsAvecTS);
          }
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des avenants:", error);
        });
    }
  }, [open, chantier]);

  // Calculer l'avancement chaque fois que la structure change
  useEffect(() => {
    if (structure.length > 0 && totalHT + montantTotalAvenants > 0) {
      let sommeMontantsLignes = 0;

      // Somme des montants des lignes du devis
      structure.forEach((partie) => {
        partie.sous_parties.forEach((sousPartie) => {
          sousPartie.lignes.forEach((ligne) => {
            sommeMontantsLignes +=
              (ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100;
          });
        });
      });

      // Ajouter les montants des avenants
      avenants.forEach((avenant) => {
        avenant.factures_ts?.forEach((ts) => {
          sommeMontantsLignes +=
            (ts.montant_ht * (ts.pourcentage_actuel || 0)) / 100;
        });
      });

      // Ajouter les montants des lignes spéciales
      lignesSpeciales.forEach((ligne) => {
        const montantLigne =
          (ligne.montant_ht * (ligne.pourcentage_actuel || 0)) / 100;
        if (ligne.type === "reduction") {
          sommeMontantsLignes -= montantLigne;
        } else {
          sommeMontantsLignes += montantLigne;
        }
      });

      const pourcentageAvancement =
        (sommeMontantsLignes / (totalHT + montantTotalAvenants)) * 100;
      setTotalAvancement(pourcentageAvancement);
    }
  }, [structure, totalHT, avenants, montantTotalAvenants, lignesSpeciales]);

  useEffect(() => {
    if (avenants && Array.isArray(avenants)) {
      const totalAvenants = avenants.reduce(
        (acc, av) => acc + parseFloat(av.montant_total || 0),
        0
      );
      setMontantTotalAvenants(totalAvenants);
    }
  }, [avenants]);

  useEffect(() => {
    if (open && chantier?.id && mois && annee) {
      const fetchSituationData = async () => {
        try {
          const response = await axios.get(
            `/api/chantier/${chantier.id}/situations/by-month/`,
            {
              params: { mois, annee },
            }
          );
          const situations = response.data;

          if (situations.length > 0) {
            // ✅ Trier les situations pour s'assurer de prendre la dernière créée
            // Tri par année, mois puis ID décroissants (plus sémantique que date_creation)
            const sortedSituations = [...situations].sort((a, b) => {
              // Priorité 1 : Comparer par année décroissante
              const anneeA = parseInt(a.annee) || 0;
              const anneeB = parseInt(b.annee) || 0;
              if (anneeB !== anneeA) {
                return anneeB - anneeA; // Décroissant
              }
              
              // Priorité 2 : Si même année, comparer par mois décroissant
              const moisA = parseInt(a.mois) || 0;
              const moisB = parseInt(b.mois) || 0;
              if (moisB !== moisA) {
                return moisB - moisA; // Décroissant
              }
              
              // Priorité 3 : Si même année et mois, comparer par ID décroissant
              const idA = parseInt(a.id) || 0;
              const idB = parseInt(b.id) || 0;
              return idB - idA; // Décroissant
            });
            
            // Prendre la première situation après tri (la plus récente)
            const currentSituation = sortedSituations[0];
            
            // IMPORTANT: Charger le numéro de la situation existante EN PREMIER
            // pour éviter le problème de synchronisation
            if (currentSituation.numero_situation) {
              setNumeroSituation(currentSituation.numero_situation);
            } else {
              setNumeroSituation("");
            }
            
            // Marquer qu'une situation existe pour ce mois (pour afficher un avertissement)
            setExistingSituation(currentSituation);

            // Pré-remplir les champs avec les données existantes
            setTauxProrata(currentSituation.taux_prorata || 2.5);
            setTauxRetenueGarantie(currentSituation.taux_retenue_garantie || 5.0);
            setRetenueCIE(currentSituation.retenue_cie || 0);
            setTypeRetenueCIE(currentSituation.type_retenue_cie || 'deduction');
            
            // Charger la date de création
            if (currentSituation.date_creation) {
              setDateCreation(currentSituation.date_creation.split('T')[0]);
            } else {
              // Si aucune date de création n'est définie, utiliser la date du jour
              setDateCreation(new Date().toISOString().split('T')[0]);
            }

            // Mettre à jour la structure avec les pourcentages existants
            const newStructure = structure.map((partie) => ({
              ...partie,
              sous_parties: partie.sous_parties.map((sousPartie) => ({
                ...sousPartie,
                lignes: sousPartie.lignes.map((ligne) => {
                  const situationLigne = currentSituation.lignes.find(
                    (l) => l.ligne_devis === ligne.id
                  );
                  return {
                    ...ligne,
                    pourcentage_precedent: situationLigne
                      ? parseFloat(situationLigne.pourcentage_actuel)
                      : 0,
                    pourcentage_actuel: situationLigne
                      ? parseFloat(situationLigne.pourcentage_actuel)
                      : 0,
                  };
                }),
              })),
            }));
            setStructure(newStructure);

            // Mettre à jour les avenants
            if (avenants.length > 0) {
              const newAvenants = avenants.map((avenant) => ({
                ...avenant,
                factures_ts: (avenant.factures_ts || []).map((ts) => {
                  const situationTs = currentSituation?.lignes_avenant?.find(
                    (l) => l.facture_ts === ts.id
                  );
                  return {
                    ...ts,
                    pourcentage_precedent: situationTs
                      ? parseFloat(situationTs.pourcentage_actuel)
                      : 0,
                    pourcentage_actuel: situationTs
                      ? parseFloat(situationTs.pourcentage_actuel)
                      : 0,
                    montant_ht: parseFloat(ts.montant_ht || 0),
                  };
                }),
              }));

              setAvenants(newAvenants);
            }

            // Mettre à jour les lignes supplémentaires
            if (currentSituation.lignes_supplementaires?.length > 0) {
              setLignesSupplementaires(currentSituation.lignes_supplementaires);
            }

            // Mettre à jour les lignes spéciales avec les pourcentages de la situation existante
            if (
              lignesSpeciales.length > 0 &&
              currentSituation.lignes_speciales?.length > 0
            ) {
              const newLignesSpeciales = lignesSpeciales.map((ligne) => {
                // Chercher la ligne spéciale correspondante dans la situation existante
                const ligneExistante = currentSituation.lignes_speciales.find(
                  (l) =>
                    l.description === ligne.description &&
                    l.niveau === ligne.niveau
                );

                return {
                  ...ligne,
                  pourcentage_actuel: ligneExistante
                    ? parseFloat(ligneExistante.pourcentage_actuel || 0)
                    : 0,
                };
              });
              setLignesSpeciales(newLignesSpeciales);
            }
          } else {
            // Charger la dernière situation créée (peu importe le mois)
            // au lieu de chercher uniquement le mois précédent
            const responsePrecedent = await axios.get(
              `/api/chantier/${chantier.id}/last-situation/`
            );

            if (responsePrecedent.data) {
              const situationPrecedente = responsePrecedent.data;

              // Définir la situation précédente comme lastSituation
              setLastSituation(situationPrecedente);

              // Réinitialiser la structure avec les pourcentages précédents
              const newStructure = structure.map((partie) => ({
                ...partie,
                sous_parties: partie.sous_parties.map((sousPartie) => ({
                  ...sousPartie,
                  lignes: sousPartie.lignes.map((ligne) => {
                    const lignePrecedente = situationPrecedente.lignes.find(
                      (l) => l.ligne_devis === ligne.id
                    );
                    return {
                      ...ligne,
                      pourcentage_precedent: lignePrecedente
                        ? parseFloat(lignePrecedente.pourcentage_actuel)
                        : 0,
                      pourcentage_actuel: lignePrecedente
                        ? parseFloat(lignePrecedente.pourcentage_actuel)
                        : 0,
                      // Ne pas copier le montant_ht_mois
                    };
                  }),
                })),
              }));
              setStructure(newStructure);

              // Réinitialiser les avenants avec les pourcentages précédents
              if (avenants.length > 0) {
                const newAvenants = avenants.map((avenant) => ({
                  ...avenant,
                  factures_ts: (avenant.factures_ts || []).map((ts) => {
                    const avenantPrecedent =
                      situationPrecedente.lignes_avenant?.find(
                        (l) => l.facture_ts === ts.id
                      );
                    return {
                      ...ts,
                      pourcentage_precedent: avenantPrecedent
                        ? parseFloat(avenantPrecedent.pourcentage_actuel)
                        : 0,
                      pourcentage_actuel: avenantPrecedent
                        ? parseFloat(avenantPrecedent.pourcentage_actuel)
                        : 0,
                      montant_ht: parseFloat(ts.montant_ht || 0),
                      // Ne pas copier le montant du mois
                    };
                  }),
                }));
                setAvenants(newAvenants);
              }

              // Réinitialiser les lignes supplémentaires avec montants à 0
              if (situationPrecedente.lignes_supplementaires?.length > 0) {
                setLignesSupplementaires(
                  situationPrecedente.lignes_supplementaires.map((ligne) => ({
                    ...ligne,
                    montant: "0.00", // Montant à 0 pour la nouvelle situation
                  }))
                );
              }

              // Mettre à jour les lignes spéciales avec les pourcentages de la situation précédente
              if (
                lignesSpeciales.length > 0 &&
                situationPrecedente.lignes_speciales?.length > 0
              ) {
                const newLignesSpeciales = lignesSpeciales.map((ligne) => {
                  // Chercher la ligne spéciale correspondante dans la situation précédente
                  const lignePrecedente =
                    situationPrecedente.lignes_speciales.find(
                      (l) =>
                        l.description === ligne.description &&
                        l.niveau === ligne.niveau
                    );

                  return {
                    ...ligne,
                    pourcentage_actuel: lignePrecedente
                      ? parseFloat(lignePrecedente.pourcentage_actuel || 0)
                      : 0,
                  };
                });
                setLignesSpeciales(newLignesSpeciales);
              }

              // Réinitialiser le montant HT du mois à 0
              setMontantHTMois(0);
              setExistingSituation(null);
              
              // Marquer qu'il n'y a pas de situation existante pour ce mois
              setExistingSituation(null);
              
              // Réinitialiser le numéro pour qu'il soit régénéré automatiquement
              setNumeroSituation("");
            } else {
              setLastSituation(null);
              setExistingSituation(null);
              setNumeroSituation("");
              resetSituationData();
            }
          }
        } catch (error) {
          console.error(
            "Erreur lors de la vérification de la situation:",
            error
          );
          setExistingSituation(null);
          resetSituationData();
        }
      };

      fetchSituationData();
    }
  }, [open, chantier, mois, annee]);

  // Fonction pour fusionner les lignes supplémentaires
  const mergeSupplementaryLines = (defaultLines, existingLines) => {
    const mergedLines = [...defaultLines];

    // Ajouter les lignes existantes qui ne sont pas dans les lignes par défaut
    existingLines.forEach((existingLine) => {
      const exists = mergedLines.some(
        (defaultLine) => defaultLine.description === existingLine.description
      );
      if (!exists) {
        mergedLines.push({
          ...existingLine,
          montant: "0.00", // Réinitialiser le montant pour la nouvelle situation
        });
      }
    });

    return mergedLines;
  };

  // Modifier la fonction d'initialisation
  const initializeSituationData = (
    situation,
    isNewSituation = false,
    mergedLignes = null
  ) => {
    setTauxProrata(situation.taux_prorata);
    setLastSituation(situation);

    // Mettre à jour les pourcentages de la structure
    const newStructure = structure.map((partie) => ({
      ...partie,
      sous_parties: partie.sous_parties.map((sousPartie) => ({
        ...sousPartie,
        lignes: sousPartie.lignes.map((ligne) => {
          const situationLigne = situation.situation_lignes.find(
            (l) => l.ligne_devis === ligne.id
          );
          return {
            ...ligne,
            pourcentage_precedent: situationLigne
              ? parseFloat(situationLigne.pourcentage_actuel)
              : 0,
            pourcentage_actuel: isNewSituation
              ? situationLigne
                ? parseFloat(situationLigne.pourcentage_actuel)
                : 0
              : situationLigne
              ? parseFloat(situationLigne.pourcentage_actuel)
              : 0,
          };
        }),
      })),
    }));
    setStructure(newStructure);

    // Mettre à jour les pourcentages des avenants
    if (avenants.length > 0) {
      const newAvenants = avenants.map((avenant) => ({
        ...avenant,
        factures_ts: (avenant.factures_ts || []).map((ts) => {
          const situationTs = situation.situation_lignes_avenants.find(
            (l) => l.facture_ts === ts.id
          );
          return {
            ...ts,
            pourcentage_precedent: situationTs
              ? parseFloat(situationTs.pourcentage_actuel)
              : 0,
            pourcentage_actuel: isNewSituation
              ? situationTs
                ? parseFloat(situationTs.pourcentage_actuel)
                : 0
              : situationTs
              ? parseFloat(situationTs.pourcentage_actuel)
              : 0,
          };
        }),
      }));
      setAvenants(newAvenants);
    }

    // Mettre à jour les lignes supplémentaires
    if (isNewSituation && mergedLignes) {
      setLignesSupplementaires(mergedLignes);
    } else if (
      !isNewSituation &&
      situation.situation_lignes_supplementaires?.length > 0
    ) {
      setLignesSupplementaires(situation.situation_lignes_supplementaires);
    } else {
      setLignesSupplementaires([]);
    }

    // Mettre à jour la retenue CIE
    if (situation.retenue_cie) {
      setRetenueCIE(parseFloat(situation.retenue_cie));
    }
    if (situation.type_retenue_cie) {
      setTypeRetenueCIE(situation.type_retenue_cie);
    }
  };

  // Fonction pour réinitialiser les données
  const resetSituationData = () => {
    setTauxProrata(2.5); // Valeur par défaut
    setTauxRetenueGarantie(5.0); // Valeur par défaut
    setLastSituation(null);
    setLignesSupplementaires([]);
    setRetenueCIE(0);
    setTypeRetenueCIE('deduction');

    // Réinitialiser la structure avec des pourcentages à 0
    const newStructure = structure.map((partie) => ({
      ...partie,
      sous_parties: partie.sous_parties.map((sousPartie) => ({
        ...sousPartie,
        lignes: sousPartie.lignes.map((ligne) => ({
          ...ligne,
          pourcentage_precedent: 0,
          pourcentage_actuel: 0,
        })),
      })),
    }));
    setStructure(newStructure);
  };

  // Calculer le montant HT du mois à partir des lignes
  useEffect(() => {
    let montantActuel = 0;

    // Calculer le montant des lignes standard
    structure.forEach((partie) => {
      partie.sous_parties.forEach((sousPartie) => {
        sousPartie.lignes.forEach((ligne) => {
          const montantLigne =
            (parseFloat(ligne.total_ht || 0) *
              parseFloat(ligne.pourcentage_actuel || 0)) /
            100;
          montantActuel += montantLigne;
        });
      });
    });

    // Ajouter le montant des TS (avenants)
    avenants?.forEach((avenant) => {
      avenant.factures_ts?.forEach((ts) => {
        const montantTS =
          (parseFloat(ts.montant_ht || 0) *
            parseFloat(ts.pourcentage_actuel || 0)) /
          100;
        montantActuel += montantTS;
      });
    });

    // Récupération du montant cumulé précédent
    let montantCumulePrecedent = 0;
    if (lastSituation) {
      montantCumulePrecedent = parseFloat(lastSituation.montant_ht_mois || 0);
    } else {
    }

    // Le montant HT du mois est la différence entre le montant actuel et le cumul précédent
    const montantHTMois = montantActuel - montantCumulePrecedent;

    setMontantHTMois(montantHTMois);
  }, [structure, avenants, lastSituation]);

  useEffect(() => {
    if (open && chantier?.id && mois && annee) {
      const fetchCIEFactures = async () => {
        try {
          const response = await axios.get(
            `/api/chantier/${chantier.id}/factures-cie/`,
            {
              params: { mois, annee },
            }
          );
          setRetenueCIE(response.data.total);
          setFacturesCIE(response.data.factures);
        } catch (error) {
          console.error("Erreur lors du chargement des factures CIE:", error);
        }
      };
      fetchCIEFactures();
    }
  }, [open, chantier, mois, annee]);

  const getComparisonColor = (current, previous) => {
    if (current < previous) return "error.main"; // Rouge
    if (current > previous) return "rgb(0, 223, 56)"; // Vert personnalisé
    return "text.primary"; // Noir
  };

  const handlePourcentageChange = (ligneId, value, type = "standard") => {
    let newValue = value === "" ? 0 : parseFloat(value);
    newValue = Math.min(Math.max(newValue, 0), 100);

    if (type === "avenant") {
      const newAvenants = avenants.map((avenant) => ({
        ...avenant,
        factures_ts: avenant.factures_ts.map((ts) => {
          if (ts.id === ligneId) {
            const montantCalcule =
              (parseFloat(ts.montant_ht || 0) * newValue) / 100;
            return {
              ...ts,
              pourcentage_actuel: newValue,
              montant: montantCalcule,
            };
          }
          return ts;
        }),
      }));
      setAvenants(newAvenants);
    } else if (type === "special") {
      // Gestion des lignes spéciales
      const newLignesSpeciales = lignesSpeciales.map((ligne) => {
        if (ligne.id === ligneId) {
          return {
            ...ligne,
            pourcentage_actuel: newValue,
          };
        }
        return ligne;
      });
      setLignesSpeciales(newLignesSpeciales);
    } else {
      const newStructure = structure.map((partie) => ({
        ...partie,
        sous_parties: partie.sous_parties.map((sousPartie) => ({
          ...sousPartie,
          lignes: sousPartie.lignes.map((ligne) => {
            if (ligne.id === ligneId) {
              return {
                ...ligne,
                pourcentage_actuel: newValue,
              };
            }
            return ligne;
          }),
        })),
      }));
      setStructure(newStructure);
    }
  };

  // Fonction pour récupérer le prochain numéro de situation
  const getNextSituationNumber = async () => {
    try {
      const response = await axios.get(
        `/api/next-numero/chantier/${chantier.id}/`
      );
      return response.data.numero;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération du numéro de situation:",
        error
      );
      throw error;
    }
  };

  // Charger le numéro auto-généré pour une nouvelle situation
  useEffect(() => {
    // Générer un nouveau numéro UNIQUEMENT si :
    // - Le modal est ouvert
    // - On a un chantier
    // - Il n'y a PAS de situation existante pour ce mois
    // - ET le numéro est vide (évite de régénérer en boucle)
    if (open && chantier?.id && !existingSituation && numeroSituation === "") {
      getNextSituationNumber()
        .then((numero) => {
          setNumeroSituation(numero);
        })
        .catch((error) => {
          console.error("Erreur lors du chargement du numéro:", error);
        });
    }
  }, [open, chantier, existingSituation, mois, annee, numeroSituation]);

  // Fonction de calcul existante
  const calculateMontants = () => {
    if (!structure.length) return;

    // Calcul du montant HT du mois
    let montantHtMois = 0;
    structure.forEach((partie) => {
      partie.sous_parties.forEach((sousPartie) => {
        sousPartie.lignes.forEach((ligne) => {
          const montant = parseFloat(ligne.total_ht || 0);
          const pourcentage = parseFloat(ligne.pourcentage_actuel || 0);
          montantHtMois += (montant * pourcentage) / 100;
        });
      });
    });

    const cumulPrecedent = calculerCumulPrecedent();
    const retenueGarantie = montantHtMois * (parseFloat(tauxRetenueGarantie) / 100);
    const montantProrata = montantHtMois * (parseFloat(tauxProrata) / 100);
    const montantApresRetenues =
      montantHtMois -
      retenueGarantie -
      montantProrata -
      parseFloat(retenueCIE || 0);
    const tva = montantApresRetenues * (tvaRate / 100);
    const montantTotal = montantHtMois + parseFloat(cumulPrecedent);
    const pourcentageAvancement =
      totalHT > 0 ? (montantTotal / totalHT) * 100 : 0;

    setCalculatedValues({
      montant_ht_mois: montantHtMois.toFixed(2),
      montant_precedent: montantHtMois.toFixed(2),
      cumul_precedent: cumulPrecedent.toFixed(2),
      retenue_garantie: retenueGarantie.toFixed(2),
      montant_prorata: montantProrata.toFixed(2),
      retenue_cie: retenueCIE || "0.00",
      montant_apres_retenues: montantApresRetenues.toFixed(2),
      montant_total: montantTotal.toFixed(2),
      pourcentage_avancement: pourcentageAvancement.toFixed(2),
      tva: tva.toFixed(2),
    });
  };

  // Utiliser useEffect pour recalculer quand les données changent
  useEffect(() => {
    calculateMontants();
  }, [structure, avenants, tauxProrata, retenueCIE, lignesSupplementaires, tvaRate]);

  // Fonction pour calculer le cumul des mois précédents
  const calculerCumulPrecedent = () => {
    // Si on a une situation précédente, utiliser son montant_total_cumul_ht
    if (lastSituation && lastSituation.montant_total_cumul_ht) {
      return parseFloat(lastSituation.montant_total_cumul_ht);
    }

    // Sinon, calculer à partir des pourcentages précédents (pour la première situation)
    let montantTotal = 0;

    // Calculer le total des lignes standard
    structure.forEach((partie) => {
      partie.sous_parties.forEach((sousPartie) => {
        sousPartie.lignes.forEach((ligne) => {
          const montantLigne =
            (ligne.total_ht * (ligne.pourcentage_precedent || 0)) / 100;
          montantTotal += montantLigne;
        });
      });
    });

    // Ajouter le montant des avenants avec les pourcentages précédents
    avenants?.forEach((avenant) => {
      avenant.factures_ts?.forEach((ts) => {
        const montantTS =
          (ts.montant_ht * (ts.pourcentage_precedent || 0)) / 100;
        montantTotal += montantTS;
      });
    });

    // Ajouter le montant des lignes spéciales avec les pourcentages précédents
    lignesSpeciales.forEach((ligne) => {
      const montantLigne =
        (ligne.montant_ht * (ligne.pourcentage_precedent || 0)) / 100;
      if (ligne.type === "reduction") {
        montantTotal -= montantLigne;
      } else {
        montantTotal += montantLigne;
      }
    });

    return montantTotal;
  };

  // Fonction pour calculer le montant total cumulé HT (avec les changements actuels)
  const calculerMontantTotalCumul = () => {
    let montantTotal = 0;

    // Calculer le total des lignes standard avec pourcentages actuels
    structure.forEach((partie) => {
      partie.sous_parties.forEach((sousPartie) => {
        sousPartie.lignes.forEach((ligne) => {
          const montantLigne =
            (ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100;
          montantTotal += montantLigne;
        });
      });
    });

    // Ajouter le montant des avenants avec les pourcentages actuels
    avenants?.forEach((avenant) => {
      avenant.factures_ts?.forEach((ts) => {
        const montantTS = (ts.montant_ht * (ts.pourcentage_actuel || 0)) / 100;
        montantTotal += montantTS;
      });
    });

    // Ajouter le montant des lignes spéciales avec les pourcentages actuels
    lignesSpeciales.forEach((ligne) => {
      const montantLigne =
        (ligne.montant_ht * (ligne.pourcentage_actuel || 0)) / 100;
      if (ligne.type === "reduction") {
        montantTotal -= montantLigne;
      } else {
        montantTotal += montantLigne;
      }
    });

    return montantTotal;
  };

  // Fonction pour calculer le montant HT du mois (différence entre total et cumul précédent)
  const calculerMontantHTMois = () => {
    const montantTotalCumul = calculerMontantTotalCumul();
    const cumulPrecedent = calculerCumulPrecedent();
    return montantTotalCumul - cumulPrecedent;
  };

  // Fonction de soumission avec gestion des erreurs améliorée
  const handleSubmit = async () => {
    try {
      if (!calculatedValues) {
        throw new Error("Les calculs ne sont pas disponibles");
      }

      // Vérifier que le numéro de situation est défini
      if (!numeroSituation) {
        throw new Error("Le numéro de situation est requis");
      }

      // Fonction helper pour formater les nombres
      const formatNumber = (num) => {
        if (num === null || num === undefined) return "0.00";
        return parseFloat(num).toFixed(2);
      };

      const situationData = {
        chantier: chantier.id,
        devis: devis.id,
        mois: parseInt(mois),
        annee: parseInt(annee),
        numero_situation: numeroSituation, // Numéro modifiable par l'utilisateur
        date_creation: dateCreation, // Date de création modifiable par l'utilisateur
        lignes: structure.flatMap((partie) =>
          partie.sous_parties.flatMap((sousPartie) =>
            sousPartie.lignes.map((ligne) => ({
              ligne_devis: ligne.id,
              description: ligne.description,
              quantite: formatNumber(ligne.quantite),
              prix_unitaire: formatNumber(ligne.prix_unitaire),
              total_ht: formatNumber(ligne.total_ht),
              pourcentage_actuel: formatNumber(ligne.pourcentage_actuel),
              montant: formatNumber(
                (ligne.total_ht * ligne.pourcentage_actuel) / 100
              ),
            }))
          )
        ),
        montant_ht_mois: formatNumber(calculerMontantHTMois()),
        cumul_precedent: formatNumber(calculerCumulPrecedent()),
        montant_total_cumul_ht: formatNumber(calculerMontantTotalCumul()),
        retenue_garantie: formatNumber(calculerMontantHTMois() * (tauxRetenueGarantie / 100)),
        taux_retenue_garantie: formatNumber(tauxRetenueGarantie),
        montant_prorata: formatNumber(
          calculerMontantHTMois() * (tauxProrata / 100)
        ),
        retenue_cie: formatNumber(retenueCIE),
        type_retenue_cie: typeRetenueCIE,
        montant_apres_retenues: formatNumber(calculerTotalNet()),
        tva: formatNumber(calculerTotalNet() * (tvaRate / 100)),
        tva_rate: formatNumber(tvaRate),
        montant_ttc: formatNumber(calculerTotalNet() * (1 + tvaRate / 100)),
        pourcentage_avancement: formatNumber(
          (calculerMontantTotalCumul() / (totalHT + montantTotalAvenants)) * 100
        ),
        taux_prorata: formatNumber(tauxProrata),
        lignes_supplementaires: lignesSupplementaires.map((ligne) => ({
          description: ligne.description,
          montant: formatNumber(ligne.montant),
          type: ligne.type,
        })),
        lignes_speciales: lignesSpeciales.map((ligne) => ({
          id: ligne.id,
          description: ligne.description,
          value: formatNumber(ligne.value),
          valueType: ligne.valueType,
          type: ligne.type,
          niveau: ligne.niveau,
          partie_id: ligne.partie_id,
          sous_partie_id: ligne.sous_partie_id,
          pourcentage_actuel: formatNumber(ligne.pourcentage_actuel || 0),
          montant: formatNumber(
            (ligne.montant_ht * (ligne.pourcentage_actuel || 0)) / 100
          ),
        })),
        lignes_avenant: avenants.flatMap((avenant) =>
          avenant.factures_ts.map((ts) => ({
            facture_ts: ts.id,
            avenant_id: avenant.id,
            montant_ht: formatNumber(ts.montant_ht || 0),
            pourcentage_actuel: formatNumber(ts.pourcentage_actuel || 0),
            montant: formatNumber(
              (ts.montant_ht * (ts.pourcentage_actuel || 0)) / 100
            ),
          }))
        ),
        montant_total_devis: formatNumber(totalHT),
        montant_total_travaux: formatNumber(totalHT + montantTotalAvenants),
        total_avancement: formatNumber(totalAvancement),
      };

      // Capturer l'ancien numéro avant la mise à jour
      const oldNumeroSituation = existingSituation?.numero_situation || null;
      
      let response;
      if (existingSituation) {
        // Mise à jour d'une situation existante
        response = await axios.patch(
          `/api/situations/${existingSituation.id}/update/`,
          situationData
        );
        
        // Générer le PDF dans le drive après modification
        // Si le numéro a changé, utiliser l'endpoint regenerate-pdf pour gérer l'historique
        if (oldNumeroSituation && response.data.numero_situation && oldNumeroSituation !== response.data.numero_situation) {
          try {
            console.log('🔄 Régénération du PDF de la situation modifiée...');
            const pdfResponse = await axios.post(
              `/api/situation/${response.data.id}/regenerate-pdf/`,
              { old_numero_situation: oldNumeroSituation }
            );
            if (pdfResponse.data.success) {
              console.log('✅ PDF régénéré avec succès:', pdfResponse.data.message);
              if (pdfResponse.data.conflict_detected) {
                console.log('📦 Ancien PDF déplacé vers Historique');
              }
            } else {
              console.warn('⚠️ Erreur lors de la régénération du PDF:', pdfResponse.data.error);
            }
          } catch (pdfError) {
            console.warn('⚠️ Erreur lors de la régénération du PDF:', pdfError);
          }
        } else {
          // Si le numéro n'a pas changé, utiliser le système universel avec gestion des conflits
          try {
            console.log('🔄 Génération du PDF de la situation modifiée dans le Drive...');
            const driveData = {
              situationId: response.data.id,
              chantierId: chantier.id,
              chantierName: chantier.chantier_name || chantier.nom || "Chantier",
              societeName:
                chantier.societe?.nom_societe ||
                chantier.societe?.nom ||
                "Société",
              numeroSituation: response.data.numero_situation || numeroSituation,
            };

            const pdfResult = await generatePDFDrive("situation", driveData, {
              onSuccess: (result) => {
                console.log("✅ PDF de la situation généré et stocké dans le Drive:", result);
              },
              onError: (error) => {
                console.error("❌ Erreur lors de la génération du PDF:", error);
              },
            });

            // Si un conflit est détecté, ne pas fermer le modal (l'utilisateur doit résoudre le conflit)
            if (pdfResult && pdfResult.conflict_detected) {
              console.log("⚠️ Conflit détecté - le modal de conflit est affiché. Attente de la résolution par l'utilisateur.");
              // Ne pas fermer le modal - l'utilisateur doit résoudre le conflit via le modal
              return;
            }
          } catch (pdfError) {
            console.error("❌ Erreur lors de la génération du PDF:", pdfError);
            // Si l'erreur est un conflit, ne pas fermer le modal
            if (pdfError.response && pdfError.response.status === 409) {
              console.log("⚠️ Conflit détecté via erreur - le modal de conflit est affiché.");
              return;
            }
            // Pour les autres erreurs, continuer quand même
          }
        }
      } else {
        // Création d'une nouvelle situation
        response = await axios.post("/api/situations/", situationData);

        // Téléchargement automatique vers le Drive après création
        try {
          const driveData = {
            situationId: response.data.id,
            chantierId: chantier.id,
            chantierName: chantier.chantier_name || chantier.nom || "Chantier",
            societeName:
              chantier.societe?.nom_societe ||
              chantier.societe?.nom ||
              "Société",
            numeroSituation: numeroSituation, // Utiliser le numéro du state
          };

          await generatePDFDrive("situation", driveData);
        } catch (driveError) {
          console.error(
            "❌ Erreur lors du téléchargement automatique de la situation:",
            driveError
          );
          // Ne pas bloquer la création de la situation si le téléchargement échoue
        }
      }

      if (onCreated) onCreated();
      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert(
        `Erreur lors de la ${existingSituation ? "mise à jour" : "création"}: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  };

  const handleAjoutLigne = () => {
    setLignesSupplementaires([
      ...lignesSupplementaires,
      { description: "", montant: 0, type: "deduction" },
    ]);
  };

  const handleLigneChange = (index, field, value) => {
    const newLignes = [...lignesSupplementaires];
    newLignes[index][field] = value;
    setLignesSupplementaires(newLignes);
  };

  const handleSupprimerLigne = (index) => {
    setLignesSupplementaires(
      lignesSupplementaires.filter((_, i) => i !== index)
    );
  };

  // Calcul du total avec les lignes supplémentaires
  const calculerTotalNet = () => {
    const montantHtMois = calculerMontantHTMois();

    // Retenue de garantie (taux configurable)
    const retenueGarantie = montantHtMois * (parseFloat(tauxRetenueGarantie) / 100);

    // Compte prorata (calculé sur le montant HT du mois)
    const compteProrata = montantHtMois * (tauxProrata / 100);

    // Retenue CIE (peut être positive ou négative selon le type)
    const retenueCIEValue = parseFloat(retenueCIE || 0);
    const retenueCIECalculee = typeRetenueCIE === 'deduction' ? retenueCIEValue : -retenueCIEValue;

    // Montant après retenues
    let total =
      montantHtMois - retenueGarantie - compteProrata - retenueCIECalculee;

    // Lignes supplémentaires
    lignesSupplementaires.forEach((ligne) => {
      if (ligne.type === "deduction") {
        total -= parseFloat(ligne.montant);
      } else {
        total += parseFloat(ligne.montant);
      }
    });

    return total;
  };

  const updateCalculs = () => {
    if (!structure.length) return;

    const cumulPrecedent = calculerCumulPrecedent();
    const montantTotalCumul = calculerMontantTotalCumul();
    const montantHtMois = calculerMontantHTMois();
    const montantTotalTravaux = totalHT + montantTotalAvenants;

    const retenueGarantie = montantHtMois * (parseFloat(tauxRetenueGarantie) / 100);
    const montantProrata = montantHtMois * (parseFloat(tauxProrata) / 100);
    
    // Retenue CIE calculée selon le type
    const retenueCIEValue = parseFloat(retenueCIE || 0);
    const retenueCIECalculee = typeRetenueCIE === 'deduction' ? retenueCIEValue : -retenueCIEValue;
    
    let montantApresRetenues =
      montantHtMois -
      retenueGarantie -
      montantProrata -
      retenueCIECalculee;

    // Ajouter l'impact des lignes supplémentaires
    lignesSupplementaires.forEach((ligne) => {
      if (ligne.type === "deduction") {
        montantApresRetenues -= parseFloat(ligne.montant);
      } else {
        montantApresRetenues += parseFloat(ligne.montant);
      }
    });
    const tva = montantApresRetenues * (tvaRate / 100);
    const pourcentageAvancement =
      montantTotalTravaux > 0
        ? (montantTotalCumul / montantTotalTravaux) * 100
        : 0;

    setCalculatedValues({
      montant_ht_mois: montantHtMois.toFixed(2),
      cumul_precedent: cumulPrecedent.toFixed(2),
      montant_total_cumul: montantTotalCumul.toFixed(2),
      retenue_garantie: retenueGarantie.toFixed(2),
      montant_prorata: montantProrata.toFixed(2),
      retenue_cie: retenueCIE || "0.00",
      montant_apres_retenues: montantApresRetenues.toFixed(2),
      pourcentage_avancement: pourcentageAvancement.toFixed(2),
      tva: tva.toFixed(2),
    });
  };

  // Utiliser useEffect pour recalculer quand les données changent
  useEffect(() => {
    updateCalculs();
  }, [
    structure,
    avenants,
    tauxProrata,
    tauxRetenueGarantie,
    retenueCIE,
    typeRetenueCIE,
    lignesSupplementaires,
    lignesSpeciales,
    tvaRate,
  ]);

  const renderCalculs = () => {
    if (!calculatedValues) return null;

    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">Récapitulatif des montants</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography>
            Montant HT du mois: {calculatedValues.montant_ht_mois} €
          </Typography>
          <Typography>
            Montant précédent: {calculatedValues.montant_precedent} €
          </Typography>
          <Typography>
            Cumul précédent: {calculatedValues.cumul_precedent} €
          </Typography>
          <Typography>
            Retenue de garantie: {calculatedValues.retenue_garantie} €
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography>
            Montant prorata: {calculatedValues.montant_prorata} €
          </Typography>
          <Typography>Retenue CIE: {calculatedValues.retenue_cie} €</Typography>
          <Typography>
            Montant après retenues: {calculatedValues.montant_apres_retenues} €
          </Typography>
          <Typography>TVA: {calculatedValues.tva} €</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6">
            Montant total: {calculatedValues.montant_total} €
          </Typography>
          <Typography>
            Pourcentage d'avancement: {calculatedValues.pourcentage_avancement}{" "}
            %
          </Typography>
        </Grid>
      </Grid>
    );
  };

  // Initialiser le mois actuel uniquement à l'ouverture du modal
  useEffect(() => {
    if (open) {
      setMois(new Date().getMonth() + 1);
      setAnnee(new Date().getFullYear());
      // Initialiser la date de création avec la date du jour
      setDateCreation(new Date().toISOString().split('T')[0]);
      // Réinitialiser les états au cas où on réouvre le modal
      // Note: Le numéro sera chargé automatiquement par fetchSituationData
      setExistingSituation(null);
      // Ne pas réinitialiser numeroSituation ici, il sera géré par fetchSituationData
    }
  }, [open]);

  if (!open || !devis || !chantier) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minWidth: "1200px",
          maxWidth: "95vw",
          maxHeight: "95vh",
        },
      }}
    >
      <DialogTitle>
        {existingSituation
          ? "Modification d'une situation"
          : "Création d'une situation"}
      </DialogTitle>
      <DialogContent>
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
              Montant total des travaux HT:{" "}
              {(totalHT + montantTotalAvenants)
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
              €
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              %Avancement: {totalAvancement.toFixed(2)}%
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Mois</InputLabel>
            <Select
              value={mois}
              onChange={(e) => setMois(e.target.value)}
              label="Mois"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Année"
            type="number"
            value={annee}
            onChange={(e) => setAnnee(e.target.value)}
            sx={{ width: 120 }}
          />
        </Box>

        {existingSituation && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Une situation existe déjà pour {new Date(0, mois - 1).toLocaleString("default", { month: "long" })} {annee}.
            Vous êtes en mode modification. Changez de mois pour créer une nouvelle situation.
          </Alert>
        )}

        <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "flex-start" }}>
          <TextField
            label="Numéro de situation"
            value={numeroSituation}
            onChange={(e) => setNumeroSituation(e.target.value)}
            helperText="Vous pouvez personnaliser le numéro de la situation"
            sx={{ flex: 1, maxWidth: 400 }}
            required
          />
          <TextField
            label="Date de création"
            type="date"
            value={dateCreation}
            onChange={(e) => setDateCreation(e.target.value)}
            helperText="Date qui apparaîtra sur le document"
            sx={{ flex: 1, maxWidth: 200 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Taux compte prorata (%)"
            type="number"
            value={tauxProrata}
            onChange={(e) => setTauxProrata(e.target.value)}
            inputProps={{ step: "0.01", min: "0", max: "100" }}
            sx={{ width: "200px" }}
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
          <Table sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: "50px", padding: "8px" }} />
                <TableCell sx={{ width: "300px", padding: "8px" }}>
                  Description
                </TableCell>
                <TableCell
                  sx={{ width: "100px", padding: "8px" }}
                  align="right"
                >
                  Quantité
                </TableCell>
                <TableCell
                  sx={{ width: "120px", padding: "8px" }}
                  align="right"
                >
                  Prix unitaire
                </TableCell>
                <TableCell
                  sx={{ width: "120px", padding: "8px" }}
                  align="right"
                >
                  Total HT
                </TableCell>
                <TableCell
                  sx={{ width: "120px", padding: "8px" }}
                  align="right"
                >
                  % Avancement
                </TableCell>
                <TableCell
                  sx={{ width: "120px", padding: "8px" }}
                  align="right"
                >
                  Montant
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {structure.map((partie) => (
                <PartieRow
                  key={partie.id}
                  partie={partie}
                  handlePourcentageChange={handlePourcentageChange}
                  lignesSpeciales={lignesSpeciales}
                />
              ))}
              {/* Lignes spéciales globales - Trier par index_global si disponible */}
              {lignesSpeciales
                .filter((ligne) => ligne.niveau === "global")
                .sort((a, b) => (a.index_global || 0) - (b.index_global || 0))
                .map((ligne, index) => {
                  // ✅ Appliquer les styles de la ligne spéciale
                  const ligneStyles = ligne.styles || {};
                  return (
                    <TableRow
                      key={ligne.id}
                      sx={{
                        backgroundColor:
                          index % 2 === 0 ? "white" : "rgba(0, 0, 0, 0.05)",
                        "& td": { padding: "8px" },
                      }}
                    >
                      <TableCell
                        sx={{ width: "50px", padding: "8px" }}
                      ></TableCell>
                      <TableCell 
                        sx={{ 
                          width: "300px", 
                          padding: "8px",
                          // ✅ Appliquer les styles de la ligne spéciale
                          fontWeight: ligneStyles.fontWeight || 'normal',
                          fontStyle: ligneStyles.fontStyle || 'normal',
                          textDecoration: ligneStyles.textDecoration || 'none',
                          color: ligneStyles.color || 'inherit',
                          backgroundColor: ligneStyles.backgroundColor || 'transparent',
                          textAlign: ligneStyles.textAlign || 'left',
                        }}
                      >
                        {ligne.description}
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ color: "text.secondary" }}
                        >
                          Ligne spéciale globale
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{ width: "100px", padding: "8px" }}
                        align="right"
                      ></TableCell>
                      <TableCell
                        sx={{ width: "120px", padding: "8px" }}
                        align="right"
                      ></TableCell>
                      <TableCell
                        sx={{ 
                          width: "120px", 
                          padding: "8px",
                          // ✅ Appliquer les styles pour les montants
                          fontWeight: ligneStyles.fontWeight || 'normal',
                          color: ligneStyles.color || 'inherit',
                        }}
                        align="right"
                      >
                        {ligne.type === "reduction" ? "-" : ""}
                        {parseFloat(ligne.montant_ht)
                          .toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                        €
                      </TableCell>
                      <TableCell
                        sx={{ width: "120px", padding: "8px" }}
                        align="right"
                      >
                        <TextField
                          type="number"
                          value={ligne.pourcentage_actuel || 0}
                          onChange={(e) =>
                            handlePourcentageChange(
                              ligne.id,
                              e.target.value,
                              "special"
                            )
                          }
                          onFocus={(e) => e.target.select()}
                          InputProps={{
                            inputProps: {
                              min: 0,
                              max: 100,
                              step: "any",
                            },
                          }}
                          size="small"
                          sx={{
                            width: "100px",
                            "& input": {
                              textAlign: "right",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{ 
                          width: "120px", 
                          padding: "8px",
                          // ✅ Appliquer les styles pour les montants calculés
                          fontWeight: ligneStyles.fontWeight || 'bold',
                          color: ligneStyles.color || 'inherit',
                        }}
                        align="right"
                      >
                        {ligne.type === "reduction" ? "-" : ""}
                        {(
                          (ligne.montant_ht * (ligne.pourcentage_actuel || 0)) /
                          100
                        )
                          .toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                        €
                      </TableCell>
                    </TableRow>
                  );
                })}
              {/* Afficher la partie Avenants uniquement s'il y a des avenants avec des factures_ts */}
              {avenants && avenants.length > 0 && avenants.some(av => av.factures_ts && av.factures_ts.length > 0) && (
                <AvenantsPartieRow
                  avenants={avenants.filter(av => av.factures_ts && av.factures_ts.length > 0)}
                  handlePourcentageChange={handlePourcentageChange}
                />
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell align="right">Montant</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Montant HT du mois */}

              {/* Montant total cumul HT */}
              <TableRow>
                <TableCell>Montant total cumul HT</TableCell>
                <TableCell align="right">
                  {(() => {
                    const cumulPrecedent = calculerCumulPrecedent();
                    const montantTotalCumul = calculerMontantTotalCumul();

                    return montantTotalCumul
                      .toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                  })()}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Cumul mois précédent */}
              <TableRow>
                <TableCell>Cumul mois précédent</TableCell>
                <TableCell align="right">
                  {calculerCumulPrecedent()
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Montant HT du mois</TableCell>
                <TableCell align="right">
                  {calculerMontantHTMois()
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Retenue de garantie */}
              <TableRow>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Retenue de garantie (
                    <TextField
                      type="number"
                      value={tauxRetenueGarantie}
                      onChange={(e) => setTauxRetenueGarantie(parseFloat(e.target.value) || 0)}
                      inputProps={{ step: "0.1", min: "0", max: "100" }}
                      size="small"
                      sx={{ width: 80 }}
                    />
                    % HT du mois)
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ color: "error.main" }}>
                  -
                  {(calculerMontantHTMois() * (tauxRetenueGarantie / 100))
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Compte prorata */}
              <TableRow>
                <TableCell>
                  Compte prorata ({tauxProrata}% HT du mois)
                </TableCell>
                <TableCell align="right" sx={{ color: "error.main" }}>
                  -
                  {(calculerMontantHTMois() * (tauxProrata / 100))
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Retenue CIE */}
              <TableRow>
                <TableCell>Retenue CIE HT du mois</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={typeRetenueCIE}
                        onChange={(e) => setTypeRetenueCIE(e.target.value)}
                        label="Type"
                      >
                        <MenuItem value="deduction">Déduction</MenuItem>
                        <MenuItem value="ajout">Ajout</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      type="number"
                      value={retenueCIE}
                      onChange={(e) => setRetenueCIE(e.target.value)}
                      inputProps={{ step: "0.01", min: "0" }}
                      size="small"
                      sx={{ width: 150 }}
                    />
                  </Box>
                  {facturesCIE.length > 0 && (
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ mt: 1, color: "text.secondary", textAlign: "right" }}
                    >
                      Factures incluses :
                      {facturesCIE.map((f) => (
                        <div key={f.id}>
                          {f.numero}:{" "}
                          {parseFloat(f.montant_ht)
                            .toFixed(2)
                            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                          €
                        </div>
                      ))}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>

              {/* Lignes supplémentaires */}
              {lignesSupplementaires.map((ligne, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <TextField
                        size="small"
                        value={ligne.description}
                        onChange={(e) =>
                          handleLigneChange(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Description"
                        fullWidth
                      />
                      <Select
                        size="small"
                        value={ligne.type}
                        onChange={(e) =>
                          handleLigneChange(index, "type", e.target.value)
                        }
                      >
                        <MenuItem value="deduction">Déduction</MenuItem>
                        <MenuItem value="addition">Addition</MenuItem>
                      </Select>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      {ligne.type === "deduction" && "-"}
                      <TextField
                        size="small"
                        type="number"
                        value={ligne.montant}
                        onChange={(e) =>
                          handleLigneChange(
                            index,
                            "montant",
                            parseFloat(e.target.value)
                          )
                        }
                        inputProps={{ step: "0.01" }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleSupprimerLigne(index)}
                        sx={{ color: "red" }}
                      >
                        <FaTrash />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {/* Montant total du mois HT après retenues */}
              <TableRow>
                <TableCell>Montant total du mois HT après retenues</TableCell>
                <TableCell align="right">
                  {(() => {
                    const retenueCIEValue = parseFloat(retenueCIE || 0);
                    const retenueCIECalculee = typeRetenueCIE === 'deduction' ? retenueCIEValue : -retenueCIEValue;
                    
                    let montantTotal =
                      calculerMontantHTMois() -
                      calculerMontantHTMois() * (tauxRetenueGarantie / 100) -
                      calculerMontantHTMois() * (tauxProrata / 100) -
                      retenueCIECalculee;

                    // Appliquer les lignes supplémentaires
                    lignesSupplementaires.forEach((ligne) => {
                      if (ligne.type === "deduction") {
                        montantTotal -= parseFloat(ligne.montant || 0);
                      } else {
                        montantTotal += parseFloat(ligne.montant || 0);
                      }
                    });

                    return montantTotal
                      .toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                  })()}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* TVA */}
              <TableRow>
                <TableCell>TVA ({tvaRate}%)</TableCell>
                <TableCell align="right">
                  {(() => {
                    const retenueCIEValue = parseFloat(retenueCIE || 0);
                    const retenueCIECalculee = typeRetenueCIE === 'deduction' ? retenueCIEValue : -retenueCIEValue;
                    
                    let montantBase =
                      calculerMontantHTMois() -
                      calculerMontantHTMois() * (tauxRetenueGarantie / 100) -
                      calculerMontantHTMois() * (tauxProrata / 100) -
                      retenueCIECalculee;

                    // Appliquer les lignes supplémentaires
                    lignesSupplementaires.forEach((ligne) => {
                      if (ligne.type === "deduction") {
                        montantBase -= parseFloat(ligne.montant || 0);
                      } else {
                        montantBase += parseFloat(ligne.montant || 0);
                      }
                    });

                    return (montantBase * (tvaRate / 100))
                      .toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                  })()}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Montant total TTC à payer */}
              <TableRow sx={{ "& td": { fontWeight: "bold" } }}>
                <TableCell>Montant total TTC à payer</TableCell>
                <TableCell align="right">
                  {(() => {
                    const retenueCIEValue = parseFloat(retenueCIE || 0);
                    const retenueCIECalculee = typeRetenueCIE === 'deduction' ? retenueCIEValue : -retenueCIEValue;
                    
                    let montantBase =
                      calculerMontantHTMois() -
                      calculerMontantHTMois() * (tauxRetenueGarantie / 100) -
                      calculerMontantHTMois() * (tauxProrata / 100) -
                      retenueCIECalculee;

                    // Appliquer les lignes supplémentaires
                    lignesSupplementaires.forEach((ligne) => {
                      if (ligne.type === "deduction") {
                        montantBase -= parseFloat(ligne.montant || 0);
                      } else {
                        montantBase += parseFloat(ligne.montant || 0);
                      }
                    });

                    return (montantBase * (1 + tvaRate / 100))
                      .toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                  })()}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Lignes supplémentaires */}
              <TableRow>
                <TableCell colSpan={2}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAjoutLigne}
                    sx={{ mb: 2 }}
                  >
                    Ajouter une ligne
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} color="primary">
          {existingSituation
            ? "Mettre à jour la situation"
            : "Créer la situation"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SituationCreationModal;
