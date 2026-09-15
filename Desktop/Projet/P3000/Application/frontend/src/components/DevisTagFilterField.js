import { TextField } from "@mui/material";
import React from "react";
import {
  formatStatusFilterLabel,
  normalizeStatusFilter,
} from "../config/devisTags";

/**
 * Champ filtre tags stylé comme les autres inputs du tableau (underline MUI).
 * Ouvre le modal au clic.
 */
const DevisTagFilterField = ({ value, onClick, dark = false }) => {
  const label = formatStatusFilterLabel(value);
  const active = normalizeStatusFilter(value).length > 0;

  return (
    <TextField
      variant="standard"
      value={label}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.(event);
        }
      }}
      InputProps={{
        readOnly: true,
      }}
      inputProps={{
        readOnly: true,
        title: "Cliquer pour filtrer par un ou plusieurs tags",
        "aria-label": "Filtrer par tags",
      }}
      sx={{
        width: "100%",
        maxWidth: 160,
        "& .MuiInputBase-root": {
          cursor: "pointer",
          pt: "10px",
        },
        "& .MuiInputBase-input": {
          cursor: "pointer",
          textAlign: "center",
          fontWeight: active ? 700 : 400,
          color: dark ? "#fff" : active ? "#1565c0" : "inherit",
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
        ...(dark
          ? {
              "& .MuiInput-underline:before": {
                borderBottomColor: "rgba(255, 255, 255, 0.42)",
              },
              "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                borderBottomColor: "rgba(255, 255, 255, 0.87)",
              },
              "& .MuiInput-underline:after": {
                borderBottomColor: "#fff",
              },
            }
          : {}),
      }}
    />
  );
};

export default DevisTagFilterField;
