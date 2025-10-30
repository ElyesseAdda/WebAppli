import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import Fuse from 'fuse.js';
import { FiPlus, FiX, FiSearch } from 'react-icons/fi';

const PartieSearch = ({
  selectedParties = [],
  onPartieSelect,
  onPartieCreate,
  onPartieRemove,
  searchParties,
  isLoadingParties = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les options au montage du composant
  useEffect(() => {
    loadInitialOptions();
  }, []);

  // Charger toutes les options au démarrage
  const loadInitialOptions = async () => {
    console.log('🚀 Chargement initial des options...');
    setIsLoading(true);
    try {
      const allOptions = await searchParties('');
      console.log('✅ Options chargées:', allOptions.length);
      setOptions(allOptions);
    } catch (error) {
      console.error('❌ Erreur lors du chargement initial:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Filtrer les options avec recherche floue et exclure les parties déjà sélectionnées
  const filteredOptions = useMemo(() => {
    // D'abord, exclure les parties déjà sélectionnées
    const availableOptions = options.filter(option => 
      !selectedParties.some(partie => partie.id === option.value)
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
    
    // Si aucun résultat, vérifier s'il y a une correspondance approximative avec un seuil moins strict
    // Cela permet de trouver des résultats même si la tolérance est un peu dépassée
    return availableOptions.filter(option => 
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      inputValue.toLowerCase().includes(option.label.toLowerCase())
    );
  }, [inputValue, options, selectedParties, fuse]);

  // Ajouter l'option de création si aucune correspondance trouvée et qu'il y a du texte
  const optionsWithCreate = inputValue && filteredOptions.length === 0 ? [
    {
      value: `create_${inputValue}`,
      label: `✨ Créer "${inputValue}"`,
      data: {
        id: `create_${inputValue}`,
        titre: inputValue,
        type: 'PEINTURE',
        domaine: 'PEINTURE',
        total_partie: 0,
        special_lines: [],
        sous_parties: [],
        isNew: true,
        isCreateOption: true
      }
    }
  ] : filteredOptions;

  // Debug
  console.log('🔍 Input value:', inputValue);
  console.log('📋 Options disponibles:', options.length);
  console.log('🎯 Options filtrées:', filteredOptions.length);
  console.log('✅ Parties déjà sélectionnées:', selectedParties.map(p => p.titre));

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
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      borderRadius: '6px'
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '14px',
      padding: '12px'
    })
  };

  return (
    <div style={{ marginBottom: '0' }}>
      {/* Interface intégrée dans le style partie */}
      <div style={{ position: 'relative' }}>
        {/* Zone de recherche/création intégrée */}
        <div style={{ maxWidth: '100%' }}>
          <Select
            isClearable
            isSearchable
            isCreatable
            placeholder={selectedParties.length > 0 ? "Ajouter une autre partie..." : "Tapez le nom de la partie ou choisissez-en une existante..."}
            value={null}
            inputValue={inputValue}
            onInputChange={setInputValue}
            options={optionsWithCreate}
            onCreateOption={(inputValue) => {
              const result = onPartieCreate(inputValue);
              // Effacer l'input après création
              setInputValue('');
              return result;
            }}
            onChange={(selectedOption) => {
              if (selectedOption) {
                if (selectedOption.data.isCreateOption) {
                  // Créer une nouvelle partie
                  onPartieCreate(selectedOption.data.titre);
                } else {
                  // Sélectionner une partie existante
                  onPartieSelect(selectedOption);
                }
                // Effacer l'input après sélection/création
                setInputValue('');
              }
            }}
            isLoading={isLoading || isLoadingParties}
            loadingMessage={() => "Chargement..."}
            noOptionsMessage={() => {
              if (inputValue && inputValue.length > 0) {
                return `Aucune partie trouvée pour "${inputValue}". L'option de création apparaîtra dans le dropdown.`;
              }
              if (selectedParties.length > 0) {
                return "Toutes les parties disponibles sont déjà sélectionnées. Tapez pour créer une nouvelle partie.";
              }
              return "Commencez à taper pour rechercher ou créer une partie.";
            }}
            formatCreateLabel={(inputValue) => `✨ Créer "${inputValue}"`}
            onBlur={() => {
              // Ne pas effacer l'input au blur
              setTimeout(() => setInputValue(inputValue), 0);
            }}
            onFocus={() => {
              // S'assurer que les options sont chargées
              if (options.length === 0) {
                loadInitialOptions();
              }
            }}
            onMenuOpen={() => {
              // Charger les options si le menu s'ouvre
              if (options.length === 0) {
                loadInitialOptions();
              }
            }}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={{
              ...customStyles,
              control: (provided, state) => ({
                ...provided,
                minHeight: '40px',
                border: state.isFocused ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.3)',
                borderRadius: '4px',
                boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(255,255,255,0.25)' : 'none',
                fontSize: '16px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  backgroundColor: 'rgba(255,255,255,0.2)'
                }
              }),
              placeholder: (provided) => ({
                ...provided,
                color: 'rgba(255,255,255,0.8)',
                fontSize: '16px',
                fontWeight: 'bold'
              }),
              input: (provided) => ({
                ...provided,
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold'
              }),
              singleValue: (provided) => ({
                ...provided,
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold'
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 99999, // Augmenté pour être au-dessus de tout
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: '6px',
                position: 'absolute'
              }),
              menuPortal: (provided) => ({
                ...provided,
                zIndex: 99999
              })
            }}
            components={{
              DropdownIndicator: () => <FiSearch style={{ marginRight: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '18px' }} />,
              CreateOption: ({ children, ...props }) => (
                <div {...props} style={{ ...props.style, color: '#1976d2', fontWeight: '600', fontSize: '16px' }}>
                  <FiPlus style={{ marginRight: '8px' }} />
                  {children}
                </div>
              )
            }}
          />
        </div>

      </div>
    </div>
  );
};

export default PartieSearch;
