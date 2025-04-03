import {
  Box,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import ChantierDetailStats from "./ChantierDetailStats";
import ChantierSelect from "./ChantierSelect";
import ChantierStatsCard from "./ChantierStatsCard";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedView, setSelectedView] = useState("year"); // 'year', 'month', 'period'
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");

  const fetchDashboardData = async () => {
    try {
      const params = {
        year: selectedYear,
        chantier_id: selectedChantier,
      };

      if (selectedView === "month" && selectedMonth) {
        params.month = selectedMonth;
      } else if (selectedView === "period" && startMonth && endMonth) {
        params.period_start = `${selectedYear}-${startMonth}-01`;
        params.period_end = `${selectedYear}-${endMonth}-01`;
      }

      const response = await axios.get("/api/dashboard/", { params });
      setDashboardData(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [
    selectedYear,
    selectedView,
    selectedMonth,
    startMonth,
    endMonth,
    selectedChantier,
  ]);

  const months = [
    { value: "01", label: "Janvier" },
    { value: "02", label: "Février" },
    { value: "03", label: "Mars" },
    { value: "04", label: "Avril" },
    { value: "05", label: "Mai" },
    { value: "06", label: "Juin" },
    { value: "07", label: "Juillet" },
    { value: "08", label: "Août" },
    { value: "09", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" },
  ];

  const years = Array.from(
    new Array(10),
    (val, index) => new Date().getFullYear() - index
  );

  const handleChantierChange = (event) => {
    setSelectedChantier(event.target.value);
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
          }}
        >
          Accueil
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Année</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              label="Année"
            >
              {years.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Vue</InputLabel>
            <Select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              label="Vue"
            >
              <MenuItem value="year">Année</MenuItem>
              <MenuItem value="month">Mois</MenuItem>
              <MenuItem value="period">Période</MenuItem>
            </Select>
          </FormControl>

          {selectedView === "month" && (
            <FormControl fullWidth>
              <InputLabel>Mois</InputLabel>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                label="Mois"
              >
                {months.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selectedView === "period" && (
            <>
              <FormControl fullWidth>
                <InputLabel>Mois de début</InputLabel>
                <Select
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  label="Mois de début"
                >
                  {months.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Mois de fin</InputLabel>
                <Select
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  label="Mois de fin"
                >
                  {months.map((month) => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          <ChantierSelect
            selectedChantier={selectedChantier}
            onChantierChange={handleChantierChange}
          />
        </Box>

        {/* Stats Globales */}
        <ChantierStatsCard data={dashboardData?.global_stats} />

        {/* Stats par Chantier */}
        {selectedChantier && dashboardData?.chantiers[selectedChantier] && (
          <ChantierDetailStats
            data={dashboardData.chantiers[selectedChantier]}
            year={selectedYear}
            month={selectedMonth}
          />
        )}
      </Box>
    </Container>
  );
};

export default Dashboard;
