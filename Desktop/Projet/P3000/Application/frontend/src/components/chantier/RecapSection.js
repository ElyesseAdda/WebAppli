import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import RecapCategoryDetails from "./RecapCategoryDetails";

const RecapSection = ({ title, data, colors }) => {
  if (!data) return null;
  // Log des props reçues
  console.log("[RecapSection] props:", { title, data, colors });
  const [openDetails, setOpenDetails] = useState({});

  // Préparer les données pour le PieChart
  const pieData = Object.keys(data).map((cat) => ({
    name: cat.replace("_", " ").toUpperCase(),
    value: data[cat].total || 0,
    key: cat,
  }));

  // Log chaque catégorie et ses données
  Object.keys(data).forEach((cat) => {
    console.log(`[RecapSection] Catégorie: ${cat}`, data[cat]);
  });

  // Gestion de l'ouverture/fermeture des détails
  const handleToggleDetails = (cat) => {
    setOpenDetails((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        alignItems="flex-start"
        gap={4}
      >
        {/* PieChart désactivé temporairement pour debug */}
        {/*
        <Box sx={{ width: 220, height: 220, minWidth: 220, minHeight: 220 }}>
          <ResponsiveContainer width="99%" height="99%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {pieData.map((entry, idx) => (
                  <Cell
                    key={`cell-${entry.key}`}
                    fill={colors[entry.key] || "#8884d8"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  `${Number(value).toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })} €`
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
        */}
        {/* Totaux par catégorie + bouton détails */}
        <Box flex={1}>
          <List>
            {Object.keys(data).map((cat) => (
              <React.Fragment key={cat}>
                <ListItem
                  secondaryAction={
                    <Button
                      size="small"
                      onClick={() => handleToggleDetails(cat)}
                      endIcon={
                        openDetails[cat] ? <FaChevronUp /> : <FaChevronDown />
                      }
                    >
                      Plus d'infos
                    </Button>
                  }
                >
                  <ListItemText
                    primary={cat.replace("_", " ").toUpperCase()}
                    secondary={
                      <Typography
                        sx={{
                          fontWeight: 700,
                          color: colors[cat] || "primary.main",
                        }}
                      >
                        {Number(data[cat].total).toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        €
                      </Typography>
                    }
                  />
                </ListItem>
                <RecapCategoryDetails
                  open={!!openDetails[cat]}
                  documents={data[cat]?.documents || []}
                  title={cat.replace("_", " ").toUpperCase()}
                  onClose={() => handleToggleDetails(cat)}
                />
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Box>
    </Paper>
  );
};

export default RecapSection;
