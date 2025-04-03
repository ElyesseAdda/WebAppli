import {
  Box,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import ChantierTabs from "./ChantierTabs";

const ChantiersDashboard = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Liste des années pour le filtre (10 dernières années)
  const years = Array.from(
    new Array(10),
    (val, index) => new Date().getFullYear() - index
  );

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  return (
    <Container maxWidth="xl">
      <Box>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            color: "white",
            mb: 3,
            backgroundColor: "rgba(27, 120, 188, 1)",
            fontSize: "32px",
            padding: "10px",
          }}
        >
          Tableau de Bord des Chantiers
        </Typography>

        {/* Filtres année */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Année</InputLabel>
            <Select
              value={selectedYear}
              onChange={handleYearChange}
              label="Année"
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Onglets des chantiers */}
        <Paper elevation={3} sx={{ p: 0, borderRadius: "8px" }}>
          <ChantierTabs initialYear={selectedYear} />
        </Paper>
      </Box>
    </Container>
  );
};

export default ChantiersDashboard;
