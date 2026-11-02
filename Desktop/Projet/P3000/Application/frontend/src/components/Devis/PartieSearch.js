import React, { useState, useEffect, useMemo, useRef } from 'react';
import Select from 'react-select';
import Fuse from 'fuse.js';
import axios from 'axios';
import { FiPlus, FiSearch } from 'react-icons/fi';

const RESULT_LIMIT = 80;
const KIND_RANK = { partie: 0, sous_partie: 1, ligne_detail: 2 };
const KIND_META = {
  partie: { label: 'Partie', color: '#0e6f84', bg: '#e7f6f9' },
  sous_partie: { label: 'Sous-partie', color: '#6b4c9a', bg: '#f3eef8' },
  ligne_detail: { label: 'Ligne', color: '#0f766e', bg: '#e7f5f2' }
};

const fold = (value) =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

const isActive = (item) => item && item.is_deleted !== true;

const toSelectOptions = (parties) => (parties || []).map(partie => ({
  value: partie.id,
  label: `${partie.titre || partie.nom || ''}${partie.type ? ` (${partie.type})` : ''}`,
  data: partie
}));

const hasHierarchy = (partieOptions) => (partieOptions || []).some(option =>
  Array.isArray(option?.data?.sous_parties) && option.data.sous_parties.length > 0
);

const fetchAllParties = async () => {
  const firstResponse = await axios.get('/api/parties/');
  const firstRaw = firstResponse.data;
  if (Array.isArray(firstRaw)) return firstRaw;
  if (!firstRaw || !Array.isArray(firstRaw.results)) return [];

  let allParties = [...firstRaw.results];
  let nextUrl = firstRaw.next;
  let guard = 0;
  while (nextUrl && guard < 50) {
    guard += 1;
    const nextResp = await axios.get(nextUrl);
    const nextRaw = nextResp.data;
    if (Array.isArray(nextRaw)) return nextRaw;
    if (!nextRaw || !Array.isArray(nextRaw.results)) break;
    allParties = allParties.concat(nextRaw.results);
    nextUrl = nextRaw.next;
  }
  return allParties;
};

const buildCatalog = (partieOptions) => {
  const entries = [];

  (partieOptions || []).forEach(option => {
    const partie = option?.data;
    if (!partie || partie.isCreateOption || partie.isHint || !isActive(partie)) return;

    const partieId = partie.id ?? option.value;
    const titre = (partie.titre || partie.nom || '').trim();
    if (!titre) return;

    const typeLabel = partie.type || partie.type_activite || '';
    entries.push({
      value: `partie:${partieId}`,
      kind: 'partie',
      label: titre,
      folded: fold(titre),
      context: typeLabel,
      partieId,
      partie
    });

    (partie.sous_parties || []).forEach(sousPartie => {
      if (!isActive(sousPartie)) return;
      const sousPartieLabel = (sousPartie.description || '').trim() || 'Lignes directes';
      entries.push({
        value: `sous_partie:${sousPartie.id}`,
        kind: 'sous_partie',
        label: sousPartieLabel,
        folded: fold(sousPartieLabel),
        context: `dans ${titre}`,
        partieId,
        partie,
        sousPartieId: sousPartie.id,
        sousPartie
      });

      (sousPartie.lignes_details || []).forEach(ligne => {
        if (!isActive(ligne)) return;
        const ligneLabel = (ligne.description || '').trim();
        if (!ligneLabel) return;
        const unite = (ligne.unite || '').trim();
        entries.push({
          value: `ligne:${ligne.id}`,
          kind: 'ligne_detail',
          label: ligneLabel,
          folded: fold(ligneLabel),
          context: `dans ${sousPartieLabel} › ${titre}${unite ? ` · ${unite}` : ''}`,
          partieId,
          partie,
          sousPartieId: sousPartie.id,
          sousPartie,
          ligneId: ligne.id,
          ligne
        });
      });
    });
  });

  return entries;
};

