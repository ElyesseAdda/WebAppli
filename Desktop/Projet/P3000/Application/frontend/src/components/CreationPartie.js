import axios from "axios";
import React, { useEffect, useState } from "react";
import { FaMinusCircle, FaPlusCircle } from "react-icons/fa";
import "./../../static/css/creationPartie.css";

const CreationPartie = ({ refreshData }) => {
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [creationType, setCreationType] = useState(""); // 'partie', 'sousPartie', 'ligne'
  const [newPartie, setNewPartie] = useState("");
  const [newSousPartie, setNewSousPartie] = useState("");
  const [lignesDetails, setLignesDetails] = useState([]);

  const [selectedPartieId, setSelectedPartieId] = useState("");
  const [selectedSousPartieId, setSelectedSousPartieId] = useState("");
  const [parties, setParties] = useState([]);
  const [sousPartiesFiltered, setSousPartiesFiltered] = useState([]); // Sous-parties filtrées

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = () => {
    axios
      .get("/api/parties/")
      .then((response) => {
        setParties(response.data);
      })
      .catch((error) => {
        console.error("Erreur lors du chargement des parties", error);
      });
  };

  const loadSousParties = (partieId) => {
    if (partieId) {
      axios
        .get(`/api/sous-parties/?partie=${partieId}`)
        .then((response) => {
          setSousPartiesFiltered(response.data); // Charger uniquement les sous-parties liées à la partie sélectionnée
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des sous-parties", error);
        });
    }
  };

  const handleAddLigneDetail = () => {
    setLignesDetails([
      ...lignesDetails,
      { description: "", unite: "", prix: "" },
    ]);
  };

  const handleLigneDetailChange = (index, field, value) => {
    const newLignesDetails = [...lignesDetails];
    newLignesDetails[index][field] = value;
    setLignesDetails(newLignesDetails);
  };

  const handleCreationSubmit = () => {
    if (creationType === "partie") {
      if (!newPartie.trim()) {
        alert("Le titre de la nouvelle partie est obligatoire.");
        return;
      }

      axios
        .post("/api/parties/", { titre: newPartie })
        .then((response) => {
          const partieId = response.data.id;

          if (newSousPartie.trim()) {
            axios
              .post("/api/sous-parties/", {
                description: newSousPartie,
                partie: partieId,
              })
              .then((response) => {
                const sousPartieId = response.data.id;

                lignesDetails.forEach((ligneDetail) => {
                  if (
                    ligneDetail.description.trim() &&
                    ligneDetail.unite.trim() &&
                    ligneDetail.prix.trim()
                  ) {
                    axios.post("/api/ligne-details/", {
                      description: ligneDetail.description,
                      unite: ligneDetail.unite,
                      prix: ligneDetail.prix,
                      sous_partie: sousPartieId,
                    });
                  }
                });

                refreshData(); // Rafraîchir les données dynamiquement après la création
                resetForm();
              });
          } else {
            refreshData(); // Rafraîchir les données après la création de la partie seule
            resetForm();
          }
        })
        .catch((error) => {
          console.error(
            "Erreur lors de la création de la nouvelle partie",
            error
          );
        });
    } else if (creationType === "sousPartie") {
      if (!newSousPartie.trim() || !selectedPartieId) {
        alert("La sous-partie et la partie associée sont obligatoires.");
        return;
      }

      axios
        .post("/api/sous-parties/", {
          description: newSousPartie,
          partie: selectedPartieId,
        })
        .then((response) => {
          const sousPartieId = response.data.id;

          lignesDetails.forEach((ligneDetail) => {
            if (
              ligneDetail.description.trim() &&
              ligneDetail.unite.trim() &&
              ligneDetail.prix.trim()
            ) {
              axios.post("/api/ligne-details/", {
                description: ligneDetail.description,
                unite: ligneDetail.unite,
                prix: ligneDetail.prix,
                sous_partie: sousPartieId,
              });
            }
          });

          refreshData(); // Rafraîchir les données après la création de la sous-partie
          resetForm();
        })
        .catch((error) => {
          console.error("Erreur lors de la création de la sous-partie", error);
        });
    } else if (creationType === "ligne") {
      if (!selectedSousPartieId) {
        alert("La sous-partie associée est obligatoire.");
        return;
      }

      lignesDetails.forEach((ligneDetail) => {
        if (
          ligneDetail.description.trim() &&
          ligneDetail.unite.trim() &&
          ligneDetail.prix.trim()
        ) {
          axios
            .post("/api/ligne-details/", {
              description: ligneDetail.description,
              unite: ligneDetail.unite,
              prix: ligneDetail.prix,
              sous_partie: selectedSousPartieId,
            })
            .then(() => {
              refreshData(); // Rafraîchir les données après la création de la ligne de détail
              resetForm();
            })
            .catch((error) => {
              console.error(
                "Erreur lors de la création de la ligne de détail",
                error
              );
            });
        }
      });
    }
  };

  const resetForm = () => {
    setNewPartie("");
    setNewSousPartie("");
    setSelectedPartieId("");
    setSelectedSousPartieId("");
    setLignesDetails([]);
  };

  return (
    <div className="creation-partie-container">
      <button
        className="add-button"
        onClick={() => setShowCreationForm(!showCreationForm)}
      >
        {showCreationForm ? (
          <FaMinusCircle />
        ) : (
          <span>
            <FaPlusCircle /> Nouvelle Partie
          </span>
        )}
      </button>

      {showCreationForm && (
        <div className="creation-form">
          <h2>
            Création d'une Nouvelle Partie, Sous-Partie ou Ligne de Détail
          </h2>

          <div>
            <label>Type de création: </label>
            <select
              value={creationType}
              onChange={(e) => setCreationType(e.target.value)}
            >
              <option value="">-- Choisir un type --</option>
              <option value="partie">Nouvelle Partie</option>
              <option value="sousPartie">Nouvelle Sous-Partie</option>
              <option value="ligne">Nouvelle Ligne de Détail</option>
            </select>
          </div>

          {/* Section Nouvelle Partie */}
          {creationType === "partie" && (
            <div className="new-creation-section">
              <div>
                <label>Nouvelle Partie: </label>
                <input
                  type="text"
                  value={newPartie}
                  onChange={(e) => setNewPartie(e.target.value)}
                />
              </div>
              <div>
                <label>Nouvelle Sous-Partie: </label>
                <input
                  type="text"
                  value={newSousPartie}
                  onChange={(e) => setNewSousPartie(e.target.value)}
                />
              </div>
              {lignesDetails.map((ligne, index) => (
                <div key={index} className="ligne-detail">
                  <div>
                    <label>Ligne de Détail: </label>
                    <input
                      type="text"
                      value={ligne.description}
                      onChange={(e) =>
                        handleLigneDetailChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <label>Unité: </label>
                    <input
                      type="text"
                      value={ligne.unite}
                      onChange={(e) =>
                        handleLigneDetailChange(index, "unite", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label>Prix: </label>
                    <input
                      type="number"
                      step="0.01"
                      value={ligne.prix}
                      onChange={(e) =>
                        handleLigneDetailChange(index, "prix", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
              <button onClick={handleAddLigneDetail}>
                Ajouter une Ligne de Détail
              </button>
            </div>
          )}

          {/* Section Nouvelle Sous-Partie */}
          {creationType === "sousPartie" && (
            <div className="new-creation-section">
              <div>
                <label>Associer à une Partie: </label>
                <select
                  value={selectedPartieId}
                  onChange={(e) => {
                    setSelectedPartieId(e.target.value);
                    loadSousParties(e.target.value);
                  }}
                >
                  <option value="">-- Sélectionner une Partie --</option>
                  {parties.map((partie) => (
                    <option key={partie.id} value={partie.id}>
                      {partie.titre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Nouvelle Sous-Partie: </label>
                <input
                  type="text"
                  value={newSousPartie}
                  onChange={(e) => setNewSousPartie(e.target.value)}
                />
              </div>
              {lignesDetails.map((ligne, index) => (
                <div key={index} className="ligne-detail">
                  <div>
                    <label>Ligne de Détail: </label>
                    <input
                      type="text"
                      value={ligne.description}
                      onChange={(e) =>
                        handleLigneDetailChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <label>Unité: </label>
                    <input
                      type="text"
                      value={ligne.unite}
                      onChange={(e) =>
                        handleLigneDetailChange(index, "unite", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label>Prix: </label>
                    <input
                      type="number"
                      step="0.01"
                      value={ligne.prix}
                      onChange={(e) =>
                        handleLigneDetailChange(index, "prix", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
              <button onClick={handleAddLigneDetail}>
                Ajouter une Ligne de Détail
              </button>
            </div>
          )}

          {/* Section Nouvelle Ligne de Détail */}
          {creationType === "ligne" && (
            <div className="new-creation-section">
              {/* Sélection de la Partie */}
              <div>
                <label>Associer à une Partie: </label>
                <select
                  value={selectedPartieId} // État pour la partie sélectionnée
                  onChange={(e) => {
                    setSelectedPartieId(e.target.value); // Mise à jour de la partie sélectionnée
                    loadSousParties(e.target.value); // Charger les sous-parties de la partie sélectionnée
                  }}
                >
                  <option value="">-- Sélectionner une Partie --</option>
                  {parties.map((partie) => (
                    <option key={partie.id} value={partie.id}>
                      {partie.titre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sélection de la Sous-Partie */}
              <div>
                <label>Associer à une Sous-Partie: </label>
                <select
                  value={selectedSousPartieId}
                  onChange={(e) => setSelectedSousPartieId(e.target.value)}
                >
                  <option value="">-- Sélectionner une Sous-Partie --</option>
                  {sousPartiesFiltered.length > 0 ? (
                    sousPartiesFiltered.map((sousPartie) => (
                      <option key={sousPartie.id} value={sousPartie.id}>
                        {sousPartie.description}
                      </option>
                    ))
                  ) : (
                    <option value="">Aucune sous-partie disponible</option>
                  )}
                </select>
              </div>

              {/* Détails des lignes */}
              {lignesDetails.map((ligne, index) => (
                <div key={index} className="ligne-detail">
                  <div>
                    <label>Ligne de Détail: </label>
                    <input
                      type="text"
                      value={ligne.description}
                      onChange={(e) =>
                        handleLigneDetailChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <label>Unité: </label>
                    <input
                      type="text"
                      value={ligne.unite}
                      onChange={(e) =>
                        handleLigneDetailChange(index, "unite", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label>Prix: </label>
                    <input
                      type="number"
                      step="0.01"
                      value={ligne.prix}
                      onChange={(e) =>
                        handleLigneDetailChange(index, "prix", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
              <button onClick={handleAddLigneDetail}>
                Ajouter une Ligne de Détail
              </button>
            </div>
          )}

          <button className="valider" onClick={handleCreationSubmit}>
            Valider
          </button>
          <button className="supprimer" onClick={resetForm}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default CreationPartie;
