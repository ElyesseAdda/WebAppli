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
  const [allFactures, setAllFactures] = useState([]);
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

  // Charger toutes les situations et factures pour l'année sélectionnée
  useEffect(() => {
    if (selectedAnnee) {
      setLoading(true);
      const fetchAllData = async () => {
        try {
          // Récupérer les situations et les factures en parallèle
          // Pour les factures, récupérer celles avec date_envoi__year OU date_creation__year
          // (faire deux requêtes et fusionner pour gérer les factures sans date_envoi)
          const [situationsResponse, facturesAvecDateEnvoi, facturesAvecDateCreation] = await Promise.all([
            axios.get(`/api/situations/by-year/?annee=${selectedAnnee}`),
            axios.get(`/api/facture/?date_envoi__year=${selectedAnnee}`).catch(() => ({ data: [] })),
            axios.get(`/api/facture/?date_creation__year=${selectedAnnee}`).catch(() => ({ data: [] }))
          ]);
          
          // Fusionner les factures et supprimer les doublons
          const facturesAvecEnvoi = facturesAvecDateEnvoi.data || [];
          const facturesAvecCreation = facturesAvecDateCreation.data || [];
          const facturesIds = new Set();
          const factures = [];
          
          // Fonction pour obtenir l'année d'une facture (priorité à date_envoi)
          const getAnneeFacture = (facture) => {
            if (facture.date_envoi) {
              return new Date(facture.date_envoi).getFullYear();
            }
            if (facture.date_creation) {
              return new Date(facture.date_creation).getFullYear();
            }
            return null;
          };
          
          // Ajouter d'abord les factures avec date_envoi de l'année sélectionnée
          facturesAvecEnvoi.forEach(f => {
            const anneeFacture = getAnneeFacture(f);
            if (!facturesIds.has(f.id) && anneeFacture === selectedAnnee) {
              facturesIds.add(f.id);
              factures.push(f);
            }
          });
          
          // Ajouter les factures avec date_creation de l'année sélectionnée qui n'ont pas de date_envoi
          facturesAvecCreation.forEach(f => {
            const anneeFacture = getAnneeFacture(f);
            if (!facturesIds.has(f.id) && !f.date_envoi && anneeFacture === selectedAnnee) {
              facturesIds.add(f.id);
              factures.push(f);
            }
          });
          
          const facturesResponse = { data: factures };

          const situations = situationsResponse.data || [];
          
          // Mapper les factures pour avoir la même structure que les situations
          const facturesFormatees = factures.map(facture => ({
            ...facture,
            chantier_id: facture.chantier || facture.chantier_id,
            isFacture: true, // Marqueur pour identifier les factures
          }));
          
          // Les données sont déjà formatées par l'API avec toutes les informations nécessaires
          setAllSituations(situations);
          setAllFactures(facturesFormatees);
        } catch (error) {
          console.error("Erreur lors du chargement des données:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchAllData();
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

  // Trier les factures (mémorisé)
  const facturesTriees = useMemo(() => {
    return [...allFactures].sort((a, b) => {
      // Trier par chantier, puis par date_envoi (ou date_creation en fallback)
      const chantierA = a.chantier_name || '';
      const chantierB = b.chantier_name || '';
      if (chantierA !== chantierB) {
        return chantierA.localeCompare(chantierB);
      }
      // Utiliser date_envoi en priorité, sinon date_creation
      const dateA = a.date_envoi || a.date_creation;
      const dateB = b.date_envoi || b.date_creation;
      if (dateA && dateB) {
        return new Date(dateA) - new Date(dateB);
      }
      return 0;
    });
  }, [allFactures]);

  // Grouper les situations et factures par mois avec sous-totaux (mémorisé)
  const situationsAvecSousTotaux = useMemo(() => {
    return groupSituationsByMonth(situationsTriees, facturesTriees);
  }, [situationsTriees, facturesTriees]);

  // Calculer les totaux (mémorisé)
  const totaux = useMemo(() => {
    return calculateTotaux(allSituations, allFactures);
  }, [allSituations, allFactures]);

  // Handlers pour les mises à jour
  const handleDateModalSubmit = useCallback(
    async (itemId, { dateEnvoi, delaiPaiement }) => {
      try {
        // Détecter si c'est une facture (a price_ht ou isFacture) ou une situation
        const isFacture = allFactures.some(f => f.id === itemId);
        
        if (isFacture) {
          // Mise à jour d'une facture
          await axios.patch(`/api/facture/${itemId}/`, {
            date_envoi: dateEnvoi,
            delai_paiement: delaiPaiement,
          });

          setAllFactures((prev) =>
            prev.map((f) =>
              f.id === itemId
                ? { ...f, date_envoi: dateEnvoi, delai_paiement: delaiPaiement }
                : f
            )
          );
        } else {
          // Mise à jour d'une situation
          await axios.patch(`/api/situations/${itemId}/update/`, {
            date_envoi: dateEnvoi,
            delai_paiement: delaiPaiement,
          });

          setAllSituations((prev) =>
            prev.map((s) =>
              s.id === itemId
                ? { ...s, date_envoi: dateEnvoi, delai_paiement: delaiPaiement }
                : s
            )
          );
        }
      } catch (error) {
        console.error("Erreur lors de la mise à jour:", error);
        alert("Erreur lors de la mise à jour des données");
      }
    },
    [allFactures]
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
    allFactures,
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

