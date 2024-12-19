import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./../../static/css/listChantier.css";

const StyledTableContainer = styled(TableContainer)({
  margin: "0 auto",
  width: "100%",
  "& .MuiTableCell-root": {
    fontFamily: "Work Sans, sans-serif",
  },
  "& .MuiTable-root": {
    minWidth: "100%",
  },
});

const HeaderCell = styled(TableCell)({
  backgroundColor: "rgba(27, 120, 188, 1)",
  color: "white",
  fontWeight: "bold",
});

const ChantierName = styled(TableCell)({
  "& a": {
    color: "rgba(27, 120, 188, 1)",
    textDecoration: "none",
    fontWeight: 700,
    fontFamily: "Merriweather, serif",
  },
});

const StatusCell = styled(TableCell)(({ status }) => ({
  color:
    status === "En Cours"
      ? "rgba(27, 120, 188, 1)"
      : status === "En Attente Signature"
      ? "rgb(255, 123, 0)"
      : status === "Terminer"
      ? "rgb(185, 0, 0)"
      : "inherit",
  fontWeight: 600,
}));

const StyledBox = styled(Box)({
  width: "100%",
  padding: "0 20px",
  boxSizing: "border-box",
  position: "relative",
});

function ListChantiers() {
  const [chantiers, setChantiers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/chantier/", {
      method: "GET", // Assure-toi que c'est bien une requête GET
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        setChantiers(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <StyledBox>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontFamily: "Merriweather, serif" }}
      >
        Liste des Chantiers
      </Typography>

      <StyledTableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <HeaderCell>Nom Chantier</HeaderCell>
              <HeaderCell>Nom Client</HeaderCell>
              <HeaderCell>Statut</HeaderCell>
              <HeaderCell>Date de Création</HeaderCell>
              <HeaderCell>Taux facturation</HeaderCell>
              <HeaderCell>Chiffre d'Affaires</HeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {chantiers.map((chantier) => (
              <TableRow key={chantier.id}>
                <ChantierName>
                  <Link to={`/chantier/${chantier.id}`}>
                    {chantier.chantier_name}
                  </Link>
                </ChantierName>
                <TableCell>{chantier.client_name}</TableCell>
                <StatusCell status={chantier.state_chantier}>
                  {chantier.state_chantier}
                </StatusCell>
                <TableCell>{chantier.date_debut}</TableCell>
                <TableCell>A faire</TableCell>
                <TableCell>{chantier.chiffre_affaire} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>
    </StyledBox>
  );
}

export default ListChantiers;
