import { useCallback, useState } from "react";
import axios from "axios";

export const useRapports = () => {
  const [rapports, setRapports] = useState([]);
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRapports = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value);
        }
      });
      const response = await axios.get(`/api/rapports-intervention/?${params.toString()}`);
      const list = Array.isArray(response.data?.results)
        ? response.data.results
        : Array.isArray(response.data)
          ? response.data
          : [];
      setRapports(list);
      return list;
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement des rapports");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRapport = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/rapports-intervention/${id}/`);
      setRapport(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement du rapport");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRapport = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("/api/rapports-intervention/", data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la creation du rapport");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRapport = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`/api/rapports-intervention/${id}/`, data);
      setRapport(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la mise a jour du rapport");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const patchRapport = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.patch(`/api/rapports-intervention/${id}/`, data);
      setRapport(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la mise a jour du rapport");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRapport = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`/api/rapports-intervention/${id}/`);
      setRapports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la suppression du rapport");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadPhoto = useCallback(async (prestationId, file, typePhoto = "avant", datePhoto = null) => {
    const formData = new FormData();
    formData.append("prestation_id", prestationId);
    formData.append("type_photo", typePhoto);
    formData.append("photo", file);
    if (datePhoto) {
      formData.append("date_photo", datePhoto);
    }

    try {
      const response = await axios.post("/api/rapports-intervention/upload_photo/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const updatePhoto = useCallback(async (photoId, data) => {
    try {
      const response = await axios.patch(`/api/rapports-intervention/update_photo/${photoId}/`, data);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const deletePhoto = useCallback(async (photoId) => {
    try {
      await axios.delete(`/api/rapports-intervention/delete_photo/${photoId}/`);
    } catch (err) {
      throw err;
    }
  }, []);

  const uploadSignature = useCallback(async (rapportId, signatureBase64) => {
    try {
      const response = await axios.post(
        `/api/rapports-intervention/${rapportId}/upload_signature/`,
        { signature: signatureBase64 }
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const genererPdf = useCallback(async (rapportId) => {
    try {
      const response = await axios.post(`/api/rapports-intervention/${rapportId}/generer_pdf/`);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const validerRapport = useCallback(async (rapportId) => {
    try {
      const response = await axios.post(`/api/rapports-intervention/${rapportId}/valider/`);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const lierChantier = useCallback(async (rapportId, chantierId) => {
    try {
      const response = await axios.post(
        `/api/rapports-intervention/${rapportId}/lier_chantier/`,
        { chantier_id: chantierId }
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  // Titres
  const fetchTitres = useCallback(async () => {
    try {
      const response = await axios.get("/api/titres-rapport/");
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const createTitre = useCallback(async (nom) => {
    try {
      const response = await axios.post("/api/titres-rapport/", { nom });
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    rapports,
    rapport,
    loading,
    error,
    setRapport,
    fetchRapports,
    fetchRapport,
    createRapport,
    updateRapport,
    patchRapport,
    deleteRapport,
    uploadPhoto,
    updatePhoto,
    deletePhoto,
    uploadSignature,
    genererPdf,
    validerRapport,
    lierChantier,
    fetchTitres,
    createTitre,
  };
};
