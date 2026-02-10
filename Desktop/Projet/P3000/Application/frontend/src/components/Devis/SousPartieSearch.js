import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import Fuse from 'fuse.js';
import { FiPlus, FiX, FiSearch } from 'react-icons/fi';
import axios from 'axios';

// ✅ Constante pour "Lignes directes" (option par défaut)
const DIRECT_LINES_DESCRIPTION = "Lignes directes";

const SousPartieSearch = ({
  partieId,
  selectedSousParties = [],
  onSousPartieSelect,
  onSousPartieCreate,
  onSousPartieRemove
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Configuration de Fuse.js pour la recherche floue
  const fuse = useMemo(() => {
    return new Fuse(options, {
      keys: ['label'],
      threshold: 0.4, // Tolérance aux erreurs (0.0 = exact, 1.0 = accepte tout)
      distance: 100, // Distance maximale de recherche (caractères)
      includeScore: true, // Inclure le score de correspondance
      minMatchCharLength: 2, // Nombre minimum de caractères pour déclencher la recherche
      ignoreLocation: true, // Ignorer la position des caractères
      shouldSort: true, // Trier par pertinence
      findAllMatches: true // Trouver toutes les correspondances
    });
  }, [options]);

  // Filtrer les options avec recherche floue et exclure les sous-parties déjà sélectionnées
  const filteredOptions = useMemo(() => {
    // D'abord, exclure les sous-parties déjà sélectionnées
    const availableOptions = options.filter(option => 
      !selectedSousParties.some(sp => sp.id === option.value)
    );

    // ✅ Vérifier si "Lignes directes" est déjà sélectionnée
    const hasDirectLines = selectedSousParties.some(sp => 
      sp.description === DIRECT_LINES_DESCRIPTION
    );

    // ✅ Vérifier si "Lignes directes" existe déjà dans les options chargées depuis l'API
    // Format API : {value: id, label: description, data: {id, description, ...}}
    const existingDirectLinesOption = availableOptions.find(option => {
      const description = option.data?.description || option.label || '';
      return description === DIRECT_LINES_DESCRIPTION || description.trim() === DIRECT_LINES_DESCRIPTION;
    });

    // Si pas de recherche, ajouter "Lignes directes" en premier si elle n'est pas déjà sélectionnée
    if (!inputValue || inputValue.trim() === '') {
      // Si "Lignes directes" existe déjà dans les options, l'utiliser (avec son ID réel)
      if (existingDirectLinesOption && !hasDirectLines) {
        // Marquer cette option comme "Lignes directes" pour le style
        const directLinesOption = {
          ...existingDirectLinesOption,
          label: `⚡ ${existingDirectLinesOption.label || DIRECT_LINES_DESCRIPTION}`,
          data: {
            ...existingDirectLinesOption.data,
            isDirectLines: true
          }
        };
        // Retirer l'option des availableOptions pour éviter les doublons
        const otherOptions = availableOptions.filter(opt => opt.value !== existingDirectLinesOption.value);
        return [directLinesOption, ...otherOptions];
      }
      
      // Si "Lignes directes" n'existe pas encore, créer une option temporaire pour la création
      if (!hasDirectLines && !existingDirectLinesOption) {
        const directLinesOption = {
          value: `direct_lines_${partieId}`,
          label: `⚡ ${DIRECT_LINES_DESCRIPTION}`,
          data: { 
            description: DIRECT_LINES_DESCRIPTION, 
            isDirectLines: true,
            needsCreation: true // Flag pour indiquer qu'il faut créer
          }
        };
        return [directLinesOption, ...availableOptions];
      }
      
      return availableOptions;
    }

    // Utiliser Fuse.js pour la recherche floue
    const fuseResults = fuse.search(inputValue);
    
    // Convertir les résultats Fuse en format React Select
    const results = fuseResults.map(result => result.item);
    
    // ✅ Vérifier si la recherche correspond à "Lignes directes"
    const searchLower = inputValue.toLowerCase().trim();
    const directLinesMatches = !hasDirectLines && (
      DIRECT_LINES_DESCRIPTION.toLowerCase().includes(searchLower) ||
      searchLower.includes('ligne') ||
      searchLower.includes('directe')
    );
    
    // Si "Lignes directes" correspond à la recherche, l'ajouter en premier
    if (directLinesMatches) {
      // Si "Lignes directes" existe déjà dans les options, l'utiliser (avec son ID réel)
      if (existingDirectLinesOption) {
        const directLinesOption = {
          ...existingDirectLinesOption,
          label: `⚡ ${existingDirectLinesOption.label || DIRECT_LINES_DESCRIPTION}`,
          data: {
            ...existingDirectLinesOption.data,
            isDirectLines: true
          }
        };
        // Retirer l'option des results si elle y est déjà
        const otherResults = results.filter(opt => opt.value !== existingDirectLinesOption.value);
        // Si on a des résultats, les ajouter après "Lignes directes"
        if (otherResults.length > 0) {
          return [directLinesOption, ...otherResults];
        }
        // Si aucun résultat mais correspondance avec "Lignes directes", la retourner seule
        return [directLinesOption];
      }
      
      // Si "Lignes directes" n'existe pas encore, créer une option temporaire pour la création
      const directLinesOption = {
        value: `direct_lines_${partieId}`,
        label: `⚡ ${DIRECT_LINES_DESCRIPTION}`,
        data: { 
          description: DIRECT_LINES_DESCRIPTION, 
          isDirectLines: true,
          needsCreation: true // Flag pour indiquer qu'il faut créer
        }
      };
      
      // Si on a des résultats, les ajouter après "Lignes directes"
      if (results.length > 0) {
        return [directLinesOption, ...results];
      }
      
      // Si aucun résultat mais correspondance avec "Lignes directes", la retourner seule
      return [directLinesOption];
    }
    
    // Si on a des résultats, les retourner
    if (results.length > 0) {
      return results;
    }
    
    // Si aucun résultat, vérifier s'il y a une correspondance approximative
    return availableOptions.filter(option => 
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      inputValue.toLowerCase().includes(option.label.toLowerCase())
    );
  }, [inputValue, options, selectedSousParties, fuse, partieId]);

  // Options avec possibilité de créer
  const optionsWithCreate = useMemo(() => {
    // Si pas de recherche ou si on a des résultats, retourner les options normales
    if (inputValue.trim() === '' || filteredOptions.length > 0) {
      return filteredOptions;
    }
    
    // Si aucun résultat, proposer l'option de création
    return [
      {
        value: 'create',
        label: `✨ Créer "${inputValue}"`,
        data: { description: inputValue, isCreate: true }
      }
    ];
  }, [filteredOptions, inputValue]);

  // Gérer la sélection ou création
  const handleChange = async (selectedOption) => {
    if (!selectedOption) return;

    // ✅ Si c'est "Lignes directes", vérifier si elle existe déjà ou doit être créée
    if (selectedOption.data?.isDirectLines) {
      // Vérifier si c'est une option existante (avec ID réel) ou une nouvelle à créer
      const valueStr = selectedOption.value?.toString() || '';
      const isTemporaryId = valueStr.startsWith('direct_lines_');
      const hasRealId = selectedOption.data?.id && !isTemporaryId;
      const needsCreation = selectedOption.data?.needsCreation === true;
      
      if (hasRealId && !needsCreation) {
        // C'est une sous-partie existante, la sélectionner
        if (onSousPartieSelect) {
          onSousPartieSelect(selectedOption.data);
        }
        // ✅ Réinitialiser l'input après sélection
        setInputValue('');
      } else {
        // C'est une nouvelle "Lignes directes" à créer (ou options pas encore chargées).
        // ✅ Anti-race : vérifier d'abord si "Lignes directes" existe déjà en base.
        try {
          const res = await axios.get('/api/sous-parties/search/', {
            params: { partie: partieId, q: DIRECT_LINES_DESCRIPTION }
          });

          if (Array.isArray(res.data)) {
            const existing = res.data.find(opt => {
              const desc = opt?.data?.description || opt?.label || '';
              return desc.trim() === DIRECT_LINES_DESCRIPTION;
            });

            if (existing?.data && onSousPartieSelect) {
              onSousPartieSelect(existing.data);
              setInputValue('');
              return;
            }
          }
        } catch (e) {
          // ignore: on tente ensuite la création
        }

        // Sinon, créer réellement
        if (onSousPartieCreate) {
          onSousPartieCreate(partieId, DIRECT_LINES_DESCRIPTION);
        }
        setInputValue('');
      }
      return;
    }

    // Si c'est une création
    if (selectedOption.value === 'create' || selectedOption.data?.isCreate) {
      if (onSousPartieCreate && inputValue.trim()) {
        onSousPartieCreate(partieId, inputValue.trim());
        // ✅ Réinitialiser l'input après création
        setInputValue('');
      }
    } else {
      // Si c'est une sélection
      if (onSousPartieSelect) {
        onSousPartieSelect(selectedOption.data);
        // ✅ Réinitialiser l'input après sélection
        setInputValue('');
      }
    }
  };

  // Styles personnalisés pour React Select
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '40px',
      border: state.isFocused ? '2px solid #1976d2' : '1px solid #dee2e6',
      borderRadius: '6px',
      boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(25, 118, 210, 0.25)' : 'none',
      '&:hover': {
        borderColor: '#1976d2'
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '14px'
    }),
    input: (provided) => ({
      ...provided,
      fontSize: '14px'
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      borderRadius: '6px'
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#1976d2' 
        : state.isFocused 
          ? '#e3f2fd' 
          : 'white',
      color: state.isSelected ? 'white' : '#333',
      fontSize: '14px',
      padding: '8px 12px'
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '14px',
      padding: '12px'
    })
  };

  // Fonction pour charger les options via l'endpoint search
  const loadOptions = async () => {
    if (!partieId) return;
    
    try {
      setIsLoading(true);
      const url = inputValue.trim() 
        ? `/api/sous-parties/search/?partie=${partieId}&q=${encodeURIComponent(inputValue.trim())}`
        : `/api/sous-parties/search/?partie=${partieId}`;
      
      const response = await axios.get(url);
      
      if (response.data && Array.isArray(response.data)) {
        const formattedOptions = response.data
          .filter(option => !selectedSousParties.some(sp => sp.id === option.value))
          .map(option => ({
            value: option.value,
            label: option.label,
            data: option.data
          }));
        
        setOptions(formattedOptions);
      }
    } catch (error) {
      // Erreur lors du chargement des sous-parties
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les options lorsque l'input change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (partieId) {
        loadOptions();
      }
    }, 300); // Debounce de 300ms
    
    return () => clearTimeout(timeoutId);
  }, [inputValue, partieId, selectedSousParties]);

  return (
    <div style={{ marginBottom: '0' }}>
      <Select
        isClearable
        isSearchable
        placeholder="Rechercher une sous-partie ou sélectionner 'Lignes directes'..."
        options={optionsWithCreate}
        value={null}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(newValue, actionMeta) => {
          // Préserver la valeur sauf si l'utilisateur efface explicitement
          if (actionMeta.action === 'input-change') {
            setInputValue(newValue);
          } else if (actionMeta.action === 'clear') {
            setInputValue('');
          }
        }}
        styles={customStyles}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        isLoading={isLoading}
        onBlur={() => {
          // Préserver la valeur au blur
          // Ne rien faire, la valeur est déjà préservée dans inputValue
        }}
        noOptionsMessage={() => 
          inputValue.trim() 
            ? `Aucune sous-partie trouvée. Tapez pour créer "${inputValue}"`
            : 'Commencez à taper pour rechercher...'
        }
      />
    </div>
  );
};

export default SousPartieSearch;

