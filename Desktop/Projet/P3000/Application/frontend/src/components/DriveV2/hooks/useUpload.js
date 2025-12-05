/**
 * useUpload Hook - Gestion de l'upload de fichiers
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = '/api/drive-v2';

export const useUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState({});

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

  // Upload d'un fichier
  const uploadFile = async (file, currentPath) => {
    try {
      // 1. Obtenir l'URL d'upload
      const uploadUrlResponse = await axios.post(
        `${API_BASE_URL}/upload-url/`,
        {
          file_path: currentPath,
          file_name: file.name,
          content_type: file.type || 'application/octet-stream',
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
        }
      );

      const { upload_url, fields } = uploadUrlResponse.data;

      // 2. Upload direct vers S3
      const formData = new FormData();
      Object.keys(fields).forEach((key) => {
        formData.append(key, fields[key]);
      });
      formData.append('file', file);

      // Upload vers S3 sans credentials (authentification via URL présignée)
      await axios.post(upload_url, formData, {
        withCredentials: false, // Important : S3 n'accepte pas les credentials avec CORS wildcard
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress((prev) => ({
            ...prev,
            [file.name]: {
              progress: percentCompleted,
              complete: false,
              error: null,
            },
          }));
        },
      });

      // Marquer comme complété
      setProgress((prev) => ({
        ...prev,
        [file.name]: {
          progress: 100,
          complete: true,
          error: null,
        },
      }));

      return true;
    } catch (error) {
      setProgress((prev) => ({
        ...prev,
        [file.name]: {
          progress: 0,
          complete: false,
          error: error.message,
        },
      }));
      
      setErrors((prev) => ({
        ...prev,
        [file.name]: error.message,
      }));

      return false;
    }
  };

  // Upload de plusieurs fichiers
  const uploadFiles = useCallback(async (files, currentPath) => {
    setUploading(true);
    setProgress({});
    setErrors({});

    const results = await Promise.all(
      files.map((file) => uploadFile(file, currentPath))
    );

    setUploading(false);

    const successCount = results.filter((r) => r).length;
    const errorCount = results.filter((r) => !r).length;

    return {
      success: successCount,
      error: errorCount,
      total: files.length,
    };
  }, []);

  return {
    uploadFiles,
    uploading,
    progress,
    errors,
  };
};
