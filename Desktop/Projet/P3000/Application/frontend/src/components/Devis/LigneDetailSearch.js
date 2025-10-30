import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import Fuse from 'fuse.js';
import axios from 'axios';
import LigneDetailCreateModal from './LigneDetailCreateModal';

const LigneDetailSearch = ({
  sousPartieId,
  partieId,
  selectedLignesDetails = [],
  onLigneDetailSelect,
  onLigneDetailCreate
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDescription, setModalDescription] = useState('');

  // Configuration de Fuse.js pour la recherche floue
  const fuse = useMemo(() => {
    return new Fuse(options, {
      keys: ['label'],
      threshold: 0.4,
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
      shouldSort: true,
      findAllMatches: true
    });
  }, [options]);

  // Filtrer les options avec recherche floue
  const filteredOptions = useMemo(() => {
    const availableOptions = options.filter(option => 
      !selectedLignesDetails.some(ld => ld.id === option.value)
    );

    if (!inputValue || inputValue.trim() === '') {
      return availableOptions;
    }

    const fuseResults = fuse.search(inputValue);
    const results = fuseResults.map(result => result.item);
    
    if (results.length > 0) {
      return results;
    }
    
    return availableOptions.filter(option => 
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      inputValue.toLowerCase().includes(option.label.toLowerCase())
    );
  }, [inputValue, options, selectedLignesDetails, fuse]);

  // Options avec possibilité de créer
  const optionsWithCreate = useMemo(() => {
    if (inputValue.trim() === '' || filteredOptions.length > 0) {
      return filteredOptions;
    }
    
    return [
      {
        value: 'create',
        label: `✨ Créer "${inputValue}"`,
        data: { description: inputValue, isCreate: true }
      }
    ];
  }, [filteredOptions, inputValue]);

  // Charger les options via l'endpoint search
  const loadOptions = async () => {
    if (!sousPartieId) return;
    
    try {
      setIsLoading(true);
      const url = inputValue.trim() 
        ? `/api/ligne-details/search/?sous_partie=${sousPartieId}&q=${encodeURIComponent(inputValue.trim())}`
        : `/api/ligne-details/search/?sous_partie=${sousPartieId}`;
      
      const response = await axios.get(url);
      
      if (response.data && Array.isArray(response.data)) {
        const formattedOptions = response.data
          .filter(option => !selectedLignesDetails.some(ld => ld.id === option.value))
          .map(option => {
            const unite = option.data?.unite || '';
            const prix = option.data?.prix || '';
            // Ajouter l'unité et le prix au label : "Description | unite| prix"
            const labelWithDetails = unite && prix 
              ? `${option.label} | ${unite}| ${prix} €`
              : option.label;
            return {
              value: option.value,
              label: labelWithDetails,
              data: option.data
            };
          });
        
        setOptions(formattedOptions);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des lignes de détails:', error);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les options lorsque l'input change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (sousPartieId) {
        loadOptions();
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [inputValue, sousPartieId, selectedLignesDetails]);

  // Gérer la sélection ou création
  const handleChange = (selectedOption) => {
    if (!selectedOption) return;

    if (selectedOption.value === 'create' || selectedOption.data?.isCreate) {
      // Ouvrir le modal de création
      setModalDescription(inputValue.trim());
      setIsModalOpen(true);
      setInputValue('');
    } else {
      if (onLigneDetailSelect) {
        onLigneDetailSelect(selectedOption.data);
        setInputValue('');
      }
    }
  };

  // Gérer la création réussie depuis le modal
  const handleModalSuccess = (newLigneDetail) => {
    // Ajouter la nouvelle ligne directement
    if (onLigneDetailSelect) {
      onLigneDetailSelect({ ...newLigneDetail, quantity: 0 });
    }
    setIsModalOpen(false);
    setModalDescription('');
  };

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '32px',
      border: state.isFocused ? '2px solid #1976d2' : '1px solid #dee2e6',
      borderRadius: '6px',
      fontSize: '13px',
      '&:hover': {
        borderColor: '#1976d2'
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '13px'
    }),
    input: (provided) => ({
      ...provided,
      fontSize: '13px'
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 99999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      borderRadius: '6px'
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 99999
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#1976d2' 
        : state.isFocused 
          ? '#e3f2fd' 
          : 'white',
      color: state.isSelected ? 'white' : '#333',
      fontSize: '13px',
      padding: '6px 10px'
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '13px',
      padding: '10px'
    })
  };

  return (
    <>
      <div style={{ marginBottom: '8px' }}>
        <Select
          isClearable
          isSearchable
          placeholder="Rechercher une ligne de détail..."
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
              ? `Aucune ligne trouvée. Tapez pour créer "${inputValue}"`
              : 'Commencez à taper pour rechercher...'
          }
        />
      </div>
      
      <LigneDetailCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        description={modalDescription}
        sousPartieId={sousPartieId}
        partieId={partieId}
        onSuccess={handleModalSuccess}
      />
    </>
  );
};

export default LigneDetailSearch;

