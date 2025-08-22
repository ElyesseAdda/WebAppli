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
  TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import NewFournisseurForm from "./Founisseur/NewFournisseurForm";

function SelectionFournisseurModal({ open, onClose, onSubmit, numeroBC }) {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [selectedData, setSelectedData] = useState({
    fournisseur: "",
    chantier: "",
    agent: "",
  });
  const [dateCommande, setDateCommande] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dateCreation, setDateCreation] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [contactType, setContactType] = useState("");
  const [contactAgent, setContactAgent] = useState("");
  const [contactSousTraitant, setContactSousTraitant] = useState("");
  const [numeroBonCommande, setNumeroBonCommande] = useState(numeroBC);
  const [openFournisseurModal, setOpenFournisseurModal] = useState(false);
  const [sousTraitants, setSousTraitants] = useState([]);

  // Liste dynamique des émetteurs (chargée depuis l'API)
  const [emetteurs, setEmetteurs] = useState([]);

  // Liste dynamique des agents pour la réception (depuis API)
  const [agentsReceptionnaires, setAgentsReceptionnaires] = useState([]);

  useEffect(() => {
    // Charger la liste des fournisseurs
    fetch("/api/fournisseurs/")
      .then((response) => response.json())
      .then((data) => setFournisseurs(data))
      .catch((error) => console.error("Erreur:", error));

    // Charger la liste des chantiers
    fetch("/api/chantier/")
      .then((response) => response.json())
      .then((data) => setChantiers(data))
      .catch((error) => console.error("Erreur:", error));

    // Charger la liste des sous-traitants
    fetch("/api/sous-traitants/")
      .then((response) => response.json())
      .then((data) => setSousTraitants(data))
      .catch((error) => console.error("Erreur:", error));

    // Charger la liste des agents réceptionnaires depuis l'API
    fetch("/api/agent/")
      .then((response) => response.json())
      .then((data) => setAgentsReceptionnaires(data))
      .catch((error) => console.error("Erreur:", error));

    // Charger la liste des émetteurs depuis l'API
    fetch("/api/emetteurs/")
      .then((response) => response.json())
      .then((data) => setEmetteurs(data))
      .catch((error) => console.error("Erreur:", error));
  }, []);

  const handleChange = (event) => {
    setSelectedData({
      ...selectedData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = () => {
    const selectedFournisseur = fournisseurs.find(
      (f) => f.id === selectedData.fournisseur
    );
    onSubmit({
      fournisseur: selectedData.fournisseur,
      fournisseurName: selectedFournisseur ? selectedFournisseur.name : "",
      chantier: selectedData.chantier,
      emetteur: selectedData.emetteur,
      date_commande: dateCommande,
      date_creation_personnalisee: dateCreation,
      numero_bon_commande: numeroBonCommande,
      contact_type: contactType,
      contact_agent: contactType === "agent" ? contactAgent : null,
      contact_sous_traitant:
        contactType === "sous_traitant" ? contactSousTraitant : null,
    });
    onClose();
  };

  const isFormValid =
    selectedData.fournisseur && selectedData.chantier && selectedData.emetteur;

  const handleOpenFournisseurModal = () => setOpenFournisseurModal(true);
  const handleCloseFournisseurModal = () => setOpenFournisseurModal(false);
  const handleAddFournisseur = () => {
    // Rafraîchir la liste des fournisseurs après création
    fetch("/api/fournisseurs/")
      .then((response) => response.json())
      .then((data) => setFournisseurs(data));
    handleCloseFournisseurModal();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nouveau Bon de Commande</DialogTitle>
      <DialogContent>
        <Box
          component="form"
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          onSubmit={handleSubmit}
        >
          <FormControl fullWidth>
            <InputLabel>Fournisseur</InputLabel>
            <Select
              name="fournisseur"
              value={selectedData.fournisseur}
              onChange={(e) =>
                setSelectedData({
                  ...selectedData,
                  fournisseur: e.target.value,
                })
              }
              label="Fournisseur"
            >
              {fournisseurs.map((fournisseur) => (
                <MenuItem key={fournisseur.id} value={fournisseur.id}>
                  {fournisseur.name || fournisseur.Fournisseur_mail}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Chantier</InputLabel>
            <Select
              name="chantier"
              value={selectedData.chantier}
              onChange={(e) =>
                setSelectedData({ ...selectedData, chantier: e.target.value })
              }
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
            <InputLabel>Émetteur</InputLabel>
            <Select
              name="emetteur"
              value={selectedData.emetteur}
              onChange={(e) =>
                setSelectedData({ ...selectedData, emetteur: e.target.value })
              }
              label="Émetteur"
              renderValue={(selected) => {
                const emetteur = emetteurs.find((e) => e.id === selected);
                return emetteur ? `${emetteur.name} ${emetteur.surname}` : "";
              }}
            >
              {emetteurs.map((emetteur) => (
                <MenuItem key={emetteur.id} value={emetteur.id}>
                  {emetteur.surname} {emetteur.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Date de Commande"
            type="date"
            value={dateCommande}
            onChange={(e) => setDateCommande(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            required
          />

          <TextField
            label="Date de Création du Document"
            type="date"
            value={dateCreation}
            onChange={(e) => setDateCreation(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            helperText="Date qui apparaîtra sur le document (pour antidater)"
            required
          />

          <FormControl fullWidth>
            <InputLabel>Type de Contact Réceptionnaire</InputLabel>
            <Select
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
              label="Type de Contact Réceptionnaire"
            >
              <MenuItem value="agent">Agent</MenuItem>
              <MenuItem value="sous_traitant">Sous-traitant</MenuItem>
            </Select>
          </FormControl>

          {contactType === "agent" && (
            <FormControl fullWidth>
              <InputLabel>Agent Réceptionnaire</InputLabel>
              <Select
                value={contactAgent}
                onChange={(e) => setContactAgent(e.target.value)}
                label="Agent Réceptionnaire"
                renderValue={(selected) => {
                  const agent = agentsReceptionnaires.find(
                    (a) => a.id === selected
                  );
                  return agent ? `${agent.name} ${agent.surname}` : "";
                }}
              >
                {agentsReceptionnaires.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    {agent.surname} {agent.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {contactType === "sous_traitant" && (
            <FormControl fullWidth>
              <InputLabel>Sous-traitant Réceptionnaire</InputLabel>
              <Select
                value={contactSousTraitant}
                onChange={(e) => setContactSousTraitant(e.target.value)}
                label="Sous-traitant Réceptionnaire"
              >
                {sousTraitants.map((sousTraitant) => (
                  <MenuItem key={sousTraitant.id} value={sousTraitant.id}>
                    {sousTraitant.representant} - {sousTraitant.entreprise}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Numéro de Bon de Commande"
            value={numeroBonCommande}
            onChange={(e) => setNumeroBonCommande(e.target.value)}
            required
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Button
            onClick={handleOpenFournisseurModal}
            color="secondary"
            variant="outlined"
          >
            Nouveau Fournisseur
          </Button>
          <Box>
            <Button onClick={onClose}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!isFormValid}
              sx={{ ml: 1 }}
            >
              Suivant
            </Button>
          </Box>
        </Box>
        <NewFournisseurForm
          open={openFournisseurModal}
          handleClose={handleCloseFournisseurModal}
          onAddFournisseur={handleAddFournisseur}
        />
      </DialogActions>
    </Dialog>
  );
}

export default SelectionFournisseurModal;
