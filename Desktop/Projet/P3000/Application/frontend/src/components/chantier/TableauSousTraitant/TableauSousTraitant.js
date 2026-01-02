import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  MenuItem,
  Select,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from "@mui/material";
import FactureModal from "./FactureModal";
import DatePaiementModal from "./DatePaiementModal";
import DateEnvoiModal from "./DateEnvoiModal";
import DatePaiementFactureModal from "./DatePaiementFactureModal";
// import RecapSousTraitant from "./RecapSousTraitant"; // À créer plus tard
import { Add as AddIcon, Close as CloseIcon, CheckCircle as CheckCircleIcon, AddCircleOutline as AddCircleOutlineIcon } from "@mui/icons-material";
import axios from "axios";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { FaSync } from "react-icons/fa";

const TableauSousTraitant = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editedValuesPaye, setEditedValuesPaye] = useState({}); // {mois_sous_traitant_chantierId: value} - seul champ éditable (montant payé)
  const [editedFactures, setEditedFactures] = useState({}); // {mois_sous_traitant_chantierId: [{id, numero_facture, montant_facture}, ...]}
  const [selectedAnnee, setSelectedAnnee] = useState("");
  
  // État pour le modal de facture
  const [factureModalOpen, setFactureModalOpen] = useState(false);
  const [currentFacture, setCurrentFacture] = useState(null); // {mois, sous_traitant, chantierId, factureIndex}
  const [factureModalData, setFactureModalData] = useState({ numero: "", montant: "" });
  
  // État pour le modal de date de paiement
  const [datePaiementModalOpen, setDatePaiementModalOpen] = useState(false);
  const [currentPaiement, setCurrentPaiement] = useState(null); // {mois, sous_traitant, chantierId, montantPaye, datePaiement}
  
  // État pour le modal de date d'envoi
  const [dateEnvoiModalOpen, setDateEnvoiModalOpen] = useState(false);
  const [currentEnvoi, setCurrentEnvoi] = useState(null); // {mois, sous_traitant, chantierId, dateEnvoi}
  
  // État pour le modal de confirmation de remplissage automatique
  const [confirmFillModalOpen, setConfirmFillModalOpen] = useState(false);
  const [pendingFillAction, setPendingFillAction] = useState(null); // {mois, sous_traitant}
  
  // État pour le modal de date de paiement de facture
  const [datePaiementFactureModalOpen, setDatePaiementFactureModalOpen] = useState(false);
  const [currentFacturePaiement, setCurrentFacturePaiement] = useState(null); // {mois, sous_traitant, chantierId, factureIndex}
  
  // État pour le modal d'ajustement agent journalier
  const [ajustementModalOpen, setAjustementModalOpen] = useState(false);
  const [currentAjustement, setCurrentAjustement] = useState(null); // {agent_id, mois, annee, sous_traitant, a_payer_labor_cost, ajustement_montant, ajustement_description, chantiersDetails}
  const [ajustementFormData, setAjustementFormData] = useState({ montant: "", description: "" });
  const [savingAjustement, setSavingAjustement] = useState(false);
  
  // Timer pour la sauvegarde automatique
  const saveTimerRef = useRef(null);

  // Récupérer les données
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/api/tableau-sous-traitant-global/");
      setData(res.data);
      
      // Initialiser editedValues avec les valeurs actuelles (seulement montant payé - seul champ éditable)
      const initialValuesPaye = {};
      const initialFactures = {};
      
      // Séparer les agents journaliers des autres pour l'initialisation
      const agentsJournaliersData = {};
      const autresData = [];
      
      res.data.forEach((item) => {
        // Utiliser le champ source_type du backend pour différencier les agents journaliers
        const isAgent = item.source_type === 'agent_journalier';
        if (isAgent) {
          // Pour les agents journaliers, regrouper par mois/sous_traitant
          const keyAgent = `${item.mois}_${item.sous_traitant}`;
          if (!agentsJournaliersData[keyAgent]) {
            agentsJournaliersData[keyAgent] = {
              mois: item.mois,
              sous_traitant: item.sous_traitant,
              paye: 0,
              factures: []
            };
          }
          agentsJournaliersData[keyAgent].paye += item.paye || 0;
          if (item.factures && item.factures.length > 0) {
            agentsJournaliersData[keyAgent].factures.push(...item.factures);
          }
        } else {
          autresData.push(item);
        }
      });
      
      // Initialiser les autres sous-traitants (non agents journaliers)
      autresData.forEach((item) => {
        const key = `${item.mois}_${item.sous_traitant}_${item.chantier_id}`;
        initialValuesPaye[key] = item.paye;
        initialFactures[key] = (item.factures || []).map(f => ({
          id: f.id || null,
          numero_facture: f.numero_facture || f,
          montant_facture: f.montant_facture || 0,
          payee: f.payee || false,
          date_paiement_facture: f.date_paiement_facture || null
        }));
      });
      
      // Initialiser les agents journaliers avec la clé spéciale
      Object.values(agentsJournaliersData).forEach((agentData) => {
        const keyAgentJournalier = `${agentData.mois}_${agentData.sous_traitant}_AGENT_JOURNALIER`;
        initialValuesPaye[keyAgentJournalier] = agentData.paye;
        initialFactures[keyAgentJournalier] = agentData.factures.map(f => ({
          id: f.id || null,
          numero_facture: f.numero_facture || f,
          montant_facture: f.montant_facture || 0,
          payee: f.payee || false,
          date_paiement_facture: f.date_paiement_facture || null
        }));
      });
      
      setEditedValuesPaye(initialValuesPaye);
      setEditedFactures(initialFactures);
    } catch (err) {
      setError("Erreur lors du chargement des données.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Initialiser l'année actuelle
  useEffect(() => {
    const now = new Date();
    setSelectedAnnee(now.getFullYear());
  }, []);

  // Nettoyer le timer au démontage du composant pour éviter les memory leaks
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Fonction pour obtenir le nom du mois en français
  const getMoisName = (mois) => {
    const moisNames = {
      1: "Janvier",
      2: "Février",
      3: "Mars",
      4: "Avril",
      5: "Mai",
      6: "Juin",
      7: "Juillet",
      8: "Août",
      9: "Septembre",
      10: "Octobre",
      11: "Novembre",
      12: "Décembre",
    };
    return moisNames[mois] || mois.toString().padStart(2, "0");
  };


  // Sauvegarder automatiquement (avec debounce) - montant payé et factures
  const savePaiement = useCallback(async (mois, sous_traitant, chantierId, montantPaye, factures = null, datePaiement = null, dateEnvoi = null) => {
    // Ne pas sauvegarder si chantierId === 0 (lignes AgencyExpenseMonth gérées par un autre endpoint)
    if (chantierId === 0) {
      return;
    }

    // Annuler le timer précédent
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Définir un nouveau timer pour sauvegarder après 1 seconde d'inactivité
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      setSaveSuccess(false);
      setError(null);

      try {
        const [moisNum, annee2digits] = mois.split("/").map(Number);
        // Convertir l'année à 2 chiffres en année complète (25 -> 2025, 24 -> 2024, etc.)
        const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
        
        // Préparer les données pour le suivi de paiement
        const payload = {
          mois: moisNum,
          annee: anneeComplete,
          sous_traitant: sous_traitant,
          chantier_id: chantierId || null,
          montant_paye_ht: montantPaye || 0,
        };

        // Ajouter les dates si fournies
        if (datePaiement !== undefined && datePaiement !== null) {
          payload.date_paiement_reel = datePaiement;
        }
        if (dateEnvoi !== undefined && dateEnvoi !== null) {
          payload.date_envoi_facture = dateEnvoi;
        }

        // Utiliser l'endpoint update_or_create_suivi pour créer ou mettre à jour
        const response = await axios.post(
          `/api/suivi-paiements-sous-traitant-mensuel/update_or_create_suivi/`,
          payload
        );

        // ✅ Mise à jour dynamique : mettre à jour uniquement cette ligne dans data
        const suiviData = response.data;
        
        const key = chantierId === 0 || chantierId === null 
          ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
          : `${mois}_${sous_traitant}_${chantierId}`;
        
        setData((prevData) => {
          return prevData.map((item) => {
            if (
              item.mois === mois &&
              item.sous_traitant === sous_traitant &&
              item.chantier_id === chantierId
            ) {
              return {
                ...item,
                paye: suiviData.montant_paye_ht || 0,
                date_paiement: suiviData.date_paiement_reel,
                date_envoi: suiviData.date_envoi_facture,
                date_paiement_prevue: suiviData.date_paiement_prevue,
                ecart_paiement_reel: suiviData.ecart_paiement_reel,
                delai_paiement: suiviData.delai_paiement,
                suivi_paiement_id: suiviData.id
              };
            }
            return item;
          });
        });
        
        // ✅ Synchroniser editedValuesPaye
        setEditedValuesPaye((prev) => ({
          ...prev,
          [key]: suiviData.montant_paye_ht || 0
        }));

        setSaveSuccess(true);
        
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
      } catch (err) {
        setError("Erreur lors de la sauvegarde.");
        console.error(err);
      } finally {
        setSaving(false);
      }
    }, 1000);
  }, [fetchData]);

  // Ouvrir le modal pour saisir/modifier le montant payé et la date
  const handleOpenDatePaiementModal = (mois, sous_traitant, chantierId) => {
    const currentData = data.find(d => 
      d.mois === mois && 
      d.sous_traitant === sous_traitant && 
      d.chantier_id === chantierId
    );
    
    setCurrentPaiement({
      mois,
      sous_traitant,
      chantierId,
      montantPaye: currentData?.a_payer || 0, // Préremplir avec le montant à payer
      datePaiement: currentData?.date_paiement || null,
      sourceType: currentData?.source_type || null,
      agencyExpenseId: currentData?.agency_expense_id || null
    });
    setDatePaiementModalOpen(true);
  };
  
  // Gérer la sauvegarde depuis le modal de date de paiement (MONTANT PAYÉ)
  const handleSaveDatePaiement = async (montantPaye, datePaiement) => {
    if (currentPaiement) {
      const { mois, sous_traitant, chantierId } = currentPaiement;
      const key = `${mois}_${sous_traitant}_${chantierId}`;
      
      // ✅ TOUTES les lignes (y compris AgencyExpenseMonth et agents journaliers) utilisent le système de suivi
      setEditedValuesPaye((prev) => ({
        ...prev,
        [key]: montantPaye,
      }));
      
      // Sauvegarder avec la date de paiement dans SuiviPaiementSousTraitantMensuel
      // Pour les lignes avec chantierId === 0 (AgencyExpenseMonth et agents journaliers),
      // appeler directement l'API car savePaiement les exclut
      if (chantierId === 0 || chantierId === null) {
        try {
          setSaving(true);
          
          const [moisNum, annee2digits] = mois.split("/").map(Number);
          const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
          
          const response = await axios.post(
            `/api/suivi-paiements-sous-traitant-mensuel/update_or_create_suivi/`,
            {
              mois: moisNum,
              annee: anneeComplete,
              sous_traitant: sous_traitant,
              chantier_id: null,  // null pour les lignes sans chantier spécifique
              montant_paye_ht: montantPaye || 0,
              date_paiement_reel: datePaiement
            }
          );
          
          // Mise à jour dynamique
          const suiviData = response.data;
          
          setData((prevData) => {
            return prevData.map((item) => {
              if (
                item.mois === mois &&
                item.sous_traitant === sous_traitant &&
                item.chantier_id === chantierId
              ) {
                return {
                  ...item,
                  paye: suiviData.montant_paye_ht || 0,
                  date_paiement: suiviData.date_paiement_reel,
                  date_envoi: suiviData.date_envoi_facture,
                  date_paiement_prevue: suiviData.date_paiement_prevue,
                  ecart_paiement_reel: suiviData.ecart_paiement_reel,
                  delai_paiement: suiviData.delai_paiement,
                  suivi_paiement_id: suiviData.id
                };
              }
              return item;
            });
          });
          
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
          console.error("Erreur lors de la sauvegarde:", error);
          setError("Erreur lors de la sauvegarde du montant payé");
        } finally {
          setSaving(false);
        }
      } else {
        // Pour les autres lignes, utiliser savePaiement normalement
        savePaiement(mois, sous_traitant, chantierId, montantPaye, null, datePaiement);
      }
    }
    setDatePaiementModalOpen(false);
    setCurrentPaiement(null);
  };
  
  // Nouvelle fonction pour modifier le MONTANT À PAYER des lignes AgencyExpenseMonth
  const handleOpenMontantAPayerModal = (mois, sous_traitant, chantierId) => {
    const currentData = data.find(d => 
      d.mois === mois && 
      d.sous_traitant === sous_traitant && 
      d.chantier_id === chantierId
    );
    
    setCurrentPaiement({
      mois,
      sous_traitant,
      chantierId,
      montantPaye: currentData?.a_payer || 0, // Le montant à payer actuel
      datePaiement: null, // Pas de date pour ce modal
      sourceType: currentData?.source_type || null,
      agencyExpenseId: currentData?.agency_expense_id || null,
      isMontantAPayer: true // Flag pour différencier ce modal
    });
    setDatePaiementModalOpen(true);
  };
  
  // Gérer la sauvegarde du MONTANT À PAYER pour AgencyExpenseMonth
  const handleSaveMontantAPayer = async (montantAPayer) => {
    if (currentPaiement && currentPaiement.agencyExpenseId) {
      const { mois, sous_traitant, chantierId, agencyExpenseId } = currentPaiement;
      
      try {
        setSaving(true);
        
        // Modifier le montant dans AgencyExpenseMonth
        await axios.patch(`/api/agency-expenses-month/${agencyExpenseId}/`, {
          amount: parseFloat(montantAPayer)
        });
        
        // ✅ Mise à jour dynamique : mettre à jour uniquement cette ligne dans data
        const newMontantAPayer = parseFloat(montantAPayer);
        
        setData((prevData) => {
          return prevData.map((item) => {
            if (
              item.mois === mois &&
              item.sous_traitant === sous_traitant &&
              item.chantier_id === chantierId
            ) {
              return {
                ...item,
                a_payer: newMontantAPayer,
                a_payer_ttc: newMontantAPayer * 1.20,
                ecart: newMontantAPayer - (item.paye || 0)
              };
            }
            return item;
          });
        });
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error) {
        console.error("Erreur lors de la modification du montant à payer:", error);
        setError("Erreur lors de la modification du montant à payer");
      } finally {
        setSaving(false);
      }
    }
    setDatePaiementModalOpen(false);
    setCurrentPaiement(null);
  };
  
  // Ouvrir le modal pour saisir/modifier la date d'envoi
  const handleOpenDateEnvoiModal = (mois, sous_traitant, chantierId) => {
    const currentData = data.find(d => 
      d.mois === mois && 
      d.sous_traitant === sous_traitant && 
      d.chantier_id === chantierId
    );
    
    setCurrentEnvoi({
      mois,
      sous_traitant,
      chantierId,
      dateEnvoi: currentData?.date_envoi || null
    });
    setDateEnvoiModalOpen(true);
  };
  
  // Gérer la sauvegarde depuis le modal de date d'envoi
  const handleSaveDateEnvoi = async (dateEnvoi) => {
    if (currentEnvoi) {
      const { mois, sous_traitant, chantierId } = currentEnvoi;
      const [moisNum, annee2digits] = mois.split("/").map(Number);
      const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
      
      try {
        setSaving(true);
        
        // Récupérer les données actuelles pour voir si c'est une ligne AgencyExpenseMonth
        const currentData = data.find(d => 
          d.mois === mois && 
          d.sous_traitant === sous_traitant && 
          d.chantier_id === chantierId
        );
        
        // Si c'est une ligne AgencyExpenseMonth, utiliser l'API spécifique
        if (currentData?.source_type === 'agency_expense' && currentData?.agency_expense_id) {
          await axios.patch(`/api/agency-expenses-month/${currentData.agency_expense_id}/`, {
            date_reception_facture: dateEnvoi  // ✅ Utiliser le bon champ
          });
          
          // ✅ Calcul de la date de paiement prévue (date_envoi + delai_paiement jours)
          const delai = currentData.delai_paiement || 45;
          let datePaiementPrevue = null;
          let ecartPaiementReel = null;
          
          if (dateEnvoi) {
            const dateEnvoiObj = new Date(dateEnvoi);
            const datePrevue = new Date(dateEnvoiObj);
            datePrevue.setDate(datePrevue.getDate() + delai);
            datePaiementPrevue = datePrevue.toISOString().split('T')[0];
            
            // Calculer l'écart si date de paiement réel existe
            if (currentData.date_paiement) {
              const datePaiementObj = new Date(currentData.date_paiement);
              const diffTime = datePaiementObj - datePrevue;
              ecartPaiementReel = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
          }
          
          // Mise à jour dynamique
          setData((prevData) => {
            return prevData.map((item) => {
              if (
                item.mois === mois &&
                item.sous_traitant === sous_traitant &&
                item.chantier_id === chantierId
              ) {
                return {
                  ...item,
                  date_envoi: dateEnvoi,
                  date_paiement_prevue: datePaiementPrevue,
                  ecart_paiement_reel: ecartPaiementReel
                };
              }
              return item;
            });
          });
        } else {
          // Sauvegarder directement avec le nouveau système pour les autres lignes
          const response = await axios.post('/api/suivi-paiements-sous-traitant-mensuel/update_or_create_suivi/', {
            mois: moisNum,
            annee: anneeComplete,
            sous_traitant: sous_traitant,
            chantier_id: chantierId || null,
            date_envoi_facture: dateEnvoi,
            delai_paiement: 45, // Délai par défaut
          });
          
          // ✅ Mise à jour dynamique
          const suiviData = response.data;
          
          setData((prevData) => {
            return prevData.map((item) => {
              if (
                item.mois === mois &&
                item.sous_traitant === sous_traitant &&
                item.chantier_id === chantierId
              ) {
                return {
                  ...item,
                  date_envoi: suiviData.date_envoi_facture,
                  date_paiement_prevue: suiviData.date_paiement_prevue,
                  ecart_paiement_reel: suiviData.ecart_paiement_reel,
                  delai_paiement: suiviData.delai_paiement,
                  suivi_paiement_id: suiviData.id
                };
              }
              return item;
            });
          });
        }
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        setError("Erreur lors de la sauvegarde de la date d'envoi");
      } finally {
        setSaving(false);
      }
    }
    setDateEnvoiModalOpen(false);
    setCurrentEnvoi(null);
  };

  // Ouvrir le modal de confirmation avant de remplir toutes les lignes
  const handleFillAllSousTraitantMois = (mois, sous_traitant) => {
    // Trouver toutes les lignes correspondant à ce mois et ce sous-traitant
    const lignesSousTraitant = data.filter(d => 
      d.mois === mois && 
      d.sous_traitant === sous_traitant
    );

    if (lignesSousTraitant.length === 0) {
      return;
    }

    // Ouvrir le modal de confirmation
    setPendingFillAction({ mois, sous_traitant });
    setConfirmFillModalOpen(true);
  };

  // Exécuter réellement le remplissage après confirmation
  const executeFillAllSousTraitantMois = async () => {
    if (!pendingFillAction) {
      return;
    }

    const { mois, sous_traitant } = pendingFillAction;
    
    // Fermer le modal
    setConfirmFillModalOpen(false);
    
    // Trouver toutes les lignes correspondant à ce mois et ce sous-traitant
    const lignesSousTraitant = data.filter(d => 
      d.mois === mois && 
      d.sous_traitant === sous_traitant
    );

    if (lignesSousTraitant.length === 0) {
      setPendingFillAction(null);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const [moisNum, annee2digits] = mois.split("/").map(Number);
      const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
      const dateDuJour = new Date().toISOString().split('T')[0];

      // Préparer toutes les mises à jour d'état
      const updatedValuesPaye = { ...editedValuesPaye };
      const updatedData = [...data];

      // Mettre à jour toutes les lignes
      const updatePromises = lignesSousTraitant.map(async (ligne) => {
        const key = `${mois}_${sous_traitant}_${ligne.chantier_id}`;
        const montantAPayer = ligne.a_payer || 0;
        
        // Mettre à jour les valeurs payées
        updatedValuesPaye[key] = montantAPayer;
        
        // Récupérer les factures actuelles
        const facturesList = editedFactures[key] !== undefined 
          ? editedFactures[key] 
          : ((ligne.factures || []).map(f => ({
              id: f.id || null,
              numero_facture: f.numero_facture || f,
              montant_facture: f.montant_facture || 0,
              payee: f.payee || false,
              date_paiement_facture: f.date_paiement_facture || null
            })));
        
        // Préparer le payload
        const payload = [{
          sous_traitant: sous_traitant,
          mois: moisNum,
          annee: anneeComplete,
          montant_facture_ht: montantAPayer,
          montant_paye_ht: montantAPayer,
          date_paiement: dateDuJour,
          date_envoi_facture: ligne.date_envoi || null,
          delai_paiement: ligne.delai_paiement || 45,
        }];

        // Appel API direct (sans debounce)
        const response = await axios.post(
          `/api/chantier/${ligne.chantier_id}/paiements-sous-traitant/`,
          payload
        );

        // Mettre à jour les données locales
        if (response.data && response.data.length > 0) {
          const updatedPaiement = response.data[0];
          const annee2digits = anneeComplete.toString().slice(-2);
          const moisKey = `${moisNum.toString().padStart(2, '0')}/${annee2digits}`;
          
          const dataIndex = updatedData.findIndex(item => 
            item.mois === moisKey &&
            item.sous_traitant === sous_traitant &&
            item.chantier_id === ligne.chantier_id
          );
          
          if (dataIndex !== -1) {
            updatedData[dataIndex] = {
              ...updatedData[dataIndex],
              paye: parseFloat(updatedPaiement.montant_paye_ht) || 0,
              a_payer: parseFloat(updatedPaiement.montant_facture_ht) || updatedData[dataIndex].a_payer,
              ecart: (parseFloat(updatedPaiement.montant_facture_ht) || updatedData[dataIndex].a_payer) - (parseFloat(updatedPaiement.montant_paye_ht) || 0),
              date_paiement: updatedPaiement.date_paiement_reel || updatedData[dataIndex].date_paiement || null,
              date_envoi: updatedPaiement.date_envoi_facture !== undefined ? updatedPaiement.date_envoi_facture : updatedData[dataIndex].date_envoi,
              date_paiement_prevue: updatedPaiement.date_paiement_prevue !== undefined ? updatedPaiement.date_paiement_prevue : updatedData[dataIndex].date_paiement_prevue,
              ecart_paiement_reel: updatedPaiement.ecart_paiement_reel !== undefined ? updatedPaiement.ecart_paiement_reel : updatedData[dataIndex].ecart_paiement_reel,
            };
          }
        }
      });

      // Attendre que toutes les mises à jour soient terminées
      await Promise.all(updatePromises);

      // Appliquer toutes les mises à jour d'état en une seule fois
      setEditedValuesPaye(updatedValuesPaye);
      setData(updatedData);

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      setError("Erreur lors de la sauvegarde des paiements.");
      console.error(err);
    } finally {
      setSaving(false);
      setPendingFillAction(null);
    }
  };

  // Ouvrir le modal pour ajouter/modifier une facture
  const handleOpenFactureModal = (mois, sous_traitant, chantierId, factureIndex = null) => {
    // Vérifier si c'est une ligne AgencyExpenseMonth (source_type === 'agency_expense')
    const currentData = data.find(d => 
      d.mois === mois && 
      d.sous_traitant === sous_traitant && 
      d.chantier_id === chantierId
    );

    // Pour les agents journaliers (chantierId = 0 ou null), utiliser une clé spéciale
    const key = chantierId === 0 || chantierId === null 
      ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
      : `${mois}_${sous_traitant}_${chantierId}`;
    
    // ✅ CORRECTION : Pour AgencyExpenseMonth, utiliser currentData.factures au lieu de editedFactures
    const factures = currentData?.source_type === 'agency_expense' 
      ? (currentData.factures || [])  // Factures depuis les données pour AgencyExpenseMonth
      : (editedFactures[key] || []);  // Factures depuis editedFactures pour les autres
    
    if (factureIndex !== null && factureIndex < factures.length && factures[factureIndex]) {
      // Mode édition
      const facture = factures[factureIndex];
      setFactureModalData({
        numero: facture.numero_facture || "",
        montant: facture.montant_facture || 0
      });
      setCurrentFacture({ mois, sous_traitant, chantierId, factureIndex });
    } else {
      // Mode ajout
      setFactureModalData({ numero: "", montant: "" });
      setCurrentFacture({ mois, sous_traitant, chantierId, factureIndex: null });
    }
    setFactureModalOpen(true);
  };

  // Fermer le modal
  const handleCloseFactureModal = () => {
    setFactureModalOpen(false);
    setCurrentFacture(null);
    setFactureModalData({ numero: "", montant: "" });
  };

  // === HANDLERS POUR AJUSTEMENT AGENT JOURNALIER ===
  
  // Ouvrir le modal d'ajustement
  const handleOpenAjustementModal = (item) => {
    // Parser le mois pour obtenir mois/annee numériques
    const [moisStr, anneeStr] = item.mois.split("/");
    const mois = parseInt(moisStr, 10);
    const annee = parseInt("20" + anneeStr, 10); // Convertir YY en 20YY
    
    setCurrentAjustement({
      agent_id: item.agent_id,
      mois: mois,
      annee: annee,
      sous_traitant: item.sous_traitant,
      a_payer_labor_cost: item.a_payer_labor_cost || item.a_payer,
      ajustement_id: item.ajustement_id,
      ajustement_montant: item.ajustement_montant || 0,
      ajustement_description: item.ajustement_description || "",
      chantiersDetails: item.chantiersDetails || [],
    });
    setAjustementFormData({
      montant: item.ajustement_montant || "",
      description: item.ajustement_description || ""
    });
    setAjustementModalOpen(true);
  };
  
  // Fermer le modal d'ajustement
  const handleCloseAjustementModal = () => {
    setAjustementModalOpen(false);
    setCurrentAjustement(null);
    setAjustementFormData({ montant: "", description: "" });
  };
  
  // Sauvegarder l'ajustement
  const handleSaveAjustement = async () => {
    if (!currentAjustement || !currentAjustement.agent_id) {
      return;
    }
    
    setSavingAjustement(true);
    try {
      const response = await axios.post("/api/ajustement-agent-journalier/", {
        agent_id: currentAjustement.agent_id,
        mois: currentAjustement.mois,
        annee: currentAjustement.annee,
        montant_ajustement: parseFloat(ajustementFormData.montant) || 0,
        description: ajustementFormData.description.trim()
      });
      
      // Rafraîchir les données
      await fetchData();
      
      handleCloseAjustementModal();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de l'ajustement:", err);
      setError("Erreur lors de la sauvegarde de l'ajustement.");
    } finally {
      setSavingAjustement(false);
    }
  };
  
  // Supprimer l'ajustement
  const handleDeleteAjustement = async () => {
    if (!currentAjustement || !currentAjustement.ajustement_id) {
      return;
    }
    
    setSavingAjustement(true);
    try {
      await axios.delete("/api/ajustement-agent-journalier/", {
        data: { ajustement_id: currentAjustement.ajustement_id }
      });
      
      // Rafraîchir les données
      await fetchData();
      
      handleCloseAjustementModal();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Erreur lors de la suppression de l'ajustement:", err);
      setError("Erreur lors de la suppression de l'ajustement.");
    } finally {
      setSavingAjustement(false);
    }
  };

  // Sauvegarder la facture depuis le modal
  const handleSaveFactureModal = async () => {
    if (!currentFacture || !factureModalData.numero.trim()) {
      return;
    }

    const { mois, sous_traitant, chantierId, factureIndex } = currentFacture;
    
    // Vérifier si c'est une ligne AgencyExpenseMonth
    const currentData = data.find(d => 
      d.mois === mois && 
      d.sous_traitant === sous_traitant && 
      d.chantier_id === chantierId
    );
    
    // Si c'est une ligne AgencyExpenseMonth, utiliser l'ancienne méthode
    if (currentData?.source_type === 'agency_expense' && currentData?.agency_expense_id) {
      try {
        setSaving(true);
        
        // Récupérer les factures actuelles
        const currentFactures = currentData.factures || [];
        
        let updatedFactures;
        if (factureIndex !== null && factureIndex < currentFactures.length) {
          // Modification : conserver payee et date_paiement_facture
          updatedFactures = [...currentFactures];
          updatedFactures[factureIndex] = {
            ...currentFactures[factureIndex],  // Conserver tous les champs existants (payee, date_paiement_facture)
            numero_facture: factureModalData.numero.trim(),
            montant_facture: parseFloat(factureModalData.montant) || 0
          };
        } else {
          // Ajout : nouvelle facture
          const newFacture = {
            numero_facture: factureModalData.numero.trim(),
            montant_facture: parseFloat(factureModalData.montant) || 0,
            payee: false,
            date_paiement_facture: null
          };
          updatedFactures = [...currentFactures, newFacture];
        }
        
        // Sauvegarder via l'API
        await axios.patch(`/api/agency-expenses-month/${currentData.agency_expense_id}/`, {
          factures: updatedFactures
        });
        
        const key = chantierId === 0 || chantierId === null 
          ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
          : `${mois}_${sous_traitant}_${chantierId}`;
        
        // ✅ Mise à jour dynamique : mettre à jour uniquement cette ligne dans data
        // Pour AgencyExpenseMonth, on ne synchronise PAS editedFactures
        setData((prevData) => {
          return prevData.map((item) => {
            if (
              item.mois === mois &&
              item.sous_traitant === sous_traitant &&
              item.chantier_id === chantierId
            ) {
              return {
                ...item,
                factures: updatedFactures
              };
            }
            return item;
          });
        });
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error) {
        console.error("Erreur lors de la sauvegarde de la facture:", error);
        alert("Erreur lors de la sauvegarde de la facture");
      } finally {
        setSaving(false);
      }
    } else {
      // Utiliser le nouveau système de suivi pour les autres lignes
      try {
        setSaving(true);
        
        const [moisNum, annee2digits] = mois.split("/").map(Number);
        const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
        
        // 1. Créer ou récupérer le suivi de paiement
        const suiviResponse = await axios.post('/api/suivi-paiements-sous-traitant-mensuel/update_or_create_suivi/', {
          mois: moisNum,
          annee: anneeComplete,
          sous_traitant: sous_traitant,
          chantier_id: chantierId || null,
        });
        
        const suiviId = suiviResponse.data.id;
        
        // 2. Créer ou mettre à jour la facture
        const factureData = {
          suivi_paiement: suiviId,
          numero_facture: factureModalData.numero.trim(),
          montant_facture_ht: parseFloat(factureModalData.montant) || 0,
        };
        
        if (factureIndex !== null && currentData?.suivi_paiement_id) {
          // Mode édition : récupérer l'ID de la facture
          const key = chantierId === 0 || chantierId === null 
            ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
            : `${mois}_${sous_traitant}_${chantierId}`;
          const factures = editedFactures[key] || currentData.factures || [];
          const factureToEdit = factures[factureIndex];
          
          if (factureToEdit && factureToEdit.id && factureToEdit.id.toString().startsWith('suivi_')) {
            // C'est une facture de suivi, on peut la mettre à jour
            const factureId = factureToEdit.id.replace('suivi_', '');
            await axios.patch(`/api/factures-suivi-sous-traitant/${factureId}/`, factureData);
          } else {
            // Nouvelle facture
            await axios.post('/api/factures-suivi-sous-traitant/', factureData);
          }
        } else {
          // Mode ajout
          await axios.post('/api/factures-suivi-sous-traitant/', factureData);
        }
        
        // ✅ Mise à jour dynamique : recharger uniquement les données du backend pour cette ligne
        const [moisNum2, annee2digits2] = mois.split("/").map(Number);
        const anneeComplete2 = annee2digits2 < 50 ? 2000 + annee2digits2 : 1900 + annee2digits2;
        
        const response = await axios.get(`/api/suivi-paiements-sous-traitant-mensuel/`, {
          params: {
            mois: moisNum2,
            annee: anneeComplete2,
            sous_traitant: sous_traitant,
            chantier_id: chantierId || null
          }
        });
        
        if (response.data && response.data.length > 0) {
          const updatedSuivi = response.data[0];
          
          // Mettre à jour uniquement cette ligne dans data
          setData((prevData) => {
            return prevData.map((item) => {
              if (
                item.mois === mois &&
                item.sous_traitant === sous_traitant &&
                item.chantier_id === chantierId
              ) {
                return {
                  ...item,
                  factures: updatedSuivi.factures_suivi?.map(f => ({
                    id: `suivi_${f.id}`,
                    numero_facture: f.numero_facture,
                    montant_facture: f.montant_facture_ht,
                    payee: f.payee,
                    date_paiement_facture: f.date_paiement_facture
                  })) || [],
                  suivi_paiement_id: updatedSuivi.id
                };
              }
              return item;
            });
          });
          
          // Mettre à jour aussi editedFactures pour la cohérence
          const key = chantierId === 0 || chantierId === null 
            ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
            : `${mois}_${sous_traitant}_${chantierId}`;
          
          setEditedFactures((prev) => ({
            ...prev,
            [key]: updatedSuivi.factures_suivi?.map(f => ({
              id: `suivi_${f.id}`,
              numero_facture: f.numero_facture,
              montant_facture: f.montant_facture_ht,
              payee: f.payee,
              date_paiement_facture: f.date_paiement_facture
            })) || []
          }));
        }
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error) {
        console.error("Erreur lors de la sauvegarde de la facture:", error);
        setError("Erreur lors de la sauvegarde de la facture");
      } finally {
        setSaving(false);
      }
    }
    
    handleCloseFactureModal();
  };

  // Ouvrir le modal pour saisir la date de paiement de la facture
  const handleMarkFactureAsPaid = (mois, sous_traitant, chantierId, factureIndex) => {
    // Récupérer les données actuelles
    const currentData = data.find(d => 
      d.mois === mois && 
      d.sous_traitant === sous_traitant && 
      d.chantier_id === chantierId
    );
    
    // Pour AgencyExpenseMonth, utiliser currentData.factures
    // Pour les autres, utiliser editedFactures
    let currentFactures;
    if (currentData?.source_type === 'agency_expense') {
      currentFactures = currentData.factures || [];
    } else {
      const key = chantierId === 0 || chantierId === null 
        ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
        : `${mois}_${sous_traitant}_${chantierId}`;
      currentFactures = editedFactures[key] || currentData?.factures || [];
    }
    
    if (factureIndex < 0 || factureIndex >= currentFactures.length) {
      return;
    }

    const facture = currentFactures[factureIndex];
    
    // Si la facture est déjà payée, ne rien faire
    if (facture.payee) {
      return;
    }

    // Ouvrir le modal pour saisir la date de paiement
    setCurrentFacturePaiement({ mois, sous_traitant, chantierId, factureIndex });
    setDatePaiementFactureModalOpen(true);
  };

  // Sauvegarder la facture avec la date de paiement saisie
  const handleSaveFacturePaiement = async (datePaiementFacture) => {
    if (!currentFacturePaiement) {
      return;
    }

    const { mois, sous_traitant, chantierId, factureIndex } = currentFacturePaiement;
    
    // Récupérer les données actuelles
    const currentData = data.find(d => 
      d.mois === mois && 
      d.sous_traitant === sous_traitant && 
      d.chantier_id === chantierId
    );
    
    // ✅ Utiliser TOUJOURS le même format de clé que dans organizeData
    // Pour les agents journaliers avec isAgentJournalier, la clé spéciale est utilisée dans l'affichage
    const key = currentData?.isAgentJournalier 
      ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
      : `${mois}_${sous_traitant}_${chantierId}`;
    
    // ✅ Pour AgencyExpenseMonth, utiliser currentData.factures
    // Pour les autres, utiliser editedFactures
    let currentFactures;
    if (currentData?.source_type === 'agency_expense') {
      currentFactures = currentData.factures || [];
    } else {
      currentFactures = editedFactures[key] || currentData?.factures || [];
    }
    
    const facture = currentFactures[factureIndex];
    
    if (!facture) {
      return;
    }

    // Vérifier si c'est une ligne AgencyExpenseMonth
    if (currentData?.source_type === 'agency_expense' && currentData?.agency_expense_id) {
      try {
        setSaving(true);
        
        const montantFacture = parseFloat(facture.montant_facture) || 0;
        const montantPayeActuel = parseFloat(currentData?.paye) || 0;
        const nouveauMontantPaye = montantPayeActuel + montantFacture;
        
        // Mettre à jour les factures dans AgencyExpenseMonth
        const currentFacturesAgency = currentData.factures || [];
        const updatedFactures = currentFacturesAgency.map((f, idx) => {
          if (idx === factureIndex) {
            return {
              ...f,
              payee: true,
              date_paiement_facture: datePaiementFacture
            };
          }
          return f;
        });
        
        // ✅ Calculer la date de paiement la plus récente parmi toutes les factures payées
        const datesPaiementFactures = updatedFactures
          .filter(f => f.payee && f.date_paiement_facture)
          .map(f => new Date(f.date_paiement_facture));
        
        const datePaiementReelGlobale = datesPaiementFactures.length > 0
          ? new Date(Math.max(...datesPaiementFactures)).toISOString().split('T')[0]
          : datePaiementFacture;
        
        // ✅ Sauvegarder les factures dans AgencyExpenseMonth (sans modifier amount)
        await axios.patch(`/api/agency-expenses-month/${currentData.agency_expense_id}/`, {
          factures: updatedFactures
        });
        
        // ✅ Sauvegarder le montant payé dans SuiviPaiementSousTraitantMensuel
        // Utiliser la date la plus récente pour le calcul de l'écart
        const [moisNum, annee2digits] = mois.split("/").map(Number);
        const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
        
        await axios.post('/api/suivi-paiements-sous-traitant-mensuel/update_or_create_suivi/', {
          mois: moisNum,
          annee: anneeComplete,
          sous_traitant: sous_traitant,
          chantier_id: null,  // null pour AgencyExpenseMonth
          montant_paye_ht: nouveauMontantPaye,
          date_paiement_reel: datePaiementReelGlobale  // Date la plus récente
        });
        
        // ✅ Mise à jour dynamique
        setData((prevData) => {
          return prevData.map((item) => {
            if (
              item.mois === mois &&
              item.sous_traitant === sous_traitant &&
              item.chantier_id === chantierId
            ) {
              return {
                ...item,
                factures: updatedFactures,
                paye: nouveauMontantPaye,
                date_paiement: datePaiementReelGlobale  // Date la plus récente
              };
            }
            return item;
          });
        });
        
        // ✅ Synchroniser editedValuesPaye pour AgencyExpenseMonth avec la bonne clé
        setEditedValuesPaye((prev) => ({
          ...prev,
          [key]: nouveauMontantPaye
        }));
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error) {
        console.error("Erreur:", error);
        setError("Erreur lors de la mise à jour de la facture");
      } finally {
        setSaving(false);
      }
    } else if (facture.id && facture.id.toString().startsWith('suivi_')) {
      // Factures de suivi
      try {
        setSaving(true);
        const factureId = facture.id.replace('suivi_', '');
        
        // Marquer la facture comme payée avec la date
        await axios.patch(`/api/factures-suivi-sous-traitant/${factureId}/`, {
          payee: true,
          date_paiement_facture: datePaiementFacture
        });
        
        // Optionnel : mettre à jour aussi le montant payé total
        const montantFacture = parseFloat(facture.montant_facture) || 0;
        const montantPayeActuel = parseFloat(currentData?.paye) || 0;
        const nouveauMontantPaye = montantPayeActuel + montantFacture;
        
        // Calculer la liste des factures mises à jour pour déterminer la date la plus récente
        const updatedFacturesList = (currentData?.factures || []).map((f, idx) => {
          if (idx === factureIndex) {
            return {
              ...f,
              payee: true,
              date_paiement_facture: datePaiementFacture
            };
          }
          return f;
        });
        
        // ✅ Calculer la date de paiement la plus récente parmi toutes les factures payées
        const datesPaiementFactures = updatedFacturesList
          .filter(f => f.payee && f.date_paiement_facture)
          .map(f => new Date(f.date_paiement_facture));
        
        const datePaiementReelGlobale = datesPaiementFactures.length > 0
          ? new Date(Math.max(...datesPaiementFactures)).toISOString().split('T')[0]
          : datePaiementFacture;
        
        const [moisNum, annee2digits] = mois.split("/").map(Number);
        const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
        
        // Mettre à jour le montant payé dans le suivi avec la date la plus récente
        await axios.post('/api/suivi-paiements-sous-traitant-mensuel/update_or_create_suivi/', {
          mois: moisNum,
          annee: anneeComplete,
          sous_traitant: sous_traitant,
          chantier_id: chantierId || null,
          montant_paye_ht: nouveauMontantPaye,
          date_paiement_reel: datePaiementReelGlobale  // Date la plus récente
        });
        
        // ✅ Mise à jour dynamique : mettre à jour uniquement cette ligne dans data
        setData((prevData) => {
          return prevData.map((item) => {
            if (
              item.mois === mois &&
              item.sous_traitant === sous_traitant &&
              item.chantier_id === chantierId
            ) {
              return {
                ...item,
                factures: updatedFacturesList,
                paye: nouveauMontantPaye,
                date_paiement: datePaiementReelGlobale  // Date la plus récente
              };
            }
            return item;
          });
        });
        
        // Mettre à jour aussi editedFactures pour la cohérence
        setEditedFactures((prev) => {
          return {
            ...prev,
            [key]: updatedFacturesList
          };
        });
        
        // ✅ Synchroniser editedValuesPaye
        setEditedValuesPaye((prev) => ({
          ...prev,
          [key]: nouveauMontantPaye
        }));
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error) {
        console.error("Erreur:", error);
        setError("Erreur lors de la mise à jour de la facture");
      } finally {
        setSaving(false);
      }
    } else if (currentData?.source_type === 'facture_sous_traitant' && facture.id && !isNaN(Number(facture.id))) {
      // ✅ NOUVEAU : Factures de sous-traitants réels (FactureSousTraitant)
      // Créer un PaiementFactureSousTraitant dans la base de données
      try {
        setSaving(true);
        
        const montantFacture = parseFloat(facture.montant_facture) || 0;
        
        // Créer le paiement via l'API PaiementFactureSousTraitant
        const paiementResponse = await axios.post('/api/paiements-facture-sous-traitant/', {
          facture: facture.id,
          montant_paye: montantFacture,
          date_paiement_reel: datePaiementFacture,
          commentaire: `Paiement validé depuis TableauSousTraitant`
        });
        
        // Calculer le nouveau montant payé total
        const montantPayeActuel = parseFloat(currentData?.paye || 0);
        const nouveauMontantPaye = montantPayeActuel + montantFacture;
        
        // Mettre à jour les factures localement
        const updatedFactures = [...currentFactures];
        updatedFactures[factureIndex] = {
          ...updatedFactures[factureIndex],
          payee: true,
          date_paiement_facture: datePaiementFacture
        };
        
        // ✅ Mise à jour dynamique de data
        setData((prevData) => {
          return prevData.map((item) => {
            if (
              item.mois === mois &&
              item.sous_traitant === sous_traitant &&
              item.chantier_id === chantierId
            ) {
              return {
                ...item,
                factures: updatedFactures,
                paye: nouveauMontantPaye,
                date_paiement: datePaiementFacture
              };
            }
            return item;
          });
        });
        
        setEditedFactures((prev) => ({
          ...prev,
          [key]: updatedFactures,
        }));
        
        setEditedValuesPaye((prev) => ({
          ...prev,
          [key]: nouveauMontantPaye,
        }));
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error) {
        console.error("Erreur lors de la création du paiement:", error);
        setError("Erreur lors de la création du paiement dans la base de données");
      } finally {
        setSaving(false);
      }
    } else {
      // Ancienne méthode pour les factures non-suivi (rétrocompatibilité)
      const montantFacture = parseFloat(facture.montant_facture) || 0;
      const isAgentJournalier = chantierId === 0 || chantierId === null;
      const keyPaye = key;
      
      const montantPayeActuel = parseFloat(
        editedValuesPaye[keyPaye] !== undefined 
          ? editedValuesPaye[keyPaye] 
          : (currentData?.paye || 0)
      ) || 0;
      
      const nouveauMontantPaye = montantPayeActuel + montantFacture;
      
      const updatedFactures = [...currentFactures];
      updatedFactures[factureIndex] = {
        ...updatedFactures[factureIndex],
        payee: true,
        date_paiement_facture: datePaiementFacture
      };

      setEditedFactures((prev) => ({
        ...prev,
        [key]: updatedFactures,
      }));
      
      setEditedValuesPaye((prev) => ({
        ...prev,
        [key]: nouveauMontantPaye,
      }));

      if (!isAgentJournalier) {
        savePaiement(mois, sous_traitant, chantierId, nouveauMontantPaye, updatedFactures, currentData?.date_paiement || null, currentData?.date_envoi || null);
      }
    }
    
    // Fermer le modal
    setDatePaiementFactureModalOpen(false);
    setCurrentFacturePaiement(null);
  };

  // Supprimer une facture
  const handleRemoveFacture = async (mois, sous_traitant, chantierId, factureIndex) => {
    // Vérifier si c'est une ligne AgencyExpenseMonth (source_type === 'agency_expense')
    const currentData = data.find(d => 
      d.mois === mois && 
      d.sous_traitant === sous_traitant && 
      d.chantier_id === chantierId
    );
    
    // Si c'est une ligne AgencyExpenseMonth, supprimer via l'API
    if (currentData?.source_type === 'agency_expense' && currentData?.agency_expense_id) {
      try {
        setSaving(true);
        const currentFactures = currentData.factures || [];
        const updatedFactures = currentFactures.filter((_, idx) => idx !== factureIndex);
        
        await axios.patch(`/api/agency-expenses-month/${currentData.agency_expense_id}/`, {
          factures: updatedFactures
        });
        
        // ✅ Mise à jour dynamique : mettre à jour uniquement cette ligne dans data
        // Pour AgencyExpenseMonth, on ne synchronise PAS editedFactures
        setData((prevData) => {
          return prevData.map((item) => {
            if (
              item.mois === mois &&
              item.sous_traitant === sous_traitant &&
              item.chantier_id === chantierId
            ) {
              return {
                ...item,
                factures: updatedFactures
              };
            }
            return item;
          });
        });
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error) {
        console.error("Erreur lors de la suppression de la facture:", error);
        alert("Erreur lors de la suppression de la facture");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Pour les autres lignes
    const key = chantierId === 0 || chantierId === null 
      ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
      : `${mois}_${sous_traitant}_${chantierId}`;
    
    const factures = editedFactures[key] || currentData?.factures || [];
    const factureToDelete = factures[factureIndex];
    
    if (!factureToDelete) return;
    
    // Vérifier si c'est une facture de suivi
    if (factureToDelete.id && factureToDelete.id.toString().startsWith('suivi_')) {
      try {
        setSaving(true);
        const factureId = factureToDelete.id.replace('suivi_', '');
        await axios.delete(`/api/factures-suivi-sous-traitant/${factureId}/`);
        
        // ✅ Mise à jour dynamique : mettre à jour uniquement cette ligne dans data
        setData((prevData) => {
          return prevData.map((item) => {
            if (
              item.mois === mois &&
              item.sous_traitant === sous_traitant &&
              item.chantier_id === chantierId
            ) {
              const updatedFactures = (item.factures || []).filter((_, idx) => idx !== factureIndex);
              return {
                ...item,
                factures: updatedFactures
              };
            }
            return item;
          });
        });
        
        // Mettre à jour aussi editedFactures pour la cohérence
        setEditedFactures((prev) => {
          const updatedFactures = (prev[key] || []).filter((_, idx) => idx !== factureIndex);
          return {
            ...prev,
            [key]: updatedFactures
          };
        });
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error) {
        console.error("Erreur lors de la suppression de la facture:", error);
        setError("Erreur lors de la suppression de la facture");
      } finally {
        setSaving(false);
      }
    } else {
      // Ancienne méthode pour les factures non-suivi (rétrocompatibilité)
      const isAgentJournalier = chantierId === 0 || chantierId === null;
      
      setEditedFactures((prev) => {
        const currentFactures = prev[key] || [];
        const newFactures = currentFactures.filter((_, idx) => idx !== factureIndex);
        // Sauvegarder après suppression (sauf pour les agents journaliers)
        if (!isAgentJournalier) {
          savePaiement(mois, sous_traitant, chantierId, editedValuesPaye[key] || 0, newFactures);
        }
        return { ...prev, [key]: newFactures };
      });
    }
  };

  // ⚠️ FONCTION OBSOLÈTE - Conservée pour référence uniquement
  // Utilisez maintenant le champ `source_type` du backend pour différencier :
  // - 'agent_journalier' : Agents du planning (LaborCost)
  // - 'facture_sous_traitant' : Sous-traitants avec factures (FactureSousTraitant)
  // 
  // Ancienne méthode (fragile) : détecter par le format du nom "Prénom Nom"
  const isAgentJournalier = (sousTraitant, chantierId = null) => {
    // ⚠️ NE PLUS UTILISER - Utiliser item.source_type === 'agent_journalier' à la place
    if (chantierId !== null && chantierId !== undefined && chantierId !== 0) {
      return false;
    }
    return sousTraitant && sousTraitant.includes(' ') && !sousTraitant.includes('Entreprise') && !sousTraitant.includes('SARL') && !sousTraitant.includes('SA') && !sousTraitant.includes('STAR CLEAN') && !sousTraitant.includes('ABCONDUITE');
  };

  // Organiser les données par mois, puis par sous-traitant, puis par chantier
  const organizeData = () => {
    // Filtrer les données par année
    let filteredData = data;
    if (selectedAnnee) {
      const annee2digits = selectedAnnee.toString().slice(-2);
      filteredData = data.filter((item) => {
        const [moisItem, anneeItem] = item.mois.split("/");
        return anneeItem === annee2digits;
      });
    }

    // Séparer les agents journaliers des autres sous-traitants
    const agentsJournaliers = {};
    const autresSousTraitants = {};
    
    filteredData.forEach((item) => {
      // Utiliser le champ source_type du backend pour différencier
      const isAgent = item.source_type === 'agent_journalier';
      const target = isAgent ? agentsJournaliers : autresSousTraitants;
      
      if (!target[item.mois]) {
        target[item.mois] = {};
      }
      if (!target[item.mois][item.sous_traitant]) {
        target[item.mois][item.sous_traitant] = [];
      }
      
      const key = `${item.mois}_${item.sous_traitant}_${item.chantier_id}`;
      // Montant à payer est toujours en lecture seule (non modifiable)
      const aPayerValue = item.a_payer || 0;
      // Seul le montant payé peut être modifié par l'utilisateur
      const payeValue = editedValuesPaye[key] !== undefined 
        ? editedValuesPaye[key] 
        : item.paye || 0;
      const ecart = aPayerValue - payeValue;
      
      // ⚠️ CORRECTION IMPORTANTE : Pour AgencyExpenseMonth, toujours utiliser item.factures
      // Pour les autres (factures de suivi), utiliser editedFactures si disponible
      let facturesList;
      if (item.source_type === 'agency_expense') {
        // Pour AgencyExpenseMonth : toujours utiliser les factures de data
        facturesList = (item.factures || []).map(f => ({
          id: f.id || null,
          numero_facture: f.numero_facture || f,
          montant_facture: f.montant_facture || 0,
          payee: f.payee || false,
          date_paiement_facture: f.date_paiement_facture || null
        }));
      } else {
        // Pour les autres : utiliser editedFactures si disponible, sinon item.factures
        facturesList = editedFactures[key] !== undefined 
          ? editedFactures[key] 
          : ((item.factures || []).map(f => ({
              id: f.id || null,
              numero_facture: f.numero_facture || f,
              montant_facture: f.montant_facture || 0,
              payee: f.payee || false,
              date_paiement_facture: f.date_paiement_facture || null
            })));
      }

      const organizedItem = {
        ...item,
        paye: payeValue,
        a_payer: aPayerValue,
        a_payer_ttc: aPayerValue * 1.20, // TTC = HT + 20%
        ecart: ecart,
        factures: facturesList,
        // S'assurer que date_paiement est bien propagé depuis les données de l'API
        date_paiement: item.date_paiement || null,
        date_envoi: item.date_envoi || null,
        date_paiement_prevue: item.date_paiement_prevue || null,
        ecart_paiement_reel: item.ecart_paiement_reel || null,
        delai_paiement: item.delai_paiement || 45,
        source_type: item.source_type || 'facture_sous_traitant', // Conserver le type de source
      };
      
      target[item.mois][item.sous_traitant].push(organizedItem);
    });

    // Pour les agents journaliers, regrouper tous les chantiers d'un mois/agent en une seule ligne
    const organized = {};
    
    // Traiter les agents journaliers : regrouper par mois/agent
    Object.keys(agentsJournaliers).forEach((mois) => {
      if (!organized[mois]) {
        organized[mois] = {};
      }
      Object.keys(agentsJournaliers[mois]).forEach((sous_traitant) => {
        const chantiers = agentsJournaliers[mois][sous_traitant];
        
        // Calculer les totaux pour tous les chantiers (montant LaborCost de base)
        let totalLaborCost = 0;
        let totalPaye = 0;
        let totalEcart = 0;
        const chantiersDetails = [];
        const allFactures = [];
        
        // Récupérer les infos d'ajustement depuis le premier chantier (elles sont identiques pour tous)
        const ajustementId = chantiers[0]?.ajustement_id || null;
        const ajustementMontant = chantiers[0]?.ajustement_montant || 0;
        const ajustementDescription = chantiers[0]?.ajustement_description || '';
        const agentId = chantiers[0]?.agent_id || null;
        
        chantiers.forEach((chantier) => {
          totalLaborCost += chantier.a_payer || 0;
          totalPaye += chantier.paye || 0;
          totalEcart += chantier.ecart || 0;
          
          chantiersDetails.push({
            chantier_id: chantier.chantier_id,
            chantier_name: chantier.chantier_name,
            a_payer: chantier.a_payer || 0,
            paye: chantier.paye || 0,
            ecart: chantier.ecart || 0,
          });
          
          // Collecter toutes les factures
          if (chantier.factures && chantier.factures.length > 0) {
            allFactures.push(...chantier.factures);
          }
        });
        
        // Montant total à payer = LaborCost + ajustement
        const totalAPayer = totalLaborCost + ajustementMontant;
        
        // Pour les agents journaliers, utiliser une clé sans chantier_id pour le montant payé et les factures
        const keyAgentJournalier = `${mois}_${sous_traitant}_AGENT_JOURNALIER`;
        const payeValueAgent = editedValuesPaye[keyAgentJournalier] !== undefined 
          ? editedValuesPaye[keyAgentJournalier]
          : totalPaye;
        
        // Récupérer les factures depuis editedFactures pour les agents journaliers
        const facturesAgentJournalier = editedFactures[keyAgentJournalier] !== undefined
          ? editedFactures[keyAgentJournalier]
          : allFactures;
        
        // Créer une seule ligne regroupée pour cet agent/mois
        organized[mois][sous_traitant] = [{
          mois: mois,
          sous_traitant: sous_traitant,
          chantier_id: 0, // Utiliser 0 pour identifier les agents journaliers (au lieu de null)
          chantier_name: null, // Sera remplacé par la liste des chantiers
          a_payer: totalAPayer,
          a_payer_labor_cost: totalLaborCost, // Montant original de LaborCost (avant ajustement)
          paye: payeValueAgent,
          ecart: totalAPayer - payeValueAgent,
          a_payer_ttc: totalAPayer * 1.20,
          factures: facturesAgentJournalier,
          date_envoi: chantiers[0]?.date_envoi || null,
          date_paiement_prevue: chantiers[0]?.date_paiement_prevue || null,
          date_paiement: chantiers[0]?.date_paiement || null,
          ecart_paiement_reel: chantiers[0]?.ecart_paiement_reel || null,
          delai_paiement: chantiers[0]?.delai_paiement || 45,
          source_type: 'agent_journalier', // Type de source depuis le backend
          isAgentJournalier: true, // Flag pour identifier les agents journaliers (rétrocompatibilité)
          chantiersDetails: chantiersDetails, // Liste de tous les chantiers avec leurs montants
          keyAgentJournalier: keyAgentJournalier, // Clé pour la gestion du montant payé
          // Infos d'ajustement
          agent_id: agentId,
          ajustement_id: ajustementId,
          ajustement_montant: ajustementMontant,
          ajustement_description: ajustementDescription,
        }];
      });
    });
    
    // Ajouter les autres sous-traitants (non regroupés)
    Object.keys(autresSousTraitants).forEach((mois) => {
      if (!organized[mois]) {
        organized[mois] = {};
      }
      Object.keys(autresSousTraitants[mois]).forEach((sous_traitant) => {
        organized[mois][sous_traitant] = autresSousTraitants[mois][sous_traitant];
      });
    });

    // Trier les mois
    const moisSorted = Object.keys(organized).sort((a, b) => {
      const [moisA, anneeA] = a.split("/").map(Number);
      const [moisB, anneeB] = b.split("/").map(Number);
      if (anneeA !== anneeB) return anneeA - anneeB;
      return moisA - moisB;
    });

    // Trier les sous-traitants et les chantiers dans chaque groupe
    moisSorted.forEach((mois) => {
      const sous_traitants = Object.keys(organized[mois]).sort();
      sous_traitants.forEach((sous_traitant) => {
        organized[mois][sous_traitant].sort((a, b) => {
          // Trier par nom de chantier
          return a.chantier_name.localeCompare(b.chantier_name);
        });
      });
    });

    return { organized, moisSorted };
  };

  // Mémoriser l'organisation des données pour éviter les recalculs inutiles
  const organizedData = useMemo(
    () => organizeData(),
    [data, selectedAnnee, editedValuesPaye, editedFactures]
  );
  
  const { organized, moisSorted } = organizedData;

  // Styles communs pour les cellules (identique à TableauFacturation)
  const commonBodyCellStyle = {
    maxWidth: "150px",
    padding: "6px 8px",
    whiteSpace: "normal",
    wordWrap: "break-word",
    textAlign: "center",
    verticalAlign: "middle",
  };

  const commonCellStyle = {
    color: "white",
    maxWidth: "150px",
    padding: "4px 6px",
    whiteSpace: "normal",
    wordWrap: "break-word",
    textAlign: "center",
    minHeight: "45px",
    verticalAlign: "middle",
    fontSize: "0.85rem",
  };

  // Formater un montant avec couleur (style TableauFacturation)
  const formatMontant = (montant, isNegatif = false) => {
    const valeur = parseFloat(montant) || 0;
    const couleur = isNegatif ? "error.main" : "rgb(0, 168, 42)";

    return (
      <Typography
        sx={{
          color: couleur,
          fontFamily: "Roboto, Arial, sans-serif",
          fontWeight: 500,
          fontSize: "0.75rem",
          whiteSpace: "nowrap",
        }}
      >
        {isNegatif ? "-" : ""}
        {Math.abs(valeur).toFixed(2)} €
      </Typography>
    );
  };

  // Formater un nombre avec 2 décimales
  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculer les totaux pour un mois
  const calculerTotauxMois = (mois) => {
    const sous_traitants = organized[mois] || {};
    let totalAPayer = 0;
    let totalAPayerTTC = 0;
    let totalPaye = 0;
    let totalEcart = 0;

    Object.values(sous_traitants).forEach((chantiers) => {
      chantiers.forEach((item) => {
        totalAPayer += item.a_payer || 0;
        totalAPayerTTC += item.a_payer_ttc || 0;
        totalPaye += item.paye || 0;
        totalEcart += item.ecart || 0;
      });
    });

    return { totalAPayer, totalAPayerTTC, totalPaye, totalEcart };
  };

  // Calculer le total par sous-traitant pour un mois
  const calculerTotalSousTraitant = (mois, sous_traitant) => {
    const sous_traitants = organized[mois] || {};
    const chantiers = sous_traitants[sous_traitant] || [];
    let totalAPayer = 0;
    let totalPaye = 0;
    chantiers.forEach((item) => {
      totalAPayer += item.a_payer || 0;
      totalPaye += item.paye || 0;
    });
    return { totalAPayer, totalPaye };
  };

  // Créer la structure de lignes avec récap entre chaque mois
  const buildTableRows = () => {
    const rows = [];

    moisSorted.forEach((mois, moisIndex) => {
      const sous_traitants = Object.keys(organized[mois]).sort();
      
      // Calculer le nombre total de lignes de données pour ce mois (sans le récap)
      let nombreLignesMois = 0;
      sous_traitants.forEach((sous_traitant) => {
        nombreLignesMois += organized[mois][sous_traitant].length;
      });
      
      // Ajouter les lignes pour chaque sous-traitant
      sous_traitants.forEach((sous_traitant, sousTraitantIndex) => {
        const chantiers = organized[mois][sous_traitant];
        
        // Calculer le nombre de lignes pour ce sous-traitant (pour fusionner la cellule sous-traitant)
        const nombreLignesSousTraitant = chantiers.length;
        
        // Calculer le total du sous-traitant pour ce mois
        const totalSousTraitant = calculerTotalSousTraitant(mois, sous_traitant);
        
        chantiers.forEach((item, chantierIndex) => {
          const key = `${mois}_${sous_traitant}_${item.chantier_id}`;
          
          // La première ligne de chaque mois
          const isFirstRowOfMois = sousTraitantIndex === 0 && chantierIndex === 0;
          // La première ligne de chaque sous-traitant
          const isFirstRowOfSousTraitant = chantierIndex === 0;

          // Identifier le chantier précédent pour changer le background
          const previousChantierId = chantierIndex > 0 
            ? chantiers[chantierIndex - 1].chantier_id 
            : null;
          const isNewChantier = previousChantierId !== null && previousChantierId !== item.chantier_id;
          
          // Calculer l'index global de la ligne pour l'alternance (en comptant toutes les lignes précédentes)
          const globalRowIndex = rows.length;

          rows.push({
            type: "data",
            mois: mois,
            sous_traitant: sous_traitant,
            item: item,
            key: key,
            isFirstRowOfMois: isFirstRowOfMois,
            isFirstRowOfSousTraitant: isFirstRowOfSousTraitant,
            rowSpanMois: isFirstRowOfMois ? nombreLignesMois : 0, // rowSpan pour fusionner les cellules du mois
            rowSpanSousTraitant: isFirstRowOfSousTraitant ? nombreLignesSousTraitant : 0, // rowSpan pour fusionner les cellules du sous-traitant
            totalSousTraitant: isFirstRowOfSousTraitant ? totalSousTraitant : null, // Total du sous-traitant seulement sur la première ligne
            isNewChantier: isNewChantier, // Pour marquer le changement de chantier
            globalRowIndex: globalRowIndex, // Index global pour l'alternance cohérente
          });
        });
      });

      // Ajouter la ligne de récap après chaque mois
      const totaux = calculerTotauxMois(mois);
      rows.push({
        type: "recap",
        mois: mois,
        totaux: totaux,
      });
    });

    return rows;
  };

  // Mémoriser la construction des lignes du tableau pour éviter les recalculs inutiles
  const tableRows = useMemo(
    () => buildTableRows(),
    [organizedData, organized, moisSorted]
  );

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontFamily: "Merriweather, serif",
            color: "white",
            fontWeight: "bold",
            fontSize: "1.5rem",
            mb: 1,
          }}
        >
          TABLEAU SOUS-TRAITANT{" "}
          {selectedAnnee ? `Année ${selectedAnnee}` : ""}
        </Typography>

        {/* Sélecteur d'année */}
        <Box sx={{ display: "flex", gap: 2, mb: 1.5, alignItems: "center" }}>
          <Select
            value={selectedAnnee}
            onChange={(e) => setSelectedAnnee(e.target.value)}
            variant="standard"
            sx={{
              minWidth: 120,
              color: "rgba(27, 120, 188, 1)",
              backgroundColor: "white",
            }}
          >
            {Array.from(
              { length: 5 },
              (_, i) => new Date().getFullYear() - 2 + i
            ).map((annee) => (
              <MenuItem key={annee} value={annee}>
                {annee}
              </MenuItem>
            ))}
          </Select>

          <Button
            onClick={fetchData}
            variant="outlined"
            sx={{
              ml: 2,
              backgroundColor: "white",
              color: "rgba(27, 120, 188, 1)",
              borderColor: "rgba(27, 120, 188, 1)",
              border: "1px solid rgba(27, 120, 188, 1)",
              "&:hover": {
                backgroundColor: "rgba(27, 120, 188, 0.1)",
              },
            }}
            startIcon={<FaSync />}
            disabled={loading}
          >
            Actualiser
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={200}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <TableContainer
            component={Paper}
            sx={{ 
              maxWidth: "100%", 
              overflowX: "auto",
              maxHeight: "calc(100vh - 180px)",
              height: "calc(100vh - 180px)",
              overflowY: "auto",
              position: "relative",
              // Masquer la scrollbar tout en gardant le scroll fonctionnel
              scrollbarWidth: "none", // Firefox
              "&::-webkit-scrollbar": {
                display: "none", // Chrome, Safari, Edge
              },
              msOverflowStyle: "none", // IE et Edge (ancien)
            }}
          >
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableHead
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  backgroundColor: "rgba(27, 120, 188, 1)",
                }}
              >
                <TableRow
                  sx={{
                    backgroundColor: "rgba(27, 120, 188, 1)",
                    color: "white",
                  }}
                >
                  <TableCell sx={{ ...commonCellStyle, minWidth: 100, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Mois
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 200, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Sous-Traitant
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 200, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Chantier
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 150, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Montant à payer
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 150, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Montant payé
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 350, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Facture
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 150, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Écart
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 150, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Date de réception
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 150, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Date paiement prévue
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 180, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Date de paiement
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 150, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Écart paiement réel
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 150, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Total Sous-Traitant/Mois
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      align="center"
                      sx={commonBodyCellStyle}
                    >
                      Aucune donnée disponible
                    </TableCell>
                  </TableRow>
                ) : (
                  tableRows.map((row, index) => {
                    // Calculer l'index réel des lignes de données (sans les récaps) pour l'alternance
                    const dataRowIndex = tableRows
                      .slice(0, index + 1)
                      .filter(r => r.type === "data").length - 1;
                    // Alternance simple basée sur l'ordre d'affichage
                    // Utiliser globalRowIndex si disponible pour une alternance cohérente
                    const rowIndexForAlternance = row.type === "data" && row.globalRowIndex !== undefined 
                      ? row.globalRowIndex 
                      : dataRowIndex;
                    const isEvenRow = rowIndexForAlternance % 2 === 0;
                    
                    if (row.type === "recap") {
                      // Ligne de récap du mois
                      const [moisNum, annee2digits] = row.mois.split("/").map(Number);
                      const moisName = getMoisName(moisNum);
                      const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
                      
                      return (
                        <TableRow
                          key={`recap-${row.mois}`}
                          sx={{
                            backgroundColor: "#000000", // Fond noir
                            fontWeight: "bold",
                            borderTop: "2px solid rgba(255, 255, 255, 0.2)",
                            borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
                            "& td": {
                              fontWeight: "bold",
                              color: "white", // Texte blanc pour contraste
                            },
                          }}
                        >
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography
                              sx={{
                                fontWeight: "bold",
                                color: "#ffffff",
                                fontSize: "0.95rem",
                              }}
                            >
                              Récap {moisName} {anneeComplete}
                            </Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography sx={{ color: "#ffffff" }}>-</Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography sx={{ color: "#ffffff" }}>-</Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography
                              sx={{
                                fontWeight: "bold",
                                fontSize: "0.9rem",
                                color: row.totaux.totalAPayer !== 0 
                                  ? "#ff6b6b" // Rouge clair si différent de 0
                                  : "#ffffff", // Blanc si égal à 0
                              }}
                            >
                              {formatNumber(row.totaux.totalAPayer)} €
                            </Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography
                              sx={{
                                fontWeight: "bold",
                                fontSize: "0.9rem",
                                color: "#ffffff",
                              }}
                            >
                              {formatNumber(row.totaux.totalPaye)} €
                            </Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography sx={{ color: "#ffffff" }}>-</Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography
                              sx={{
                                fontWeight: "bold",
                                fontSize: "0.9rem",
                                color: "#ff6b6b", // Rouge clair pour l'écart
                              }}
                            >
                              {row.totaux.totalEcart < 0 ? "-" : ""}{formatNumber(Math.abs(row.totaux.totalEcart))} €
                            </Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography sx={{ color: "#ffffff" }}>-</Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography sx={{ color: "#ffffff" }}>-</Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography sx={{ color: "#ffffff" }}>-</Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography sx={{ color: "#ffffff" }}>-</Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography sx={{ color: "#ffffff" }}>-</Typography>
                          </TableCell>
                        </TableRow>
                      );
                    } else {
                      // Ligne de données
                      const { item, isFirstRowOfMois, isFirstRowOfSousTraitant, rowSpanMois, rowSpanSousTraitant, totalSousTraitant } = row;
                      const [moisNum, annee2digits] = row.mois.split("/").map(Number);
                      const moisName = getMoisName(moisNum);
                      const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;

                      // Alternance simple basée sur l'ordre d'affichage : bleu clair / blanc
                      const backgroundColor = isEvenRow ? "rgba(27, 120, 188, 0.05)" : "#ffffff";
                      // Si c'est un nouveau chantier, accentuer la séparation
                      const borderTop = row.isNewChantier ? "2px solid rgba(27, 120, 188, 0.2)" : "none";
                      
                      return (
                        <TableRow
                          key={row.key}
                          sx={{
                            backgroundColor: backgroundColor,
                            borderTop: borderTop,
                            "&:hover": { backgroundColor: isEvenRow ? "rgba(27, 120, 188, 0.1)" : "#f0f0f0" },
                          }}
                        >
                          {isFirstRowOfMois ? (
                            <TableCell
                              rowSpan={rowSpanMois}
                              sx={{
                                ...commonBodyCellStyle,
                                verticalAlign: "middle",
                                textAlign: "center",
                                borderRight: "1px solid #e0e0e0",
                                backgroundColor: "#ffffff", // Background blanc sans alternance
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.9rem",
                                  color: "rgba(27, 120, 188, 1)",
                                }}
                              >
                                {moisName} {anneeComplete}
                              </Typography>
                            </TableCell>
                          ) : null}
                          {isFirstRowOfSousTraitant ? (
                            <TableCell
                              rowSpan={rowSpanSousTraitant}
                              sx={{
                                ...commonBodyCellStyle,
                                verticalAlign: "middle",
                                textAlign: "center",
                                borderRight: "1px solid #e0e0e0",
                                backgroundColor: "#ffffff", // Background blanc sans alternance
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                  color: "rgba(27, 120, 188, 1)",
                                }}
                              >
                                {row.sous_traitant}
                              </Typography>
                            </TableCell>
                          ) : null}
                          <TableCell sx={commonBodyCellStyle}>
                            {item.isAgentJournalier && item.chantiersDetails ? (
                              <Typography
                                sx={{
                                  fontSize: "0.7rem",
                                  color: "text.primary",
                                  "& span": {
                                    fontSize: "0.7rem !important",
                                  },
                                }}
                              >
                                {item.chantiersDetails.map((chantier, idx) => (
                                  <span key={idx} style={{ fontSize: "0.7rem" }}>
                                    {chantier.chantier_name}
                                    {idx < item.chantiersDetails.length - 1 ? " / " : ""}
                                  </span>
                                ))}
                              </Typography>
                            ) : (
                              <Typography
                                sx={{
                                  fontSize: "0.8rem",
                                  color: "text.primary",
                                }}
                              >
                                {item.chantier_name}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            {item.source_type === 'agency_expense' && item.agency_expense_id ? (
                              // Pour AgencyExpenseMonth, rendre le montant à payer cliquable
                              <Typography
                                sx={{
                                  fontSize: "0.8rem",
                                  color: "rgba(27, 120, 188, 1)",
                                  textAlign: "center",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                  "&:hover": {
                                    backgroundColor: "rgba(27, 120, 188, 0.1)",
                                  },
                                }}
                                onClick={() => handleOpenMontantAPayerModal(row.mois, row.sous_traitant, item.chantier_id)}
                              >
                                {formatNumber(item.a_payer)} €
                              </Typography>
                            ) : item.isAgentJournalier ? (
                              // Pour les agents journaliers, afficher avec Tooltip détaillé et clic pour ajustement
                              <Tooltip
                                title={
                                  <Box sx={{ p: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, borderBottom: '1px solid rgba(255,255,255,0.3)', pb: 0.5 }}>
                                      {item.sous_traitant} - Détail
                                    </Typography>
                                    {item.chantiersDetails && item.chantiersDetails.length > 0 && (
                                      <Box sx={{ mb: 1 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', mb: 0.5 }}>
                                          Par chantier :
                                        </Typography>
                                        {item.chantiersDetails.map((ch, idx) => (
                                          <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', pl: 1 }}>
                                            <span>{ch.chantier_name}</span>
                                            <span style={{ marginLeft: 8, fontWeight: 500 }}>{formatNumber(ch.a_payer)} €</span>
                                          </Box>
                                        ))}
                                      </Box>
                                    )}
                                    <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.3)', pt: 0.5, mt: 0.5 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                        <span>Total planning :</span>
                                        <span style={{ fontWeight: 600 }}>{formatNumber(item.a_payer_labor_cost || item.a_payer)} €</span>
                                      </Box>
                                      {(item.ajustement_montant !== 0 && item.ajustement_montant !== undefined) && (
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: item.ajustement_montant > 0 ? '#4caf50' : '#f44336' }}>
                                          <span>Ajustement ({item.ajustement_description || 'Manuel'}) :</span>
                                          <span style={{ fontWeight: 600 }}>
                                            {item.ajustement_montant > 0 ? '+' : ''}{formatNumber(item.ajustement_montant)} €
                                          </span>
                                        </Box>
                                      )}
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, mt: 0.5, pt: 0.5, borderTop: '1px dashed rgba(255,255,255,0.3)' }}>
                                        <span>TOTAL À PAYER :</span>
                                        <span>{formatNumber(item.a_payer)} €</span>
                                      </Box>
                                    </Box>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic', opacity: 0.8 }}>
                                      Cliquez pour modifier l'ajustement
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <Typography
                                  sx={{
                                    fontSize: "0.8rem",
                                    color: item.ajustement_montant ? "rgba(27, 120, 188, 1)" : "text.primary",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    fontWeight: item.ajustement_montant ? 500 : 400,
                                    "&:hover": {
                                      backgroundColor: "rgba(27, 120, 188, 0.1)",
                                      borderRadius: "4px",
                                    },
                                  }}
                                  onClick={() => handleOpenAjustementModal(item)}
                                >
                                  {formatNumber(item.a_payer)} €
                                  {item.ajustement_montant !== 0 && item.ajustement_montant !== undefined && (
                                    <Typography 
                                      component="span" 
                                      sx={{ 
                                        fontSize: "0.65rem", 
                                        color: item.ajustement_montant > 0 ? "#4caf50" : "#f44336",
                                        ml: 0.5 
                                      }}
                                    >
                                      ({item.ajustement_montant > 0 ? '+' : ''}{formatNumber(item.ajustement_montant)})
                                    </Typography>
                                  )}
                                </Typography>
                              </Tooltip>
                            ) : (
                              // Pour les autres lignes, affichage normal
                              <Typography
                                sx={{
                                  fontSize: "0.8rem",
                                  color: "text.primary",
                                  textAlign: "center",
                                }}
                              >
                                {formatNumber(item.a_payer)} €
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            {item.isAgentJournalier ? (
                              <TextField
                                type="number"
                                size="small"
                                value={item.paye || ""}
                                onChange={(e) => {
                                  const newValue = parseFloat(e.target.value) || 0;
                                  const key = item.keyAgentJournalier || `${row.mois}_${row.sous_traitant}_AGENT_JOURNALIER`;
                                  setEditedValuesPaye((prev) => ({
                                    ...prev,
                                    [key]: newValue,
                                  }));
                                  // Pour les agents journaliers, on ne peut pas sauvegarder directement car il n'y a pas de chantier_id unique
                                  // La sauvegarde devra être gérée différemment
                                }}
                                inputProps={{
                                  min: 0,
                                  step: 0.01,
                                  style: {
                                    textAlign: "center",
                                    fontSize: "0.75rem",
                                    padding: "4px 8px",
                                  },
                                }}
                                sx={{
                                  width: "100%",
                                  "& .MuiInputBase-root": {
                                    fontSize: "0.75rem",
                                    height: "32px",
                                  },
                                  "& .MuiOutlinedInput-root": {
                                    backgroundColor: "white",
                                    "&:hover": {
                                      borderColor: "rgba(27, 120, 188, 1)",
                                    },
                                  },
                                }}
                              />
                            ) : (
                              <TextField
                                type="number"
                                size="small"
                                value={item.paye || ""}
                                onClick={() =>
                                  handleOpenDatePaiementModal(
                                    row.mois,
                                    row.sous_traitant,
                                    item.chantier_id
                                  )
                                }
                                InputProps={{
                                  readOnly: true,
                                }}
                                inputProps={{
                                  min: 0,
                                  step: 0.01,
                                  style: {
                                    textAlign: "center",
                                    fontSize: "0.75rem",
                                    padding: "4px 8px",
                                    cursor: "pointer",
                                    textDecoration: "none",
                                  },
                                }}
                                sx={{
                                  width: "100%",
                                  "& .MuiInputBase-root": {
                                    fontSize: "0.75rem",
                                    height: "32px",
                                    cursor: "pointer",
                                  },
                                  "& .MuiOutlinedInput-root": {
                                    backgroundColor: "white",
                                    "&:hover": {
                                      borderColor: "rgba(27, 120, 188, 1)",
                                    },
                                  },
                                  "& input": {
                                    textDecoration: "none !important",
                                  },
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell 
                            sx={{ 
                              ...commonBodyCellStyle,
                              position: "relative",
                              overflow: "visible", // Permettre au bouton de sortir de la div
                              "&:hover .add-facture-btn": {
                                opacity: 1,
                                visibility: "visible",
                              }
                            }}
                          >
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8, alignItems: "stretch" }}>
                              {item.factures && item.factures.length > 0 ? (
                                item.factures.map((facture, idx) => {
                                  const isPaid = facture.payee || false;
                                  return (
                                    <Box
                                      key={idx}
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        backgroundColor: isPaid 
                                          ? "rgba(46, 125, 50, 0.1)" // Vert clair si payée
                                          : "rgba(211, 47, 47, 0.1)", // Rouge clair si non payée
                                        border: isPaid
                                          ? "1px solid rgba(46, 125, 50, 0.3)"
                                          : "1px solid rgba(211, 47, 47, 0.3)",
                                        transition: "all 0.2s ease",
                                        "&:hover": {
                                          backgroundColor: isPaid
                                            ? "rgba(46, 125, 50, 0.15)"
                                            : "rgba(211, 47, 47, 0.15)",
                                          borderColor: isPaid
                                            ? "rgba(46, 125, 50, 0.5)"
                                            : "rgba(211, 47, 47, 0.5)",
                                        },
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          flex: 1,
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 0.2,
                                          cursor: "pointer",
                                          minWidth: 0,
                                        }}
                                        onClick={() => handleOpenFactureModal(row.mois, row.sous_traitant, item.isAgentJournalier ? 0 : item.chantier_id, idx)}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: "0.75rem",
                                            fontWeight: 500,
                                            color: isPaid 
                                              ? "rgba(46, 125, 50, 1)" // Vert foncé si payée
                                              : "rgba(211, 47, 47, 1)", // Rouge foncé si non payée
                                            lineHeight: 1.2,
                                          }}
                                        >
                                          {facture.numero_facture || facture}
                                        </Typography>
                                        {facture.montant_facture ? (
                                          <Typography
                                            sx={{
                                              fontSize: "0.7rem",
                                              color: isPaid 
                                                ? "rgba(46, 125, 50, 0.8)"
                                                : "text.secondary",
                                              lineHeight: 1.2,
                                            }}
                                          >
                                            {formatNumber(facture.montant_facture)} €
                                          </Typography>
                                        ) : null}
                                      </Box>
                                      {isPaid ? (
                                        <CheckCircleIcon
                                          sx={{
                                            fontSize: "1.2rem",
                                            color: "rgba(46, 125, 50, 1)",
                                            flexShrink: 0,
                                          }}
                                        />
                                      ) : (
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkFactureAsPaid(row.mois, row.sous_traitant, item.isAgentJournalier ? 0 : item.chantier_id, idx);
                                          }}
                                          sx={{
                                            padding: "4px",
                                            color: "rgba(211, 47, 47, 0.7)",
                                            "&:hover": {
                                              backgroundColor: "rgba(211, 47, 47, 0.1)",
                                              color: "rgba(211, 47, 47, 1)",
                                            },
                                          }}
                                          title="Marquer comme payée"
                                        >
                                          <CheckCircleIcon sx={{ fontSize: "1.2rem" }} />
                                        </IconButton>
                                      )}
                                    </Box>
                                  );
                                })
                              ) : (
                                <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", fontStyle: "italic", textAlign: "center", py: 1 }}>
                                  -
                                </Typography>
                              )}
                              <Box
                                className="add-facture-btn"
                                sx={{
                                  position: "absolute",
                                  bottom: 4,
                                  right: -15, // 5px sur la droite, sort de la div
                                  opacity: 0,
                                  visibility: "hidden",
                                  transition: "all 0.2s ease",
                                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                                  borderRadius: "4px",
                                  border: "1px solid rgba(27, 120, 188, 0.2)",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                  zIndex: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenFactureModal(row.mois, row.sous_traitant, item.isAgentJournalier ? 0 : item.chantier_id, null)}
                                  sx={{
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    color: "rgba(27, 120, 188, 0.8)",
                                    "&:hover": {
                                      color: "rgba(27, 120, 188, 1)",
                                      backgroundColor: "rgba(27, 120, 188, 0.1)",
                                    },
                                  }}
                                  title="Ajouter une facture"
                                >
                                  <AddCircleOutlineIcon sx={{ fontSize: "1rem" }} />
                                </IconButton>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                color:
                                  item.ecart > 0 ? "#d32f2f" : "#2e7d32",
                                fontWeight: item.ecart !== 0 ? "bold" : "normal",
                              }}
                            >
                              {formatNumber(item.ecart)} €
                            </Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            {item.date_envoi ? (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: "rgba(27, 120, 188, 1)",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                }}
                                onClick={() => handleOpenDateEnvoiModal(row.mois, row.sous_traitant, item.chantier_id)}
                              >
                                {new Date(item.date_envoi).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </Typography>
                            ) : (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  fontStyle: "italic",
                                  cursor: "pointer",
                                }}
                                onClick={() => handleOpenDateEnvoiModal(row.mois, row.sous_traitant, item.chantier_id)}
                              >
                                Cliquer pour ajouter
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            {item.date_paiement_prevue ? (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: "rgba(27, 120, 188, 1)",
                                  fontWeight: 500,
                                }}
                              >
                                {new Date(item.date_paiement_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </Typography>
                            ) : (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  fontStyle: "italic",
                                }}
                              >
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            {item.isAgentJournalier ? (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  fontStyle: "italic",
                                }}
                              >
                                -
                              </Typography>
                            ) : (
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "center" }}>
                                {/* ✅ Ne pas afficher la date principale si des factures sont payées */}
                                {(() => {
                                  const hasFacturesPayees = item.factures && item.factures.some(f => f.payee && f.date_paiement_facture);
                                  
                                  // Si des factures sont payées, ne pas afficher la date principale
                                  if (hasFacturesPayees) {
                                    return null;
                                  }
                                  
                                  // Sinon, afficher la date principale normalement
                                  return item.date_paiement && item.date_paiement !== null && item.date_paiement !== "" ? (
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        color: "rgba(27, 120, 188, 1)",
                                        fontWeight: 500,
                                        cursor: "pointer",
                                      }}
                                      onClick={() => {
                                        setCurrentPaiement({
                                          mois: row.mois,
                                          sous_traitant: row.sous_traitant,
                                          chantierId: item.chantier_id,
                                          montantPaye: item.paye,
                                          datePaiement: item.date_paiement,
                                          sourceType: item.source_type || null,
                                          agencyExpenseId: item.agency_expense_id || null
                                        });
                                        setDatePaiementModalOpen(true);
                                      }}
                                    >
                                      {(() => {
                                        try {
                                          const date = new Date(item.date_paiement);
                                          if (isNaN(date.getTime())) {
                                            return item.date_paiement;
                                          }
                                          return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                        } catch (e) {
                                          return item.date_paiement;
                                        }
                                      })()}
                                    </Typography>
                                  ) : (
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        color: "text.secondary",
                                        fontStyle: "italic",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => {
                                        setCurrentPaiement({
                                          mois: row.mois,
                                          sous_traitant: row.sous_traitant,
                                          chantierId: item.chantier_id,
                                          montantPaye: item.paye,
                                          datePaiement: null,
                                          sourceType: item.source_type || null,
                                          agencyExpenseId: item.agency_expense_id || null
                                        });
                                        setDatePaiementModalOpen(true);
                                      }}
                                    >
                                      Non renseignée
                                    </Typography>
                                  );
                                })()}
                                
                                {/* Afficher les dates de paiement des factures en dessous */}
                                {item.factures && item.factures.some(f => f.payee && f.date_paiement_facture) ? (
                                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3, width: "100%", marginTop: "4px" }}>
                                    {item.factures
                                      .filter(f => f.payee && f.date_paiement_facture)
                                      .map((facture, idx) => {
                                        const datePaiement = facture.date_paiement_facture;
                                        // ✅ Pour AgencyExpenseMonth et facture_sous_traitant, afficher TOUTES les factures payées
                                        // Pour les autres, afficher seulement si la date est différente
                                        const isDifferentFromMain = !item.date_paiement || datePaiement !== item.date_paiement;
                                        const isAgencyExpense = item.source_type === 'agency_expense';
                                        const isFactureSousTraitant = item.source_type === 'facture_sous_traitant';
                                        // Toujours afficher pour AgencyExpense et FactureSousTraitant
                                        if (!isAgencyExpense && !isFactureSousTraitant && !isDifferentFromMain) return null;
                                        
                                        // ✅ Pour AgencyExpenseMonth et FactureSousTraitant, mettre en évidence la facture avec la date la plus récente
                                        const isLatestDate = (item.source_type === 'agency_expense' || item.source_type === 'facture_sous_traitant') && datePaiement === item.date_paiement;
                                        
                                        return (
                                          <Box
                                            key={facture.id || idx}
                                            sx={{
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: 0.1,
                                              padding: "2px 4px",
                                              borderRadius: "3px",
                                              backgroundColor: isLatestDate ? "rgba(46, 125, 50, 0.2)" : "rgba(46, 125, 50, 0.1)",
                                              border: isLatestDate ? "1px solid rgba(46, 125, 50, 0.6)" : "1px solid rgba(46, 125, 50, 0.3)",
                                            }}
                                          >
                                            <Typography
                                              sx={{
                                                fontSize: "0.65rem",
                                                color: "rgba(46, 125, 50, 0.9)",
                                                fontWeight: isLatestDate ? 600 : 500,
                                              }}
                                            >
                                              {facture.numero_facture || `Facture ${idx + 1}`}
                                            </Typography>
                                            <Typography
                                              sx={{
                                                fontSize: "0.7rem",
                                                color: "rgba(46, 125, 50, 1)",
                                                fontWeight: isLatestDate ? 600 : 500,
                                              }}
                                            >
                                              {datePaiement ? new Date(datePaiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                            </Typography>
                                          </Box>
                                        );
                                      })}
                                  </Box>
                                ) : null}
                            </Box>
                            )}
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            {item.ecart_paiement_reel !== null && item.ecart_paiement_reel !== undefined ? (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: "bold",
                                  color: item.ecart_paiement_reel > 0 
                                    ? "rgba(211, 47, 47, 1)" // Rouge si retard (positif)
                                    : item.ecart_paiement_reel < 0
                                    ? "rgba(46, 125, 50, 1)" // Vert si avance (négatif)
                                    : "rgba(46, 125, 50, 1)", // Vert si à temps (nul)
                                }}
                              >
                                {item.ecart_paiement_reel > 0 ? '+' : ''}{item.ecart_paiement_reel} j
                              </Typography>
                            ) : (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  fontStyle: "italic",
                                }}
                              >
                                -
                              </Typography>
                            )}
                          </TableCell>
                          {isFirstRowOfSousTraitant ? (() => {
                            const isPayeComplet = totalSousTraitant && 
                              Math.abs(totalSousTraitant.totalAPayer - totalSousTraitant.totalPaye) < 0.01; // Tolérance pour les arrondis
                            
                            // Pas d'alternance : vert si payé complet, bleu sinon
                            const totalBackgroundColor = isPayeComplet 
                              ? "rgba(46, 125, 50, 0.2)" // Vert clair si payé complet
                              : "rgba(27, 120, 188, 0.1)"; // Bleu si pas payé complet (pas d'alternance)
                            
                            return (
                              <TableCell
                                rowSpan={rowSpanSousTraitant}
                                onClick={() => handleFillAllSousTraitantMois(row.mois, row.sous_traitant)}
                                sx={{
                                  ...commonBodyCellStyle,
                                  verticalAlign: "middle",
                                  textAlign: "center",
                                  fontWeight: "bold",
                                  backgroundColor: totalBackgroundColor,
                                  cursor: "pointer",
                                  "&:hover": {
                                    backgroundColor: isPayeComplet 
                                      ? "rgba(46, 125, 50, 0.3)" 
                                      : "rgba(27, 120, 188, 0.2)",
                                  },
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: "0.85rem",
                                    fontWeight: "bold",
                                    color: isPayeComplet 
                                      ? "rgba(46, 125, 50, 1)" // Vert foncé si payé complet
                                      : "rgba(27, 120, 188, 1)", // Bleu par défaut
                                  }}
                                >
                                  {formatNumber(totalSousTraitant.totalAPayer)} €
                                </Typography>
                              </TableCell>
                            );
                          })() : null}
                        </TableRow>
                      );
                    }
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Récapitulatif par sous-traitant - À créer plus tard */}
          {/* {tableRows.length > 0 && (
            <RecapSousTraitant
              data={data}
              selectedAnnee={selectedAnnee}
              organized={organized}
              moisSorted={moisSorted}
            />
          )} */}

          {/* Modal pour ajouter/modifier une facture */}
          <FactureModal
            open={factureModalOpen}
            onClose={handleCloseFactureModal}
            onSave={handleSaveFactureModal}
            onDelete={currentFacture?.factureIndex !== null ? () => {
              handleRemoveFacture(
                currentFacture.mois,
                currentFacture.sous_traitant,
                currentFacture.chantierId,
                currentFacture.factureIndex
              );
              handleCloseFactureModal();
            } : null}
            factureData={factureModalData}
            onFactureDataChange={setFactureModalData}
            isEditMode={currentFacture?.factureIndex !== null}
          />
          
          {/* Modal pour saisir/modifier le montant payé OU le montant à payer */}
          <DatePaiementModal
            open={datePaiementModalOpen}
            onClose={() => {
              setDatePaiementModalOpen(false);
              setCurrentPaiement(null);
            }}
            onSave={currentPaiement?.isMontantAPayer ? handleSaveMontantAPayer : handleSaveDatePaiement}
            datePaiement={currentPaiement?.datePaiement || null}
            montantPaye={currentPaiement?.montantPaye || 0}
            isMontantAPayer={currentPaiement?.isMontantAPayer || false}
          />
          
          {/* Modal pour saisir/modifier la date d'envoi */}
          <DateEnvoiModal
            open={dateEnvoiModalOpen}
            onClose={() => {
              setDateEnvoiModalOpen(false);
              setCurrentEnvoi(null);
            }}
            onSave={handleSaveDateEnvoi}
            dateEnvoi={currentEnvoi?.dateEnvoi || null}
          />

          {/* Modal pour saisir la date de paiement de la facture */}
          <DatePaiementFactureModal
            open={datePaiementFactureModalOpen}
            onClose={() => {
              setDatePaiementFactureModalOpen(false);
              setCurrentFacturePaiement(null);
            }}
            onSave={handleSaveFacturePaiement}
            datePaiement={currentFacturePaiement ? (() => {
              const key = `${currentFacturePaiement.mois}_${currentFacturePaiement.sous_traitant}_${currentFacturePaiement.chantierId}`;
              const factures = editedFactures[key] || [];
              const facture = factures[currentFacturePaiement.factureIndex];
              return facture?.date_paiement_facture || null;
            })() : null}
          />

          {/* Modal de confirmation pour le remplissage automatique */}
          <Dialog
            open={confirmFillModalOpen}
            onClose={() => {
              setConfirmFillModalOpen(false);
              setPendingFillAction(null);
            }}
          >
            <DialogTitle>
              Confirmer le remplissage automatique
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                {pendingFillAction && (() => {
                  const [moisNum, annee2digits] = pendingFillAction.mois.split("/").map(Number);
                  const moisName = getMoisName(moisNum);
                  const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
                  const lignesCount = data.filter(d => 
                    d.mois === pendingFillAction.mois && 
                    d.sous_traitant === pendingFillAction.sous_traitant
                  ).length;
                  
                  return (
                    <>
                      Êtes-vous sûr de vouloir remplir automatiquement toutes les lignes du sous-traitant <strong>{pendingFillAction.sous_traitant}</strong> pour le mois de <strong>{moisName} {anneeComplete}</strong> ?
                      <br /><br />
                      Cette action va :
                      <ul style={{ marginTop: "8px", marginBottom: "8px" }}>
                        <li>Remplir le montant payé avec le montant à payer pour chaque ligne ({lignesCount} ligne{lignesCount > 1 ? 's' : ''})</li>
                        <li>Définir la date de paiement à aujourd'hui</li>
                      </ul>
                      Cette action est irréversible.
                    </>
                  );
                })()}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setConfirmFillModalOpen(false);
                  setPendingFillAction(null);
                }}
                color="secondary"
              >
                Annuler
              </Button>
              <Button
                onClick={executeFillAllSousTraitantMois}
                color="primary"
                variant="contained"
                autoFocus
              >
                Confirmer
              </Button>
            </DialogActions>
          </Dialog>

          {/* Modal d'ajustement pour les agents journaliers */}
          <Dialog
            open={ajustementModalOpen}
            onClose={handleCloseAjustementModal}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle sx={{ borderBottom: '1px solid #e0e0e0', pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Ajustement - {currentAjustement?.sous_traitant}
                </Typography>
                <IconButton onClick={handleCloseAjustementModal} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {currentAjustement && `${String(currentAjustement.mois).padStart(2, '0')}/${currentAjustement.annee}`}
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {/* Détail par chantier */}
              {currentAjustement?.chantiersDetails && currentAjustement.chantiersDetails.length > 0 && (
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Détail par chantier
                  </Typography>
                  {currentAjustement.chantiersDetails.map((ch, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">{ch.chantier_name}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatNumber(ch.a_payer)} €
                      </Typography>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, mt: 1, borderTop: '1px solid #ddd' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Total planning</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatNumber(currentAjustement.a_payer_labor_cost)} €
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Formulaire d'ajustement */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Ajustement manuel
              </Typography>
              
              <TextField
                label="Montant de l'ajustement (€)"
                type="number"
                fullWidth
                value={ajustementFormData.montant}
                onChange={(e) => setAjustementFormData(prev => ({ ...prev, montant: e.target.value }))}
                placeholder="Ex: 60 pour ajouter, -50 pour déduire"
                sx={{ mb: 2 }}
                inputProps={{ step: 0.01 }}
                helperText="Positif pour ajouter (ex: gasoil), négatif pour déduire"
              />
              
              <TextField
                label="Description"
                fullWidth
                value={ajustementFormData.description}
                onChange={(e) => setAjustementFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Gasoil, Prime, Déduction..."
                sx={{ mb: 2 }}
              />
              
              {/* Récapitulatif */}
              <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Total planning :</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatNumber(currentAjustement?.a_payer_labor_cost || 0)} €
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, color: (parseFloat(ajustementFormData.montant) || 0) >= 0 ? '#2e7d32' : '#c62828' }}>
                  <Typography variant="body2">
                    Ajustement {ajustementFormData.description ? `(${ajustementFormData.description})` : ''} :
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {(parseFloat(ajustementFormData.montant) || 0) >= 0 ? '+' : ''}{formatNumber(parseFloat(ajustementFormData.montant) || 0)} €
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, mt: 1, borderTop: '1px dashed #90caf9' }}>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>TOTAL À PAYER :</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {formatNumber((currentAjustement?.a_payer_labor_cost || 0) + (parseFloat(ajustementFormData.montant) || 0))} €
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
              {currentAjustement?.ajustement_id && (
                <Button
                  onClick={handleDeleteAjustement}
                  color="error"
                  disabled={savingAjustement}
                  sx={{ mr: 'auto' }}
                >
                  Supprimer l'ajustement
                </Button>
              )}
              <Button onClick={handleCloseAjustementModal} color="secondary">
                Annuler
              </Button>
              <Button
                onClick={handleSaveAjustement}
                color="primary"
                variant="contained"
                disabled={savingAjustement}
              >
                {savingAjustement ? <CircularProgress size={20} /> : 'Sauvegarder'}
              </Button>
            </DialogActions>
          </Dialog>

          {saveSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Paiements sauvegardés avec succès !
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </>
      )}
    </Box>
  );
};

export default TableauSousTraitant;

