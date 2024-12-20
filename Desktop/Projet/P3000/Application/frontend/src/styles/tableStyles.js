import {
  Box,
  Select,
  TableCell,
  TableContainer,
  TextField,
} from "@mui/material";
import { blue } from "@mui/material/colors";
import { styled } from "@mui/material/styles";

// Container Styles
export const StyledBox = styled(Box)({
  width: "100%",
  padding: "0 20px",
  boxSizing: "border-box",
  position: "relative",
});

// Table Container
export const StyledTableContainer = styled(TableContainer)({
  margin: "0 auto",
  width: "100%",
  "& .MuiTable-root": {
    minWidth: "100%",
  },
});

// Header Cells
export const FilterCell = styled(TableCell)({
  backgroundColor: "rgba(27, 120, 188, 1)",
  "& .MuiTableSortLabel-root": {
    color: "white",
  },
});

export const AlignedCell = styled(FilterCell)({
  "& .MuiTableSortLabel-root": {
    width: "100%",
    justifyContent: "center",
  },
});

// Custom Text Fields
export const BaseTextField = styled(TextField)({
  "& .MuiInputBase-input": {
    color: "white",
  },
  "& .MuiInputLabel-root": {
    color: "white",
  },
  "& .MuiInput-underline:before": {
    borderBottomColor: "white",
  },
});

export const StyledTextField = styled(BaseTextField)({
  "& .MuiInputBase-input": {
    textAlign: "left",
  },
  "& .MuiInputLabel-root": {
    textAlign: "left",
  },
});

export const CenteredTextField = styled(BaseTextField)({
  "& .MuiInputBase-input": {
    textAlign: "center",
  },
  "& .MuiInputLabel-root": {
    textAlign: "center",
  },
});

// Specific Field Styles
export const PriceTextField = styled(CenteredTextField)({
  "& .MuiInputBase-input": {
    fontWeight: 600,
  },
});

// Body Cells
export const DevisNumber = styled(TableCell)`
  color: rgba(27, 120, 188, 1);
  fontweight: 700;
  fontfamily: "Merriweather, serif";
  &:hover {
    color: ${blue[700]};
    text-decoration: underline;
  }
`;

export const ChantierCell = styled(TableCell)({
  fontWeight: 600,
  textAlign: "left",
});

export const CenteredTableCell = styled(TableCell)({
  textAlign: "center",
});

export const StatusCell = styled(TableCell)(({ status }) => ({
  color:
    status === "En attente"
      ? "orange"
      : status === "Refusé"
      ? "red"
      : status === "Validé"
      ? "green"
      : "inherit",
  fontWeight: 600,
}));

export const StyledSelect = styled(Select)({
  color: "white",
  marginTop: "3px",
  "&:before": {
    borderBottomColor: "white",
  },
  "& .MuiSelect-icon": {
    color: "white",
  },
});

export const ActionCell = styled(CenteredTableCell)({
  width: "50px",
  padding: "8px",
});
