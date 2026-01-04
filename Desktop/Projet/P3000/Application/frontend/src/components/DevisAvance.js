import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select, MenuItem, FormControl, InputLabel, Button, Box, Typography } from '@mui/material';
import { FiPlus } from 'react-icons/fi';
import DevisStyles from './Devis/DevisStyles';
import DevisHeader from './Devis/DevisHeader';
import ClientInfo from './Devis/ClientInfo';
import ChantierInfo from './Devis/ChantierInfo';
import DevisTable from './Devis/DevisTable';
import DevisRecap from './Devis/DevisRecap';
import TableauOption from './Devis/TableauOption';
import DevisCostPieChart from './Devis/DevisCostPieChart';
import ChantierForm from './ChantierForm';
import ClientInfoModal from './ClientInfoModal';
import SocieteInfoModal from './SocieteInfoModal';
import SelectSocieteModal from './SelectSocieteModal';
import SelectClientModal from './SelectClientModal';
import ContactSocieteModal from './ContactSocieteModal';
import DrivePathSelector from './Devis/DrivePathSelector';
import { DevisIndexManager } from '../utils/DevisIndexManager';
import { transformToLegacyFormat, validateBeforeTransform } from '../utils/DevisLegacyTransformer';

const createInitialDevisData = () => ({
  numero: '',
  date_creation: new Date().toISOString().split('T')[0],
  nature_travaux: '',
  tva_rate: 20,
  price_ht: 0,
  price_ttc: 0
});

const createInitialClientState = () => ({
  name: '',
  surname: '',
  civilite: '',
  poste: '',
  client_mail: '',
  phone_Number: ''
});

const createInitialSocieteState = () => ({
  nom_societe: '',
  rue_societe: '',
  codepostal_societe: '',
  ville_societe: ''
});

const createInitialChantierState = () => ({
  chantier_name: '',
  rue: '',
  code_postal: '',
  ville: ''
});

const createInitialPendingChantierData = () => ({
  client: {
    name: "",
    surname: "",
    client_mail: "",
    phone_Number: "",
    civilite: "",
    poste: ""
  },
  societe: {
    nom_societe: "",
    ville_societe: "",
    rue_societe: "",
    codepostal_societe: "",
  },
  chantier: {
    id: -1,
    chantier_name: "",
    ville: "",
    rue: "",
    code_postal: "",
  },
  devis: null,
});

const RECURRING_SPECIAL_LINE_TEMPLATE = {
  id: 'recurring_special_line',
  type: 'ligne_speciale',
  type_speciale: 'display',
  value_type: 'display',
  value: 0,
  context_type: 'global',
  context_id: null,
  description: 'Montant global HT des prestations unitaires',
  data: {
    description: 'Montant global HT des prestations unitaires',
    valueType: 'display',
    type: 'display',
    value: 0
  },
  styles: {
    backgroundColor: '#fbff24',
    color: '#ff3838',
    fontWeight: 'bold',
    textAlign: 'left'
  },
  isRecurringSpecial: true
};

const isRecurringSpecialLine = (item) => (
  item &&
  item.type === 'ligne_speciale' &&
  (
    item.isRecurringSpecial ||
    item.description === RECURRING_SPECIAL_LINE_TEMPLATE.description ||
    item.data?.description === RECURRING_SPECIAL_LINE_TEMPLATE.description
  )
);

const getNextPartieNumero = (items = []) => {
  const numericValues = items
    .filter(item => item.type === 'partie' && item.numero && /^\d+$/.test(item.numero))
    .map(item => parseInt(item.numero, 10));
  if (numericValues.length === 0) {
    return '1';
  }
  return String(Math.max(...numericValues) + 1);
};

