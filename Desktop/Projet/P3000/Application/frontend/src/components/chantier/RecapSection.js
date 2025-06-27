import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { ResponsivePie } from "@nivo/pie";
import React, { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import RecapCategoryDetails from "./RecapCategoryDetails";

const RecapSection = ({ title, data, colors }) => {
  const [openDetails, setOpenDetails] = useState({});

  // Préparer les données pour Nivo Pie
  const pieData = Object.keys(data).map((cat) => ({
    id: cat.replace("_", " ").toUpperCase(),
    label: cat.replace("_", " ").toUpperCase(),
    value: data[cat].total || 0,
    color: colors[cat] || "#8884d8",
    key: cat,
  }));

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
        {/* PieChart Nivo */}
        <Box sx={{ width: 220, height: 220 }}>
          <ResponsivePie
            data={pieData}
            margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
            innerRadius={0.6}
            padAngle={1}
            cornerRadius={3}
            colors={{ datum: "data.color" }}
            borderWidth={1}
            borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
            enableArcLabels={true}
            arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: "color" }}
            legends={[
              {
                anchor: "bottom",
                direction: "row",
                justify: false,
                translateY: 36,
                itemWidth: 80,
                itemHeight: 18,
                itemsSpacing: 0,
                symbolSize: 18,
                symbolShape: "circle",
              },
            ]}
            tooltip={({ datum }) => (
              <Box sx={{ p: 1 }}>
                <Typography variant="body2" fontWeight={700}>
                  {datum.label}
                </Typography>
                <Typography variant="body2">
                  {Number(datum.value).toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </Typography>
              </Box>
            )}
          />
        </Box>
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
                  documents={data[cat].documents}
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
