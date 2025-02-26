import {
  Box,
  Select,
  TableCell,
  TableContainer,
  TextField,
} from "@mui/material";
import { blue } from "@mui/material/colors";
import { styled } from "@mui/material/styles";

// Styles communs
export const commonStyles = {
  box: {
    width: "100%",
    padding: "0 20px",
    boxSizing: "border-box",
    position: "relative",
  },

  tableContainer: {
    margin: "0 auto",
    width: "100%",
    "& .MuiTable-root": {
      minWidth: "100%",
    },
  },

  filterCell: {
    backgroundColor: "rgba(27, 120, 188, 1)",
    "& .MuiTableSortLabel-root": {
      color: "white",
    },
  },

  alignedCell: {
    backgroundColor: "rgba(27, 120, 188, 1)",
    "& .MuiTableSortLabel-root": {
      width: "100%",
      justifyContent: "center",
      color: "white",
    },
  },

  baseTextField: {
    "& .MuiInputBase-input": {
      color: "white",
    },
    "& .MuiInputLabel-root": {
      color: "white",
    },
    "& .MuiInput-underline:before": {
      borderBottomColor: "white",
    },
  },

  styledTextField: {
    "& .MuiInputBase-input": {
      textAlign: "left",
    },
    "& .MuiInputLabel-root": {
      textAlign: "left",
    },
  },

  centeredTextField: {
    "& .MuiInputBase-input": {
      textAlign: "center",
    },
    "& .MuiInputLabel-root": {
      textAlign: "center",
    },
  },

  priceTextField: {
    "& .MuiInputBase-input": {
      fontWeight: 600,
      textAlign: "center",
    },
  },

  devisNumber: {
    color: "rgba(27, 120, 188, 1)",
    fontWeight: 700,
    fontFamily: "Merriweather, serif",
    "&:hover": {
      color: blue[700],
      textDecoration: "underline",
    },
  },

  chantierCell: {
    fontWeight: 600,
    textAlign: "left",
  },

  centeredTableCell: {
    textAlign: "center",
  },

  select: {
    color: "white",
    marginTop: "3px",
    "&:before": {
      borderBottomColor: "white",
    },
    "& .MuiSelect-icon": {
      color: "white",
    },
  },

  actionCell: {
    width: "50px",
    padding: "8px",
    textAlign: "center",
  },
};

// Fonction pour le style dynamique du statut
export const getStatusStyle = (status) => ({
  color:
    status === "En attente"
      ? "orange"
      : status === "Refusé"
      ? "red"
      : status === "Validé"
      ? "green"
      : "inherit",
  fontWeight: 600,
});

// Container Styles
export const StyledBox = styled(Box)(commonStyles.box);

// Table Container
export const StyledTableContainer = styled(TableContainer)(
  commonStyles.tableContainer
);

// Header Cells
export const FilterCell = styled(TableCell)(commonStyles.filterCell);

export const AlignedCell = styled(FilterCell)(commonStyles.alignedCell);

// Custom Text Fields
export const BaseTextField = styled(TextField)(commonStyles.baseTextField);

export const StyledTextField = styled(BaseTextField)(
  commonStyles.styledTextField
);

export const CenteredTextField = styled(BaseTextField)(
  commonStyles.centeredTextField
);

// Specific Field Styles
export const PriceTextField = styled(CenteredTextField)(
  commonStyles.priceTextField
);

// Body Cells
export const DevisNumber = styled(TableCell)(commonStyles.devisNumber);

export const ChantierCell = styled(TableCell)(commonStyles.chantierCell);

export const CenteredTableCell = styled(TableCell)(
  commonStyles.centeredTableCell
);

export const StatusCell = styled(TableCell)(getStatusStyle);

export const StyledSelect = styled(Select)(commonStyles.select);

export const ActionCell = styled(CenteredTableCell)(commonStyles.actionCell);
