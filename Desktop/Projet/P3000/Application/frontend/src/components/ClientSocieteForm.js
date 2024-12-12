import React from "react";
import axios from "../utils/axiosConfig";

const ClientSocieteForm = ({ clientData, setClientData, onSubmit }) => {
  const handleChange = (e, section) => {
    const { name, value } = e.target;
    if (section === "societe") {
      setClientData((prev) => ({
        ...prev,
        societe: { ...prev.societe, [name]: value },
      }));
    } else {
      setClientData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    try {
      // Créer le client
      const clientResponse = await axios.post("/api/client/", {
        name: clientData.name,
        surname: clientData.surname,
        client_mail: clientData.client_mail,
        phone_Number: parseInt(clientData.phone_Number),
      });

      // Créer la société
      const societeResponse = await axios.post("/api/societe/", {
        nom_societe: clientData.societe.nom_societe,
        ville_societe: clientData.societe.ville_societe,
        rue_societe: clientData.societe.rue_societe,
        codepostal_societe: clientData.societe.codepostal_societe,
        client_name: clientResponse.data.id,
      });

      onSubmit(societeResponse.data.id);
    } catch (error) {
      console.error(
        "Erreur lors de la création:",
        error.response?.data || error
      );
      alert("Erreur lors de la création du client/société");
    }
  };

  return (
    <div className="client-societe-form">
      <h3>Informations Client</h3>
      <div>
        <input
          type="text"
          name="name"
          placeholder="Nom"
          value={clientData.name}
          onChange={(e) => handleChange(e, "client")}
        />
        <input
          type="text"
          name="surname"
          placeholder="Prénom"
          value={clientData.surname}
          onChange={(e) => handleChange(e, "client")}
        />
        <input
          type="email"
          name="client_mail"
          placeholder="Email"
          value={clientData.client_mail}
          onChange={(e) => handleChange(e, "client")}
        />
        <input
          type="tel"
          name="phone_Number"
          placeholder="Téléphone"
          value={clientData.phone_Number}
          onChange={(e) => handleChange(e, "client")}
        />
      </div>

      <h3>Informations Société</h3>
      <div>
        <input
          type="text"
          name="nom_societe"
          placeholder="Nom de la société"
          value={clientData.societe.nom_societe}
          onChange={(e) => handleChange(e, "societe")}
        />
        <input
          type="text"
          name="ville_societe"
          placeholder="Ville"
          value={clientData.societe.ville_societe}
          onChange={(e) => handleChange(e, "societe")}
        />
        <input
          type="text"
          name="rue_societe"
          placeholder="Rue"
          value={clientData.societe.rue_societe}
          onChange={(e) => handleChange(e, "societe")}
        />
        <input
          type="text"
          name="codepostal_societe"
          placeholder="Code postal"
          value={clientData.societe.codepostal_societe}
          onChange={(e) => handleChange(e, "societe")}
        />
      </div>

      <button onClick={handleSubmit}>Valider</button>
    </div>
  );
};

export default ClientSocieteForm;
