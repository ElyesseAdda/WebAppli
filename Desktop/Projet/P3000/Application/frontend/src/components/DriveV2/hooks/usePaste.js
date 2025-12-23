/**
 * usePaste Hook - Gestion du copier-coller de fichiers depuis le presse-papier SYSTÈME
 * 
 * Permet d'uploader des fichiers directement en faisant Ctrl+V (ou Cmd+V sur Mac)
 * dans le Drive sans avoir à passer par le sélecteur de fichiers.
 * 
 * ⚠️ LIMITATION : L'API Clipboard des navigateurs ne préserve PAS la structure des dossiers.
 * Si vous copiez un dossier depuis l'explorateur Windows/Mac, seuls les fichiers individuels
 * seront collés, sans leur structure de dossiers.
 * 
 * 📁 Pour uploader des dossiers avec leur structure complète, utilisez le DRAG & DROP ou
 * le bouton "Upload" avec l'option "Dossier".
 */

import { useEffect, useCallback } from 'react';

/**
 * Hook pour gérer le paste de fichiers depuis le clipboard système
 * 
 * @param {Function} onFilesPasted - Callback appelé quand des fichiers sont collés
 * @param {Function} onWarning - Callback optionnel pour afficher un avertissement
 * @param {boolean} enabled - Active ou désactive l'écoute du paste (défaut: true)
 * @returns {Object} - { isPasteSupported }
 */
export const usePaste = (onFilesPasted, onWarning = null, enabled = true) => {
  // Vérifier si le navigateur supporte l'API Clipboard
  const isPasteSupported = typeof ClipboardEvent !== 'undefined';

  const handlePaste = useCallback((event) => {
    // Ignorer si on est dans un champ de texte, textarea ou autre input
    const activeElement = document.activeElement;
    const isInputField = 
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable ||
      activeElement.getAttribute('contenteditable') === 'true';

    if (isInputField) {
      // Laisser le comportement par défaut dans les champs de texte
      return;
    }

    // Récupérer les fichiers depuis le clipboard
    if (!event.clipboardData || !event.clipboardData.items) {
      return;
    }

    const items = event.clipboardData.items;
    const files = [];

    // Parcourir tous les items du clipboard
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Vérifier si c'est un fichier
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    // Si on a des fichiers, les transmettre au callback
    if (files.length > 0) {
      event.preventDefault(); // Empêcher le comportement par défaut
      console.log(`${files.length} fichier(s) collé(s) depuis le presse-papier système`);
      
      // Avertissement sur la limitation de l'API Clipboard
      if (onWarning && files.length > 5) {
        onWarning(
          'Note : Si vous avez copié un dossier, seuls les fichiers individuels seront uploadés ' +
          '(sans la structure de dossiers). Pour préserver la structure, utilisez le drag & drop.'
        );
      }
      
      onFilesPasted(files);
    }
  }, [onFilesPasted, onWarning]);

  useEffect(() => {
    if (!enabled || !isPasteSupported) {
      return;
    }

    // Ajouter l'écouteur d'événement sur le document
    document.addEventListener('paste', handlePaste);

    // Nettoyer l'écouteur au démontage
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [enabled, isPasteSupported, handlePaste]);

  return {
    isPasteSupported,
  };
};

export default usePaste;

