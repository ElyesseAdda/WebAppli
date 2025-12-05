/**
 * useDrive Hook - Gestion de l'état du drive
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = '/api/drive-v2';

export const useDrive = () => {
  const [currentPath, setCurrentPath] = useState('');
  const [folderContent, setFolderContent] = useState({
    folders: [],
    files: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Récupérer le contenu d'un dossier
  const fetchFolderContent = useCallback(async (folderPath = '') => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/list-content/`, {
        params: { folder_path: folderPath },
        withCredentials: true,
      });

      setFolderContent({
        folders: response.data.folders || [],
        files: response.data.files || [],
      });
      setCurrentPath(folderPath);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Créer un dossier
  const createFolder = useCallback(async (parentPath, folderName) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/create-folder/`,
        {
          parent_path: parentPath,
          folder_name: folderName,
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
        }
      );

      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, []);

  // Supprimer un élément
  const deleteItem = useCallback(async (itemPath, isFolder = false) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/delete-item/`, {
        data: {
          item_path: itemPath,
          is_folder: isFolder,
        },
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
      });

      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }, []);

  // Actualiser le contenu
  const refreshContent = useCallback(() => {
    fetchFolderContent(currentPath);
  }, [currentPath, fetchFolderContent]);

  // Utilitaire pour récupérer le token CSRF
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + '=') {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  return {
    currentPath,
    folderContent,
    loading,
    error,
    fetchFolderContent,
    createFolder,
    deleteItem,
    refreshContent,
  };
};
