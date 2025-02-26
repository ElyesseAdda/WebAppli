import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import "./../../static/css/dashboard.css";
import ChantierEnCoursCard from "./ChantierEnCoursCard";

const Dashboard = () => {
  // État pour les filtres
  const [selectedDate, setSelectedDate] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [chantiers, setChantiers] = useState([]);

  // État pour les données
  const [dashboardData, setDashboardData] = useState({
    chantier_en_cours: 0,
    cout_materiel: 0,
    cout_main_oeuvre: 0,
    cout_sous_traitance: 0,
    montant_total: 0,
  });

  // Fonction pour charger les chantiers
  const fetchChantiers = async () => {
    try {
      const response = await axios.get("/api/chantier/");
      setChantiers(response.data);
    } catch (error) {
      console.error("Error fetching chantiers:", error);
    }
  };

  // Fonction pour charger les données du dashboard avec filtres
  const fetchDashboardData = async () => {
    try {
      const response = await axios.get("/api/dashboard/", {
        params: {
          month: selectedDate.month,
          year: selectedDate.year,
          chantier_id: selectedChantier,
        },
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  useEffect(() => {
    fetchChantiers();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate, selectedChantier]);

  return (
    <div style={{ padding: "20px" }}>
      {/* Filtres */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        {/* Sélecteur de date */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Période</InputLabel>
          <Select
            value={`${selectedDate.month}-${selectedDate.year}`}
            onChange={(e) => {
              const [month, year] = e.target.value.split("-");
              setSelectedDate({ month: parseInt(month), year: parseInt(year) });
            }}
          >
            {/* Générer les options pour les 12 derniers mois */}
          </Select>
        </FormControl>

        {/* Sélecteur de chantier */}
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Chantier</InputLabel>
          <Select
            value={selectedChantier || ""}
            onChange={(e) => setSelectedChantier(e.target.value)}
          >
            <MenuItem value="">Tous les chantiers</MenuItem>
            {chantiers.map((chantier) => (
              <MenuItem key={chantier.id} value={chantier.id}>
                {chantier.chantier_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Contenu du dashboard */}
      <ChantierEnCoursCard
        chantierEnCours={dashboardData.chantier_en_cours}
        montantTotal={dashboardData.montant_total}
      />
    </div>
  );
};

export default Dashboard;
