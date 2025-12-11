import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  calculateCumulsBySituationId,
  sortSituations,
  calculateTotaux,
  groupSituationsByMonth,
} from "../utils/calculations";
import { extractSituationNumber } from "../utils/formatters";

export const useTableauFacturation = () => {
  const [chantiers, setChantiers] = useState([]);
  const [selectedAnnee, setSelectedAnnee] = useState("");
  const [allSituations, setAllSituations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banques, setBanques] = useState([]);

  // Charger la liste des chantiers et des banques
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [chantiersResponse, banquesResponse] = await Promise.all([
          axios.get("/api/chantier/"),
          axios.get("/api/banques/"),
        ]);
        setChantiers(chantiersResponse.data);
        setBanques(banquesResponse.data);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      }
    };
    fetchData();
  }, []);

  // Initialiser l'année actuelle
  useEffect(() => {
    const now = new Date();
    setSelectedAnnee(now.getFullYear());
  }, []);

  // Charger toutes les situations pour l'année sélectionnée
  useEffect(() => {
    if (selectedAnnee) {
      setLoading(true);
      const fetchAllSituations = async () => {
        try {
          // Une seule requête pour récupérer toutes les situations de l'année
          // L'API retourne déjà les situations avec chantier_name, chantier_id et allSituationsChantier
          const response = await axios.get(
            `/api/situations/by-year/?annee=${selectedAnnee}`
          );

          const situations = response.data || [];
          
          // Les données sont déjà formatées par l'API avec toutes les informations nécessaires
          setAllSituations(situations);
        } catch (error) {
          console.error("Erreur lors du chargement des situations:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchAllSituations();
    }
  }, [selectedAnnee]);

  // Pré-calculer les cumuls pour toutes les situations (mémorisé)
  const cumulsBySituationId = useMemo(() => {
    return calculateCumulsBySituationId(allSituations, extractSituationNumber);
  }, [allSituations]);

  // Fonction optimisée pour calculer le cumul (utilise le Map pré-calculé)
  const calculerCumulSituationHT = useCallback(
    (situation) => {
      return (
        cumulsBySituationId.get(situation.id) ||
        parseFloat(situation.montant_apres_retenues) || 0
      );
    },
    [cumulsBySituationId]
  );

  // Trier les situations (mémorisé)
  const situationsTriees = useMemo(() => {
    return sortSituations(allSituations, extractSituationNumber);
  }, [allSituations]);

  // Grouper les situations par mois avec sous-totaux (mémorisé)
  const situationsAvecSousTotaux = useMemo(() => {
    return groupSituationsByMonth(situationsTriees);
  }, [situationsTriees]);

  // Calculer les totaux (mémorisé)
  const totaux = useMemo(() => {
    return calculateTotaux(allSituations);
  }, [allSituations]);

  // Handlers pour les mises à jour
  const handleDateModalSubmit = useCallback(
    async (situationId, { dateEnvoi, delaiPaiement }) => {
      try {
        await axios.patch(`/api/situations/${situationId}/update/`, {
          date_envoi: dateEnvoi,
          delai_paiement: delaiPaiement,
        });

        setAllSituations((prev) =>
          prev.map((s) =>
            s.id === situationId
              ? { ...s, date_envoi: dateEnvoi, delai_paiement: delaiPaiement }
              : s
          )
        );
      } catch (error) {
        console.error("Erreur lors de la mise à jour:", error);
        alert("Erreur lors de la mise à jour des données");
      }
    },
    []
  );

  const handlePaiementModalSubmit = useCallback(
    async (situationId, { montantRecu, datePaiementReel }) => {
      try {
        await axios.patch(`/api/situations/${situationId}/update/`, {
          montant_reel_ht: montantRecu,
          date_paiement_reel: datePaiementReel,
        });

        setAllSituations((prev) =>
          prev.map((s) =>
            s.id === situationId
              ? {
                  ...s,
                  montant_reel_ht: montantRecu,
                  date_paiement_reel: datePaiementReel,
                }
              : s
          )
        );
      } catch (error) {
        console.error("Erreur lors de la mise à jour:", error);
        alert("Erreur lors de la mise à jour des données");
      }
    },
    []
  );

  const handleNumeroCPChange = useCallback(async (situationId, numeroCP) => {
    try {
      await axios.patch(`/api/situations/${situationId}/update/`, {
        numero_cp: numeroCP,
      });

      setAllSituations((prev) =>
        prev.map((s) =>
          s.id === situationId ? { ...s, numero_cp: numeroCP } : s
        )
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour du numéro CP:", error);
      alert("Erreur lors de la mise à jour du numéro CP");
    }
  }, []);

  const handleBanqueChange = useCallback(async (situationId, banqueId) => {
    try {
      await axios.patch(`/api/situations/${situationId}/update/`, {
        banque: banqueId,
      });

      setAllSituations((prev) =>
        prev.map((s) =>
          s.id === situationId ? { ...s, banque: banqueId } : s
        )
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la banque:", error);
      alert("Erreur lors de la mise à jour de la banque");
    }
  }, []);

  const handleCreateBanque = useCallback(async (nomBanque) => {
    try {
      const response = await axios.post("/api/banques/", {
        nom_banque: nomBanque,
      });

      setBanques((prev) => [...prev, response.data]);
      alert("Banque créée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la création de la banque:", error);
      alert("Erreur lors de la création de la banque");
    }
  }, []);

  return {
    chantiers,
    selectedAnnee,
    setSelectedAnnee,
    allSituations,
    loading,
    banques,
    situationsAvecSousTotaux,
    totaux,
    calculerCumulSituationHT,
    handleDateModalSubmit,
    handlePaiementModalSubmit,
    handleNumeroCPChange,
    handleBanqueChange,
    handleCreateBanque,
  };
};

