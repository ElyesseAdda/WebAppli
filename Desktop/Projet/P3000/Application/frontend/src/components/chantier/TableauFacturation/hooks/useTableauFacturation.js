import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  calculateCumulsBySituationId,
  sortSituations,
  calculateTotaux,
  groupSituationsByMonth,
} from "../utils/calculations";
import { extractSituationNumber, extractFactureNumber } from "../utils/formatters";

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
        // Erreur silencieuse
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
          
          // Récupérer les IDs de chantiers uniques pour enrichir les factures
          const chantierIds = [...new Set(factures.map(f => f.chantier || f.chantier_id).filter(Boolean))];
          
          // Récupérer les informations des chantiers pour enrichir les factures avec le client
          let chantiersData = {};
          if (chantierIds.length > 0) {
            try {
              // Récupérer tous les chantiers et filtrer côté client
              const chantiersResponse = await axios.get('/api/chantier/');
              chantiersData = {};
              (chantiersResponse.data || []).forEach(chantier => {
                if (chantierIds.includes(chantier.id)) {
                  chantiersData[chantier.id] = chantier;
                }
              });
            } catch (error) {
              // Erreur silencieuse
            }
          }
          
          // Mapper les factures pour avoir la même structure que les situations
          const facturesFormatees = factures.map(facture => {
            const chantierId = facture.chantier || facture.chantier_id;
            const chantier = chantiersData[chantierId];
            
            // Déterminer le nom du client (maître d'ouvrage ou société)
            let clientName = null;
            if (chantier) {
              if (chantier.maitre_ouvrage_nom_societe) {
                clientName = chantier.maitre_ouvrage_nom_societe;
              } else if (chantier.societe?.nom_societe) {
                clientName = chantier.societe.nom_societe;
              }
            }
            
            return {
              ...facture,
              chantier_id: chantierId,
              isFacture: true, // Marqueur pour identifier les factures
              client_name: clientName,
            };
          });
          
          // Les données sont déjà formatées par l'API avec toutes les informations nécessaires
          setAllSituations(situations);
          setAllFactures(facturesFormatees);
        } catch (error) {
          // Erreur silencieuse
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

  // Trier les factures (mémorisé) - uniquement par numéro de facture, sans tenir compte du chantier
  const facturesTriees = useMemo(() => {
    return [...allFactures].sort((a, b) => {
      // Trier uniquement par numéro de facture (001, 002, etc.), indépendamment du chantier
      const numA = extractFactureNumber(a.numero);
      const numB = extractFactureNumber(b.numero);
      
      if (numA !== null && numB !== null) {
        return numA - numB;
      }
      // Si une facture n'a pas de numéro, la mettre à la fin
      if (numA === null && numB !== null) return 1;
      if (numA !== null && numB === null) return -1;
      // Si les deux n'ont pas de numéro, garder l'ordre original
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
        alert("Erreur lors de la mise à jour des données");
      }
    },
    [allFactures]
  );

  const handlePaiementModalSubmit = useCallback(
    async (itemId, { montantRecu, datePaiementReel }) => {
      try {
        // Détecter si c'est une facture (a price_ht ou isFacture) ou une situation
        const isFacture = allFactures.some(f => f.id === itemId);
        
        if (isFacture) {
          // Mise à jour d'une facture
          const facture = allFactures.find(f => f.id === itemId);
          const updateData = {
            date_paiement: datePaiementReel || null,
          };
          
          // Si une date de paiement est fournie, marquer la facture comme payée
          // Sinon, si on supprime la date, remettre le statut à "Attente paiement"
          if (datePaiementReel) {
            updateData.state_facture = 'Payée';
          } else if (facture && facture.state_facture === 'Payée') {
            // Si on supprime la date de paiement d'une facture payée, remettre en attente
            updateData.state_facture = 'Attente paiement';
          }
          
          await axios.patch(`/api/facture/${itemId}/`, updateData);

          setAllFactures((prev) =>
            prev.map((f) =>
              f.id === itemId
                ? {
                    ...f,
                    date_paiement: datePaiementReel || null,
                    state_facture: datePaiementReel ? 'Payée' : (f.state_facture === 'Payée' ? 'Attente paiement' : f.state_facture),
                  }
                : f
            )
          );
        } else {
          // Mise à jour d'une situation
          await axios.patch(`/api/situations/${itemId}/update/`, {
            montant_reel_ht: montantRecu,
            date_paiement_reel: datePaiementReel,
          });

          setAllSituations((prev) =>
            prev.map((s) =>
              s.id === itemId
                ? {
                    ...s,
                    montant_reel_ht: montantRecu,
                    date_paiement_reel: datePaiementReel,
                  }
                : s
            )
          );
        }
      } catch (error) {
        alert("Erreur lors de la mise à jour des données");
      }
    },
    [allFactures]
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

