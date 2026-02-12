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
} from "@mui/material";
import FactureModal from "./FactureModal";
import DatePaiementModal from "./DatePaiementModal";
import DateEnvoiModal from "./DateEnvoiModal";
import DatePaiementFactureModal from "./DatePaiementFactureModal";
import RecapFournisseur from "./RecapFournisseur";
import { Add as AddIcon, Close as CloseIcon, CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import axios from "axios";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { FaSync } from "react-icons/fa";

const TableauFournisseur = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editedValuesPaye, setEditedValuesPaye] = useState({}); // {mois_fournisseur_chantierId: value} - seul champ éditable (montant payé)
  const [editedFactures, setEditedFactures] = useState({}); // {mois_fournisseur_chantierId: [{id, numero_facture, montant_facture}, ...]}
  const [selectedAnnee, setSelectedAnnee] = useState("");
  
  // État pour le modal de facture
  const [factureModalOpen, setFactureModalOpen] = useState(false);
  const [currentFacture, setCurrentFacture] = useState(null); // {mois, fournisseur, chantierId, factureIndex}
  const [factureModalData, setFactureModalData] = useState({ numero: "", montant: "" });
  
  // État pour le modal de date de paiement
  const [datePaiementModalOpen, setDatePaiementModalOpen] = useState(false);
  const [currentPaiement, setCurrentPaiement] = useState(null); // {mois, fournisseur, chantierId, montantPaye, datePaiement}
  
  // État pour le modal de date d'envoi
  const [dateEnvoiModalOpen, setDateEnvoiModalOpen] = useState(false);
  const [currentEnvoi, setCurrentEnvoi] = useState(null); // {mois, fournisseur, chantierId, dateEnvoi}
  
  // État pour le modal de confirmation de remplissage automatique
  const [confirmFillModalOpen, setConfirmFillModalOpen] = useState(false);
  const [pendingFillAction, setPendingFillAction] = useState(null); // {mois, fournisseur}
  const [fillDatePaiement, setFillDatePaiement] = useState(new Date().toISOString().split('T')[0]); // Date de paiement pour le remplissage
  
  // État pour le modal de date de paiement de facture
  const [datePaiementFactureModalOpen, setDatePaiementFactureModalOpen] = useState(false);
  const [currentFacturePaiement, setCurrentFacturePaiement] = useState(null); // {mois, fournisseur, chantierId, factureIndex}
  
  // Timer pour la sauvegarde automatique
  const saveTimerRef = useRef(null);

  // Récupérer les données
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/api/tableau-fournisseur-global/");
      setData(res.data);
      
      // Initialiser editedValues avec les valeurs actuelles (seulement montant payé - seul champ éditable)
      const initialValuesPaye = {};
      const initialFactures = {};
      res.data.forEach((item) => {
        const key = `${item.mois}_${item.fournisseur}_${item.chantier_id}`;
        initialValuesPaye[key] = item.paye;
        // Initialiser les factures (liste d'objets avec id, numero_facture, montant_facture, payee, date_paiement_facture)
        initialFactures[key] = (item.factures || []).map(f => ({
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
  const savePaiement = useCallback(async (mois, fournisseur, chantierId, montantPaye, factures = null, datePaiement = null, dateEnvoi = null) => {
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
        
        // Récupérer le montant à payer actuel depuis les données (non modifiable par l'utilisateur)
        const currentData = data.find(d => 
          d.mois === mois && 
          d.fournisseur === fournisseur && 
          d.chantier_id === chantierId
        );
        const montantAPayer = currentData?.a_payer || 0;
        
        // Récupérer les factures si fournies, sinon utiliser celles de editedFactures
        const key = `${mois}_${fournisseur}_${chantierId}`;
        const facturesList = factures !== null ? factures : (editedFactures[key] || []);
        
        // Les montants saisis par l'utilisateur sont les montants PAYÉS (seul champ éditable)
        const payload = [{
          fournisseur: fournisseur,
          mois: moisNum,
          annee: anneeComplete,
          montant: montantPaye || 0, // Montant saisi par l'utilisateur = montant payé
          montant_a_payer: montantAPayer, // Montant à payer non modifié
          date_paiement: datePaiement !== undefined ? datePaiement : (currentData?.date_paiement || null), // Date de paiement (peut être null pour supprimer)
          date_envoi: dateEnvoi !== undefined ? (dateEnvoi || null) : (currentData?.date_envoi || null), // Date d'envoi
          factures: facturesList.filter(f => {
            // Filtrer les factures vides (objet ou string)
            if (typeof f === 'object' && f !== null) {
              return f.numero_facture && String(f.numero_facture).trim();
            }
            return f && String(f).trim();
          }).map(f => {
            // Normaliser le format (objet avec numero_facture, montant_facture, payee, date_paiement_facture)
            if (typeof f === 'object' && f !== null) {
              return {
                numero_facture: String(f.numero_facture || '').trim(),
                montant_facture: parseFloat(f.montant_facture) || 0,
                payee: f.payee || false,
                date_paiement_facture: f.date_paiement_facture || null
              };
            }
            return {
              numero_facture: String(f).trim(),
              montant_facture: 0,
              payee: false,
              date_paiement_facture: null
            };
          }),
        }];

        const response = await axios.post(
          `/api/chantier/${chantierId}/paiements-materiel/`,
          payload
        );

        setSaveSuccess(true);
        
        // Mettre à jour l'état local au lieu de recharger toutes les données
        if (response.data && response.data.length > 0) {
          const updatedPaiement = response.data[0];
          const annee2digits = anneeComplete.toString().slice(-2);
          const moisKey = `${moisNum.toString().padStart(2, '0')}/${annee2digits}`;
          
          // Mettre à jour les factures dans editedFactures
          if (updatedPaiement.factures && updatedPaiement.factures.length > 0) {
            setEditedFactures((prev) => {
              const updatedFactures = (updatedPaiement.factures || []).map(f => ({
                id: f.id || null,
                numero_facture: f.numero_facture || f,
                montant_facture: f.montant_facture || 0,
                payee: f.payee || false,
                date_paiement_facture: f.date_paiement_facture || null
              }));
              return { ...prev, [key]: updatedFactures };
            });
          }
          
          setData((prevData) => {
            return prevData.map((item) => {
              if (
                item.mois === moisKey &&
                item.fournisseur === fournisseur &&
                item.chantier_id === chantierId
              ) {
                // Mapper les factures avec les champs payee et date_paiement_facture
                const facturesMapped = (updatedPaiement.factures || []).map(f => ({
                  id: f.id || null,
                  numero_facture: f.numero_facture || f,
                  montant_facture: f.montant_facture || 0,
                  payee: f.payee || false,
                  date_paiement_facture: f.date_paiement_facture || null
                }));
                
                const aPayerUpdated = getAPayerFromResponse(updatedPaiement, item.a_payer);
                const payeUpdated = Number(updatedPaiement.montant) || 0;
                return {
                  ...item,
                  paye: payeUpdated,
                  a_payer: aPayerUpdated,
                  ecart: aPayerUpdated - payeUpdated,
                  factures: facturesMapped.length > 0 ? facturesMapped : (item.factures || []),
                  date_paiement: updatedPaiement.date_paiement !== undefined ? updatedPaiement.date_paiement : item.date_paiement,
                  date_envoi: updatedPaiement.date_envoi !== undefined ? updatedPaiement.date_envoi : item.date_envoi,
                  date_paiement_prevue: updatedPaiement.date_paiement_prevue !== undefined ? updatedPaiement.date_paiement_prevue : item.date_paiement_prevue,
                  ecart_paiement_reel: updatedPaiement.ecart_paiement_reel !== undefined ? updatedPaiement.ecart_paiement_reel : item.ecart_paiement_reel,
                  date_modification: updatedPaiement.date_modification !== undefined ? updatedPaiement.date_modification : item.date_modification,
                  historique_modifications: updatedPaiement.historique_modifications !== undefined ? updatedPaiement.historique_modifications : item.historique_modifications,
                };
              }
              return item;
            });
          });
        }
        
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
  }, [data, editedFactures]);

  // Ouvrir le modal pour saisir/modifier le montant payé et la date
  const handleOpenDatePaiementModal = (mois, fournisseur, chantierId) => {
    const currentData = data.find(d => 
      d.mois === mois && 
      d.fournisseur === fournisseur && 
      d.chantier_id === chantierId
    );
    
    setCurrentPaiement({
      mois,
      fournisseur,
      chantierId,
      montantPaye: currentData?.a_payer || 0, // Préremplir avec le montant à payer
      datePaiement: currentData?.date_paiement || null
    });
    setDatePaiementModalOpen(true);
  };
  
  // Gérer la sauvegarde depuis le modal de date de paiement
  const handleSaveDatePaiement = (montantPaye, datePaiement) => {
    if (currentPaiement) {
      const { mois, fournisseur, chantierId } = currentPaiement;
      const key = `${mois}_${fournisseur}_${chantierId}`;
      
      // Mettre à jour l'état local
      setEditedValuesPaye((prev) => ({
        ...prev,
        [key]: montantPaye,
      }));
      
      // Sauvegarder avec la date de paiement
      savePaiement(mois, fournisseur, chantierId, montantPaye, null, datePaiement);
    }
    setDatePaiementModalOpen(false);
    setCurrentPaiement(null);
  };

  // Gérer l'annulation du paiement depuis le modal
  const handleCancelDatePaiement = async () => {
    if (!currentPaiement) {
      return;
    }

    const { mois, fournisseur, chantierId } = currentPaiement;
    const key = `${mois}_${fournisseur}_${chantierId}`;
    
    // Annuler le timer de debounce s'il existe
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const [moisNum, annee2digits] = mois.split("/").map(Number);
      const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
      
      const currentData = data.find(d => 
        d.mois === mois && 
        d.fournisseur === fournisseur && 
        d.chantier_id === chantierId
      );
      const montantAPayer = currentData?.a_payer || 0;
      
      // Récupérer les factures actuelles et les marquer comme non payées
      const facturesList = editedFactures[key] !== undefined 
        ? editedFactures[key] 
        : (currentData?.factures || []).map(f => ({
            id: f.id || null,
            numero_facture: f.numero_facture || f,
            montant_facture: f.montant_facture || 0,
            payee: f.payee || false,
            date_paiement_facture: f.date_paiement_facture || null
          }));

      // Marquer toutes les factures comme non payées et supprimer leurs dates de paiement
      const facturesNonPayees = facturesList.map(f => ({
        ...f,
        payee: false,
        date_paiement_facture: null
      }));

      // Préparer le payload avec montant à 0 et date_paiement explicitement null
      const payload = [{
        fournisseur: fournisseur,
        mois: moisNum,
        annee: anneeComplete,
        montant: 0,
        montant_a_payer: montantAPayer,
        date_paiement: null, // Explicitement null pour supprimer
        date_envoi: currentData?.date_envoi || null,
        factures: facturesNonPayees.filter(f => {
          if (typeof f === 'object' && f !== null) {
            return f.numero_facture && String(f.numero_facture).trim();
          }
          return f && String(f).trim();
        }).map(f => {
          if (typeof f === 'object' && f !== null) {
            return {
              numero_facture: String(f.numero_facture || '').trim(),
              montant_facture: parseFloat(f.montant_facture) || 0,
              payee: false, // Toutes les factures non payées
              date_paiement_facture: null // Supprimer les dates de paiement des factures
            };
          }
          return {
            numero_facture: String(f).trim(),
            montant_facture: 0,
            payee: false,
            date_paiement_facture: null
          };
        }),
      }];

      const response = await axios.post(
        `/api/chantier/${chantierId}/paiements-materiel/`,
        payload
      );

      // Mettre à jour l'état local
      setEditedValuesPaye((prev) => ({
        ...prev,
        [key]: 0,
      }));

      // Mettre à jour les factures dans editedFactures (marquer comme non payées)
      setEditedFactures((prev) => ({
        ...prev,
        [key]: facturesNonPayees.map(f => ({
          ...f,
          payee: false,
          date_paiement_facture: null
        }))
      }));

      if (response.data && response.data.length > 0) {
        const updatedPaiement = response.data[0];
        const annee2digits = anneeComplete.toString().slice(-2);
        const moisKey = `${moisNum.toString().padStart(2, '0')}/${annee2digits}`;
        
        setData((prevData) => {
          return prevData.map((item) => {
            if (
              item.mois === moisKey &&
              item.fournisseur === fournisseur &&
              item.chantier_id === chantierId
            ) {
              const facturesMapped = (updatedPaiement.factures || []).map(f => ({
                id: f.id || null,
                numero_facture: f.numero_facture || f,
                montant_facture: f.montant_facture || 0,
                payee: f.payee || false,
                date_paiement_facture: f.date_paiement_facture || null
              }));
              
              const aPayerUpdated = getAPayerFromResponse(updatedPaiement, item.a_payer);
              return {
                ...item,
                paye: 0,
                a_payer: aPayerUpdated,
                ecart: aPayerUpdated - 0,
                factures: facturesMapped.length > 0 ? facturesMapped : (item.factures || []),
                date_paiement: updatedPaiement.date_paiement !== undefined ? updatedPaiement.date_paiement : null,
                date_envoi: updatedPaiement.date_envoi !== undefined ? updatedPaiement.date_envoi : item.date_envoi,
                date_paiement_prevue: updatedPaiement.date_paiement_prevue !== undefined ? updatedPaiement.date_paiement_prevue : item.date_paiement_prevue,
                ecart_paiement_reel: updatedPaiement.ecart_paiement_reel !== undefined ? updatedPaiement.ecart_paiement_reel : item.ecart_paiement_reel,
                date_modification: updatedPaiement.date_modification !== undefined ? updatedPaiement.date_modification : item.date_modification,
                historique_modifications: updatedPaiement.historique_modifications !== undefined ? updatedPaiement.historique_modifications : item.historique_modifications,
              };
            }
            return item;
          });
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      setError("Erreur lors de l'annulation du paiement.");
      console.error(err);
    } finally {
      setSaving(false);
      setDatePaiementModalOpen(false);
      setCurrentPaiement(null);
    }
  };
  
  // Ouvrir le modal pour saisir/modifier la date d'envoi
  const handleOpenDateEnvoiModal = (mois, fournisseur, chantierId) => {
    const currentData = data.find(d => 
      d.mois === mois && 
      d.fournisseur === fournisseur && 
      d.chantier_id === chantierId
    );
    
    setCurrentEnvoi({
      mois,
      fournisseur,
      chantierId,
      dateEnvoi: currentData?.date_envoi || null
    });
    setDateEnvoiModalOpen(true);
  };
  
  // Gérer la sauvegarde depuis le modal de date d'envoi
  const handleSaveDateEnvoi = (dateEnvoi) => {
    if (currentEnvoi) {
      const { mois, fournisseur, chantierId } = currentEnvoi;
      const currentData = data.find(d => 
        d.mois === mois && 
        d.fournisseur === fournisseur && 
        d.chantier_id === chantierId
      );
      
      // Sauvegarder avec la date d'envoi (le backend calculera automatiquement date_paiement_prevue)
      savePaiement(
        mois, 
        fournisseur, 
        chantierId, 
        currentData?.paye || 0, 
        null, 
        currentData?.date_paiement || null,
        dateEnvoi
      );
    }
    setDateEnvoiModalOpen(false);
    setCurrentEnvoi(null);
  };

  // Ouvrir le modal de confirmation avant de remplir toutes les lignes
  const handleFillAllFournisseurMois = (mois, fournisseur) => {
    // Trouver toutes les lignes correspondant à ce mois et ce fournisseur
    const lignesFournisseur = data.filter(d => 
      d.mois === mois && 
      d.fournisseur === fournisseur
    );

    if (lignesFournisseur.length === 0) {
      return;
    }

    // Initialiser la date avec la date du jour
    setFillDatePaiement(new Date().toISOString().split('T')[0]);
    
    // Ouvrir le modal de confirmation
    setPendingFillAction({ mois, fournisseur });
    setConfirmFillModalOpen(true);
  };

  // Exécuter réellement le remplissage après confirmation
  const executeFillAllFournisseurMois = async () => {
    if (!pendingFillAction) {
      return;
    }

    const { mois, fournisseur } = pendingFillAction;
    
    // Vérifier que la date est renseignée
    if (!fillDatePaiement) {
      setError("Veuillez renseigner une date de paiement.");
      return;
    }
    
    // Fermer le modal
    setConfirmFillModalOpen(false);
    
    // Trouver toutes les lignes correspondant à ce mois et ce fournisseur
    const lignesFournisseur = data.filter(d => 
      d.mois === mois && 
      d.fournisseur === fournisseur
    );

    if (lignesFournisseur.length === 0) {
      setPendingFillAction(null);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const [moisNum, annee2digits] = mois.split("/").map(Number);
      const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
      const datePaiement = fillDatePaiement; // Utiliser la date saisie par l'utilisateur

      // Préparer toutes les mises à jour d'état
      const updatedValuesPaye = { ...editedValuesPaye };
      const updatedData = [...data];

      // Mettre à jour toutes les lignes
      const updatePromises = lignesFournisseur.map(async (ligne) => {
        const key = `${mois}_${fournisseur}_${ligne.chantier_id}`;
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
        
        // Marquer toutes les factures comme payées avec la date de paiement
        const facturesPayees = facturesList.map(f => ({
          ...f,
          payee: true,
          date_paiement_facture: datePaiement // Utiliser la date de paiement saisie
        }));
        
        // Préparer le payload
        const payload = [{
          fournisseur: fournisseur,
          mois: moisNum,
          annee: anneeComplete,
          montant: montantAPayer,
          montant_a_payer: montantAPayer,
          date_paiement: datePaiement,
          date_envoi: ligne.date_envoi || null,
          factures: facturesPayees.filter(f => {
            if (typeof f === 'object' && f !== null) {
              return f.numero_facture && String(f.numero_facture).trim();
            }
            return f && String(f).trim();
          }).map(f => {
            if (typeof f === 'object' && f !== null) {
              return {
                numero_facture: String(f.numero_facture || '').trim(),
                montant_facture: parseFloat(f.montant_facture) || 0,
                payee: true, // Toutes les factures marquées comme payées
                date_paiement_facture: datePaiement // Date de paiement pour toutes les factures
              };
            }
            return {
              numero_facture: String(f).trim(),
              montant_facture: 0,
              payee: true,
              date_paiement_facture: datePaiement
            };
          }),
        }];

        // Appel API direct (sans debounce)
        const response = await axios.post(
          `/api/chantier/${ligne.chantier_id}/paiements-materiel/`,
          payload
        );

        // Mettre à jour les données locales
        if (response.data && response.data.length > 0) {
          const updatedPaiement = response.data[0];
          const annee2digits = anneeComplete.toString().slice(-2);
          const moisKey = `${moisNum.toString().padStart(2, '0')}/${annee2digits}`;
          
          const dataIndex = updatedData.findIndex(item => 
            item.mois === moisKey &&
            item.fournisseur === fournisseur &&
            item.chantier_id === ligne.chantier_id
          );
          
          if (dataIndex !== -1) {
            const aPayerUpdated = getAPayerFromResponse(updatedPaiement, updatedData[dataIndex].a_payer);
            const payeUpdated = Number(updatedPaiement.montant) || 0;
            updatedData[dataIndex] = {
              ...updatedData[dataIndex],
              paye: payeUpdated,
              a_payer: aPayerUpdated,
              ecart: aPayerUpdated - payeUpdated,
              factures: updatedPaiement.factures || updatedData[dataIndex].factures || [],
              date_paiement: updatedPaiement.date_paiement || updatedData[dataIndex].date_paiement || null,
              date_envoi: updatedPaiement.date_envoi !== undefined ? updatedPaiement.date_envoi : updatedData[dataIndex].date_envoi,
              date_paiement_prevue: updatedPaiement.date_paiement_prevue !== undefined ? updatedPaiement.date_paiement_prevue : updatedData[dataIndex].date_paiement_prevue,
              ecart_paiement_reel: updatedPaiement.ecart_paiement_reel !== undefined ? updatedPaiement.ecart_paiement_reel : updatedData[dataIndex].ecart_paiement_reel,
              date_modification: updatedPaiement.date_modification || updatedData[dataIndex].date_modification || null,
              historique_modifications: updatedPaiement.historique_modifications || updatedData[dataIndex].historique_modifications || [],
            };
          }
        }
      });

      // Attendre que toutes les mises à jour soient terminées
      await Promise.all(updatePromises);

      // Mettre à jour les factures dans editedFactures (marquer comme payées)
      const updatedFactures = { ...editedFactures };
      lignesFournisseur.forEach((ligne) => {
        const key = `${mois}_${fournisseur}_${ligne.chantier_id}`;
        const facturesList = updatedFactures[key] !== undefined 
          ? updatedFactures[key] 
          : ((ligne.factures || []).map(f => ({
              id: f.id || null,
              numero_facture: f.numero_facture || f,
              montant_facture: f.montant_facture || 0,
              payee: f.payee || false,
              date_paiement_facture: f.date_paiement_facture || null
            })));
        
        updatedFactures[key] = facturesList.map(f => ({
          ...f,
          payee: true,
          date_paiement_facture: datePaiement
        }));
      });

      // Appliquer toutes les mises à jour d'état en une seule fois
      setEditedValuesPaye(updatedValuesPaye);
      setEditedFactures(updatedFactures);
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
      setFillDatePaiement(new Date().toISOString().split('T')[0]); // Réinitialiser la date
    }
  };

  // Fonction pour annuler/réinitialiser les paiements d'un fournisseur pour un mois
  const handleCancelAllFournisseurMois = async (mois, fournisseur) => {
    // Trouver toutes les lignes correspondant à ce mois et ce fournisseur
    const lignesFournisseur = data.filter(d => 
      d.mois === mois && 
      d.fournisseur === fournisseur
    );

    if (lignesFournisseur.length === 0) {
      return;
    }

    // Demander confirmation
    if (!window.confirm(`Êtes-vous sûr de vouloir annuler tous les paiements du fournisseur "${fournisseur}" pour le mois "${mois}" ? Cette action réinitialisera les montants payés à 0 et supprimera les dates de paiement.`)) {
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const [moisNum, annee2digits] = mois.split("/").map(Number);
      const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;

      // Préparer toutes les mises à jour d'état
      const updatedValuesPaye = { ...editedValuesPaye };
      const updatedData = [...data];

      // Mettre à jour toutes les lignes
      const updatePromises = lignesFournisseur.map(async (ligne) => {
        const key = `${mois}_${fournisseur}_${ligne.chantier_id}`;
        
        // Réinitialiser les valeurs payées à 0
        updatedValuesPaye[key] = 0;
        
        // Récupérer les factures actuelles et les marquer comme non payées
        const facturesList = editedFactures[key] !== undefined 
          ? editedFactures[key] 
          : ((ligne.factures || []).map(f => ({
              id: f.id || null,
              numero_facture: f.numero_facture || f,
              montant_facture: f.montant_facture || 0,
              payee: f.payee || false,
              date_paiement_facture: f.date_paiement_facture || null
            })));
        
        // Marquer toutes les factures comme non payées
        const facturesNonPayees = facturesList.map(f => ({
          ...f,
          payee: false,
          date_paiement_facture: null
        }));
        
        // Préparer le payload avec montant à 0 et date de paiement null
        const payload = [{
          fournisseur: fournisseur,
          mois: moisNum,
          annee: anneeComplete,
          montant: 0, // Réinitialiser à 0
          montant_a_payer: ligne.a_payer || 0, // Conserver le montant à payer
          date_paiement: null, // Supprimer la date de paiement
          date_envoi: ligne.date_envoi || null, // Conserver la date d'envoi
          factures: facturesNonPayees.filter(f => {
            if (typeof f === 'object' && f !== null) {
              return f.numero_facture && String(f.numero_facture).trim();
            }
            return f && String(f).trim();
          }).map(f => {
            if (typeof f === 'object' && f !== null) {
              return {
                numero_facture: String(f.numero_facture || '').trim(),
                montant_facture: parseFloat(f.montant_facture) || 0,
                payee: false, // Toutes les factures non payées
                date_paiement_facture: null // Supprimer les dates de paiement des factures
              };
            }
            return {
              numero_facture: String(f).trim(),
              montant_facture: 0,
              payee: false,
              date_paiement_facture: null
            };
          }),
        }];

        // Appel API direct (sans debounce)
        const response = await axios.post(
          `/api/chantier/${ligne.chantier_id}/paiements-materiel/`,
          payload
        );

        // Mettre à jour les données locales
        if (response.data && response.data.length > 0) {
          const updatedPaiement = response.data[0];
          const annee2digits = anneeComplete.toString().slice(-2);
          const moisKey = `${moisNum.toString().padStart(2, '0')}/${annee2digits}`;
          
          const dataIndex = updatedData.findIndex(item => 
            item.mois === moisKey &&
            item.fournisseur === fournisseur &&
            item.chantier_id === ligne.chantier_id
          );
          
          if (dataIndex !== -1) {
            const aPayerUpdated = getAPayerFromResponse(updatedPaiement, updatedData[dataIndex].a_payer);
            updatedData[dataIndex] = {
              ...updatedData[dataIndex],
              paye: 0, // Réinitialisé à 0
              a_payer: aPayerUpdated,
              ecart: aPayerUpdated - 0,
              factures: updatedPaiement.factures || updatedData[dataIndex].factures || [],
              date_paiement: updatedPaiement.date_paiement !== undefined ? updatedPaiement.date_paiement : null, // Utiliser la valeur du backend
              date_envoi: updatedPaiement.date_envoi !== undefined ? updatedPaiement.date_envoi : updatedData[dataIndex].date_envoi,
              date_paiement_prevue: updatedPaiement.date_paiement_prevue !== undefined ? updatedPaiement.date_paiement_prevue : updatedData[dataIndex].date_paiement_prevue,
              ecart_paiement_reel: updatedPaiement.ecart_paiement_reel !== undefined ? updatedPaiement.ecart_paiement_reel : updatedData[dataIndex].ecart_paiement_reel,
              date_modification: updatedPaiement.date_modification !== undefined ? updatedPaiement.date_modification : updatedData[dataIndex].date_modification,
              historique_modifications: updatedPaiement.historique_modifications !== undefined ? updatedPaiement.historique_modifications : updatedData[dataIndex].historique_modifications,
            };
          }
        }
      });

      // Attendre que toutes les mises à jour soient terminées
      await Promise.all(updatePromises);

      // Mettre à jour les factures dans editedFactures
      lignesFournisseur.forEach((ligne) => {
        const key = `${mois}_${fournisseur}_${ligne.chantier_id}`;
        const facturesList = editedFactures[key] !== undefined 
          ? editedFactures[key] 
          : ((ligne.factures || []).map(f => ({
              id: f.id || null,
              numero_facture: f.numero_facture || f,
              montant_facture: f.montant_facture || 0,
              payee: false,
              date_paiement_facture: null
            })));
        
        setEditedFactures((prev) => ({
          ...prev,
          [key]: facturesList.map(f => ({
            ...f,
            payee: false,
            date_paiement_facture: null
          }))
        }));
      });

      // Appliquer toutes les mises à jour d'état en une seule fois
      setEditedValuesPaye(updatedValuesPaye);
      setData(updatedData);

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      setError("Erreur lors de l'annulation des paiements.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Ouvrir le modal pour ajouter/modifier une facture
  const handleOpenFactureModal = (mois, fournisseur, chantierId, factureIndex = null) => {
    const key = `${mois}_${fournisseur}_${chantierId}`;
    const factures = editedFactures[key] || [];
    
    if (factureIndex !== null && factures[factureIndex]) {
      // Mode édition
      const facture = factures[factureIndex];
      setFactureModalData({
        numero: facture.numero_facture || "",
        montant: facture.montant_facture || 0
      });
      setCurrentFacture({ mois, fournisseur, chantierId, factureIndex });
    } else {
      // Mode ajout
      setFactureModalData({ numero: "", montant: "" });
      setCurrentFacture({ mois, fournisseur, chantierId, factureIndex: null });
    }
    setFactureModalOpen(true);
  };

  // Fermer le modal
  const handleCloseFactureModal = () => {
    setFactureModalOpen(false);
    setCurrentFacture(null);
    setFactureModalData({ numero: "", montant: "" });
  };

  // Sauvegarder la facture depuis le modal
  const handleSaveFactureModal = () => {
    if (!currentFacture || !factureModalData.numero.trim()) {
      return;
    }

    const { mois, fournisseur, chantierId, factureIndex } = currentFacture;
    const key = `${mois}_${fournisseur}_${chantierId}`;
    
    setEditedFactures((prev) => {
      const currentFactures = prev[key] || [];
      const existingFacture = factureIndex !== null && currentFactures[factureIndex] ? currentFactures[factureIndex] : null;
      const newFacture = {
        id: existingFacture ? existingFacture.id : null,
        numero_facture: factureModalData.numero.trim(),
        montant_facture: parseFloat(factureModalData.montant) || 0,
        // Préserver les champs de paiement lors de la modification
        payee: existingFacture ? (existingFacture.payee || false) : false,
        date_paiement_facture: existingFacture ? (existingFacture.date_paiement_facture || null) : null
      };
      
      let newFactures;
      if (factureIndex !== null) {
        // Modification
        newFactures = [...currentFactures];
        newFactures[factureIndex] = newFacture;
      } else {
        // Ajout
        newFactures = [...currentFactures, newFacture];
      }
      
      // Sauvegarder immédiatement
      savePaiement(mois, fournisseur, chantierId, editedValuesPaye[key] || 0, newFactures);
      
      return { ...prev, [key]: newFactures };
    });
    
    handleCloseFactureModal();
  };

  // Ouvrir le modal pour saisir la date de paiement de la facture
  const handleMarkFactureAsPaid = (mois, fournisseur, chantierId, factureIndex) => {
    const key = `${mois}_${fournisseur}_${chantierId}`;
    const currentFactures = editedFactures[key] || [];
    
    if (factureIndex < 0 || factureIndex >= currentFactures.length) {
      return;
    }

    const facture = currentFactures[factureIndex];
    
    // Si la facture est déjà payée, ne rien faire
    if (facture.payee) {
      return;
    }

    // Ouvrir le modal pour saisir la date de paiement
    setCurrentFacturePaiement({ mois, fournisseur, chantierId, factureIndex });
    setDatePaiementFactureModalOpen(true);
  };

  // Sauvegarder la facture avec la date de paiement saisie
  const handleSaveFacturePaiement = (datePaiementFacture) => {
    if (!currentFacturePaiement) {
      return;
    }

    const { mois, fournisseur, chantierId, factureIndex } = currentFacturePaiement;
    const key = `${mois}_${fournisseur}_${chantierId}`;
    const currentFactures = editedFactures[key] || [];
    const facture = currentFactures[factureIndex];
    
    if (!facture) {
      return;
    }

    const montantFacture = parseFloat(facture.montant_facture) || 0;

    // Récupérer le montant payé actuel
    const currentData = data.find(d => 
      d.mois === mois && 
      d.fournisseur === fournisseur && 
      d.chantier_id === chantierId
    );
    
    const montantPayeActuel = editedValuesPaye[key] !== undefined 
      ? editedValuesPaye[key] 
      : (currentData?.paye || 0);
    
    // Ajouter le montant de la facture au montant payé total
    const nouveauMontantPaye = montantPayeActuel + montantFacture;
    
    // Préparer les factures mises à jour AVANT de mettre à jour l'état
    const updatedFactures = [...currentFactures];
    updatedFactures[factureIndex] = {
      ...updatedFactures[factureIndex],
      payee: true,
      date_paiement_facture: datePaiementFacture
    };

    // Mettre à jour l'état local
    setEditedFactures((prev) => ({
      ...prev,
      [key]: updatedFactures,
    }));
    
    // Mettre à jour le montant payé
    setEditedValuesPaye((prev) => ({
      ...prev,
      [key]: nouveauMontantPaye,
    }));

    // Sauvegarder avec le nouveau montant payé et les factures mises à jour
    savePaiement(mois, fournisseur, chantierId, nouveauMontantPaye, updatedFactures, currentData?.date_paiement || null, currentData?.date_envoi || null);
    
    // Fermer le modal
    setDatePaiementFactureModalOpen(false);
    setCurrentFacturePaiement(null);
  };

  // Supprimer une entrée d'historique de modification
  const handleDeleteHistorique = async (historiqueId, mois, fournisseur, chantierId) => {
    if (!historiqueId) {
      console.error("ID d'historique manquant");
      return;
    }
    try {
      await axios.delete(`/api/historique-modification-paiement-fournisseur/${historiqueId}/`);
      
      // Mettre à jour uniquement l'état local au lieu de recharger tout le tableau
      setData((prevData) => {
        return prevData.map((item) => {
          if (
            item.mois === mois &&
            item.fournisseur === fournisseur &&
            item.chantier_id === chantierId
          ) {
            // Filtrer l'historique pour supprimer l'entrée supprimée
            const updatedHistorique = (item.historique_modifications || []).filter(
              (hist) => hist.id !== historiqueId
            );
            return {
              ...item,
              historique_modifications: updatedHistorique,
            };
          }
          return item;
        });
      });
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      setError("Erreur lors de la suppression de l'historique.");
      console.error("Erreur suppression historique:", err);
    }
  };

  // Supprimer une facture
  const handleRemoveFacture = (mois, fournisseur, chantierId, factureIndex) => {
    const key = `${mois}_${fournisseur}_${chantierId}`;
    setEditedFactures((prev) => {
      const currentFactures = prev[key] || [];
      const newFactures = currentFactures.filter((_, idx) => idx !== factureIndex);
      // Sauvegarder après suppression
      savePaiement(mois, fournisseur, chantierId, editedValuesPaye[key] || 0, newFactures);
      return { ...prev, [key]: newFactures };
    });
  };

  // Organiser les données par mois, puis par fournisseur, puis par chantier
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

    // Ne pas afficher les lignes avec montant à payer = 0
    filteredData = filteredData.filter((item) => (item.a_payer ?? 0) !== 0);

    // Organiser : {mois: {fournisseur: [{chantier_id, chantier_name, a_payer, paye, ecart}]}}
    const organized = {};
    
    filteredData.forEach((item) => {
      if (!organized[item.mois]) {
        organized[item.mois] = {};
      }
      if (!organized[item.mois][item.fournisseur]) {
        organized[item.mois][item.fournisseur] = [];
      }
      
      const key = `${item.mois}_${item.fournisseur}_${item.chantier_id}`;
      // Montant à payer est toujours en lecture seule (non modifiable)
      const aPayerValue = item.a_payer ?? 0;
      // Seul le montant payé peut être modifié par l'utilisateur
      const payeValue = editedValuesPaye[key] !== undefined 
        ? editedValuesPaye[key] 
        : item.paye || 0;
      const ecart = aPayerValue - payeValue;
      
      // Récupérer les factures depuis editedFactures ou depuis les données
      const facturesList = editedFactures[key] !== undefined 
        ? editedFactures[key] 
        : ((item.factures || []).map(f => ({
            id: f.id || null,
            numero_facture: f.numero_facture || f,
            montant_facture: f.montant_facture || 0,
            payee: f.payee || false,
            date_paiement_facture: f.date_paiement_facture || null
          })));

      organized[item.mois][item.fournisseur].push({
        ...item,
        paye: payeValue,
        a_payer: aPayerValue,
        a_payer_ttc: aPayerValue * 1.20, // TTC = HT + 20%
        ecart: ecart,
        factures: facturesList,
      });
    });

    // Trier les mois
    const moisSorted = Object.keys(organized).sort((a, b) => {
      const [moisA, anneeA] = a.split("/").map(Number);
      const [moisB, anneeB] = b.split("/").map(Number);
      if (anneeA !== anneeB) return anneeA - anneeB;
      return moisA - moisB;
    });

    // Trier les fournisseurs et les chantiers dans chaque groupe
    moisSorted.forEach((mois) => {
      const fournisseurs = Object.keys(organized[mois]).sort();
      fournisseurs.forEach((fournisseur) => {
        organized[mois][fournisseur].sort((a, b) => {
          // Trier par nom de chantier
          return a.chantier_name.localeCompare(b.chantier_name);
        });
      });
    });

    return { organized, moisSorted };
  };

  // Mémoriser l'organisation des données pour éviter les recalculs inutiles
  const { organized, moisSorted } = useMemo(
    () => organizeData(),
    [data, selectedAnnee, editedValuesPaye, editedFactures]
  );

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

  // Formater un nombre avec 2 décimales (gère les montants négatifs et 0)
  const formatNumber = (num) => {
    return Number(num ?? 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Récupérer montant_a_payer depuis la réponse API (préserve 0 et négatifs)
  const getAPayerFromResponse = (updatedPaiement, fallback) => {
    const v = updatedPaiement?.montant_a_payer;
    if (v === null || v === undefined || v === "") return fallback;
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };

  // Couleur pour les montants (rouge si négatif pour "à payer", rouge/vert pour écart)
  const colorForAmount = (value, isEcart = false) => {
    const n = Number(value ?? 0);
    if (isEcart) return n > 0 ? "#d32f2f" : "#2e7d32";
    return n < 0 ? "#d32f2f" : "rgba(27, 120, 188, 1)";
  };

  // Calculer les totaux pour un mois
  const calculerTotauxMois = (mois) => {
    const fournisseurs = organized[mois] || {};
    let totalAPayer = 0;
    let totalAPayerTTC = 0;
    let totalPaye = 0;
    let totalEcart = 0;

    Object.values(fournisseurs).forEach((chantiers) => {
      chantiers.forEach((item) => {
        totalAPayer += item.a_payer || 0;
        totalAPayerTTC += item.a_payer_ttc || 0;
        totalPaye += item.paye || 0;
        totalEcart += item.ecart || 0;
      });
    });

    return { totalAPayer, totalAPayerTTC, totalPaye, totalEcart };
  };

  // Calculer le total par fournisseur pour un mois
  const calculerTotalFournisseur = (mois, fournisseur) => {
    const fournisseurs = organized[mois] || {};
    const chantiers = fournisseurs[fournisseur] || [];
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
      const fournisseurs = Object.keys(organized[mois]).sort();
      
      // Calculer le nombre total de lignes de données pour ce mois (sans le récap)
      let nombreLignesMois = 0;
      fournisseurs.forEach((fournisseur) => {
        nombreLignesMois += organized[mois][fournisseur].length;
      });
      
      // Ajouter les lignes pour chaque fournisseur
      fournisseurs.forEach((fournisseur, fournisseurIndex) => {
        const chantiers = organized[mois][fournisseur];
        
        // Calculer le nombre de lignes pour ce fournisseur (pour fusionner la cellule fournisseur)
        const nombreLignesFournisseur = chantiers.length;
        
        // Calculer le total du fournisseur pour ce mois
        const totalFournisseur = calculerTotalFournisseur(mois, fournisseur);
        
        chantiers.forEach((item, chantierIndex) => {
          const key = `${mois}_${fournisseur}_${item.chantier_id}`;
          
          // La première ligne de chaque mois
          const isFirstRowOfMois = fournisseurIndex === 0 && chantierIndex === 0;
          // La première ligne de chaque fournisseur
          const isFirstRowOfFournisseur = chantierIndex === 0;

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
            fournisseur: fournisseur,
            item: item,
            key: key,
            isFirstRowOfMois: isFirstRowOfMois,
            isFirstRowOfFournisseur: isFirstRowOfFournisseur,
            rowSpanMois: isFirstRowOfMois ? nombreLignesMois : 0, // rowSpan pour fusionner les cellules du mois
            rowSpanFournisseur: isFirstRowOfFournisseur ? nombreLignesFournisseur : 0, // rowSpan pour fusionner les cellules du fournisseur
            totalFournisseur: isFirstRowOfFournisseur ? totalFournisseur : null, // Total du fournisseur seulement sur la première ligne
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
    [organized, moisSorted]
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
          TABLEAU FOURNISSEUR{" "}
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
                    Fournisseur
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
                    Date d'envoi
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 180, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Date de paiement
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 150, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Date paiement prévue
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 150, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Écart paiement réel
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle, minWidth: 150, backgroundColor: "rgba(27, 120, 188, 1)" }}>
                    Total Fournisseur/Mois
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
                                  ? colorForAmount(row.totaux.totalAPayer) 
                                  : "#ffffff",
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
                                color: colorForAmount(row.totaux.totalEcart, true),
                              }}
                            >
                              {formatNumber(row.totaux.totalEcart)} €
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
                      const { item, isFirstRowOfMois, isFirstRowOfFournisseur, rowSpanMois, rowSpanFournisseur, totalFournisseur } = row;
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
                          {isFirstRowOfFournisseur ? (
                            <TableCell
                              rowSpan={rowSpanFournisseur}
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
                                {row.fournisseur}
                              </Typography>
                            </TableCell>
                          ) : null}
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography
                              sx={{
                                fontSize: "0.8rem",
                                color: "text.primary",
                              }}
                            >
                              {item.chantier_name}
                            </Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography
                              sx={{
                                fontSize: "0.8rem",
                                color: colorForAmount(item.a_payer),
                                textAlign: "center",
                              }}
                            >
                              {formatNumber(item.a_payer)} €
                            </Typography>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <TextField
                              type="number"
                              size="small"
                              value={item.paye || ""}
                              onClick={() =>
                                handleOpenDatePaiementModal(
                                  row.mois,
                                  row.fournisseur,
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
                              }}
                            />
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
                                        onClick={() => handleOpenFactureModal(row.mois, row.fournisseur, item.chantier_id, idx)}
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
                                            handleMarkFactureAsPaid(row.mois, row.fournisseur, item.chantier_id, idx);
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
                                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
                                  <Button
                                    size="small"
                                    onClick={() => handleOpenFactureModal(row.mois, row.fournisseur, item.chantier_id, null)}
                                    sx={{
                                      color: "rgba(27, 120, 188, 0.6)",
                                      fontWeight: "normal",
                                      fontSize: "1.2rem",
                                      textTransform: "none",
                                      minWidth: "30px",
                                      width: "30px",
                                      height: "30px",
                                      padding: 0,
                                      borderRadius: "5px",
                                      border: "1px dashed rgba(27, 120, 188, 0.3)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      "&:hover": {
                                        backgroundColor: "rgba(27, 120, 188, 0.1)",
                                        borderColor: "rgba(27, 120, 188, 0.5)",
                                      },
                                    }}
                                  >
                                    +
                                  </Button>
                                </Box>
                              )}
                              {/* Afficher le bouton hover seulement s'il y a des factures */}
                              {item.factures && item.factures.length > 0 && (
                                <Box
                                  className="add-facture-btn"
                                  sx={{
                                    position: "absolute",
                                    bottom: 4,
                                    right: -15, // 15px sur la droite, sort de la div
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
                                    onClick={() => handleOpenFactureModal(row.mois, row.fournisseur, item.chantier_id, null)}
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
                                    <AddIcon sx={{ fontSize: "1rem" }} />
                                  </IconButton>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                color: colorForAmount(item.ecart, true),
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
                                onClick={() => handleOpenDateEnvoiModal(row.mois, row.fournisseur, item.chantier_id)}
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
                                onClick={() => handleOpenDateEnvoiModal(row.mois, row.fournisseur, item.chantier_id)}
                              >
                                Cliquer pour ajouter
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={commonBodyCellStyle}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "center" }}>
                              {/* Afficher les dates de paiement des factures */}
                              {item.factures && item.factures.some(f => f.payee && f.date_paiement_facture) ? (
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3, width: "100%" }}>
                                  {item.factures
                                    .filter(f => f.payee && f.date_paiement_facture)
                                    .map((facture, idx) => {
                                      const datePaiement = facture.date_paiement_facture;
                                      return (
                                        <Box
                                          key={facture.id || idx}
                                          sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 0.1,
                                            padding: "2px 4px",
                                            borderRadius: "3px",
                                            backgroundColor: "rgba(46, 125, 50, 0.1)",
                                            border: "1px solid rgba(46, 125, 50, 0.3)",
                                          }}
                                        >
                                          <Typography
                                            sx={{
                                              fontSize: "0.65rem",
                                              color: "rgba(46, 125, 50, 0.9)",
                                              fontWeight: 500,
                                            }}
                                          >
                                            {facture.numero_facture || `Facture ${idx + 1}`}
                                          </Typography>
                                          <Typography
                                            sx={{
                                              fontSize: "0.7rem",
                                              color: "rgba(46, 125, 50, 1)",
                                              fontWeight: 500,
                                            }}
                                          >
                                            {datePaiement ? new Date(datePaiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                          </Typography>
                                        </Box>
                                      );
                                    })}
                                </Box>
                              ) : null}
                              
                              {/* Afficher la date de paiement principale si elle existe et qu'aucune facture n'est payée */}
                              {item.date_paiement && (!item.factures || !item.factures.some(f => f.payee && f.date_paiement_facture)) ? (
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
                                      fournisseur: row.fournisseur,
                                      chantierId: item.chantier_id,
                                      montantPaye: item.paye,
                                      datePaiement: item.date_paiement
                                    });
                                    setDatePaiementModalOpen(true);
                                  }}
                                >
                                  {new Date(item.date_paiement).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </Typography>
                              ) : !item.date_paiement && (!item.factures || !item.factures.some(f => f.payee && f.date_paiement_facture)) ? (
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
                                      fournisseur: row.fournisseur,
                                      chantierId: item.chantier_id,
                                      montantPaye: item.paye,
                                      datePaiement: null
                                    });
                                    setDatePaiementModalOpen(true);
                                  }}
                                >
                                  Non renseignée
                                </Typography>
                              ) : null}
                              {item.historique_modifications && item.historique_modifications.length > 0 && (
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3, mt: 0.5 }}>
                                  {item.historique_modifications.slice(0, 3).map((hist, idx) => (
                                    <Box
                                      key={hist.id || idx}
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.3,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: "0.65rem",
                                          color: "text.secondary",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.3,
                                          flexGrow: 1,
                                        }}
                                      >
                                        <span style={{ fontSize: "0.5rem" }}>✏️</span>
                                        {hist.date_paiement_avant 
                                          ? new Date(hist.date_paiement_avant).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                          : new Date(hist.date_modification).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                        }
                                      </Typography>
                                      {hist.id && (
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (hist.id) {
                                              handleDeleteHistorique(hist.id, row.mois, row.fournisseur, item.chantier_id);
                                            }
                                          }}
                                          sx={{
                                            padding: "2px",
                                            color: "error.main",
                                            "&:hover": {
                                              backgroundColor: "rgba(211, 47, 47, 0.1)",
                                              color: "error.dark",
                                            },
                                          }}
                                        >
                                          <CloseIcon sx={{ fontSize: "0.7rem" }} />
                                        </IconButton>
                                      )}
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </Box>
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
                          {isFirstRowOfFournisseur ? (() => {
                            const isPayeComplet = totalFournisseur && 
                              Math.abs(totalFournisseur.totalAPayer - totalFournisseur.totalPaye) < 0.01; // Tolérance pour les arrondis
                            
                            const hasPayments = totalFournisseur && totalFournisseur.totalPaye > 0;
                            
                            // Pas d'alternance : vert si payé complet, bleu sinon
                            const totalBackgroundColor = isPayeComplet 
                              ? "rgba(46, 125, 50, 0.2)" // Vert clair si payé complet
                              : "rgba(27, 120, 188, 0.1)"; // Bleu si pas payé complet (pas d'alternance)
                            
                            return (
                              <TableCell
                                rowSpan={rowSpanFournisseur}
                                onClick={() => {
                                  if (hasPayments) {
                                    handleCancelAllFournisseurMois(row.mois, row.fournisseur);
                                  } else {
                                    handleFillAllFournisseurMois(row.mois, row.fournisseur);
                                  }
                                }}
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
                                      ? "rgba(46, 125, 50, 1)"
                                      : colorForAmount(totalFournisseur.totalAPayer),
                                  }}
                                >
                                  {formatNumber(totalFournisseur.totalAPayer)} €
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

          {/* Récapitulatif par fournisseur */}
          {tableRows.length > 0 && (
            <RecapFournisseur
              data={data}
              selectedAnnee={selectedAnnee}
              organized={organized}
              moisSorted={moisSorted}
            />
          )}

          {/* Modal pour ajouter/modifier une facture */}
          <FactureModal
            open={factureModalOpen}
            onClose={handleCloseFactureModal}
            onSave={handleSaveFactureModal}
            onDelete={currentFacture?.factureIndex !== null ? () => {
              handleRemoveFacture(
                currentFacture.mois,
                currentFacture.fournisseur,
                currentFacture.chantierId,
                currentFacture.factureIndex
              );
              handleCloseFactureModal();
            } : null}
            factureData={factureModalData}
            onFactureDataChange={setFactureModalData}
            isEditMode={currentFacture?.factureIndex !== null}
          />
          
          {/* Modal pour saisir/modifier le montant payé et la date de paiement */}
          <DatePaiementModal
            open={datePaiementModalOpen}
            onClose={() => {
              setDatePaiementModalOpen(false);
              setCurrentPaiement(null);
            }}
            onSave={handleSaveDatePaiement}
            onCancel={handleCancelDatePaiement}
            datePaiement={currentPaiement?.datePaiement || null}
            montantPaye={currentPaiement?.montantPaye || 0}
            hasExistingPayment={currentPaiement?.datePaiement !== null && currentPaiement?.datePaiement !== undefined}
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
              const key = `${currentFacturePaiement.mois}_${currentFacturePaiement.fournisseur}_${currentFacturePaiement.chantierId}`;
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
              setFillDatePaiement(new Date().toISOString().split('T')[0]);
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              Remplir automatiquement les paiements
            </DialogTitle>
            <DialogContent>
              {pendingFillAction && (() => {
                const [moisNum, annee2digits] = pendingFillAction.mois.split("/").map(Number);
                const moisName = getMoisName(moisNum);
                const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
                const lignesCount = data.filter(d => 
                  d.mois === pendingFillAction.mois && 
                  d.fournisseur === pendingFillAction.fournisseur
                ).length;
                
                return (
                  <>
                    <DialogContentText sx={{ mb: 3 }}>
                      Vous allez remplir automatiquement toutes les lignes du fournisseur <strong>{pendingFillAction.fournisseur}</strong> pour le mois de <strong>{moisName} {anneeComplete}</strong>.
                      <br /><br />
                      Cette action va :
                      <ul style={{ marginTop: "8px", marginBottom: "8px" }}>
                        <li>Remplir le montant payé avec le montant à payer pour chaque ligne ({lignesCount} ligne{lignesCount > 1 ? 's' : ''})</li>
                        <li>Définir la date de paiement avec la date que vous allez saisir ci-dessous</li>
                      </ul>
                    </DialogContentText>
                    <TextField
                      label="Date de paiement"
                      type="date"
                      value={fillDatePaiement}
                      onChange={(e) => setFillDatePaiement(e.target.value)}
                      fullWidth
                      required
                      InputLabelProps={{
                        shrink: true,
                      }}
                      sx={{ mt: 2 }}
                    />
                  </>
                );
              })()}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setConfirmFillModalOpen(false);
                  setPendingFillAction(null);
                  setFillDatePaiement(new Date().toISOString().split('T')[0]);
                }}
                color="secondary"
              >
                Annuler
              </Button>
              <Button
                onClick={executeFillAllFournisseurMois}
                color="primary"
                variant="contained"
                autoFocus
                disabled={!fillDatePaiement}
              >
                Confirmer
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

export default TableauFournisseur;