const PartieSearch = ({
  selectedParties = [],
  devisItems = [],
  onPartieSelect,
  onPartieCreate,
  onCatalogSelect,
  searchParties,
  isLoadingParties = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadSeq = useRef(0);

  useEffect(() => {
    if (typeof searchParties === 'function') {
      loadInitialOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParties]);

  useEffect(() => {
    if (options.length > 0) {
      loadInitialOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParties.length]);

  const loadInitialOptions = async () => {
    const seq = ++loadSeq.current;
    setIsLoading(true);
    try {
      let allOptions = await searchParties('');
      if (!hasHierarchy(allOptions)) {
        const parties = await fetchAllParties();
        if (hasHierarchy(toSelectOptions(parties)) || (parties || []).length > 0) {
          allOptions = toSelectOptions(parties);
        }
      }
      if (seq !== loadSeq.current) return;
      setOptions(allOptions || []);
    } catch (error) {
      // Erreur lors du chargement initial
    } finally {
      if (seq === loadSeq.current) setIsLoading(false);
    }
  };

  const catalog = useMemo(() => buildCatalog(options), [options]);

  const fuse = useMemo(() => {
    return new Fuse(catalog, {
      keys: ['folded'],
      threshold: 0.35,
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
      shouldSort: true,
      findAllMatches: true
    });
  }, [catalog]);

  const isInDevis = (entry) => {
    if (entry.kind === 'partie') {
      const inItems = devisItems.some(item => item.type === 'partie' && sameId(item.id, entry.partieId));
      if (inItems) return true;
      return selectedParties.some(partie => sameId(partie.id, entry.partieId));
    }
    if (entry.kind === 'sous_partie') {
      return devisItems.some(item => item.type === 'sous_partie' && sameId(item.id, entry.sousPartieId));
    }
    if (entry.kind === 'ligne_detail') {
      return devisItems.some(item => item.type === 'ligne_detail' && sameId(item.id, entry.ligneId));
    }
    return false;
  };

  const filteredOptions = useMemo(() => {
    const available = catalog.filter(entry => !isInDevis(entry));
    const query = inputValue.trim();

    if (!query) {
      return available.filter(entry => entry.kind === 'partie');
    }

    const foldedQuery = fold(query);
    let matches = available.filter(entry => entry.folded.includes(foldedQuery));

    if (matches.length === 0 && foldedQuery.length >= 2) {
      matches = fuse.search(foldedQuery).map(result => result.item).filter(entry => !isInDevis(entry));
    }

    matches.sort((a, b) => {
      const aStart = a.folded.startsWith(foldedQuery) ? 0 : 1;
      const bStart = b.folded.startsWith(foldedQuery) ? 0 : 1;
      if (aStart !== bStart) return aStart - bStart;
      if (KIND_RANK[a.kind] !== KIND_RANK[b.kind]) return KIND_RANK[a.kind] - KIND_RANK[b.kind];
      return a.label.localeCompare(b.label, 'fr');
    });

    if (matches.length > RESULT_LIMIT) {
      const hiddenCount = matches.length - RESULT_LIMIT;
      return [
        ...matches.slice(0, RESULT_LIMIT),
        {
          value: '__more__',
          label: `… ${hiddenCount} autres résultats. Précisez la recherche.`,
          isDisabled: true,
          data: { isHint: true }
        }
      ];
    }

    return matches;
    // isInDevis dépend de devisItems et selectedParties, déjà listés
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, catalog, devisItems, selectedParties, fuse]);

  const trimmedInput = inputValue.trim();
  const hasExactPartie = trimmedInput !== '' && catalog.some(
    entry => entry.kind === 'partie' && entry.folded === fold(trimmedInput)
  );
  const realMatches = filteredOptions.filter(option => !option.data?.isHint);
  const showCreate = trimmedInput !== '' && !isLoading && !isLoadingParties && !hasExactPartie;

  const optionsWithCreate = showCreate
    ? [
        ...filteredOptions,
        {
          value: `create_${trimmedInput}`,
          label: `Créer la partie "${trimmedInput}"`,
          data: {
            id: `create_${trimmedInput}`,
            titre: trimmedInput,
            type: 'PEINTURE',
            domaine: 'PEINTURE',
            total_partie: 0,
            special_lines: [],
            sous_parties: [],
            isNew: true,
            isCreateOption: true
          }
        }
      ]
    : filteredOptions;

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
      backgroundColor: state.isFocused ? '#f4fbfc' : 'transparent',
      color: '#001514',
      fontSize: '14px',
      padding: '10px 12px',
      borderRadius: '10px',
      cursor: 'pointer',
      margin: '2px 0'
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      overflow: 'hidden',
      padding: '6px',
      border: '1px solid #e4e8ea',
      boxShadow: '0 18px 40px rgba(0, 21, 20, 0.12)',
      borderRadius: '14px',
      background: '#ffffff'
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: '#6c757d',
      fontSize: '14px',
      padding: '12px'
    })
  };

  const handleSelect = (selectedOption) => {
    if (!selectedOption || selectedOption.data?.isHint || selectedOption.isDisabled) return;

    if (selectedOption.data?.isCreateOption) {
      onPartieCreate(selectedOption.data.titre);
    } else if (selectedOption.kind === 'sous_partie' || selectedOption.kind === 'ligne_detail') {
      if (typeof onCatalogSelect === 'function') {
        onCatalogSelect(selectedOption);
      }
    } else if (selectedOption.kind === 'partie' || selectedOption.partie) {
      onPartieSelect({
        value: selectedOption.partie?.id ?? selectedOption.partieId,
        label: selectedOption.label,
        data: selectedOption.partie
      });
    }
  };

  return (
    <div style={{ marginBottom: '0' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ maxWidth: '100%' }}>
          <Select
            isClearable
            isSearchable
            placeholder={selectedParties.length > 0 ? "Ajouter une partie, une sous-partie ou une ligne..." : "Tapez une partie, une sous-partie ou une ligne de détail..."}
            value={null}
            inputValue={inputValue}
            onInputChange={(newValue, actionMeta) => {
              if (actionMeta.action === 'input-change') {
                setInputValue(newValue);
              } else if (actionMeta.action === 'clear') {
                setInputValue('');
              }
            }}
            options={optionsWithCreate}
            filterOption={() => true}
            closeMenuOnSelect={false}
            blurInputOnSelect={false}
            onChange={handleSelect}
            isLoading={isLoading || isLoadingParties}
            loadingMessage={() => "Chargement..."}
            noOptionsMessage={() => {
              if (trimmedInput && hasExactPartie && realMatches.length === 0) {
                return `« ${trimmedInput} » est déjà dans le devis.`;
              }
              if (trimmedInput) {
                return `Aucune correspondance pour « ${trimmedInput} ».`;
              }
              if (selectedParties.length > 0) {
                return "Toutes les parties disponibles sont déjà dans le devis. Tapez pour créer une nouvelle partie.";
              }
              return "Commencez à taper pour rechercher une partie, une sous-partie ou une ligne.";
            }}
            formatOptionLabel={(option) => {
              if (option.data?.isCreateOption) {
                return (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0e6f84', fontWeight: 650 }}>
                    <span style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: '#e7f6f9',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FiPlus size={14} />
                    </span>
                    {option.label}
                  </span>
                );
              }
              if (option.data?.isHint) {
                return <span style={{ color: '#6b7577', fontSize: '13px' }}>{option.label}</span>;
              }
              const meta = KIND_META[option.kind];
              if (!meta) return option.label;
              return (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{
                    marginTop: '2px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: meta.color,
                    background: meta.bg,
                    borderRadius: '999px',
                    padding: '3px 8px',
                    lineHeight: 1.4,
                    flexShrink: 0
                  }}>
                    {meta.label}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, color: '#001514', lineHeight: 1.35 }}>{option.label}</span>
                    {option.context ? (
                      <span style={{ display: 'block', marginTop: '2px', fontSize: '12px', fontWeight: 500, color: '#6b7577', lineHeight: 1.35 }}>{option.context}</span>
                    ) : null}
                  </span>
                </div>
              );
            }}
            onFocus={() => {
              if (options.length === 0) {
                loadInitialOptions();
              }
            }}
            onMenuOpen={() => {
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
                zIndex: 99999,
                overflow: 'hidden',
                padding: '6px',
                marginTop: '6px',
                border: '1px solid #e4e8ea',
                background: '#ffffff',
                boxShadow: '0 18px 40px rgba(0, 21, 20, 0.14)',
                borderRadius: '14px'
              }),
              menuList: (provided) => ({
                ...provided,
                maxHeight: '340px',
                padding: '2px'
              }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isFocused ? '#f3fbfc' : 'transparent',
                color: '#001514',
                borderRadius: '10px',
                padding: '10px 12px',
                cursor: 'pointer',
                margin: '2px 0'
              }),
              menuPortal: (provided) => ({
                ...provided,
                zIndex: 99999
              })
            }}
            components={{
              DropdownIndicator: () => <FiSearch style={{ marginRight: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '18px' }} />
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PartieSearch;
