import axios from "axios";
import React, { useEffect, useState } from "react";
import "./../../static/css/dashboard.css";
import ChantierEnCoursCard from "./ChantierEnCoursCard";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    chantier_en_cours: 0,
    cout_materiel: 0,
    cout_main_oeuvre: 0,
    cout_sous_traitance: 0,
    montant_total: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/dashboard/");
        console.log("Dashboard data:", response.data); // Pour déboguer
        setDashboardData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <ChantierEnCoursCard
        chantierEnCours={dashboardData.chantier_en_cours}
        montantTotal={dashboardData.montant_total}
      />
    </div>
  );
};

export default Dashboard;
