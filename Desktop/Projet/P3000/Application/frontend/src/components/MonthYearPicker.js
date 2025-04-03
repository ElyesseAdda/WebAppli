import { Box, FormControl, MenuItem, Select } from "@mui/material";
import React from "react";

const MonthYearPicker = ({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const months = [
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

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <FormControl sx={{ minWidth: 120 }}>
        <Select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          size="small"
        >
          {months.map((month) => (
            <MenuItem key={month.value} value={month.value}>
              {month.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 100 }}>
        <Select
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          size="small"
        >
          {years.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default MonthYearPicker;
