import React from "react";
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Chip,
  Paper,
  alpha,
} from "@mui/material";
import { MdCompareArrows } from "react-icons/md";
import { PALETTE } from "./theme";

const FournisseurSelector = ({
  fournisseurs,
  selectedFournisseurs,
  onSelectionChange,
  loading,
  fournisseurColors,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 4,
        border: `1px solid ${PALETTE.border}`,
        backgroundColor: PALETTE.surface,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.3s",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <MdCompareArrows size={20} color={PALETTE.primary} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: PALETTE.text,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontSize: "0.75rem",
          }}
        >
          Fournisseurs a comparer
        </Typography>
        {selectedFournisseurs.length > 0 && (
          <Chip
            label={`${selectedFournisseurs.length} selectionne${
              selectedFournisseurs.length > 1 ? "s" : ""
            }`}
            size="small"
            sx={{
              backgroundColor: alpha(PALETTE.primary, 0.1),
              color: PALETTE.primary,
              fontWeight: 600,
              fontSize: "0.7rem",
              height: 24,
            }}
          />
        )}
      </Box>
      <Autocomplete
        multiple
        options={fournisseurs}
        getOptionLabel={(option) => option.name}
        value={selectedFournisseurs}
        onChange={(e, newValue) => onSelectionChange(newValue)}
        loading={loading}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const color = fournisseurColors[option.name] || PALETTE.primary;
            return (
              <Chip
                label={option.name}
                {...getTagProps({ index })}
                key={option.id}
                sx={{
                  backgroundColor: color,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  borderRadius: 2,
                  height: 30,
                  "& .MuiChip-deleteIcon": {
                    color: "rgba(255,255,255,0.6)",
                    "&:hover": { color: "#fff" },
                  },
                }}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={
              selectedFournisseurs.length === 0
                ? "Tapez pour rechercher un fournisseur..."
                : "Ajouter un fournisseur..."
            }
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                backgroundColor: "#f8fafc",
                "&:hover": { backgroundColor: "#f1f5f9" },
                "&.Mui-focused": { backgroundColor: "#fff" },
              },
            }}
          />
        )}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        noOptionsText="Aucun fournisseur trouve"
        loadingText="Chargement..."
      />
    </Paper>
  );
};

export default FournisseurSelector;
