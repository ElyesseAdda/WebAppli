import { DevisIndexManager } from './DevisIndexManager';

const { reindexAll, sortByIndexGlobal, getNextIndex } = DevisIndexManager;

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

const findItem = (items, type, id) =>
  items.find(item => item.type === type && sameId(item.id, id));

const getNextPartieNumero = (items = []) => {
  const numericValues = items
    .filter(item => item.type === 'partie' && item.numero && /^\d+$/.test(String(item.numero)))
    .map(item => parseInt(item.numero, 10));
  if (numericValues.length === 0) {
    return '1';
  }
  return String(Math.max(...numericValues) + 1);
};

const getNextSousPartieNumero = (items = [], partieId) => {
  if (!partieId) return '';

  const parentPartie = findItem(items, 'partie', partieId);
  const parentNumero = parentPartie?.numero;
  if (parentNumero == null || !/^\d+(\.\d+)?$/.test(String(parentNumero))) {
    return '';
  }

  const parentText = String(parentNumero);
  const escapedParent = parentText.replace(/\./g, '\\.');
  const regex = new RegExp(`^${escapedParent}\\.(\\d+)$`);
  const existingIndexes = items
    .filter(item => (
      item.type === 'sous_partie' &&
      sameId(item.partie_id, partieId) &&
      item.numero &&
      regex.test(String(item.numero))
    ))
    .map(item => {
      const match = String(item.numero).match(regex);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(index => index !== null);

  const nextIndex = existingIndexes.length ? Math.max(...existingIndexes) + 1 : 1;
  return `${parentText}.${nextIndex}`;
};

const withoutNested = (source, keys) => {
  const copy = { ...source };
  keys.forEach(key => {
    delete copy[key];
  });
  return copy;
};

/**
 * Ajoute au devis le niveau choisi et ses parents manquants, sans doublon.
 * - partie : la partie seule
 * - sous_partie : la partie (si absente) et la sous-partie
 * - ligne_detail : la partie, la sous-partie, puis uniquement cette ligne
 */
export const appendCatalogSelection = (prevItems, selection) => {
  if (!selection || !selection.partie) return prevItems;

  const kind = selection.kind;
  let items = prevItems;
  let changed = false;

  const ensurePartie = () => {
    const partieId = selection.partie.id ?? selection.partieId;
    const existing = findItem(items, 'partie', partieId);
    if (existing) return existing;

    const fields = withoutNested(selection.partie, ['sous_parties', 'lignes_details', 'has_lignes_directes']);
    const globalIndexes = items
      .filter(item => item.type === 'partie' || (item.type === 'ligne_speciale' && item.context_type === 'global'))
      .map(item => Number(item.index_global) || 0);
    const nextIndex = (globalIndexes.length ? Math.max(...globalIndexes) : 0) + 1;

    const newPartie = {
      ...fields,
      type: 'partie',
      id: partieId,
      index_global: nextIndex,
      titre: fields.titre || fields.nom || '',
      type_activite: fields.type_activite || fields.type || 'PEINTURE',
      numero: getNextPartieNumero(items)
    };

    items = [...items, newPartie];
    changed = true;
    return newPartie;
  };

  const ensureSousPartie = (partieItem) => {
    const sousPartie = selection.sousPartie;
    if (!sousPartie || !partieItem) return null;

    const sousPartieId = sousPartie.id ?? selection.sousPartieId;
    const existing = findItem(items, 'sous_partie', sousPartieId);
    if (existing) return existing;

    const fields = withoutNested(sousPartie, ['lignes_details']);
    const nextIndex = getNextIndex(items, 'partie', partieItem.id)
      ?? ((Number(partieItem.index_global) || 0) + 0.1);

    const newSousPartie = {
      ...fields,
      type: 'sous_partie',
      id: sousPartieId,
      index_global: nextIndex,
      partie_id: partieItem.id,
      description: fields.description || 'Lignes directes',
      numero: getNextSousPartieNumero(items, partieItem.id)
    };

    items = [...items, newSousPartie];
    changed = true;
    return newSousPartie;
  };

  if (kind === 'partie') {
    ensurePartie();
  } else if (kind === 'sous_partie') {
    const partieItem = ensurePartie();
    ensureSousPartie(partieItem);
  } else if (kind === 'ligne_detail' && selection.ligne) {
    const partieItem = ensurePartie();
    const sousPartieItem = ensureSousPartie(partieItem);
    const ligneId = selection.ligne.id ?? selection.ligneId;
    if (sousPartieItem && !findItem(items, 'ligne_detail', ligneId)) {
      const nextIndex = getNextIndex(items, 'sous_partie', sousPartieItem.id)
        ?? ((Number(sousPartieItem.index_global) || 0) + 0.001);
      items = [...items, {
        ...selection.ligne,
        type: 'ligne_detail',
        id: ligneId,
        index_global: nextIndex,
        sous_partie_id: sousPartieItem.id,
        quantity: 0
      }];
      changed = true;
    }
  } else {
    return prevItems;
  }

  if (!changed) return prevItems;
  return reindexAll(sortByIndexGlobal(items));
};
