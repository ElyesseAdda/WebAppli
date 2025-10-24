import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useState } from "react";
import ChantierDetailsModal from "./ChantierDetailsModal";
import ChantierForm from "./ChantierForm";
import ClientInfoModal from "./ClientInfoModal";
import SocieteInfoModal from "./SocieteInfoModal";

const NewChantierModal = ({ open, onClose, onSuccess }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [showClientInfoModal, setShowClientInfoModal] = useState(true);
  const [showSocieteInfoModal, setShowSocieteInfoModal] = useState(false);
  const [showChantierForm, setShowChantierForm] = useState(false);
  const [showChantierDetailsModal, setShowChantierDetailsModal] =
    useState(false);
  const [chantierBasicData, setChantierBasicData] = useState(null);
  const [clientData, setClientData] = useState({
    civilite: "",
    name: "",
    surname: "",
    client_mail: "",
    phone_Number: "",
    poste: "",
    societe: {
      nom_societe: "",
      ville_societe: "",
      rue_societe: "",
      codepostal_societe: "",
    },
  });
  const [pendingData, setPendingData] = useState({
    client: null,
    societe: null,
    chantier: null,
    chantierDetails: null,
  });

  const handleChange = (e, type) => {
    const { name, value } = e.target;
    if (type === "client") {
      setClientData({ ...clientData, [name]: value });
    } else if (type === "societe") {
      setClientData({
        ...clientData,
        societe: { ...clientData.societe, [name]: value },
      });
    }
  };

  const handleClientInfoSubmit = async () => {
    try {
      const clientResponse = await axios.get("/api/client/", {
        params: { client_mail: clientData.client_mail.trim() },
      });

      let clientInfo = {
        civilite: clientData.civilite || "",
        name: clientData.name,
        surname: clientData.surname,
        client_mail: clientData.client_mail,
        phone_Number: parseInt(clientData.phone_Number),
      };

      if (
        clientResponse.data.length > 0 &&
        clientResponse.data[0].client_mail === clientData.client_mail.trim()
      ) {
        const existingClient = clientResponse.data[0];
        clientInfo = {
          civilite: existingClient.civilite || "",
          name: existingClient.name,
          surname: existingClient.surname,
          client_mail: existingClient.client_mail,
          phone_Number: existingClient.phone_Number,
        };
        alert(
          "Ce client existe déjà, nous allons utiliser ses informations existantes."
        );
      }

      setPendingData((prev) => ({ ...prev, client: clientInfo }));
      setClientData((prev) => ({ ...prev, ...clientInfo }));
      setShowClientInfoModal(false);
      setShowSocieteInfoModal(true);
      setActiveStep(1);
    } catch (error) {
      console.error("Erreur lors de la vérification du client:", error);
      alert("Erreur lors de la vérification du client");
    }
  };

  const handleSocieteInfoSubmit = async () => {
    try {
      const societeResponse = await axios.get("/api/societe/", {
        params: {
          nom_societe: clientData.societe.nom_societe.trim(),
          client_name: pendingData.client.id,
        },
      });

      let societeInfo = { ...clientData.societe };

      if (
        societeResponse.data.length > 0 &&
        societeResponse.data[0].nom_societe ===
          clientData.societe.nom_societe.trim() &&
        societeResponse.data[0].client_name === pendingData.client.id
      ) {
        const existingSociete = societeResponse.data[0];
        societeInfo = {
          id: existingSociete.id,
          nom_societe: existingSociete.nom_societe,
          ville_societe: existingSociete.ville_societe,
          rue_societe: existingSociete.rue_societe,
          codepostal_societe: existingSociete.codepostal_societe,
        };
        alert(
          "Cette société existe déjà, nous allons utiliser ses informations existantes."
        );
      }

      setPendingData((prev) => ({ ...prev, societe: societeInfo }));
      setClientData((prev) => ({ ...prev, societe: societeInfo }));
      setShowSocieteInfoModal(false);
      setShowChantierForm(true);
      setActiveStep(2);
    } catch (error) {
      console.error("Erreur lors de la vérification de la société:", error);
      alert("Erreur lors de la vérification de la société");
    }
  };

  const handleChantierSubmit = (basicChantierData) => {
    setPendingData((prev) => ({ ...prev, chantier: basicChantierData }));
    setShowChantierDetailsModal(true);
    setActiveStep(3);
  };

  const handleChantierDetailsSubmit = async (detailsData) => {
    try {
      // Convertir les valeurs numériques
      const formattedDetailsData = {
        ...detailsData,
        montant_ttc: parseFloat(detailsData.montant_ttc) || null,
        montant_ht: parseFloat(detailsData.montant_ht) || null,
        cout_materiel: parseFloat(detailsData.cout_materiel) || null,
        cout_main_oeuvre: parseFloat(detailsData.cout_main_oeuvre) || null,
        cout_sous_traitance:
          parseFloat(detailsData.cout_sous_traitance) || null,
      };

      // Création du client si nouveau
      let clientId = pendingData.client?.id;
      if (!clientId) {
        const clientResponse = await axios.post(
          "/api/client/",
          pendingData.client
        );
        clientId = clientResponse.data.id;
      }

      // Création de la société si nouvelle
      let societeId = pendingData.societe?.id;
      if (!societeId) {
        const societeResponse = await axios.post("/api/societe/", {
          ...pendingData.societe,
          client_name: clientId,
        });
        societeId = societeResponse.data.id;
      }

      // Création du chantier avec toutes les données
      const chantierData = {
        ...pendingData.chantier,
        ...formattedDetailsData,
        societe: societeId,
      };

      console.log("Données du chantier à envoyer:", chantierData); // Pour le débogage

      const chantierResponse = await axios.post("/api/chantier/", chantierData);

      onSuccess(chantierResponse.data);
      handleMainModalClose();
    } catch (error) {
      console.error("Erreur lors de la création:", error);
      console.log("Données qui ont causé l'erreur:", error.response?.data); // Pour voir les détails de l'erreur
      alert("Erreur lors de la création");
    }
  };

  const handleMainModalClose = () => {
    setShowClientInfoModal(true);
    setShowSocieteInfoModal(false);
    setShowChantierForm(false);
    setActiveStep(0);
    setClientData({
      name: "",
      surname: "",
      client_mail: "",
      phone_Number: "",
      poste: "",
      societe: {
        nom_societe: "",
        ville_societe: "",
        rue_societe: "",
        codepostal_societe: "",
      },
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleMainModalClose}
      maxWidth="md"
      fullWidth
      sx={{ top: "-700px" }}
    >
      <DialogTitle>
        <Box
          sx={{
            width: "100%",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Nouveau Chantier
          </Typography>
          <Stepper activeStep={activeStep}>
            <Step>
              <StepLabel>Client</StepLabel>
            </Step>
            <Step>
              <StepLabel>Société</StepLabel>
            </Step>
            <Step>
              <StepLabel>Chantier</StepLabel>
            </Step>
          </Stepper>
        </Box>
      </DialogTitle>
      <DialogContent>
        <ClientInfoModal
          open={showClientInfoModal}
          onClose={() => {
            setShowClientInfoModal(false);
            handleMainModalClose();
          }}
          clientData={clientData}
          onChange={handleChange}
          onSubmit={handleClientInfoSubmit}
        />

        <SocieteInfoModal
          open={showSocieteInfoModal}
          onClose={() => {
            setShowSocieteInfoModal(false);
            setShowClientInfoModal(true);
            setActiveStep(0);
          }}
          societeData={clientData.societe}
          onChange={handleChange}
          onSubmit={handleSocieteInfoSubmit}
        />

        <ChantierForm
          open={showChantierForm}
          onClose={() => {
            setShowChantierForm(false);
            setShowSocieteInfoModal(true);
            setActiveStep(1);
          }}
          onSubmit={handleChantierSubmit}
        />

        <ChantierDetailsModal
          open={showChantierDetailsModal}
          onClose={() => setShowChantierDetailsModal(false)}
          onSubmit={handleChantierDetailsSubmit}
          initialData={chantierBasicData}
        />
      </DialogContent>
    </Dialog>
  );
};

export default NewChantierModal;
