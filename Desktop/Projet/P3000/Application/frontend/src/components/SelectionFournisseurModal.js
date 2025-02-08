import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import React, { useEffect, useState } from "react";

function SelectionFournisseurModal({ open, onClose, onSubmit }) {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [selectedData, setSelectedData] = useState({
    fournisseur: "",
    chantier: "",
    agent: "",
  });

  // Liste statique des agents
  const agents = [
    {
      id: 1,
      name: "Adel",
      surname: "Majri",
      email: "adel.majri@peinture3000.fr",
      tel: "07.61.56.66.72",
    },
    {
      id: 2,
      name: "Amine",
      surname: "Belaoued",
      email: "amine.belaoued@peinture3000.fr",
      tel: "07.70.18.12.27",
    },
  ];

  useEffect(() => {
    // Charger la liste des fournisseurs
    fetch("/api/get_fournisseurs/")
      .then((response) => response.json())
      .then((data) => setFournisseurs(data))
      .catch((error) => console.error("Erreur:", error));

    // Charger la liste des chantiers
    fetch("/api/chantier/")
      .then((response) => response.json())
      .then((data) => setChantiers(data))
      .catch((error) => console.error("Erreur:", error));
  }, []);

  const handleChange = (event) => {
    setSelectedData({
      ...selectedData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = () => {
    onSubmit({
      fournisseur: selectedData.fournisseur,
      fournisseurName: selectedData.fournisseur,
      chantier: selectedData.chantier,
      agent: selectedData.agent,
    });
    onClose();
  };

  const isFormValid =
    selectedData.fournisseur && selectedData.chantier && selectedData.agent;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nouveau Bon de Commande</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Fournisseur</InputLabel>
            <Select
              name="fournisseur"
              value={selectedData.fournisseur}
              onChange={handleChange}
              label="Fournisseur"
            >
              {fournisseurs.map((fournisseur) => (
                <MenuItem key={fournisseur} value={fournisseur}>
                  {fournisseur}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Chantier</InputLabel>
            <Select
              name="chantier"
              value={selectedData.chantier}
              onChange={handleChange}
              label="Chantier"
            >
              {chantiers.map((chantier) => (
                <MenuItem key={chantier.id} value={chantier.id}>
                  {chantier.chantier_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Agent</InputLabel>
            <Select
              name="agent"
              value={selectedData.agent}
              onChange={handleChange}
              label="Agent"
              renderValue={(selected) => {
                const agent = agents.find((a) => a.id === selected);
                return agent ? `${agent.name} ${agent.surname}` : "";
              }}
            >
              {agents.map((agent) => (
                <MenuItem
                  key={agent.id}
                  value={agent.id}
                  sx={{
                    "& .MuiTypography-root": {
                      whiteSpace: "pre-line",
                    },
                  }}
                >
                  <div>
                    <div>
                      {agent.surname} {agent.name}
                    </div>
                  </div>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isFormValid}
        >
          Suivant
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SelectionFournisseurModal;
