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

function SelectionFournisseurModal({ open, onClose, onSubmit, numeroBC, initialChantierId }) {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  // Convertir initialChantierId en nombre si fourni
  const initialChantierIdNum = initialChantierId ? Number(initialChantierId) : null;
  const [selectedData, setSelectedData] = useState({
    fournisseur: "",
    chantier: initialChantierIdNum || "",
    agent: "",
    statut: "en_attente", // Statut par défaut
    magasin: "", // Magasin sélectionné
  });
  const [magasins, setMagasins] = useState([]); // Magasins du fournisseur sélectionné
  const [dateCommande, setDateCommande] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dateCreation, setDateCreation] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [contactType, setContactType] = useState("");
  const [contactAgent, setContactAgent] = useState("");
  const [contactSousTraitant, setContactSousTraitant] = useState("");
  const [contactSousTraitantContact, setContactSousTraitantContact] = useState("");
  const [sousTraitantContacts, setSousTraitantContacts] = useState([]);
  const [numeroBonCommande, setNumeroBonCommande] = useState(numeroBC);
  const [openFournisseurModal, setOpenFournisseurModal] = useState(false);
  const [sousTraitants, setSousTraitants] = useState([]);

  // Liste dynamique des émetteurs (chargée depuis l'API)
  const [emetteurs, setEmetteurs] = useState([]);

  // Liste dynamique des agents pour la réception (depuis API)
  const [agentsReceptionnaires, setAgentsReceptionnaires] = useState([]);

  // Options de statut pour les bons de commande
  const statutOptions = [
    { value: "en_attente", label: "En attente Livraison" },
    { value: "livre_chantier", label: "Livré Chantier" },
    { value: "retrait_magasin", label: "Retrait Magasin" },
  ];

  useEffect(() => {
    // Charger la liste des fournisseurs
    fetch("/api/fournisseurs/")
      .then((response) => response.json())
      .then((data) => setFournisseurs(data))
      .catch((error) => console.error("Erreur:", error));

    // Charger la liste des chantiers
    fetch("/api/chantier/")
      .then((response) => response.json())
      .then((data) => {
        // Filtrer les chantiers avec le statut "Terminé"
        const filteredChantiers = data.filter(
          (chantier) => chantier.state_chantier !== "Terminé"
        );
        setChantiers(filteredChantiers);
      })
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

  // Mettre à jour le chantier lorsque initialChantierId change ou lorsque le modal s'ouvre
  useEffect(() => {
    if (open && initialChantierIdNum) {
      setSelectedData((prev) => ({
        ...prev,
        chantier: initialChantierIdNum,
      }));
    }
  }, [open, initialChantierIdNum]);

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
    
    // Pour le contact sous-traitant :
    // - contact_sous_traitant : toujours l'ID du sous-traitant (requis par le backend)
    // - contact_sous_traitant_contact : l'ID du contact si ce n'est pas le représentant, null si c'est le représentant
    // - is_representant : true si c'est le représentant, false sinon
    let contactSousTraitantContactFinal = null;
    let isRepresentant = false;
    
    if (contactType === "sous_traitant" && contactSousTraitant) {
      if (contactSousTraitantContact === "representant") {
        // Si c'est le représentant, on ne passe pas d'ID de contact
        isRepresentant = true;
      } else if (contactSousTraitantContact) {
        // Sinon, on passe l'ID du contact
        contactSousTraitantContactFinal = contactSousTraitantContact;
      }
    }
    
    // Récupérer le nom du magasin sélectionné
    const magasinId = selectedData.magasin;
    const selectedMagasin = magasinId ? magasins.find((m) => m.id === magasinId) : null;
    const magasinNom = selectedMagasin ? selectedMagasin.nom : null;

    onSubmit({
      fournisseur: selectedData.fournisseur,
      fournisseurName: selectedFournisseur ? selectedFournisseur.name : "",
      chantier: selectedData.chantier,
      emetteur: selectedData.emetteur,
      statut: selectedData.statut, // Ajout du statut
      date_commande: dateCommande,
      date_creation_personnalisee: dateCreation,
      numero_bon_commande: numeroBonCommande,
      contact_type: contactType,
      contact_agent: contactType === "agent" ? contactAgent : null,
      contact_sous_traitant: contactType === "sous_traitant" ? contactSousTraitant : null,
      contact_sous_traitant_contact: contactSousTraitantContactFinal,
      is_representant: isRepresentant,
      magasin: magasinNom, // Nom du magasin sélectionné
      magasin_id: magasinId && magasinId !== "" ? magasinId : null, // ID du magasin sélectionné
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

  // Réinitialiser les états quand le modal se ferme
  useEffect(() => {
    if (!open) {
      setContactType("");
      setContactAgent("");
      setContactSousTraitant("");
      setContactSousTraitantContact("");
      setSousTraitantContacts([]);
      setMagasins([]);
      setSelectedData((prev) => ({
        ...prev,
        magasin: "",
      }));
    }
  }, [open]);

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
              onChange={(e) => {
                const fournisseurId = e.target.value;
                setSelectedData({
                  ...selectedData,
                  fournisseur: fournisseurId,
                  magasin: "", // Réinitialiser le magasin lors du changement de fournisseur
                });
                // Charger les magasins du fournisseur sélectionné
                if (fournisseurId) {
                  fetch(`/api/fournisseurs/${fournisseurId}/`)
                    .then((response) => response.json())
                    .then((data) => {
                      setMagasins(data.magasins || []);
                    })
                    .catch((error) => {
                      console.error("Erreur lors du chargement des magasins:", error);
                      setMagasins([]);
                    });
                } else {
                  setMagasins([]);
                }
              }}
              label="Fournisseur"
            >
              {fournisseurs.map((fournisseur) => (
                <MenuItem key={fournisseur.id} value={fournisseur.id}>
                  {fournisseur.name || fournisseur.Fournisseur_mail}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Champ Magasin - affiché uniquement si un fournisseur est sélectionné et qu'il a des magasins */}
          {selectedData.fournisseur && magasins.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>Magasin</InputLabel>
              <Select
                name="magasin"
                value={selectedData.magasin}
                onChange={(e) =>
                  setSelectedData({
                    ...selectedData,
                    magasin: e.target.value,
                  })
                }
                label="Magasin"
              >
                <MenuItem value="">
                  <em>Aucun magasin</em>
                </MenuItem>
                {magasins.map((magasin) => (
                  <MenuItem key={magasin.id} value={magasin.id}>
                    {magasin.nom}
                    {magasin.email && ` (${magasin.email})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

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
              {chantiers
                .filter((chantier) => chantier.state_chantier !== "Terminé")
                .map((chantier) => (
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

          <FormControl fullWidth>
            <InputLabel>Statut de Livraison</InputLabel>
            <Select
              value={selectedData.statut}
              onChange={(e) =>
                setSelectedData({
                  ...selectedData,
                  statut: e.target.value,
                })
              }
              label="Statut de Livraison"
            >
              {statutOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Date de Commande"
              type="date"
              value={dateCommande}
              onChange={(e) => setDateCommande(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
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
              fullWidth
              required
            />
          </Box>

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
            <>
              <FormControl fullWidth>
                <InputLabel>Sous-traitant Réceptionnaire</InputLabel>
                <Select
                  value={contactSousTraitant}
                  onChange={(e) => {
                    setContactSousTraitant(e.target.value);
                    // Charger les contacts du sous-traitant sélectionné
                    if (e.target.value) {
                      fetch(`/api/contacts-sous-traitant/?sous_traitant=${e.target.value}`)
                        .then((response) => response.json())
                        .then((data) => {
                          setSousTraitantContacts(data);
                          // Trouver le sous-traitant sélectionné pour récupérer le représentant
                          const selectedST = sousTraitants.find((st) => st.id === e.target.value);
                          // Par défaut, sélectionner le représentant (on utilisera une valeur spéciale)
                          if (selectedST && selectedST.representant) {
                            setContactSousTraitantContact("representant");
                          } else if (data.length > 0) {
                            // Sinon, sélectionner le premier contact
                            setContactSousTraitantContact(data[0].id.toString());
                          } else {
                            setContactSousTraitantContact("");
                          }
                        })
                        .catch((error) => {
                          console.error("Erreur lors du chargement des contacts:", error);
                          setSousTraitantContacts([]);
                          setContactSousTraitantContact("");
                        });
                    } else {
                      setSousTraitantContacts([]);
                      setContactSousTraitantContact("");
                    }
                  }}
                  label="Sous-traitant Réceptionnaire"
                >
                  {sousTraitants.map((sousTraitant) => (
                    <MenuItem key={sousTraitant.id} value={sousTraitant.id}>
                      {sousTraitant.entreprise}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {contactSousTraitant && (
                <FormControl fullWidth>
                  <InputLabel>Contact</InputLabel>
                  <Select
                    value={contactSousTraitantContact}
                    onChange={(e) => setContactSousTraitantContact(e.target.value)}
                    label="Contact"
                    renderValue={(selected) => {
                      if (selected === "representant") {
                        const selectedST = sousTraitants.find((st) => st.id === contactSousTraitant);
                        return selectedST ? selectedST.representant : "";
                      }
                      const contact = sousTraitantContacts.find((c) => c.id.toString() === selected);
                      if (contact) {
                        const nomComplet = contact.prenom
                          ? `${contact.prenom} ${contact.nom}`.trim()
                          : contact.nom;
                        return contact.poste
                          ? `${nomComplet} (${contact.poste})`
                          : nomComplet;
                      }
                      return "";
                    }}
                  >
                    {/* Option représentant par défaut */}
                    {(() => {
                      const selectedST = sousTraitants.find((st) => st.id === contactSousTraitant);
                      return selectedST && selectedST.representant ? (
                        <MenuItem value="representant">
                          {selectedST.representant} (Représentant)
                        </MenuItem>
                      ) : null;
                    })()}
                    {/* Liste des contacts */}
                    {sousTraitantContacts.map((contact) => {
                      const nomComplet = contact.prenom
                        ? `${contact.prenom} ${contact.nom}`.trim()
                        : contact.nom;
                      return (
                        <MenuItem key={contact.id} value={contact.id.toString()}>
                          {contact.poste
                            ? `${nomComplet} (${contact.poste})`
                            : nomComplet}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}
            </>
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
