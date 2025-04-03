import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const ChantierSelect = ({ selectedChantier, onChantierChange }) => {
  const [chantiers, setChantiers] = useState([]);

  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        const response = await axios.get("/api/chantier"); // Adjust the endpoint as needed
        setChantiers(response.data);
      } catch (error) {
        console.error("Erreur lors du chargement des chantiers:", error);
      }
    };

    fetchChantiers();
  }, []);

  return (
    <FormControl fullWidth>
      <InputLabel>Chantier</InputLabel>
      <Select
        value={selectedChantier || ""}
        onChange={onChantierChange}
        label="Chantier"
      >
        {chantiers.map((chantier) => (
          <MenuItem key={chantier.id} value={chantier.id}>
            {chantier.chantier_name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default ChantierSelect;
