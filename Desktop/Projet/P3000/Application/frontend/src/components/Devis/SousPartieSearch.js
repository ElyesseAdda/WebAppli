import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import Fuse from 'fuse.js';
import { FiPlus, FiX, FiSearch } from 'react-icons/fi';
import axios from 'axios';

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

    // Si pas de recherche, retourner toutes les options disponibles
    if (!inputValue || inputValue.trim() === '') {
      return availableOptions;
    }

    // Utiliser Fuse.js pour la recherche floue
    const fuseResults = fuse.search(inputValue);
    
    // Convertir les résultats Fuse en format React Select
    const results = fuseResults.map(result => result.item);
    
    // Si on a des résultats, les retourner
    if (results.length > 0) {
      return results;
    }
    
    // Si aucun résultat, vérifier s'il y a une correspondance approximative
    return availableOptions.filter(option => 
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      inputValue.toLowerCase().includes(option.label.toLowerCase())
    );
  }, [inputValue, options, selectedSousParties, fuse]);

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
  const handleChange = (selectedOption) => {
    if (!selectedOption) return;

    // Si c'est une création
    if (selectedOption.value === 'create' || selectedOption.data?.isCreate) {
      if (onSousPartieCreate && inputValue.trim()) {
        onSousPartieCreate(partieId, inputValue.trim());
        setInputValue(''); // Réinitialiser après création
      }
    } else {
      // Si c'est une sélection
      if (onSousPartieSelect) {
        onSousPartieSelect(selectedOption.data);
        setInputValue(''); // Réinitialiser après sélection
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
      console.error('Erreur lors du chargement des sous-parties:', error);
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
        placeholder="Rechercher une sous-partie..."
        options={optionsWithCreate}
        value={null}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(newValue) => setInputValue(newValue)}
        styles={customStyles}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        isLoading={isLoading}
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