const getNextSousPartieNumero = (items = [], partieId) => {
  if (!partieId) {
    return '';
  }
  const parentPartie = items.find(item => item.type === 'partie' && item.id === partieId);
  const parentNumero = parentPartie?.numero;
  if (!parentNumero || !/^\d+(\.\d+)?$/.test(parentNumero)) {
    return '';
  }
  const escapedParent = parentNumero.replace(/\./g, '\\.');
  const regex = new RegExp(`^${escapedParent}\\.(\\d+)$`);
  const existingIndexes = items
    .filter(item => item.type === 'sous_partie' && item.partie_id === partieId && item.numero && regex.test(item.numero))
    .map(item => {
      const match = item.numero.match(regex);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(index => index !== null);
  const nextIndex = existingIndexes.length ? Math.max(...existingIndexes) + 1 : 1;
  return `${parentNumero}.${nextIndex}`;
};

// Fonction pour slugifier un texte (similaire à custom_slugify du backend)
const customSlugify = (text) => {
  if (!text) return '';
  // Remplacer les espaces multiples par un seul espace
  text = text.trim().replace(/\s+/g, ' ');
  // Remplacer les espaces par des tirets
  text = text.replace(/\s/g, '-');
  // Supprimer les caractères spéciaux sauf les tirets
  text = text.replace(/[^a-zA-Z0-9-]/g, '');
  // Supprimer les tirets multiples
  text = text.replace(/-+/g, '-');
  // Supprimer les tirets en début et fin
  text = text.replace(/^-+|-+$/g, '');
  return text;
};

// Fonction utilitaire pour nettoyer le drive_path (retirer les préfixes Appels_Offres/ et Chantiers/)
const cleanDrivePath = (drivePath) => {
  if (!drivePath) {
    return null;
  }
  
  let path = String(drivePath).trim();
  
  // Retirer les préfixes Appels_Offres/ et Chantiers/
  if (path.startsWith('Appels_Offres/')) {
    path = path.substring('Appels_Offres/'.length);
  } else if (path.startsWith('Chantiers/')) {
    path = path.substring('Chantiers/'.length);
  }
  
  // Nettoyer les slashes en début et fin
  path = path.replace(/^\/+|\/+$/g, '');
  
  // Retourner null si vide après nettoyage
  if (!path) {
    return null;
  }
  
  return path;
};

const DevisAvance = () => {
  // États pour les données du devis
  const [devisData, setDevisData] = useState(() => createInitialDevisData());

  const [client, setClient] = useState(() => createInitialClientState());

  const [societe, setSociete] = useState(() => createInitialSocieteState());

  const [chantier, setChantier] = useState(() => createInitialChantierState());


  const [special_lines_global, setSpecialLinesGlobal] = useState([]);
  const [total_ht, setTotalHt] = useState(0);
  const [tva, setTva] = useState(0);
  const [montant_ttc, setMontantTtc] = useState(0);

  // États pour les lignes spéciales v2
  const [pendingSpecialLines, setPendingSpecialLines] = useState([]);
  const [editingSpecialLine, setEditingSpecialLine] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [lineAwaitingPlacement, setLineAwaitingPlacement] = useState(null);  // Ligne en attente de clic sur le tableau
  const [isSelectingBase, setIsSelectingBase] = useState(false);  // Mode de sélection de base pour %
  const [pendingLineForBase, setPendingLineForBase] = useState(null);  // Ligne en cours de création avec % qui attend sa base
  const [recurringLineDraft, setRecurringLineDraft] = useState(null);
  const buildRecurringSpecialLine = React.useCallback(() => ({
    ...RECURRING_SPECIAL_LINE_TEMPLATE,
    id: `recurring_special_line_${Date.now()}`
  }), []);

  // États pour le système unifié (DevisAvance utilise TOUJOURS le mode unified)
  const [devisItems, setDevisItems] = useState([]);
  const [isLoadingDevis, setIsLoadingDevis] = useState(false);
  const [isReordering, setIsReordering] = useState(false); // Flag pour éviter les recalculs pendant le drag & drop

  // États pour la gestion des chantiers
  const [chantiers, setChantiers] = useState([]);
  const [selectedChantierId, setSelectedChantierId] = useState(null);
  const [showChantierForm, setShowChantierForm] = useState(false);
  const [isLoadingChantiers, setIsLoadingChantiers] = useState(false);
  
  // États pour la création de nouveau chantier (même logique que CreationDevis.js)
  const [pendingChantierData, setPendingChantierData] = useState(() => createInitialPendingChantierData());
  const [showClientInfoModal, setShowClientInfoModal] = useState(false);
  const [showSelectClientModal, setShowSelectClientModal] = useState(false);
  const [showSocieteInfoModal, setShowSocieteInfoModal] = useState(false);
  const [showSelectSocieteModal, setShowSelectSocieteModal] = useState(false);
  const [selectedSocieteId, setSelectedSocieteId] = useState(null);
  const [selectedClientSocietes, setSelectedClientSocietes] = useState(null);
  const [prefilledClientData, setPrefilledClientData] = useState(null);
  const [prefilledSocieteData, setPrefilledSocieteData] = useState(null);
  
  // États pour la gestion des contacts de société
  const [contactsSociete, setContactsSociete] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [currentSocieteId, setCurrentSocieteId] = useState(null);

  // États pour la gestion du devis
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);
  const [devisType, setDevisType] = useState("normal"); // 'normal' ou 'chantier'
  const [nextTsNumber, setNextTsNumber] = useState(null);
  const [clientId, setClientId] = useState(null); // ID du client associé
  const [isSaving, setIsSaving] = useState(false); // Flag pour la sauvegarde en cours
  const [tauxFixe, setTauxFixe] = useState(20); // Taux fixe global (par défaut 20%)

  // États pour la gestion des parties
  const [availableParties, setAvailableParties] = useState([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);
  const [partiesToCreate, setPartiesToCreate] = useState([]); // Nouvelles parties à créer
  
  // État pour le PieChart - ligne sélectionnée (au clic)
  const [hoveredLigneDetail, setHoveredLigneDetail] = useState(null);
  const [isPieChartVisible, setIsPieChartVisible] = useState(true);
  
  // États pour le chemin personnalisé du drive
  const [customDrivePath, setCustomDrivePath] = useState(null);
  const [showDrivePathSelector, setShowDrivePathSelector] = useState(false);
  const [chantierDrivePath, setChantierDrivePath] = useState(null); // drive_path du chantier depuis la DB
  
  // États liés à la persistance locale
  const [sessionUser, setSessionUser] = useState(null);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const draftSaveTimeoutRef = React.useRef(null);
  const lastDraftKeyRef = React.useRef(null);
  
  // ✅ NOUVEAU : Enrichir devisItems pour que les parties aient selectedSousParties (pour compatibilité)
  const enrichedDevisItems = React.useMemo(() => {
    return devisItems.map(item => {
      if (item.type === 'partie') {
        // Enrichir la partie avec selectedSousParties
        return {
          ...item,
          selectedSousParties: devisItems
            .filter(i => i.type === 'sous_partie' && i.partie_id === item.id)
            .map(spItem => ({
              ...spItem,
              selectedLignesDetails: devisItems
                .filter(i => i.type === 'ligne_detail' && i.sous_partie_id === spItem.id)
            }))
        };
      } else if (item.type === 'sous_partie') {
        // Enrichir la sous-partie avec selectedLignesDetails
        return {
          ...item,
          selectedLignesDetails: devisItems
            .filter(i => i.type === 'ligne_detail' && i.sous_partie_id === item.id)
        };
      }
      return item;
    });
  }, [devisItems]);

  const hasRecurringLine = React.useMemo(() => {
    return devisItems.some(isRecurringSpecialLine);
  }, [devisItems]);
  
  // ✅ Construire selectedParties depuis enrichedDevisItems pour les barres de recherche
  const selectedParties = React.useMemo(() => {
    return enrichedDevisItems
      .filter(item => item.type === 'partie')
      .map(partieItem => ({
        ...partieItem,
        type: partieItem.type_activite || 'PEINTURE' // Restaurer le type original
      }));
  }, [enrichedDevisItems]);
  
  const draftStorageKey = React.useMemo(() => {
    if (sessionUser?.id) {
      return `devisAvanceDraft_user_${sessionUser.id}`;
    }
    return 'devisAvanceDraft_global';
  }, [sessionUser]);
  
  // Calculer le chemin par défaut du drive : priorité au drive_path du chantier en DB, sinon calcul automatique
  const defaultDrivePath = React.useMemo(() => {
    // ✅ Si un chantier existant est sélectionné et a un drive_path en DB, l'utiliser
    if (selectedChantierId && selectedChantierId !== -1 && chantierDrivePath) {
      return chantierDrivePath;
    }
    
    // Sinon, calculer automatiquement à partir de la société et du chantier
    const societeName = societe.nom_societe || pendingChantierData?.societe?.nom_societe || '';
    const chantierName = chantier.chantier_name || pendingChantierData?.chantier?.chantier_name || '';
    
    if (!societeName && !chantierName) {
      return '';
    }
    
    const societeSlug = customSlugify(societeName);
    const chantierSlug = customSlugify(chantierName);
    
    if (societeSlug && chantierSlug) {
      return `${societeSlug}/${chantierSlug}`;
    } else if (societeSlug) {
      return societeSlug;
    } else if (chantierSlug) {
      return chantierSlug;
    }
    
    return '';
  }, [selectedChantierId, chantierDrivePath, societe.nom_societe, chantier.chantier_name, pendingChantierData]);
  
  // Chemin effectif à utiliser (personnalisé ou par défaut)
  const effectiveDrivePath = customDrivePath !== null ? customDrivePath : defaultDrivePath;
  
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get('/auth/check/');
        if (response?.data?.authenticated && response.data.user) {
          setSessionUser(response.data.user);
        } else {
          setSessionUser(null);
        }
      } catch (error) {
        setSessionUser(null);
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  useEffect(() => {
    if (!draftStorageKey) {
      return;
    }
    
    if (lastDraftKeyRef.current !== draftStorageKey) {
      const previousKey = lastDraftKeyRef.current;
      
      if (
        previousKey === 'devisAvanceDraft_global' &&
        draftStorageKey !== previousKey
      ) {
        try {
          const globalDraft = localStorage.getItem(previousKey);
          const existingDraftForUser = localStorage.getItem(draftStorageKey);
          if (globalDraft && !existingDraftForUser) {
            localStorage.setItem(draftStorageKey, globalDraft);
          }
        } catch (error) {
        }
      }
      
      lastDraftKeyRef.current = draftStorageKey;
      setIsDraftHydrated(false);
    }
  }, [draftStorageKey]);

  // Fonction pour formater les montants avec espaces
  const formatMontantEspace = (montant) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant).replace(/,/g, '.');
  };

  // Fonction pour formater le numéro de téléphone
  const formatPhoneNumber = (phone) => {
    if (!phone || typeof phone !== 'string') return '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 9) {
      const phoneWithZero = '0' + cleanPhone;
      return phoneWithZero.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1.$2.$3.$4.$5');
    } else if (cleanPhone.length >= 10) {
      return cleanPhone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1.$2.$3.$4.$5');
    }
    return phone;
  };

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  // Charger les chantiers
  const fetchChantiers = async () => {
    try {
      setIsLoadingChantiers(true);
      const response = await axios.get('/api/chantier/');
      // Filtrer les chantiers avec le statut "Terminé" ou "En attente"
      const filteredChantiers = response.data.filter(
        (chantier) =>
          chantier.state_chantier !== "Terminé" &&
          chantier.state_chantier !== "En attente"
      );
      setChantiers(filteredChantiers);
    } catch (error) {
      // Erreur lors du chargement des chantiers
    } finally {
      setIsLoadingChantiers(false);
    }
  };

  // Charger les contacts d'une société
  const fetchContactsSociete = async (societeId) => {
    if (!societeId) {
      setContactsSociete([]);
      setCurrentSocieteId(null);
      return;
    }
    try {
      const response = await axios.get(`/api/contacts-societe/?societe=${societeId}`);
      setContactsSociete(response.data);
      setCurrentSocieteId(societeId);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
      setContactsSociete([]);
      setCurrentSocieteId(societeId);
    }
  };

  // Gérer la sélection d'un chantier
  const handleChantierSelection = async (chantierId) => {
    setSelectedChantierId(chantierId);
    // Si un chantier existant est sélectionné, remettre le type à "normal"
    if (chantierId && chantierId !== -1) {
      setDevisType("normal");
    }
    // Régénérer le numéro de devis avec le bon suffixe
    await generateDevisNumber(chantierId);
    
    // Si c'est un nouveau chantier (id = -1), utiliser les données temporaires
    if (chantierId === -1) {
      // Réinitialiser le drive_path du chantier (nouveau chantier)
      setChantierDrivePath(null);
      
      // Mettre à jour le chantier si les données existent
      if (pendingChantierData.chantier) {
        setChantier({
          chantier_name: pendingChantierData.chantier.chantier_name || "",
          rue: pendingChantierData.chantier.rue || "",
          code_postal: pendingChantierData.chantier.code_postal || "",
          ville: pendingChantierData.chantier.ville || ""
        });
      }
      
      // Mettre à jour les informations de la société depuis pendingChantierData (même si le chantier n'est pas encore rempli)
      if (pendingChantierData.societe) {
        setSociete({
          nom_societe: pendingChantierData.societe.nom_societe || "",
          rue_societe: pendingChantierData.societe.rue_societe || "",
          codepostal_societe: pendingChantierData.societe.codepostal_societe || "",
          ville_societe: pendingChantierData.societe.ville_societe || ""
        });
      }
      
      // Mettre à jour les informations du client depuis pendingChantierData (même si le chantier n'est pas encore rempli)
      if (pendingChantierData.client) {
        setClient({
          name: pendingChantierData.client.name || "",
          surname: pendingChantierData.client.surname || "",
          civilite: pendingChantierData.client.civilite || "",
          poste: pendingChantierData.client.poste || "",
          client_mail: pendingChantierData.client.client_mail || "",
          phone_Number: String(pendingChantierData.client.phone_Number || "")
        });
      }
      return;
    }
    
    if (chantierId && chantierId !== '') {
      try {
        // Récupérer les détails du chantier avec la société
        const chantierResponse = await axios.get(`/api/chantier/${chantierId}/`);
        const chantierData = chantierResponse.data;
        
        // ✅ Récupérer et stocker le drive_path du chantier depuis la DB
        if (chantierData.drive_path) {
          setChantierDrivePath(chantierData.drive_path);
        } else {
          // Si pas de drive_path en DB, réinitialiser pour utiliser le calcul automatique
          setChantierDrivePath(null);
        }
        
        // Mettre à jour les informations du chantier
        setChantier({
          chantier_name: chantierData.chantier_name,
          rue: chantierData.rue,
          code_postal: chantierData.code_postal,
          ville: chantierData.ville
        });
        
        // Mettre à jour les informations de la société et du client si disponibles
        if (chantierData.societe) {
          // Si societe est un objet avec les détails (via serializer)
          if (typeof chantierData.societe === 'object' && chantierData.societe.id) {
            setSociete({
              nom_societe: chantierData.societe.nom_societe || '',
              rue_societe: chantierData.societe.rue_societe || '',
              codepostal_societe: chantierData.societe.codepostal_societe || '',
              ville_societe: chantierData.societe.ville_societe || ''
            });
            // Charger les contacts de la société
            await fetchContactsSociete(chantierData.societe.id);
            
            // Récupérer les informations du client
            if (chantierData.societe.client_name) {
              const clientId = typeof chantierData.societe.client_name === 'object' 
                ? chantierData.societe.client_name.id 
                : chantierData.societe.client_name;
              
              if (clientId) {
                const clientResponse = await axios.get(`/api/client/${clientId}/`);
                const clientData = clientResponse.data;
                
                setClient({
                  name: clientData.name || '',
                  surname: clientData.surname || '',
                  civilite: clientData.civilite || 'M.',
                  poste: clientData.poste || '',
                  client_mail: clientData.client_mail || '',
                  phone_Number: String(clientData.phone_Number || '')
                });
                
                // Stocker l'ID du client
                setClientId(clientId);
              }
            }
          } else if (typeof chantierData.societe === 'number') {
            // Si societe est juste un ID, récupérer les détails
            const societeResponse = await axios.get(`/api/societe/${chantierData.societe}/`);
            const societeData = societeResponse.data;
            
            setSociete({
              nom_societe: societeData.nom_societe || '',
              rue_societe: societeData.rue_societe || '',
              codepostal_societe: societeData.codepostal_societe || '',
              ville_societe: societeData.ville_societe || ''
            });
            // Charger les contacts de la société
            await fetchContactsSociete(chantierData.societe);
            
            if (societeData.client_name) {
              const clientId = typeof societeData.client_name === 'object' 
                ? societeData.client_name.id 
                : societeData.client_name;
              
              if (clientId) {
                const clientResponse = await axios.get(`/api/client/${clientId}/`);
                const clientData = clientResponse.data;
                
                setClient({
                  name: clientData.name || '',
                  surname: clientData.surname || '',
                  civilite: clientData.civilite || 'M.',
                  poste: clientData.poste || '',
                  client_mail: clientData.client_mail || '',
                  phone_Number: String(clientData.phone_Number || '')
                });
                
                // Stocker l'ID du client
                setClientId(clientId);
              }
            }
          }
        }
      } catch (error) {
        // Erreur lors du chargement des détails du chantier
        // En cas d'erreur, utiliser les données de base du chantier
        const selectedChantier = chantiers.find(c => c.id === chantierId);
        if (selectedChantier) {
          setChantier({
            chantier_name: selectedChantier.chantier_name,
            rue: selectedChantier.rue,
            code_postal: selectedChantier.code_postal,
            ville: selectedChantier.ville
          });
          // Réinitialiser le drive_path en cas d'erreur
          setChantierDrivePath(null);
        }
      }
    } else {
      // Si aucun chantier n'est sélectionné, réinitialiser le drive_path
      setChantierDrivePath(null);
    }
  };

  // Gérer la création d'un nouveau chantier
  const handleChantierCreation = (chantierData) => {
    // Mettre à jour pendingChantierData avec les données du chantier
    setPendingChantierData((prev) => ({
      ...prev,
      chantier: {
        ...prev.chantier,
        ...chantierData,
      },
    }));
    
    // Mettre à jour l'état chantier pour l'affichage
    setChantier({
      chantier_name: chantierData.chantier_name || "",
      rue: chantierData.rue || "",
      code_postal: chantierData.code_postal || "",
      ville: chantierData.ville || ""
    });
    
    // Mettre à jour aussi les états client et societe si disponibles dans pendingChantierData
    if (pendingChantierData.client) {
      setClient({
        name: pendingChantierData.client.name || "",
        surname: pendingChantierData.client.surname || "",
        civilite: pendingChantierData.client.civilite || "",
        poste: pendingChantierData.client.poste || "",
        client_mail: pendingChantierData.client.client_mail || "",
        phone_Number: String(pendingChantierData.client.phone_Number || "")
      });
    }
    
    if (pendingChantierData.societe) {
      setSociete({
        nom_societe: pendingChantierData.societe.nom_societe || "",
        rue_societe: pendingChantierData.societe.rue_societe || "",
        codepostal_societe: pendingChantierData.societe.codepostal_societe || "",
        ville_societe: pendingChantierData.societe.ville_societe || ""
      });
    }
    
    setSelectedChantierId(-1); // Marquer comme nouveau chantier
    setShowChantierForm(false);
    // Régénérer le numéro avec le format "Devis travaux"
    generateDevisNumber(-1);
  };
  
  // Handlers pour le flux de création de nouveau chantier

  const handleClientInfoSubmit = async (clientData) => {
    if (!clientData.name || !clientData.surname || !clientData.phone_Number) {
      alert("Tous les champs sont obligatoires");
      return;
    }
    if (!clientData) {
      return;
    }
    try {
      const updatedClient = {
        name: clientData.name || "",
        surname: clientData.surname || "",
        phone_Number: parseInt(clientData.phone_Number) || 0,
        client_mail: clientData.client_mail || "",
        civilite: clientData.civilite || "",
        poste: clientData.poste || "",
      };
      
      // ✅ Mettre à jour pendingChantierData avec tous les champs du client
      setPendingChantierData((prev) => ({
        ...prev,
        client: updatedClient,
      }));
      
      // ✅ Mettre à jour aussi l'état client pour l'affichage immédiat
      setClient({
        name: updatedClient.name,
        surname: updatedClient.surname,
        civilite: updatedClient.civilite,
        poste: updatedClient.poste,
        client_mail: updatedClient.client_mail,
        phone_Number: String(updatedClient.phone_Number)
      });
      
      setShowClientInfoModal(false);
      
      // Si le client a plusieurs sociétés à choisir, ouvrir le modal de sélection
      if (selectedClientSocietes && selectedClientSocietes.length > 1) {
        setShowSelectSocieteModal(true);
      } else {
        // Sinon, ouvrir le modal de création/modification de société (avec données pré-remplies si disponibles)
        setShowSocieteInfoModal(true);
      }
    } catch (error) {
      console.error("Erreur lors de la soumission des informations client:", error);
    }
  };

  const handleSocieteInfoSubmit = async (societeData) => {
    const updatedSociete = {
      nom_societe: societeData.nom_societe || "",
      ville_societe: societeData.ville_societe || "",
      rue_societe: societeData.rue_societe || "",
      codepostal_societe: societeData.codepostal_societe || "",
    };
    
    // ✅ Vérifier si la société existe déjà (par nom et code postal)
    let existingSociete = null;
    try {
      existingSociete = await checkSocieteExists(updatedSociete);
    } catch (error) {
      console.error("Erreur lors de la vérification de la société:", error);
    }
    
    // ✅ IMPORTANT : Si l'utilisateur a modifié les informations d'une société sélectionnée,
    // on considère qu'il veut créer une nouvelle société (pas utiliser l'ID de l'ancienne)
    const hadSelectedSocieteId = pendingChantierData.societe?.id && selectedSocieteId;
    const societeWasModified = hadSelectedSocieteId && existingSociete && existingSociete.id !== selectedSocieteId;
    
    // ✅ Si la société existe ET qu'elle correspond à celle sélectionnée, utiliser son ID
    // Sinon, créer une nouvelle société
    const societeToStore = (existingSociete && !societeWasModified)
      ? {
          ...updatedSociete,
          id: existingSociete.id, // ✅ Utiliser l'ID de la société existante
        }
      : {
          ...updatedSociete,
          // ✅ Pas d'ID = sera créée lors de la sauvegarde
          needsCreation: true,
        };
    
    // ✅ Si l'utilisateur a modifié une société sélectionnée, ne pas conserver l'ancien ID
    setPendingChantierData((prev) => ({
      ...prev,
      societe: societeToStore,
    }));
    
    // ✅ Si une société existante a été trouvée ET qu'elle correspond à celle sélectionnée, mettre à jour selectedSocieteId
    if (existingSociete && !societeWasModified) {
      setSelectedSocieteId(existingSociete.id);
    } else {
      // ✅ Si nouvelle société ou société modifiée, réinitialiser selectedSocieteId
      setSelectedSocieteId(null);
    }
    
    // Mettre à jour aussi l'état societe pour l'affichage immédiat
    setSociete(updatedSociete);
    
    setShowSocieteInfoModal(false);
    setShowChantierForm(true);
  };

  // Fonction pour ouvrir le modal de sélection de client existant
  const handleOpenSelectClient = () => {
    setShowClientInfoModal(false);
    setShowSelectClientModal(true);
  };

  // Fonction pour gérer la sélection d'un client existant
  const handleSelectClient = async (clientData, societeData) => {
    try {
      // ✅ Pré-remplir TOUTES les données obligatoires du client
      const updatedClient = {
        name: clientData.name || "",
        surname: clientData.surname || "",
        phone_Number: clientData.phone_Number ? String(clientData.phone_Number) : "",
        client_mail: clientData.client_mail || "",
        civilite: clientData.civilite || "M.",
        poste: clientData.poste || "",
      };

      // ✅ Mettre à jour immédiatement pendingChantierData avec le client
      setPendingChantierData((prev) => ({
        ...prev,
        client: updatedClient,
      }));

      // ✅ Mettre à jour aussi l'état client pour l'affichage immédiat
      setClient(updatedClient);

      // Stocker les données pré-remplies pour le modal
      setPrefilledClientData(updatedClient);

      // Gérer les sociétés associées
      if (societeData) {
        if (societeData.multiple && societeData.societes && societeData.societes.length > 0) {
          // ✅ Plusieurs sociétés trouvées : ouvrir directement le modal de sélection
          if (societeData.societes.length === 1) {
            // Une seule société, la pré-remplir directement
            const societe = societeData.societes[0];
            const updatedSociete = {
              id: societe.id,
              nom_societe: societe.nom_societe || "",
              ville_societe: societe.ville_societe || "",
              rue_societe: societe.rue_societe || "",
              codepostal_societe: societe.codepostal_societe || "",
            };
            
            setPrefilledSocieteData(updatedSociete);
            setSelectedSocieteId(societe.id);
            
            // ✅ Mettre à jour pendingChantierData avec l'ID de la société
            setPendingChantierData((prev) => ({
              ...prev,
              societe: updatedSociete,
            }));
            
            // ✅ Mettre à jour aussi l'état societe pour l'affichage immédiat
            setSociete({
              nom_societe: updatedSociete.nom_societe,
              ville_societe: updatedSociete.ville_societe,
              rue_societe: updatedSociete.rue_societe,
              codepostal_societe: updatedSociete.codepostal_societe,
            });
            
            // Fermer le modal de sélection et ouvrir le modal client
            setShowSelectClientModal(false);
            setShowClientInfoModal(true);
          } else {
            // ✅ Plusieurs sociétés : stocker les sociétés et ouvrir directement SelectSocieteModal
            setSelectedClientSocietes(societeData.societes);
            
            // Fermer TOUS les modals (sélection client ET info client) et ouvrir directement le modal de sélection de société
            setShowSelectClientModal(false);
            setShowClientInfoModal(false); // ✅ Fermer aussi le modal client info
            setShowSelectSocieteModal(true);
          }
        } else {
          // Société unique trouvée directement
          const updatedSociete = {
            id: societeData.id,
            nom_societe: societeData.nom_societe || "",
            ville_societe: societeData.ville_societe || "",
            rue_societe: societeData.rue_societe || "",
            codepostal_societe: societeData.codepostal_societe || "",
          };
          
          setPrefilledSocieteData(updatedSociete);
          
          // ✅ Stocker l'ID de la société pour l'utiliser directement plus tard
          if (societeData.id) {
            setSelectedSocieteId(societeData.id);
            // Mettre à jour pendingChantierData avec l'ID de la société
            setPendingChantierData((prev) => ({
              ...prev,
              societe: updatedSociete,
            }));
            
            // ✅ Mettre à jour aussi l'état societe pour l'affichage immédiat
            setSociete({
              nom_societe: updatedSociete.nom_societe,
              ville_societe: updatedSociete.ville_societe,
              rue_societe: updatedSociete.rue_societe,
              codepostal_societe: updatedSociete.codepostal_societe,
            });
          }
          
          // Fermer le modal de sélection et ouvrir le modal client
          setShowSelectClientModal(false);
          setShowClientInfoModal(true);
        }
      } else {
        // ✅ Aucune société trouvée : l'utilisateur devra en créer une nouvelle
        // Réinitialiser les données de société pour permettre la création
        setPrefilledSocieteData(null);
        setSelectedSocieteId(null);
        setPendingChantierData((prev) => ({
          ...prev,
          societe: {
            nom_societe: "",
            ville_societe: "",
            rue_societe: "",
            codepostal_societe: "",
          },
        }));
        
        // Fermer le modal de sélection et ouvrir le modal client
        setShowSelectClientModal(false);
        setShowClientInfoModal(true);
      }
    } catch (error) {
      console.error("Erreur lors de la sélection du client:", error);
      alert("Erreur lors de la récupération des informations du client");
    }
  };

  // Fonction pour créer un nouveau client (bouton dans SelectClientModal)
  const handleCreateNewClient = () => {
    setShowSelectClientModal(false);
    setPrefilledClientData(null);
    setPrefilledSocieteData(null);
    setShowClientInfoModal(true);
  };

  const handleSocieteSelect = async (societeId) => {
    try {
      // Récupérer les données de la société
      const societeResponse = await axios.get(`/api/societe/${societeId}/`);
      const societeData = societeResponse.data;

      // Récupérer les données du client
      const clientResponse = await axios.get(
        `/api/client/${societeData.client_name}/`
      );
      const clientData = clientResponse.data;

      const updatedClient = {
        name: clientData.name || "",
        surname: clientData.surname || "",
        phone_Number: parseInt(clientData.phone_Number) || 0,
        client_mail: clientData.client_mail || "",
        civilite: clientData.civilite || "",
        poste: clientData.poste || "",
      };

      const updatedSociete = {
        id: societeId, // ✅ Stocker l'ID de la société
        nom_societe: societeData.nom_societe || "",
        ville_societe: societeData.ville_societe || "",
        rue_societe: societeData.rue_societe || "",
        codepostal_societe: societeData.codepostal_societe || "",
      };
      
      // Charger les contacts de la société
      await fetchContactsSociete(societeId);

      // ✅ IMPORTANT : Préserver le devisType si on est en mode "chantier" (appel d'offres)
      // et s'assurer que selectedChantierId reste null pour les appels d'offres
      const isAppelOffres = devisType === "chantier";
      
      // ✅ Mettre à jour pendingChantierData avec les données récupérées (incluant civilite et poste)
      setPendingChantierData((prev) => ({
        ...prev,
        client: updatedClient,
        societe: updatedSociete,
        // ✅ Préserver le chantier existant dans pendingChantierData (important pour les appels d'offres)
        chantier: prev.chantier || { id: -1, chantier_name: "", ville: "", rue: "", code_postal: "" }
      }));

      // ✅ Mettre à jour aussi les états client et societe pour l'affichage immédiat
      setClient({
        name: updatedClient.name,
        surname: updatedClient.surname,
        civilite: updatedClient.civilite,
        poste: updatedClient.poste,
        client_mail: updatedClient.client_mail,
        phone_Number: String(updatedClient.phone_Number)
      });

      setSociete({
        nom_societe: updatedSociete.nom_societe,
        ville_societe: updatedSociete.ville_societe,
        rue_societe: updatedSociete.rue_societe,
        codepostal_societe: updatedSociete.codepostal_societe,
      });

      setSelectedSocieteId(societeId);
      setSelectedClientSocietes(null); // Réinitialiser les sociétés filtrées
      
      // Charger les contacts de la société
      await fetchContactsSociete(societeId);
      
      // ✅ Pour les appels d'offres, s'assurer que selectedChantierId reste null
      // et que devisType reste "chantier"
      if (isAppelOffres) {
        setSelectedChantierId(null);
        // Ne pas changer devisType, il doit rester "chantier"
      }
      
      // ✅ Fermer tous les modals (sélection société ET client info) avant d'ouvrir le formulaire chantier
      setShowSelectSocieteModal(false);
      setShowClientInfoModal(false); // ✅ Fermer aussi le modal client
      setShowChantierForm(true);
    } catch (error) {
      console.error("Erreur lors de la sélection de la société:", error);
      alert(
        "Erreur lors de la récupération des données du client et de la société"
      );
    }
  };

  // Fonction pour générer le numéro de devis
  const generateDevisNumber = async (chantierIdParam = null) => {
    try {
      setIsGeneratingNumber(true);
      
      const chantierIdToUse = chantierIdParam !== null ? chantierIdParam : selectedChantierId;
      
      // Déterminer les paramètres selon le type de devis
      const isChantierExistant = chantierIdToUse && chantierIdToUse !== -1;
      
      const params = {};
      if (devisType === "chantier" || !isChantierExistant) {
        // Devis de travaux (appel d'offres ou pas de chantier existant)
        params.devis_chantier = 'true';
      } else {
        // Devis TS (chantier existant)
        params.chantier_id = chantierIdToUse;
        params.devis_chantier = 'false';
      }
      
      const response = await axios.get("/api/get-next-devis-number/", { params });
      
      // Le numéro est maintenant directement au bon format (sans suffixe)
      const numero = response.data.numero;
      
      setDevisData(prev => ({ ...prev, numero: numero }));
      return numero;
    } catch (error) {
      // Erreur lors de la génération du numéro de devis
      const currentYear = new Date().getFullYear();
      const chantierIdToUse = chantierIdParam !== null ? chantierIdParam : selectedChantierId;
      const isChantierExistant = chantierIdToUse && chantierIdToUse !== -1;
      
      // Déterminer le format de fallback selon le type
      let fallbackNumber;
      if (devisType === "chantier" || !isChantierExistant) {
        fallbackNumber = `Devis de travaux n°001.${currentYear}`;
      } else {
        fallbackNumber = `Devis de travaux n°001.${currentYear} - TS n°01`;
      }
      
      setDevisData(prev => ({ ...prev, numero: fallbackNumber }));
      return fallbackNumber;
    } finally {
      setIsGeneratingNumber(false);
    }
  };

  // Fonction pour charger les parties depuis l'API
  const loadParties = async (searchQuery = '') => {
    try {
      setIsLoadingParties(true);
      const response = await axios.get('/api/parties/');
      const allParties = response.data;
      
      // Filtrer les parties si une recherche est spécifiée
      let filteredParties = allParties;
      if (searchQuery) {
        filteredParties = allParties.filter(partie => 
          partie.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          partie.type.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setAvailableParties(allParties);
      return filteredParties;
    } catch (error) {
      // Erreur lors du chargement des parties
      return [];
    } finally {
      setIsLoadingParties(false);
    }
  };

  // Fonction pour rechercher les parties via l'endpoint dédié
  const searchPartiesAPI = async (searchQuery = '') => {
    try {
      setIsLoadingParties(true);
      const params = {};
      if (searchQuery) {
        params.q = searchQuery;
      }
      
      const response = await axios.get('/api/parties/search/', { params });
      return response.data.options;
    } catch (error) {
      // Erreur lors de la recherche des parties
      return [];
    } finally {
      setIsLoadingParties(false);
    }
  };

  // Fonction pour rechercher les parties (pour React Select)
  const searchParties = async (inputValue) => {
    try {
      // Utiliser le nouvel endpoint dédié
      const results = await searchPartiesAPI(inputValue);
      return results;
    } catch (error) {
      // Erreur lors de la recherche des parties
      return [];
    }
  };

  // Fonction pour gérer la sélection d'une partie
  const handlePartieSelect = (selectedOption) => {
    if (!selectedOption) return;
    
    setDevisItems(prevItems => {
      const alreadyExists = prevItems.some(item => item.type === 'partie' && item.id === selectedOption.value);
      if (alreadyExists) {
        return prevItems;
      }
      
      const parties = prevItems.filter(i => i.type === 'partie');
      const nextIndex = parties.length + 1;
      const numero = selectedOption.data?.numero || getNextPartieNumero(prevItems);
      
      const newPartie = {
        ...selectedOption.data,
        type: 'partie',
        id: selectedOption.value,
        index_global: nextIndex,
        titre: selectedOption.data.titre,
        type_activite: selectedOption.data.type,
        numero
      };
      
      const updated = sortByIndexGlobal([...prevItems, newPartie]);
      return reindexAll(updated);
    });
  };

  // Fonction pour créer une nouvelle partie
  const handlePartieCreate = async (inputValue) => {
    try {
      // Créer la partie en base de données
      const response = await axios.post('/api/parties/', {
        titre: inputValue,
        type: 'PEINTURE',
        is_deleted: false
      });
      
      const apiPartie = {
        id: response.data.id,
        titre: response.data.titre,
        type_activite: response.data.type,
        isNew: true
      };
      
      setPartiesToCreate(prev => [...prev, apiPartie]);
      
      // ✅ Créer newPartie en dehors de setDevisItems pour pouvoir le retourner
      const parties = devisItems.filter(i => i.type === 'partie');
      const nextIndex = parties.length + 1;
      const numero = getNextPartieNumero(devisItems);
      const newPartie = {
        ...apiPartie,
        type: 'partie',
        index_global: nextIndex,
        numero
      };
      
      setDevisItems(prevItems => {
        const updated = sortByIndexGlobal([...prevItems, newPartie]);
        return reindexAll(updated);
      });
      
      // ✅ Recharger la liste des parties disponibles pour la barre de recherche
      await loadParties();
      
      return {
        value: newPartie.id,
        label: newPartie.titre,
        data: newPartie
      };
    } catch (error) {
      // Erreur lors de la création de la partie
      const tempPartie = {
        id: `temp_${Date.now()}`,
        titre: inputValue,
        type_activite: 'PEINTURE',
        isNew: true,
        isTemp: true
      };
      
      setPartiesToCreate(prev => [...prev, tempPartie]);
      
      // ✅ Créer newPartie en dehors de setDevisItems
      const parties = devisItems.filter(i => i.type === 'partie');
      const nextIndex = parties.length + 1;
      const numero = getNextPartieNumero(devisItems);
      const newPartie = {
        ...tempPartie,
        type: 'partie',
        index_global: nextIndex,
        numero
      };
      
      setDevisItems(prevItems => {
        const updated = sortByIndexGlobal([...prevItems, newPartie]);
        return reindexAll(updated);
      });
      
      return {
        value: tempPartie.id,
        label: tempPartie.titre,
        data: tempPartie
      };
    }
  };

  // Fonction pour supprimer une partie sélectionnée
  const handlePartieRemove = async (partieId) => {
    // ✅ Supprimer la partie ET tous ses enfants de devisItems
    setDevisItems(prev => {
      // Trouver toutes les sous-parties de cette partie
      const sousPartiesIds = prev
        .filter(item => item.type === 'sous_partie' && item.partie_id === partieId)
        .map(sp => sp.id);
      
      // Supprimer : partie + sous-parties + lignes détails + lignes spéciales
      return prev.filter(item => {
        if (item.type === 'partie' && item.id === partieId) return false;
        if (item.type === 'sous_partie' && item.partie_id === partieId) return false;
        if (item.type === 'ligne_detail' && sousPartiesIds.includes(item.sous_partie_id)) return false;
        if (item.type === 'ligne_speciale' && item.context_type === 'partie' && item.context_id === partieId) return false;
        if (item.type === 'ligne_speciale' && item.context_type === 'sous_partie' && sousPartiesIds.includes(item.context_id)) return false;
        return true;
      });
    });
    
    // Si c'était une nouvelle partie, la retirer de la liste à créer
    setPartiesToCreate(prev => prev.filter(p => p.id !== partieId));
    
    // ✅ Recharger la liste des parties disponibles pour qu'elle réapparaisse dans la barre de recherche
    await loadParties();
  };

  // Fonction pour éditer une partie sélectionnée
  const handlePartieEdit = (partieId) => {
    const partie = devisItems.find(item => item.type === 'partie' && item.id === partieId);
    if (partie) {
      const newTitre = prompt('Modifier le titre de la partie:', partie.titre);
      if (newTitre && newTitre.trim() !== partie.titre) {
        // ✅ Mettre à jour directement dans devisItems
        setDevisItems(prev => prev.map(item =>
          item.type === 'partie' && item.id === partieId
            ? { ...item, titre: newTitre.trim() }
            : item
        ));
        
        // Si c'est une partie existante, mettre à jour en base de données
        if (!partie.isNew && !partie.isTemp) {
          updatePartieInDB(partieId, newTitre.trim());
        }
      }
    }
  };

  // Fonction pour mettre à jour une partie en base de données
  const updatePartieInDB = async (partieId, newTitre) => {
    try {
      await axios.patch(`/api/parties/${partieId}/`, {
        titre: newTitre
      });
    } catch (error) {
      // Erreur lors de la mise à jour de la partie
    }
  };

  // Fonction pour modifier le numéro d'une partie
  const handlePartieNumeroChange = (partieId, newNumero) => {
    // ✅ Mettre à jour directement dans devisItems
    setDevisItems(prev => prev.map(item =>
      item.type === 'partie' && item.id === partieId
        ? { ...item, numero: newNumero }
        : item
    ));
  };

  // Fonction pour gérer la réorganisation des parties via drag & drop
  const handlePartiesReorder = (reorderedParties) => {
    // ✅ Cette fonction est appelée par DevisTable après le drag & drop
    // Les index ont déjà été recalculés par DevisIndexManager.reorderAfterDrag
    // Plus rien à faire ici, devisItems a déjà été mis à jour par handleDevisItemsReorder
  };

  // ========== HANDLERS POUR SOUS-PARTIES ==========
  
  // Sélectionner une sous-partie existante
  const handleSousPartieSelect = (partieId, sousPartie) => {
    if (!sousPartie) return;
    
    setDevisItems(prevItems => {
      const partie = prevItems.find(i => i.type === 'partie' && i.id === partieId);
      if (!partie) {
        return prevItems;
      }
      
      const nextIndex = getNextIndex(prevItems, 'partie', partieId) || (partie.index_global + 0.1);
      const numero = sousPartie.numero || getNextSousPartieNumero(prevItems, partieId);
      
      const newSousPartie = {
        ...sousPartie,
        type: 'sous_partie',
        id: sousPartie.id,
        index_global: nextIndex,
        partie_id: partieId,
        numero
      };
      
      const alreadyExists = prevItems.some(item => item.type === 'sous_partie' && item.id === sousPartie.id);
      if (alreadyExists) {
        return prevItems;
      }
      
      return sortByIndexGlobal([...prevItems, newSousPartie]);
    });
  };

  // Créer une nouvelle sous-partie
  const handleSousPartieCreate = async (partieId, description) => {
    try {
      const response = await axios.post('/api/sous-parties/', {
        partie: partieId,
        description: description
      });
      
      if (response.data) {
        handleSousPartieSelect(partieId, {
          ...response.data,
          numero: ''
        });
      }
    } catch (error) {
      // Erreur lors de la création de la sous-partie
    }
  };

  // Supprimer une sous-partie
  const handleSousPartieRemove = (partieId, sousPartieId) => {
    // ✅ Supprimer la sous-partie ET toutes ses lignes de devisItems
    setDevisItems(prev => prev.filter(item => {
      if (item.type === 'sous_partie' && item.id === sousPartieId) return false;
      if (item.type === 'ligne_detail' && item.sous_partie_id === sousPartieId) return false;
      if (item.type === 'ligne_speciale' && item.context_type === 'sous_partie' && item.context_id === sousPartieId) return false;
      return true;
    }));
  };

  // Éditer une sous-partie
  const handleSousPartieEdit = async (partieId, sousPartieId) => {
    const sousPartie = devisItems.find(item => item.type === 'sous_partie' && item.id === sousPartieId);
    if (!sousPartie) return;
    
    const newDescription = prompt('Modifier la description:', sousPartie.description);
    if (newDescription && newDescription.trim()) {
      try {
        await axios.patch(`/api/sous-parties/${sousPartieId}/`, {
          description: newDescription.trim()
        });
        
        // ✅ Mettre à jour directement dans devisItems
        setDevisItems(prev => prev.map(item =>
          item.type === 'sous_partie' && item.id === sousPartieId
            ? { ...item, description: newDescription.trim() }
            : item
        ));
      } catch (error) {
        // Erreur lors de la modification de la sous-partie
      }
    }
  };

  // Changer le numéro d'une sous-partie (prend en compte le préfixe de la partie si numérique)
  const handleSousPartieNumeroChange = (partieId, sousPartieId, newNumero) => {
    const partie = devisItems.find(item => item.type === 'partie' && item.id === partieId);
    if (!partie) return;
    
    const parentNumero = partie.numero;
    const isParentNumeric = parentNumero && /^\d+$/.test(parentNumero);
    
    // Si on enlève le numéro
    if (newNumero === '') {
      setDevisItems(prev => prev.map(item =>
        item.type === 'sous_partie' && item.id === sousPartieId
          ? { ...item, numero: '' }
          : item
      ));
      return;
    }
    
    // Si on attribue un numéro automatique, s'assurer du format
    let finalNumero = newNumero;
    if (isParentNumeric && /^\d+$/.test(newNumero)) {
      finalNumero = `${parentNumero}.${newNumero}`;
    }
    
    // ✅ Mettre à jour directement dans devisItems
    setDevisItems(prev => prev.map(item =>
      item.type === 'sous_partie' && item.id === sousPartieId
        ? { ...item, numero: finalNumero }
        : item
    ));
  };

  // Réorganiser les sous-parties via drag & drop (système hiérarchique)
  const handleSousPartiesReorder = (partieId, result) => {
    // ✅ Cette fonction est appelée par DevisTable après le drag & drop
    // Les index ont déjà été recalculés par DevisIndexManager.reorderAfterDrag
    // Plus rien à faire ici, devisItems a déjà été mis à jour par handleDevisItemsReorder
  };

  // ========== HANDLERS POUR LIGNES DE DÉTAIL ==========

  // Ajouter une ligne de détail à une sous-partie sélectionnée
  const handleLigneDetailSelect = (partieId, sousPartieId, ligneDetail) => {
    // ✅ Utiliser le manager pour calculer le prochain index
    const nextIndex = getNextIndex(devisItems, 'sous_partie', sousPartieId);
    
    if (!nextIndex) {
      return;
    }
    
    // Créer la nouvelle ligne détail
    const newLigneDetail = {
      ...ligneDetail,
      type: 'ligne_detail',
      id: ligneDetail.id,
      index_global: nextIndex,
      sous_partie_id: sousPartieId,
      quantity: 0
    };
    
    // Ajouter directement dans devisItems
    setDevisItems(prev => sortByIndexGlobal([...prev, newLigneDetail]));
  };

  // Créer une ligne de détail (TODO: compléter la création serveur si besoin)
  const handleLigneDetailCreate = async (sousPartieId, description) => {
    // Création de ligne de détail (à implémenter côté API)
  };

  // Changer la quantité d'une ligne de détail
  const handleLigneDetailQuantityChange = (partieId, sousPartieId, ligneDetailId, quantity) => {
    // ✅ Mettre à jour directement devisItems (source de vérité unique)
    setDevisItems(prev => prev.map(item => {
      if (item.type === 'ligne_detail' && item.id === ligneDetailId) {
        return { ...item, quantity };
      }
      return item;
    }));
  };

  // Retirer une ligne de détail du devis
  const handleLigneDetailRemove = (partieId, sousPartieId, ligneDetailId) => {
    // ✅ Supprimer directement de devisItems
    setDevisItems(prev => prev.filter(item => 
      !(item.type === 'ligne_detail' && item.id === ligneDetailId)
    ));
  };

  // Éditer une ligne de détail (modal d'édition)
  const handleLigneDetailEdit = (ligneDetail) => {
    // Le modal d'édition est géré par DevisTable
  };

  // Modifier la marge d'une ligne de détail (ce qui recalcule le prix unitaire)
  const handleLigneDetailMargeChange = (partieId, sousPartieId, ligneDetailId, marge) => {
    // ✅ Mettre à jour directement devisItems (source de vérité unique)
    setDevisItems(prev => prev.map(item => {
      if (item.type === 'ligne_detail' && item.id === ligneDetailId) {
        // Calculer le nouveau prix basé sur la marge
        const cout_total = parseFloat(item.cout_main_oeuvre || 0) + parseFloat(item.cout_materiel || 0);
        const taux_fixe = parseFloat(item.taux_fixe || 0);
        const prix_base = cout_total * (1 + taux_fixe / 100);
        const prix_calcule = prix_base * (1 + marge / 100);
        
        return { 
          ...item, 
          marge_devis: marge,
          prix_devis: prix_calcule
        };
      }
      return item;
    }));
  };

  // Modifier directement le prix unitaire d'une ligne de détail
  const handleLigneDetailPriceChange = (partieId, sousPartieId, ligneDetailId, prix) => {
    // ✅ Mettre à jour directement devisItems (source de vérité unique)
    setDevisItems(prev => prev.map(item => {
      if (item.type === 'ligne_detail' && item.id === ligneDetailId) {
        // Calculer la marge implicite
        const cout_total = parseFloat(item.cout_main_oeuvre || 0) + parseFloat(item.cout_materiel || 0);
        const taux_fixe = parseFloat(item.taux_fixe || 0);
        const prix_base = cout_total * (1 + taux_fixe / 100);
        const marge_implicite = prix_base > 0 ? ((prix / prix_base) - 1) * 100 : 0;
        
        return { 
          ...item, 
          prix_devis: prix,
          marge_devis: marge_implicite
        };
      }
      return item;
    }));
  };

  // ===== HANDLERS POUR LIGNES SPÉCIALES V2 =====
  
  // Ajouter une ligne en attente
  const handleAddPendingSpecialLine = (line, requiresBaseSelection = false) => {
    if (requiresBaseSelection) {
      // La ligne est de type % sans base : activer le mode de sélection
      setPendingLineForBase(line);
      setIsSelectingBase(true);
    } else {
      // Mettre la ligne en attente de placement (l'utilisateur va cliquer sur le tableau)
      setLineAwaitingPlacement(line);
    }
  };
  
  // ✅ Utiliser TOUTES les fonctions du DevisIndexManager
  const { 
    roundIndex, 
    reindexSousPartie, 
    reindexPartie, 
    reindexAll,
    getPartiePrefix,
    getSousPartieIndex,
    getNextIndex,
    sortByIndexGlobal,
    insertAtPosition,
    reorderAfterDrag
  } = DevisIndexManager;

  /**
   * Valider que tous les éléments ont un index_global valide
   * Utile pour détecter les problèmes de synchronisation
   */
  const validateIndexes = (items, context = '') => {
    const errors = [];
    items.forEach(item => {
      if (item.index_global === undefined || item.index_global === null || isNaN(item.index_global)) {
        errors.push({
          type: item.type,
          id: item.id,
          description: item.description || item.designation || 'N/A',
          index_global: item.index_global
        });
      }
    });
    
    if (errors.length > 0) {
      return false;
    }
    
    return true;
  };
  
  const hydrateDraftState = React.useCallback((draft) => {
    if (!draft || typeof draft !== 'object') {
      return;
    }
    
    try {
      if (draft.devisData) {
        setDevisData(prev => ({
          ...prev,
          ...draft.devisData,
          date_creation: draft.devisData.date_creation || prev.date_creation
        }));
      }
      
      if (draft.client) {
        setClient(prev => ({
          ...prev,
          ...draft.client
        }));
      }
      
      if (draft.societe) {
        setSociete(prev => ({
          ...prev,
          ...draft.societe
        }));
      }
      
      if (draft.chantier) {
        setChantier(prev => ({
          ...prev,
          ...draft.chantier
        }));
      }
      
      if (Array.isArray(draft.devisItems)) {
        setDevisItems(draft.devisItems);
      }
      
      if (Array.isArray(draft.pendingSpecialLines)) {
        setPendingSpecialLines(draft.pendingSpecialLines);
      }
      
      if (Array.isArray(draft.special_lines_global)) {
        setSpecialLinesGlobal(draft.special_lines_global);
      }
      
      if (draft.pendingChantierData) {
        setPendingChantierData(prev => ({
          ...prev,
          ...draft.pendingChantierData,
          client: {
            ...prev.client,
            ...draft.pendingChantierData.client
          },
          societe: {
            ...prev.societe,
            ...draft.pendingChantierData.societe
          },
          chantier: {
            ...prev.chantier,
            ...draft.pendingChantierData.chantier
          }
        }));
      }
      
      if (draft.pendingLineForBase !== undefined) {
        setPendingLineForBase(draft.pendingLineForBase);
      }
      
      if (draft.lineAwaitingPlacement !== undefined) {
        setLineAwaitingPlacement(draft.lineAwaitingPlacement);
      }

      if (draft.recurringLineDraft !== undefined) {
        setRecurringLineDraft(draft.recurringLineDraft);
      }
      
      if (typeof draft.isSelectingBase === 'boolean') {
        setIsSelectingBase(draft.isSelectingBase);
      }
      
      if (typeof draft.selectedChantierId !== 'undefined') {
        setSelectedChantierId(draft.selectedChantierId ?? null);
      }
      
      if (typeof draft.devisType === 'string') {
        setDevisType(draft.devisType);
      }
      
      if (typeof draft.tauxFixe === 'number') {
        setTauxFixe(draft.tauxFixe);
      }
    } catch (error) {
    }
  }, []);
  
  useEffect(() => {
    if (!draftStorageKey || isDraftHydrated) {
      return;
    }
    
    try {
      const rawDraft = localStorage.getItem(draftStorageKey);
      if (rawDraft) {
        const parsedDraft = JSON.parse(rawDraft);
        hydrateDraftState(parsedDraft);
      }
    } catch (error) {
    } finally {
      setIsDraftHydrated(true);
    }
  }, [draftStorageKey, isDraftHydrated, hydrateDraftState]);
  
  useEffect(() => {
    if (!draftStorageKey || !isDraftHydrated) {
      return;
    }
    
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
    }
    
    draftSaveTimeoutRef.current = setTimeout(() => {
      const draftPayload = {
        devisData,
        client,
        societe,
        chantier,
        special_lines_global,
        pendingSpecialLines,
        devisItems,
        selectedChantierId,
        pendingChantierData,
        devisType,
        tauxFixe,
        lineAwaitingPlacement,
        pendingLineForBase,
      isSelectingBase,
      recurringLineDraft
      };
      
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify(draftPayload));
      } catch (error) {
      }
    }, 400);
    
    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [
    draftStorageKey,
    isDraftHydrated,
    devisData,
    client,
    societe,
    chantier,
    special_lines_global,
    pendingSpecialLines,
    devisItems,
    selectedChantierId,
    pendingChantierData,
    devisType,
    tauxFixe,
    lineAwaitingPlacement,
    pendingLineForBase,
    isSelectingBase
  ]);
  
  useEffect(() => {
    return () => {
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, []);
  
  const clearDraftStorage = React.useCallback(() => {
    if (!draftStorageKey) {
      return;
    }
    
    try {
      localStorage.removeItem(draftStorageKey);
    } catch (error) {
    }
  }, [draftStorageKey]);
  
  const resetDevisFormState = React.useCallback(() => {
    setDevisData(createInitialDevisData());
    setClient(createInitialClientState());
    setSociete(createInitialSocieteState());
    setChantier(createInitialChantierState());
    setSpecialLinesGlobal([]);
    setPendingSpecialLines([]);
    setEditingSpecialLine(null);
    setShowEditModal(false);
    setLineAwaitingPlacement(null);
    setIsSelectingBase(false);
    setPendingLineForBase(null);
    setRecurringLineDraft(null);
    setDevisItems([]);
    setSelectedChantierId(null);
    setPendingChantierData(createInitialPendingChantierData());
    setSelectedSocieteId(null);
    setDevisType("normal");
    setTauxFixe(20);
    setPartiesToCreate([]);
    setIsReordering(false);
    setShowChantierForm(false);
    setShowClientInfoModal(false);
    setShowSocieteInfoModal(false);
    setShowSelectSocieteModal(false);
    setClientId(null);
    setNextTsNumber(null);
    setTotalHt(0);
    setTva(0);
    setMontantTtc(0);
    setChantierDrivePath(null); // ✅ Réinitialiser le drive_path du chantier
    setCustomDrivePath(null); // ✅ Réinitialiser aussi le chemin personnalisé
  }, []);

  // ✅ Plus besoin de synchronisation : devisItems est la source de vérité unique

  // Placer la ligne à un endroit spécifique du tableau (système hiérarchique)
  const handlePlaceLineAt = (position) => {
    if (!lineAwaitingPlacement) return;
    
    const line = lineAwaitingPlacement;
    
    // ✅ Activer isReordering pour éviter la boucle de synchronisation
    setIsReordering(true);
    
    // Préparer la nouvelle ligne spéciale
    const { isMoving, originalId, data, ...lineWithoutFlags } = line;
    
    const newLine = {
      ...lineWithoutFlags,
      id: isMoving ? line.id : (line.id || Date.now().toString()),
      description: data?.description || line.description || '',
      value: data?.value || line.value,
      value_type: data?.valueType || line.value_type,
      type_speciale: data?.type || line.type_speciale,
      baseCalculation: line.baseCalculation,
      base_calculation: line.base_calculation,
      styles: line.styles,
      isMoving,
      originalId
    };
    
    // ✅ Utiliser le DevisIndexManager pour l'insertion
    const updated = DevisIndexManager.insertAtPosition(devisItems, newLine, position);
    
    setDevisItems(updated);
    setLineAwaitingPlacement(null);
    
    // ✅ Désactiver le flag après un délai
    setTimeout(() => setIsReordering(false), 100);
  };

  const handleAutoPlaceRecurringLine = React.useCallback(() => {
    if (!recurringLineDraft) {
      return;
    }

    setIsReordering(true);

    const newLine = {
      ...recurringLineDraft,
      id: recurringLineDraft.id || `recurring_special_line_${Date.now()}`,
      context_type: 'global',
      context_id: null
    };

    setDevisItems(prevItems => {
      const updated = DevisIndexManager.insertAtPosition(prevItems, newLine, 'global_end');
      return reindexAll(updated);
    });
    setRecurringLineDraft(null);

    setTimeout(() => setIsReordering(false), 100);
  }, [recurringLineDraft, devisItems, reindexAll]);


  // Supprimer une ligne en attente
  const handleRemovePendingSpecialLine = (lineId) => {
    setPendingSpecialLines(prev => prev.filter(line => line.id !== lineId));
  };

  // Supprimer une ligne spéciale placée (sans recalculer les index_global)
  const handleRemoveSpecialLine = (lineId) => {
    setDevisItems(prev => prev.filter(item => !(item.type === 'ligne_speciale' && item.id === lineId)));
  };
  
  // ✅ NOUVEAU : Déplacer une ligne spéciale existante via le bouton
  const handleMoveSpecialLine = (lineId) => {
    // Trouver la ligne spéciale dans devisItems
    const lineToMove = devisItems.find(item => item.type === 'ligne_speciale' && item.id === lineId);
    
    if (!lineToMove) {
      return;
    }
    
    // Mettre la ligne en mode "en attente de placement"
    // L'utilisateur va ensuite cliquer sur le tableau pour choisir la nouvelle position
    setLineAwaitingPlacement({
      ...lineToMove,
      isMoving: true, // Flag pour indiquer qu'on déplace (pas une création)
      originalId: lineId // Garder l'ID original pour la suppression
    });
  };

  // Gérer la sélection de base pour une ligne spéciale en %
  const handleBaseSelected = (baseInfo) => {
    // baseInfo contient : { type: 'partie'/'sous_partie'/'global', id: X, label: 'Partie A' }
    if (!pendingLineForBase) return;
    
    // Mettre à jour la ligne avec la base sélectionnée
    const updatedLine = {
      ...pendingLineForBase,
      baseCalculation: baseInfo
    };
    
    // Stocker la ligne mise à jour pour la réédition dans le modal
    setPendingLineForBase(updatedLine);
    
    // Désactiver le mode de sélection
    setIsSelectingBase(false);
    
    // NE PAS créer la ligne automatiquement, le modal va se rouvrir
    // Le modal se rouvrira automatiquement via la prop pendingLineForBase
  };

  // Ouvrir modal d'édition
  const handleEditSpecialLine = (line) => {
    setEditingSpecialLine(line);
    setShowEditModal(true);
  };

  // Sauvegarder ligne éditée
  const handleSaveSpecialLine = (updatedLine) => {
    // Mettre à jour la ligne spéciale dans devisItems
    const updatedItems = devisItems.map(item => {
      if (item.type === 'ligne_speciale' && item.id === updatedLine.id) {
        return {
          ...item,
          description: updatedLine.data?.description || updatedLine.description,
          value: updatedLine.data?.value || updatedLine.value,
          value_type: updatedLine.data?.valueType || updatedLine.value_type,
          type_speciale: updatedLine.data?.type || updatedLine.type_speciale,
          styles: updatedLine.styles || item.styles,
          baseCalculation: updatedLine.baseCalculation || item.baseCalculation
        };
      }
      return item;
    });
    
    setDevisItems(updatedItems);
    
    // Aussi mettre à jour pendingSpecialLines si la ligne y est encore
    setPendingSpecialLines(prev => prev.map(line => 
      line.id === updatedLine.id ? updatedLine : line
    ));
    
    setShowEditModal(false);
    setEditingSpecialLine(null);
  };

  // Réordonner les lignes spéciales
  const handleSpecialLinesReorder = (newLines) => {
    setPendingSpecialLines(newLines);
  };

  // ===== HANDLERS POUR LE SYSTÈME UNIFIÉ =====

  // ✅ Plus besoin de convertir : devisItems est la source de vérité unique

  // ✅ Plus besoin de useEffect : devisItems est la source de vérité unique, géré directement par les handlers

  // Fonction de recalcul des numéros (côté frontend)
  // Recalcule automatiquement les numéros après réorganisation
  const recalculateNumeros = (items) => {
    // Trier par index_global
    const sorted = [...items].sort((a, b) => a.index_global - b.index_global);
    
    // Recalculer les numéros seulement pour les éléments qui en ont
    return sorted.map(item => {
      // Si l'élément n'a pas de numéro, le laisser tel quel
      if (!item.numero) return item;
      
      // Calculer le nouveau numéro basé sur la position
      const newNumero = generateNumero(item, sorted);
      return { ...item, numero: newNumero };
    });
  };

  const generateNumero = (item, allItems) => {
    const findParentById = (parentId) => {
      return allItems.find(e => e.id === parentId);
    };

    if (item.type === 'partie') {
      // Compter uniquement les parties NUMÉROTÉES avant celle-ci
      const partiesNumeroteesBefore = allItems.filter(
        e => e.type === 'partie' && 
        e.index_global < item.index_global &&
        e.numero && /^\d+$/.test(e.numero) // Seulement les numéros simples (1, 2, 3...)
      );
      return String(partiesNumeroteesBefore.length + 1);
    }

    if (item.type === 'sous_partie') {
      const partie = findParentById(item.partie_id);
      if (!partie || !partie.numero) return ''; // Si pas de partie ou partie sans numéro, pas de numéro
      
      // Regex pour les sous-parties qui suivent le pattern "X.Y" où X = numéro de la partie
      const regex = new RegExp('^' + partie.numero + '\\.(\\d+)$');
      
      const sousPartiesNumeroteesBefore = allItems.filter(
        e => e.type === 'sous_partie' && 
        e.partie_id === item.partie_id && 
        e.index_global < item.index_global &&
        e.numero && regex.test(e.numero) // Compter seulement les sous-parties avec le bon format
      );
      
      return `${partie.numero}.${sousPartiesNumeroteesBefore.length + 1}`;
    }

    if (item.type === 'ligne_detail') {
      const sousPartie = findParentById(item.sous_partie_id);
      if (!sousPartie || !sousPartie.numero) return ''; // Si pas de sous-partie ou sous-partie sans numéro, pas de numéro
      
      // Regex pour les lignes qui suivent le pattern "X.Y.Z" où X.Y = numéro de la sous-partie
      const regex = new RegExp('^' + sousPartie.numero.replace(/\./g, '\\.') + '\\.(\\d+)$');
      
      const lignesNumeroteesBefore = allItems.filter(
        e => e.type === 'ligne_detail' && 
        e.sous_partie_id === item.sous_partie_id && 
        e.index_global < item.index_global &&
        e.numero && regex.test(e.numero) // Compter seulement les lignes avec le bon format
      );
      
      return `${sousPartie.numero}.${lignesNumeroteesBefore.length + 1}`;
    }

    if (item.type === 'ligne_speciale') {
      const previousItems = allItems.filter(e => e.index_global < item.index_global);
      if (previousItems.length === 0) return '0.1';
      
      const lastItem = previousItems[previousItems.length - 1];
      const lastNumero = lastItem.numero || '0';
      const parts = lastNumero.split('.');
      
      if (parts.length === 1) {
        return `${parts[0]}.1`;
      } else if (parts.length === 2) {
        return `${parts[0]}.${parts[1]}.1`;
      } else {
        try {
          const lastPart = parseInt(parts[parts.length - 1]);
          const newParts = [...parts.slice(0, -1), String(lastPart + 1)];
          return newParts.join('.');
        } catch {
          return `${parts.join('.')}.1`;
        }
      }
    }

    return '0';
  };

  // Handler de réordonnancement unifié (système hiérarchique)
  const handleDevisItemsReorder = async (reorderedItems) => {
    // ⚠️ Cette fonction doit recevoir TOUS les items, y compris les lignes spéciales
    // Si appelée sans lignes spéciales, cela causera leur disparition
    
    // Activer le flag pour éviter la synchro
    setIsReordering(true);
    
    // ✅ Dédupliquer les items reçus (au cas où)
    const uniqueItems = [];
    const seenIds = new Map();
    reorderedItems.forEach(item => {
      const key = `${item.type}_${item.id}`;
      if (!seenIds.has(key)) {
        seenIds.set(key, item);
        uniqueItems.push(item);
      }
    });
    
    // ✅ Les items sont déjà réordonnés par DevisTable avec les bons index_global
    // On les trie juste pour être sûr
    const sorted = DevisIndexManager.sortByIndexGlobal(uniqueItems);
    
    // Recalculer les numéros d'affichage
    const withNumeros = recalculateNumeros(sorted);
    
    setDevisItems(withNumeros);
    
    // ✅ Désactiver le flag après un délai
    setTimeout(() => setIsReordering(false), 100);
    
    // Sauvegarder en BDD seulement si le devis existe (a un ID)
    if (devisData.id) {
      try {
        // 1. Créer/mettre à jour les lignes spéciales en BDD
        const specialLines = withNumeros.filter(item => item.type === 'ligne_speciale');
        
        for (const line of specialLines) {
          // Vérifier si la ligne a déjà un ID numérique (sauvegardée en BDD)
          const isNewLine = typeof line.id === 'string' || !line.devis;
          
          if (isNewLine) {
            // Préparer base_calculation SANS amount (pour calcul dynamique)
            const baseCalcToSave = line.base_calculation ? {
              type: line.base_calculation.type,
              id: line.base_calculation.id,
              label: line.base_calculation.label
              // ❌ Ne PAS sauvegarder amount
            } : null;

            // Créer la ligne en BDD
            const response = await axios.post(`/api/devis/${devisData.id}/ligne-speciale/create/`, {
              description: line.description,
              type_speciale: line.type_speciale,
              value_type: line.value_type,
              value: line.value,
              base_calculation: baseCalcToSave,
              styles: line.styles,
              index_global: line.index_global,
              context_type: line.context_type,
              context_id: line.context_id
            });
            
            // Mettre à jour l'ID avec celui de la BDD
            line.id = response.data.id;
          } else {
            // Mettre à jour la ligne existante
            await axios.put(`/api/devis/${devisData.id}/ligne-speciale/${line.id}/update/`, {
              index_global: line.index_global,
              context_type: line.context_type,
              context_id: line.context_id
            });
          }
        }
        
        // 2. Sauvegarder l'ordre global de tous les items
        await axios.post(`/api/devis/${devisData.id}/update-order/`, {
          items: withNumeros.map(item => ({
            type: item.type,
            id: item.id,
            index_global: item.index_global
          }))
        });
      } catch (error) {
        // Erreur sauvegarde ordre
      }
    }
  };

  // Calculer le prix d'une ligne de détail
  const calculatePrice = (ligne) => {
    // Si un prix_devis existe (prix personnalisé pour ce devis), l'utiliser
    if (ligne.prix_devis !== null && ligne.prix_devis !== undefined) {
      return parseFloat(ligne.prix_devis);
    }
    
    const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre) || 0;
    const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
    
    // Si pas de coûts, utiliser le prix de base (prix manuel ou prix du catalogue)
    if (cout_main_oeuvre === 0 && cout_materiel === 0) {
      return parseFloat(ligne.prix) || 0;
    }
    
    // Sinon, calculer avec les coûts
    const marge = ligne.marge_devis !== null && ligne.marge_devis !== undefined 
      ? parseFloat(ligne.marge_devis)
      : parseFloat(ligne.marge) || 0;
    
    const taux_fixe = parseFloat(ligne.taux_fixe) || 0;
    
    const base = cout_main_oeuvre + cout_materiel;
    const montant_taux_fixe = base * (taux_fixe / 100);
    const sous_total = base + montant_taux_fixe;
    const montant_marge = sous_total * (marge / 100);
    const prix = sous_total + montant_marge;
    
    return prix;
  };

  // Calculer toutes les bases brutes (sans lignes spéciales)
  const calculerBasesBrutes = () => {
    const bases = {
      sousParties: {},
      parties: {},
      global: 0
    };
    
    // 1. Calculer les bases des sous-parties (somme des lignes de détail)
    devisItems
      .filter(item => item.type === 'sous_partie')
      .forEach(sp => {
        const totalLignes = devisItems
          .filter(item => item.type === 'ligne_detail' && item.sous_partie_id === sp.id)
          .reduce((sum, ligne) => {
            const prix = calculatePrice(ligne);
            return sum + (prix * (ligne.quantity || 0));
          }, 0);
        
        bases.sousParties[sp.id] = totalLignes;
      });
    
    // 2. Calculer les bases des parties (somme des bases des sous-parties)
    devisItems
      .filter(item => item.type === 'partie')
      .forEach(partie => {
        const totalSPs = devisItems
          .filter(item => item.type === 'sous_partie' && item.partie_id === partie.id)
          .reduce((sum, sp) => sum + (bases.sousParties[sp.id] || 0), 0);
        
        bases.parties[partie.id] = totalSPs;
      });
    
    // 3. Calculer la base globale (somme des bases des parties)
    bases.global = devisItems
      .filter(item => item.type === 'partie')
      .reduce((sum, partie) => sum + (bases.parties[partie.id] || 0), 0);
    
    return bases;
  };

  // Calculer le montant d'une ligne spéciale
  const calculerMontantLigneSpeciale = (ligneSpeciale, bases, excludeLineId = null) => {
    const value = parseFloat(ligneSpeciale.value || 0);
    
    // Si montant fixe, retourner directement
    if (ligneSpeciale.value_type === 'fixed') {
      return value;
    }
    
    // Si pourcentage, utiliser baseCalculation
    if (ligneSpeciale.value_type === 'percentage' && ligneSpeciale.baseCalculation) {
      const baseCalc = ligneSpeciale.baseCalculation;
      let base = 0;
      
      // Récupérer la base selon le type
      if (baseCalc.type === 'sous_partie' && baseCalc.id) {
        base = bases.sousParties[baseCalc.id] || 0;
      } else if (baseCalc.type === 'partie' && baseCalc.id) {
        base = bases.parties[baseCalc.id] || 0;
      } else if (baseCalc.type === 'global') {
        // Pour le type global, calculer le total SANS cette ligne pour éviter la récursion
        base = calculateGlobalTotalExcludingLine(ligneSpeciale.id || excludeLineId);
      }
      
      return base * (value / 100);
    }
    
    // Si pourcentage sans baseCalculation, retourner 0 (cas d'erreur)
    return 0;
  };

  // Calculer le total global SANS une ligne spéciale spécifique (pour éviter la récursion)
  const calculateGlobalTotalExcludingLine = (excludeLineId = null) => {
    // Calculer d'abord toutes les bases brutes
    const bases = calculerBasesBrutes();
    
    // Base : somme des parties (avec leurs lignes spéciales déjà incluses)
    let total = devisItems
      .filter(item => item.type === 'partie')
      .reduce((sum, partie) => sum + calculatePartieTotal(partie), 0);
    
    // Récupérer les lignes spéciales globales, triées par index_global, en excluant celle spécifiée
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'global' &&
        item.id !== excludeLineId
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    // Appliquer les lignes spéciales séquentiellement
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases, excludeLineId);
      
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
      // Note : les lignes 'display' n'affectent pas le total
    });
    
    return total;
  };

  // Calculer le total global
  const calculateGlobalTotal = () => {
    return calculateGlobalTotalExcludingLine(null);
  };

  const calculateRecurringLineAmount = React.useCallback((lineOrId) => {
    const targetId = typeof lineOrId === 'object' ? lineOrId.id : lineOrId;
    if (!targetId) {
      return 0;
    }
    const targetLine = devisItems.find(item => item.id === targetId);
    if (!targetLine || targetLine.index_global === undefined) {
      return 0;
    }
    const sortedItems = [...devisItems].sort((a, b) => a.index_global - b.index_global);
    const bases = calculerBasesBrutes();
    let runningTotal = 0;
    for (const item of sortedItems) {
      if (item.index_global >= targetLine.index_global) {
        break;
      }
      if (item.type === 'partie') {
        runningTotal += calculatePartieTotal(item, bases);
      } else if (item.type === 'ligne_speciale' && item.context_type === 'global') {
        const amount = calculerMontantLigneSpeciale(item, bases, targetLine.id);
        if (item.type_speciale === 'addition') {
          runningTotal += amount;
        } else if (item.type_speciale === 'reduction') {
          runningTotal -= amount;
        }
      }
    }
    return runningTotal;
  }, [devisItems]);

  useEffect(() => {
    if (!hasRecurringLine) {
      return;
    }

    setDevisItems(prevItems => {
      let didUpdate = false;
      const updatedItems = prevItems.map(item => {
        if (isRecurringSpecialLine(item)) {
          const amount = calculateRecurringLineAmount(item);
          if (Number.isFinite(amount)) {
            const currentValue = typeof item.value === 'number' ? item.value : 0;
            if (Math.abs(currentValue - amount) > 0.01 || item.value === undefined) {
              didUpdate = true;
              return { ...item, value: amount };
            }
          }
        }
        return item;
      });
      return didUpdate ? updatedItems : prevItems;
    });
  }, [hasRecurringLine, calculateRecurringLineAmount]);

  // Fonction pour calculer les totaux estimés (main d'œuvre, matériel, marge)
  const calculateEstimatedTotals = () => {
    let totals = {
      cout_estime_main_oeuvre: 0,
      cout_estime_materiel: 0,
      cout_avec_taux_fixe: 0,
      marge_estimee: 0,
    };

    // 1. Calculer les coûts directs à partir de devisItems
    const lignesDetails = devisItems.filter(item => item.type === 'ligne_detail');
    
    lignesDetails.forEach(ligne => {
      const quantity = parseFloat(ligne.quantity || 0);
      const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre || 0);
      const cout_materiel = parseFloat(ligne.cout_materiel || 0);

      totals.cout_estime_main_oeuvre += cout_main_oeuvre * quantity;
      totals.cout_estime_materiel += cout_materiel * quantity;
    });

    // 2. Calculer le total des coûts directs
    const coutsDirects = totals.cout_estime_main_oeuvre + totals.cout_estime_materiel;

    // 3. Calculer le montant du taux fixe (moyenne pondérée des taux_fixe des lignes)
    let totalTauxFixe = 0;
    let totalQuantite = 0;
    
    lignesDetails.forEach(ligne => {
      const quantity = parseFloat(ligne.quantity || 0);
      const tauxPersonnalise = parseFloat(ligne.taux_fixe || tauxFixe || 20);
      totalTauxFixe += tauxPersonnalise * quantity;
      totalQuantite += quantity;
    });

    const tauxFixeMoyen = totalQuantite > 0 ? totalTauxFixe / totalQuantite : (tauxFixe || 20);
    const montantTauxFixe = coutsDirects * (tauxFixeMoyen / 100);
    totals.cout_avec_taux_fixe = coutsDirects + montantTauxFixe;

    // 4. Obtenir le total HT (calculé automatiquement)
    const totalHT = calculateGlobalTotal();

    // 5. Calculer la marge (Total HT - Coût avec taux fixe)
    totals.marge_estimee = totalHT - totals.cout_avec_taux_fixe;

    // 6. Arrondir tous les résultats à 2 décimales
    totals.cout_estime_main_oeuvre = parseFloat(totals.cout_estime_main_oeuvre.toFixed(2));
    totals.cout_estime_materiel = parseFloat(totals.cout_estime_materiel.toFixed(2));
    totals.cout_avec_taux_fixe = parseFloat(totals.cout_avec_taux_fixe.toFixed(2));
    totals.marge_estimee = parseFloat(totals.marge_estimee.toFixed(2));

    return totals;
  };

  // Calculer le total d'une partie
  const calculatePartieTotal = (partie, basesOverride = null) => {
    // Calculer d'abord toutes les bases brutes
    const bases = basesOverride || calculerBasesBrutes();
    
    // Base : somme des sous-parties (avec leurs lignes spéciales déjà incluses)
    let total = devisItems
      .filter(item => item.type === 'sous_partie' && item.partie_id === partie.id)
      .reduce((sum, sp) => sum + calculateSousPartieTotal(sp, bases), 0);
    
    // Récupérer les lignes spéciales de cette partie, triées par index_global
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'partie' && 
        item.context_id === partie.id
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    // Appliquer les lignes spéciales séquentiellement
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases);
      
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
      // Note : les lignes 'display' n'affectent pas le total
    });
    
    return total;
  };

  // Calculer le total d'une sous-partie
  const calculateSousPartieTotal = (sousPartie, basesOverride = null) => {
    // Calculer d'abord toutes les bases brutes
    const bases = basesOverride || calculerBasesBrutes();
    
    // Base : somme des lignes de détail
    let total = devisItems
      .filter(item => item.type === 'ligne_detail' && item.sous_partie_id === sousPartie.id)
      .reduce((sum, ligne) => {
        const prix = calculatePrice(ligne);
        return sum + (prix * (ligne.quantity || 0));
      }, 0);
    
    // Récupérer les lignes spéciales de cette sous-partie, triées par index_global
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'sous_partie' && 
        item.context_id === sousPartie.id
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    // Appliquer les lignes spéciales séquentiellement
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases);
      
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
      // Note : les lignes 'display' n'affectent pas le total
    });
    
    return total;
  };

  // Calculer automatiquement total_ht, tva et montant_ttc
  useEffect(() => {
    // Calculer le total HT en utilisant calculateGlobalTotal
    // calculateGlobalTotal utilise devisItems qui est dans les dépendances
    const totalHT = calculateGlobalTotal();
    
    // Calculer la TVA
    // ✅ Utiliser ?? pour permettre tva_rate = 0
    const tvaRate = devisData.tva_rate ?? 20;
    const tvaAmount = totalHT * (tvaRate / 100);
    
    // Calculer le TTC
    const totalTTC = totalHT + tvaAmount;
    
    // Mettre à jour les états
    setTotalHt(totalHT);
    setTva(tvaAmount);
    setMontantTtc(totalTTC);
    
    // Mettre à jour aussi devisData pour la cohérence
    setDevisData(prev => ({
      ...prev,
      price_ht: totalHT,
      price_ttc: totalTTC
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devisItems, devisData.tva_rate]);

  // Fonction pour transférer un élément du tableau option vers le tableau principal
  const handleTransferFromOptionsToMain = (itemToTransfer) => {
    if (!itemToTransfer) return;
    
    // Calculer le prochain index_global pour l'élément transféré
    const nextIndex = getNextIndex(devisItems, itemToTransfer.type === 'ligne_detail' ? 'sous_partie' : 
                                                      itemToTransfer.type === 'sous_partie' ? 'partie' : 'global', 
                                                      itemToTransfer.type === 'ligne_detail' ? itemToTransfer.sous_partie_id :
                                                      itemToTransfer.type === 'sous_partie' ? itemToTransfer.partie_id : null);
    
    // Créer la copie de l'élément avec le nouvel index
    const transferredItem = {
      ...itemToTransfer,
      index_global: nextIndex || (devisItems.length > 0 ? Math.max(...devisItems.map(i => i.index_global)) + 1 : 1)
    };
    
    // Ajouter au tableau principal
    setDevisItems(prev => sortByIndexGlobal([...prev, transferredItem]));
  };

  // Fonction pour récupérer l'ID du client depuis le chantier sélectionné
  const getClientIdFromChantier = async (chantierId) => {
    if (!chantierId || chantierId === -1) {
      return null;
    }
    
    try {
      const chantierResponse = await axios.get(`/api/chantier/${chantierId}/`);
      const chantierData = chantierResponse.data;
      
      if (chantierData.societe) {
        let societeData = null;
        
        if (typeof chantierData.societe === 'object' && chantierData.societe.id) {
          societeData = chantierData.societe;
        } else if (typeof chantierData.societe === 'number') {
          const societeResponse = await axios.get(`/api/societe/${chantierData.societe}/`);
          societeData = societeResponse.data;
        }
        
        if (societeData && societeData.client_name) {
          const clientId = typeof societeData.client_name === 'object' 
            ? societeData.client_name.id 
            : societeData.client_name;
          return clientId;
        }
      }
    } catch (error) {
    }
    
    return null;
  };

  // Fonctions de vérification pour client et société (même logique que CreationDevis.js)
  const checkClientExists = async (clientData) => {
    try {
      const response = await axios.get("/api/check-client/", {
        params: {
          email: clientData.client_mail,
          phone: clientData.phone_Number,
        },
      });
      return response.data.client || null;
    } catch (error) {
      return null;
    }
  };

  const checkSocieteExists = async (societeData) => {
    try {
      const response = await axios.get("/api/check-societe/", {
        params: {
          nom_societe: societeData.nom_societe,
          codepostal_societe: societeData.codepostal_societe,
        },
      });
      return response.data.societe || null;
    } catch (error) {
      return null;
    }
  };

  // Fonction pour sauvegarder le devis au format legacy
  const handleSaveDevis = async () => {
    try {
      setIsSaving(true);
      
      // Valider les données avant transformation
      const validation = validateBeforeTransform({
        devisItems,
        devisData,
        selectedChantierId
      });
      
      if (!validation.valid) {
        alert(`Erreurs de validation:\n${validation.errors.join('\n')}`);
        return;
      }
      
      let finalClientId = clientId;
      let finalSocieteId = null;
      let finalChantierId = selectedChantierId;
      
      // Calculer les totaux estimés une seule fois (utilisé pour le chantier et la transformation)
      const totals = calculateEstimatedTotals();
      
      // Gestion du client et de la société pour nouveau chantier OU appel d'offres
      // ✅ Pour les appels d'offres : devisType === "chantier" ET selectedChantierId est null ou -1
      // ✅ Pour les nouveaux chantiers : selectedChantierId === -1 ET devisType !== "chantier"
      const isAppelOffres = devisType === "chantier";
      const isNouveauChantier = (selectedChantierId === -1 || selectedChantierId === null) && !isAppelOffres;
      
      // ✅ Condition pour gérer les appels d'offres (selectedChantierId peut être null) et les nouveaux chantiers
      // Un appel d'offres a toujours selectedChantierId === null ou -1
      // Un nouveau chantier a selectedChantierId === -1 et devisType !== "chantier"
      if (isAppelOffres || isNouveauChantier || selectedChantierId === -1) {
        if (!pendingChantierData.client || !pendingChantierData.societe || !pendingChantierData.chantier) {
          const missingData = {
            client: !pendingChantierData.client ? "Client manquant" : null,
            societe: !pendingChantierData.societe ? "Société manquante" : null,
            chantier: !pendingChantierData.chantier ? "Chantier manquant" : null,
          };
          throw new Error(
            `Données manquantes: ${Object.values(missingData).filter(Boolean).join(", ")}`
          );
        }
        
        // 1. Vérifier si le client existe
        const existingClient = await checkClientExists(pendingChantierData.client);
        if (existingClient) {
          finalClientId = existingClient.id;
        } else {
          // Créer le client avec tous les champs (incluant civilite et poste)
          const clientResponse = await axios.post("/api/client/", {
            name: pendingChantierData.client.name,
            surname: pendingChantierData.client.surname,
            phone_Number: pendingChantierData.client.phone_Number.toString(),
            client_mail: pendingChantierData.client.client_mail || "",
            civilite: pendingChantierData.client.civilite || "",
            poste: pendingChantierData.client.poste || "",
          });
          finalClientId = clientResponse.data.id;
        }

        // 2. Gérer la société : vérifier si elle existe, sinon la créer IMMÉDIATEMENT
        // ✅ IMPORTANT : Pour les appels d'offres, la société DOIT avoir un ID avant de créer l'appel d'offres
        // ✅ Si l'ID de la société est déjà disponible (cas où on a sélectionné un client existant), l'utiliser directement
        if (pendingChantierData.societe?.id && !pendingChantierData.societe?.needsCreation) {
          finalSocieteId = pendingChantierData.societe.id;
        } else if (selectedSocieteId) {
          // ✅ Utiliser selectedSocieteId si disponible (important pour les appels d'offres avec société sélectionnée)
          finalSocieteId = selectedSocieteId;
        } else {
          // ✅ Vérifier si la société existe (même si on a un ID, on vérifie pour être sûr)
          const existingSociete = await checkSocieteExists(pendingChantierData.societe);
          if (existingSociete) {
            finalSocieteId = existingSociete.id;
          } else {
            // ✅ CRÉER LA SOCIÉTÉ IMMÉDIATEMENT si elle n'existe pas
            // C'est crucial pour les appels d'offres qui ont besoin de l'ID de la société
            // Préparer les données de la société avec gestion sécurisée du code postal
            const societeData = {
              nom_societe: pendingChantierData.societe.nom_societe || "",
              ville_societe: pendingChantierData.societe.ville_societe || "",
              rue_societe: pendingChantierData.societe.rue_societe || "",
              client_name: finalClientId,
            };
            
            // Ajouter codepostal_societe seulement s'il existe et n'est pas vide
            if (pendingChantierData.societe.codepostal_societe) {
              societeData.codepostal_societe = pendingChantierData.societe.codepostal_societe.toString();
            }
            
            // ✅ Créer la société et récupérer son ID immédiatement
            const societeResponse = await axios.post("/api/societe/", societeData);
            finalSocieteId = societeResponse.data.id;
            
            // ✅ Mettre à jour pendingChantierData avec le nouvel ID pour cohérence
            setPendingChantierData((prev) => ({
              ...prev,
              societe: {
                ...prev.societe,
                id: finalSocieteId,
                needsCreation: false,
              },
            }));
            
            // ✅ Mettre à jour aussi selectedSocieteId pour cohérence
            setSelectedSocieteId(finalSocieteId);
          }
        }
        
        // ✅ Vérification finale pour les appels d'offres : s'assurer que finalSocieteId est défini
        if (isAppelOffres && !finalSocieteId) {
          throw new Error("Erreur : L'ID de la société n'a pas pu être obtenu pour l'appel d'offres. Veuillez réessayer.");
        }

        // 3. Créer le chantier SEULEMENT si ce n'est PAS un appel d'offres
        // ✅ IMPORTANT : Ne jamais créer de chantier pour les appels d'offres
        // Les chantiers sont créés uniquement lors de la transformation d'un appel d'offres validé en chantier
        if (devisType !== "chantier") {
          // Vérifier que finalSocieteId est bien défini avant de créer le chantier
          if (!finalSocieteId) {
            throw new Error("Erreur : L'ID de la société n'a pas pu être obtenu. Impossible de créer le chantier.");
          }

          // Créer le chantier avec la société (totals déjà calculé plus haut)
          const chantierData = {
            chantier_name: pendingChantierData.chantier.chantier_name.trim(),
            ville: pendingChantierData.chantier.ville,
            rue: pendingChantierData.chantier.rue,
            code_postal: pendingChantierData.chantier.code_postal.toString(),
            montant_ht: total_ht,
            montant_ttc: montant_ttc,
            societe_id: finalSocieteId,
            client: finalClientId,
            // Coûts estimés
            cout_estime_main_oeuvre: totals.cout_estime_main_oeuvre,
            cout_estime_materiel: totals.cout_estime_materiel,
            cout_avec_taux_fixe: totals.cout_avec_taux_fixe,
            marge_estimee: totals.marge_estimee,
            taux_fixe: tauxFixe !== null ? tauxFixe : 20,
          };
          
          // ✅ Ajouter drive_path si customDrivePath est défini (utilisateur a modifié le chemin)
          if (customDrivePath !== null && customDrivePath.trim() !== '') {
            // ✅ Nettoyer le chemin : retirer les préfixes Appels_Offres/ et Chantiers/
            const cleanedPath = cleanDrivePath(customDrivePath);
            if (cleanedPath) {
              chantierData.drive_path = cleanedPath;
            }
          }
          
          const chantierResponse = await axios.post("/api/chantier/", chantierData);
          finalChantierId = chantierResponse.data.id;
        } else {
          // ✅ Pour les appels d'offres, ne pas créer de chantier
          // Le chantier sera créé uniquement lors de la transformation depuis GestionAppelsOffres.js
          // Ne pas définir finalChantierId pour les appels d'offres
          finalChantierId = null;
        }
      } else if (selectedChantierId) {
        // Récupérer l'ID du client et de la société depuis le chantier existant
        const chantierResponse = await axios.get(`/api/chantier/${selectedChantierId}/`);
        const chantierData = chantierResponse.data;
        
        // Récupérer la société depuis le chantier
        if (chantierData.societe) {
          // Si societe est un objet avec les détails (via serializer)
          if (typeof chantierData.societe === 'object' && chantierData.societe.id) {
            finalSocieteId = chantierData.societe.id;
          } else if (typeof chantierData.societe === 'number') {
            finalSocieteId = chantierData.societe;
          }
        }
        
        // Récupérer l'ID du client depuis la société ou directement depuis le chantier
        finalClientId = await getClientIdFromChantier(selectedChantierId);
      }
      
      // Transformer les données vers le format legacy (totals déjà calculé plus haut)
      const legacyDevis = transformToLegacyFormat({
        devisItems,
        devisData: {
          ...devisData,
          price_ht: total_ht,
          price_ttc: montant_ttc,
          contact_societe: selectedContactId || null, // Ajouter le contact sélectionné
        },
        selectedChantierId: finalChantierId,
        clientIds: finalClientId ? [finalClientId] : [],
        // ✅ NOUVEAU : Données pour appel d'offres
        devisType: devisType, // Passer le type de devis
        pendingChantierData: devisType === "chantier" ? pendingChantierData : null,
        societeId: finalSocieteId,
        totals: totals, // Totals estimés (marge_estimee, cout_avec_taux_fixe)
        tauxFixe: tauxFixe,
        // ✅ Ajouter drive_path si customDrivePath est défini (pour les appels d'offres)
        // ✅ Nettoyer le chemin : retirer les préfixes Appels_Offres/ et Chantiers/
        drive_path: customDrivePath !== null && customDrivePath.trim() !== '' ? cleanDrivePath(customDrivePath) : null,
      });
      
      // Envoyer à l'API
      const response = await axios.post('/api/create-devis/', legacyDevis);
      
      if (response.data) {
        // Succès : mettre à jour l'ID du devis pour les futures modifications
        setDevisData(prev => ({ ...prev, id: response.data.id }));
        
        // Recalculer automatiquement les coûts du devis créé
        try {
          await axios.post(`/api/devis/${response.data.id}/recalculer-couts/`);
        } catch (recalcError) {
          void recalcError;
        }

        const devisId = response.data.id;
        
        // Réinitialiser complètement l'état de la page (comme le bouton Réinitialiser)
        resetDevisFormState();
        clearDraftStorage();
        await generateDevisNumber(null);
        
        // Gestion auto-download pour les appels d'offres (devisType "chantier")
        if (devisType === "chantier") {
          try {
            const appelOffresId = response.data.appel_offres_id;
            const appelOffresName = response.data.appel_offres_name;
            if (appelOffresId && appelOffresName) {
              const societeName =
                pendingChantierData?.societe?.nom_societe ||
                societe.nom_societe ||
                "Société";
              const urlParams = new URLSearchParams({
                autoDownload: "true",
                devisId: devisId,
                appelOffresId: appelOffresId,
                appelOffresName: appelOffresName,
                societeName: societeName,
                numero: devisData.numero,
              });
              // Ajouter le chemin personnalisé du drive si défini
              if (effectiveDrivePath) {
                urlParams.append('customPath', effectiveDrivePath);
              }
              alert(
                "Devis créé avec succès ! Téléchargement automatique vers le Drive..."
              );
              window.location.href = `/ListeDevis?${urlParams.toString()}`;
              return;
            }
          } catch (autoDownloadAppelOffresError) {
            void autoDownloadAppelOffresError;
          }
        }

        // Gestion auto-download pour les devis normaux
        if (devisType === "normal" && finalChantierId) {
          try {
            const chantierResponse = await axios.get(
              `/api/chantier/${finalChantierId}/`
            );
            const chantierData = chantierResponse.data;
            let societeName = "";
            if (chantierData.societe) {
              if (typeof chantierData.societe === "object") {
                societeName = chantierData.societe.nom_societe || "";
              } else {
                try {
                  const societeResponse = await axios.get(
                    `/api/societe/${chantierData.societe}/`
                  );
                  societeName = societeResponse.data?.nom_societe || "";
                } catch (societeError) {
                  void societeError;
                }
              }
            }

            const urlParams = new URLSearchParams({
              autoDownload: "true",
              devisId: devisId,
              chantierId: finalChantierId,
              chantierName:
                chantierData.chantier_name || chantier.chantier_name || "",
              societeName:
                societeName ||
                chantierData.societe?.nom_societe ||
                societe.nom_societe ||
                "Société",
              numero: devisData.numero,
            });
            // Ajouter le chemin personnalisé du drive si défini
            if (effectiveDrivePath) {
              urlParams.append('customPath', effectiveDrivePath);
            }

            alert(
              "Devis créé avec succès ! Téléchargement automatique vers le Drive..."
            );
            window.location.href = `/ListeDevis?${urlParams.toString()}`;
            return;
          } catch (autoDownloadNormalError) {
            void autoDownloadNormalError;
          }
        }
        
        alert('Devis sauvegardé avec succès!');
        
        // Rediriger vers la liste des devis
        window.location.href = '/ListeDevis';
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Erreur inconnue';
      alert(`Erreur lors de la sauvegarde du devis:\n${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleResetDraft = async () => {
    const confirmed = window.confirm("Voulez-vous vraiment réinitialiser toutes les informations du devis en cours ?");
    if (!confirmed) {
      return;
    }
    
    resetDevisFormState();
    clearDraftStorage();
    await generateDevisNumber(null);
  };

  // Charger les chantiers au montage du composant
  useEffect(() => {
    fetchChantiers();
    // Générer le numéro initial avec le format "Devis travaux" (nouveau chantier)
    generateDevisNumber(null);
    // Charger les parties initiales
    loadParties();
  }, []);

  useEffect(() => {
    const hasAtLeastOnePartie = devisItems.some(item => item.type === 'partie');
    const recurringLineExists = devisItems.some(isRecurringSpecialLine);
    if (!hasAtLeastOnePartie || recurringLineExists || recurringLineDraft) {
      return;
    }
    setRecurringLineDraft(buildRecurringSpecialLine());
  }, [devisItems, recurringLineDraft, buildRecurringSpecialLine]);

  return (
    <div style={{
      padding: '20px 10px',
      marginRight: '150px', // Espace pour la sidebar
      minHeight: 'auto', // Changé de 100vh à auto
      backgroundColor: '#f5f5f5',
      borderRadius: '10px',
    }}>
      <div style={{
        fontFamily: 'Arial, Helvetica, "Roboto", sans-serif',
        fontSize: '16px',
        maxWidth: '1200px',
        margin: '0 150px 0 150px',
        padding: '20px 10px',
        minHeight: 'auto', // Changé de 100vh à auto
        backgroundColor: 'rgb(255 255 255)',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        overflow: 'visible' // Changé de hidden à visible
      }}>
        <DevisStyles />
        
        {/* En-tête de la page */}
        <div style={{
          backgroundColor: '#1976d2',
          color: 'white',
          padding: '20px 30px',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
            Création de Devis
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
            Remplissez les informations ci-dessous pour créer votre devis
          </p>
        </div>

        {/* Contenu principal */}
        <div style={{ padding: '30px' }}>
          
          {/* Section 0: Sélection du chantier */}
          <div style={{
            backgroundColor: '#e3f2fd',
            border: '2px solid #1976d2',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              🏗️ Sélection du chantier
            </h2>
            
            <Box sx={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 300, flex: 1 }}>
                <InputLabel shrink>Chantier existant</InputLabel>
                <Select
                  value={selectedChantierId || ''}
                  onChange={(e) => handleChantierSelection(e.target.value)}
                  disabled={isLoadingChantiers} // Permettre de recliquer même si appel d'offres
                  displayEmpty
                  notched
                >
                  <MenuItem value="">
                    <em>-- Choisir un chantier --</em>
                  </MenuItem>
                  {chantiers
                    .filter((chantier) => chantier.chantier_name !== "École - Formation")
                    .filter(
                      (chantier) =>
                        chantier.state_chantier !== "Terminé" &&
                        chantier.state_chantier !== "En attente"
                    )
                    .map((chantier) => (
                      <MenuItem key={chantier.id} value={chantier.id}>
                        {chantier.chantier_name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              
              <Typography sx={{ color: '#6c757d', fontSize: '14px' }}>
                ou
              </Typography>
              
              <Button
                variant="contained"
                startIcon={<FiPlus />}
                onClick={() => {
                  // Pour appel d'offres, mettre le type à "chantier" et ouvrir directement le modal client
                  setDevisType("chantier");
                  setSelectedChantierId(null);
                  setPendingChantierData({
                    client: { name: "", surname: "", client_mail: "", phone_Number: "", civilite: "", poste: "" },
                    societe: { nom_societe: "", ville_societe: "", rue_societe: "", codepostal_societe: "" },
                    chantier: { id: -1, chantier_name: "", ville: "", rue: "", code_postal: "" },
                    devis: null,
                  });
                  setPrefilledClientData(null);
                  setPrefilledSocieteData(null);
                  setShowClientInfoModal(true);
                  // Régénérer le numéro avec le format "Devis travaux"
                  generateDevisNumber(null);
                }}
                // Permettre de recliquer même si déjà en mode appel d'offres (pour recommencer)
                sx={{
                  backgroundColor: '#ff9800',
                  '&:hover': { backgroundColor: '#f57c00' },
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}
              >
                Créer un appel d'offres
              </Button>
            </Box>
            
            {devisType === "chantier" && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Appel d'offres :</strong> Aucun chantier ne sera créé. Les informations du chantier seront stockées dans l'appel d'offres.
                </Typography>
              </Box>
            )}
            
            {selectedChantierId && devisType === "normal" && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                <Typography variant="body2" color="text.secondary">
                  Chantier sélectionné : <strong>{chantier.chantier_name}</strong>
                </Typography>
              </Box>
            )}
          </div>
          
          {/* Section 1: Client et contact */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              👤 Client et contact
            </h2>
            
            <ClientInfo 
              client={client} 
              societe={societe} 
              formatPhoneNumber={formatPhoneNumber}
              isEditable={selectedChantierId === -1}
              contacts={contactsSociete}
              selectedContactId={selectedContactId}
              societeId={currentSocieteId || selectedSocieteId || (pendingChantierData.societe?.id)}
              onContactSelect={(contactId) => {
                setSelectedContactId(contactId || null);
              }}
              onOpenContactModal={() => {
                setShowContactModal(true);
              }}
              onClientChange={(updatedClient) => {
                setClient(updatedClient);
                // Mettre à jour pendingChantierData avec tous les champs (incluant civilite et poste)
                setPendingChantierData((prev) => ({
                  ...prev,
                  client: {
                    name: updatedClient.name || "",
                    surname: updatedClient.surname || "",
                    phone_Number: updatedClient.phone_Number || "",
                    client_mail: updatedClient.client_mail || "",
                    civilite: updatedClient.civilite || "",
                    poste: updatedClient.poste || "",
                  },
                }));
              }}
              onSocieteChange={(updatedSociete) => {
                setSociete(updatedSociete);
                // Mettre à jour pendingChantierData
                setPendingChantierData((prev) => ({
                  ...prev,
                  societe: {
                    nom_societe: updatedSociete.nom_societe || "",
                    ville_societe: updatedSociete.ville_societe || "",
                    rue_societe: updatedSociete.rue_societe || "",
                    codepostal_societe: updatedSociete.codepostal_societe || "",
                  },
                }));
              }}
            />
          </div>

          {/* Section 2: Chantier */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              🏗️ Adresse du chantier
            </h2>
            
            <ChantierInfo 
              chantier={chantier} 
              selectedChantierId={selectedChantierId}
              isEditable={selectedChantierId === -1}
              onChantierChange={(updatedChantier) => {
                setChantier(updatedChantier);
                // Mettre à jour pendingChantierData
                setPendingChantierData((prev) => ({
                  ...prev,
                  chantier: {
                    ...prev.chantier,
                    chantier_name: updatedChantier.chantier_name || "",
                    rue: updatedChantier.rue || "",
                    code_postal: updatedChantier.code_postal || "",
                    ville: updatedChantier.ville || "",
                  },
                }));
              }}
            />
          </div>

          {/* Section 3: Informations générales */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              📋 Informations générales
            </h2>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ maxWidth: '600px', width: '100%' }}>
                <h3 style={{ color: '#495057', fontSize: '16px', margin: '0 0 15px 0', textAlign: 'center' }}>
                  Informations du devis
                </h3>
                <DevisHeader 
                  devisData={devisData} 
                  formatDate={formatDate}
                  onDateChange={(value, field) => {
                    if (field === 'numero') {
                      setDevisData(prev => ({ ...prev, numero: value }));
                    } else {
                      setDevisData(prev => ({ ...prev, date_creation: value }));
                    }
                  }}
                  isGeneratingNumber={isGeneratingNumber}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Chemin du drive */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              📁 Chemin du drive pour les documents
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" style={{ marginBottom: '5px' }}>
                    Chemin actuel :
                  </Typography>
                  <Typography variant="body1" style={{ 
                    fontFamily: 'monospace',
                    color: effectiveDrivePath ? '#1976d2' : '#6c757d'
                  }}>
                    {effectiveDrivePath || '(Chemin par défaut non disponible)'}
                  </Typography>
                  {customDrivePath === null && defaultDrivePath && (
                    <Typography variant="caption" color="text.secondary" style={{ marginTop: '5px', display: 'block' }}>
                      Chemin par défaut : {defaultDrivePath}
                    </Typography>
                  )}
                </div>
                <Button
                  variant="outlined"
                  onClick={() => setShowDrivePathSelector(true)}
                  style={{
                    marginLeft: '15px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Modifier le chemin
                </Button>
              </div>
              
              {customDrivePath !== null && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setCustomDrivePath(null);
                  }}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Réinitialiser au chemin par défaut
                </Button>
              )}
            </div>
          </div>

          {/* Section 5: Détail du devis */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              📊 Détail du devis
            </h2>
            
            <DevisTable 
              devisData={devisData}
              parties={availableParties}
              selectedParties={selectedParties}
              special_lines_global={special_lines_global}
              total_ht={total_ht}
              formatMontantEspace={formatMontantEspace}
              onNatureTravauxChange={(value) => setDevisData(prev => ({ ...prev, nature_travaux: value }))}
              onPartieSelect={handlePartieSelect}
              onPartieCreate={handlePartieCreate}
              onPartieRemove={handlePartieRemove}
              onPartieEdit={handlePartieEdit}
              onPartieNumeroChange={handlePartieNumeroChange}
              onPartiesReorder={handlePartiesReorder}
              searchParties={searchParties}
              isLoadingParties={isLoadingParties}
              onSousPartieSelect={handleSousPartieSelect}
              onSousPartieCreate={handleSousPartieCreate}
              onSousPartieRemove={handleSousPartieRemove}
              onSousPartieEdit={handleSousPartieEdit}
              onSousPartieNumeroChange={handleSousPartieNumeroChange}
              onSousPartiesReorder={handleSousPartiesReorder}
              onLigneDetailSelect={handleLigneDetailSelect}
              onLigneDetailCreate={handleLigneDetailCreate}
              onLigneDetailQuantityChange={handleLigneDetailQuantityChange}
              onLigneDetailEdit={handleLigneDetailEdit}
              onLigneDetailRemove={handleLigneDetailRemove}
              onLigneDetailMargeChange={handleLigneDetailMargeChange}
              onLigneDetailPriceChange={handleLigneDetailPriceChange}
              pendingSpecialLines={pendingSpecialLines}
              onAddPendingSpecialLine={handleAddPendingSpecialLine}
              onRemovePendingSpecialLine={handleRemovePendingSpecialLine}
              onRemoveSpecialLine={handleRemoveSpecialLine}
              onMoveSpecialLine={handleMoveSpecialLine}
              onEditSpecialLine={handleEditSpecialLine}
              editingSpecialLine={editingSpecialLine}
              showEditModal={showEditModal}
              lineAwaitingPlacement={lineAwaitingPlacement}
              onPlaceLineAt={handlePlaceLineAt}
              onCancelPlacement={() => setLineAwaitingPlacement(null)}
              onRequestReplacement={(line) => setLineAwaitingPlacement(line)}
              onCloseEditModal={() => setShowEditModal(false)}
              onSaveSpecialLine={handleSaveSpecialLine}
              onSpecialLinesReorder={handleSpecialLinesReorder}
              calculateGlobalTotal={calculateGlobalTotal}
              calculateGlobalTotalExcludingLine={calculateGlobalTotalExcludingLine}
              calculatePartieTotal={calculatePartieTotal}
              calculateSousPartieTotal={calculateSousPartieTotal}
              
              devisItems={enrichedDevisItems}
              onDevisItemsReorder={handleDevisItemsReorder}
              
              isSelectingBase={isSelectingBase}
              onBaseSelected={handleBaseSelected}
              onCancelBaseSelection={() => {
                setIsSelectingBase(false);
                setPendingLineForBase(null);
              }}
              pendingLineForBase={pendingLineForBase}
              onClearPendingLineForBase={() => setPendingLineForBase(null)}
              pendingRecurringLine={recurringLineDraft}
              onAutoPlaceRecurringLine={handleAutoPlaceRecurringLine}
              pendingRecurringAmount={calculateGlobalTotal()}
              calculateRecurringLineAmount={calculateRecurringLineAmount}
              hasRecurringLine={hasRecurringLine}
              onLigneDetailHover={setHoveredLigneDetail}
              hoveredLigneDetail={hoveredLigneDetail}
            />
          </div>

          {/* Section 6: Récapitulatif */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              💰 Récapitulatif financier
            </h2>
            
            <DevisRecap 
              devisData={devisData}
              total_ht={total_ht}
              tva={tva}
              montant_ttc={montant_ttc}
              formatMontantEspace={formatMontantEspace}
              onTvaRateChange={(newRate) => {
                setDevisData(prev => ({ ...prev, tva_rate: newRate }));
              }}
            />
          </div>

          {/* Section 7: Options (prestations supplémentaires) */}
          <TableauOption
            devisData={devisData}
            devisItems={devisItems}
            formatMontantEspace={formatMontantEspace}
            onTransferToMain={handleTransferFromOptionsToMain}
          />

          {/* Section 6: Actions */}
          <div style={{
            backgroundColor: '#e3f2fd',
            border: '1px solid #1976d2',
            borderRadius: '8px',
            padding: '25px',
            textAlign: 'center'
          }}>
            <h3 style={{
              color: '#1976d2',
              fontSize: '18px',
              fontWeight: 'bold',
              margin: '0 0 15px 0'
            }}>
              Actions disponibles
            </h3>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleSaveDevis}
                disabled={isSaving}
                style={{
                  backgroundColor: isSaving ? '#6c757d' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  opacity: isSaving ? 0.6 : 1
                }}
              >
                {isSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder le devis'}
              </button>
              <button 
                onClick={async () => {
                  try {
                    // Valider les données avant transformation
                    const validation = validateBeforeTransform({
                      devisItems,
                      devisData,
                      selectedChantierId
                    });
                    
                    if (!validation.valid) {
                      alert(`Erreurs de validation:\n${validation.errors.join('\n')}`);
                      return;
                    }
                    
                    // Récupérer l'ID du client si nécessaire
                    let finalClientId = clientId;
                    if (!finalClientId && selectedChantierId) {
                      finalClientId = await getClientIdFromChantier(selectedChantierId);
                    }
                    
                    // Transformer les données vers le format legacy
                    const legacyDevis = transformToLegacyFormat({
                      devisItems,
                      devisData: {
                        ...devisData,
                        price_ht: total_ht,
                        price_ttc: montant_ttc,
                        contact_societe: selectedContactId || null, // Ajouter le contact sélectionné
                      },
                      selectedChantierId,
                      clientIds: finalClientId ? [finalClientId] : []
                    });
                    
                    // Préparer les données pour la prévisualisation temporaire
                    const previewData = {
                      ...legacyDevis,
                      chantier: selectedChantierId || -1,
                      tempData: selectedChantierId === -1 ? {
                        chantier: chantier,
                        client: client,
                        societe: societe
                      } : {}
                    };
                    
                    // Utiliser POST au lieu de GET pour éviter les limites d'URL avec les devis longs
                    // Créer un formulaire temporaire pour soumettre en POST dans un nouvel onglet
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = '/api/preview-devis-v2/';
                    form.target = '_blank';
                    form.style.display = 'none';
                    
                    // Ajouter les données comme input hidden (JSON stringifié)
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'devis';
                    input.value = JSON.stringify(previewData);
                    form.appendChild(input);
                    
                    // Ajouter le formulaire au DOM, le soumettre, puis le supprimer
                    document.body.appendChild(form);
                    form.submit();
                    
                    // Nettoyer après un court délai
                    setTimeout(() => {
                      document.body.removeChild(form);
                    }, 100);
                } catch (error) {
                  alert(`Erreur lors de la prévisualisation:\n${error.message || 'Erreur inconnue'}`);
                }
                }}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                👁️ Aperçu PDF
              </button>
              <button
                onClick={handleResetDraft}
                style={{
                  backgroundColor: '#9e9e9e',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                ♻️ Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals pour la création de nouveau chantier */}
      <SelectClientModal
        open={showSelectClientModal}
        onClose={() => {
          setShowSelectClientModal(false);
          // ✅ Ne rouvrir le modal client que si on n'est pas en train de sélectionner une société
          // Si SelectSocieteModal est ouvert, ne pas rouvrir ClientInfoModal
          if (!showSelectSocieteModal) {
            setShowClientInfoModal(true);
          }
        }}
        onSelectClient={handleSelectClient}
        onCreateNew={handleCreateNewClient}
      />

      <ClientInfoModal
        open={showClientInfoModal}
        onClose={() => {
          setShowClientInfoModal(false);
          // ✅ Ne pas réinitialiser prefilledClientData et prefilledSocieteData ici
          // pour permettre la réouverture avec les mêmes données
          // Si c'était un appel d'offres et que le processus n'est pas complété, réinitialiser
          // ✅ MAIS conserver le devisType si l'utilisateur a déjà commencé le processus
          const hasStartedProcess = pendingChantierData.client?.name || pendingChantierData.societe?.nom_societe;
          if (devisType === "chantier" && !hasStartedProcess) {
            // ✅ Seulement réinitialiser si vraiment rien n'a été fait
            setDevisType("normal");
            setSelectedChantierId(null);
            setPendingChantierData({
              client: { name: "", surname: "", client_mail: "", phone_Number: "", civilite: "", poste: "" },
              societe: { nom_societe: "", ville_societe: "", rue_societe: "", codepostal_societe: "" },
              chantier: { id: -1, chantier_name: "", ville: "", rue: "", code_postal: "" },
              devis: null,
            });
            setPrefilledClientData(null);
            setPrefilledSocieteData(null);
          }
        }}
        onSubmit={handleClientInfoSubmit}
        onSelectExisting={handleOpenSelectClient}
        initialData={prefilledClientData}
      />

      <SocieteInfoModal
        open={showSocieteInfoModal}
        onClose={() => {
          setShowSocieteInfoModal(false);
          // ✅ Ne pas réinitialiser prefilledSocieteData ici pour permettre la réouverture
          // Si c'était un appel d'offres et que le processus n'est pas complété, réinitialiser
          // ✅ MAIS conserver le devisType si l'utilisateur a déjà commencé le processus
          const hasStartedProcess = pendingChantierData.client?.name || pendingChantierData.societe?.nom_societe;
          if (devisType === "chantier" && !hasStartedProcess) {
            // ✅ Seulement réinitialiser si vraiment rien n'a été fait
            setDevisType("normal");
            setSelectedChantierId(null);
            setPendingChantierData({
              client: { name: "", surname: "", client_mail: "", phone_Number: "", civilite: "", poste: "" },
              societe: { nom_societe: "", ville_societe: "", rue_societe: "", codepostal_societe: "" },
              chantier: { id: -1, chantier_name: "", ville: "", rue: "", code_postal: "" },
              devis: null,
            });
            setPrefilledClientData(null);
            setPrefilledSocieteData(null);
          }
        }}
        onSubmit={handleSocieteInfoSubmit}
        initialData={prefilledSocieteData}
      />

      <SelectSocieteModal
        open={showSelectSocieteModal}
        onClose={() => {
          setShowSelectSocieteModal(false);
          setSelectedClientSocietes(null); // Réinitialiser les sociétés filtrées
          // ✅ Ne pas réinitialiser le processus si l'utilisateur a déjà commencé
          // Le devisType doit être conservé
        }}
        onSocieteSelect={handleSocieteSelect}
        filteredSocietes={selectedClientSocietes}
        onCreateNew={() => {
          // ✅ Permettre de créer une nouvelle société même si plusieurs existent déjà
          setShowSelectSocieteModal(false);
          setShowClientInfoModal(false); // ✅ Fermer aussi le modal client
          setShowSocieteInfoModal(true);
        }}
      />

      {/* Modal de création de chantier */}
      <ChantierForm
        open={showChantierForm}
        onClose={() => {
          setShowChantierForm(false);
          // ✅ Ne pas réinitialiser le processus si l'utilisateur a déjà commencé
          // Le devisType doit être conservé tout au long du processus
        }}
        onSubmit={(chantierData) => {
          handleChantierCreation(chantierData);
        }}
        societeId={selectedSocieteId}
        chantierData={pendingChantierData.chantier}
      />

      {/* Modal de gestion des contacts de société */}
      <ContactSocieteModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        societeId={currentSocieteId || selectedSocieteId || (pendingChantierData.societe?.id)}
        societeName={societe.nom_societe || ''}
        onContactChange={() => {
          // Recharger les contacts après modification
          const societeIdToFetch = currentSocieteId || selectedSocieteId || (pendingChantierData.societe?.id);
          if (societeIdToFetch) {
            fetchContactsSociete(societeIdToFetch);
          }
        }}
      />

      {/* Modal de sélection du chemin du drive */}
      <DrivePathSelector
        open={showDrivePathSelector}
        onClose={() => setShowDrivePathSelector(false)}
        onSelect={(path) => {
          setCustomDrivePath(path);
          setShowDrivePathSelector(false);
        }}
        defaultPath={defaultDrivePath}
      />

      {/* PieChart flottant pour la répartition des coûts */}
      <DevisCostPieChart
        devisItems={devisItems}
        totalHT={total_ht}
        hoveredLine={hoveredLigneDetail}
        isVisible={isPieChartVisible}
        onClose={() => setIsPieChartVisible(false)}
      />

    </div>
  );
};

export default DevisAvance;