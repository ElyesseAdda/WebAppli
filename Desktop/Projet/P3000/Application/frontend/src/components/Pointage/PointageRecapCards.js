import React from "react";
import { Box, Button, Card, CardContent, Paper, Typography } from "@mui/material";

const RecapStatCard = ({ label, value, valueColor }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 2.5,
      border: "1px solid rgba(15, 23, 42, 0.08)",
      backgroundColor: "#fff",
      minHeight: 90,
      transition: "all 0.2s ease",
      "&:hover": {
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
        transform: "translateY(-1px)",
      },
    }}
  >
    <CardContent
      sx={{
        py: 1.75,
        px: 2.25,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 0.4,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.78rem",
          color: "text.secondary",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          lineHeight: 1.25,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "1.2rem",
          fontWeight: 800,
          color: valueColor,
          lineHeight: 1.15,
        }}
      >
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const PointageRecapCards = ({
  totals,
  formatCurrency,
  selectedRecapGroup,
  onToggleGroup,
}) => (
  <Paper
    sx={{
      mb: 2,
      p: 0,
      backgroundColor: "transparent",
    }}
    elevation={0}
  >
    <Box
      sx={{
        mb: 1.5,
        px: 0.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700, color: "#fff" }}>
        Récapitulatif pointage
      </Typography>
      <Box sx={{ display: "flex", gap: 1, ml: 1 }}>
        <Button
          size="small"
          variant={selectedRecapGroup === "horaire" ? "contained" : "outlined"}
          onClick={() => onToggleGroup("horaire")}
          sx={{
            minWidth: 100,
            color: selectedRecapGroup === "horaire" ? "#1976d2" : "#fff",
            backgroundColor: selectedRecapGroup === "horaire" ? "#fff" : "transparent",
            borderColor: "rgba(255,255,255,0.7)",
            "&:hover": {
              backgroundColor:
                selectedRecapGroup === "horaire" ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)",
              borderColor: "#fff",
            },
          }}
        >
          Horaire
        </Button>
        <Button
          size="small"
          variant={selectedRecapGroup === "journalier" ? "contained" : "outlined"}
          onClick={() => onToggleGroup("journalier")}
          sx={{
            minWidth: 100,
            color: selectedRecapGroup === "journalier" ? "#1976d2" : "#fff",
            backgroundColor: selectedRecapGroup === "journalier" ? "#fff" : "transparent",
            borderColor: "rgba(255,255,255,0.7)",
            "&:hover": {
              backgroundColor:
                selectedRecapGroup === "journalier"
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.08)",
              borderColor: "#fff",
            },
          }}
        >
          Journalier
        </Button>
      </Box>
    </Box>
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 2,
      }}
    >
      <RecapStatCard
        label="Total Net verse au salaries"
        value={formatCurrency(totals.totalNetVerseSalaries)}
        valueColor="rgba(46, 125, 50, 1)"
      />
      <RecapStatCard
        label="Total Net verse par l'employeur"
        value={formatCurrency(totals.totalNetVerseEmployeur)}
        valueColor="rgba(27, 120, 188, 1)"
      />
      <RecapStatCard
        label="Cumul mensuel charges du personnel"
        value={formatCurrency(totals.cumulMensuelCharges)}
        valueColor="rgba(27, 120, 188, 1)"
      />
      <RecapStatCard
        label="Total verse"
        value={formatCurrency(totals.totalVerse)}
        valueColor="rgba(46, 125, 50, 1)"
      />
    </Box>
  </Paper>
);

export default PointageRecapCards;

