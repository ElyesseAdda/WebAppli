import { useCallback, useState } from "react";
import axios from "axios";

export const RAPPORTS_LIST_PAGE_SIZE = 30;

export const useRapports = () => {
  const [rapports, setRapports] = useState([]);
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rapportsCount, setRapportsCount] = useState(0);

  const fetchRapports = useCallback(async (filters = {}, opts = {}) => {
    const {
      page = 1,
      pageSize,
      ordering,
      excludeStatutTermine,
      onlyStatutTermine,
    } = opts;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value);
        }
      });
      params.append("page", String(page));
      if (pageSize != null && pageSize !== "") {
        params.append("page_size", String(pageSize));
      }
      if (ordering) {
        params.append("ordering", ordering);
      }
      if (excludeStatutTermine) {
        params.append("exclude_statut_termine", "true");
      }
      if (onlyStatutTermine) {
        params.append("only_statut_termine", "true");
      }
      const response = await axios.get(`/api/rapports-intervention/?${params.toString()}`);
      const data = response.data;
      if (data != null && Array.isArray(data.results)) {
        setRapports(data.results);
        const total = typeof data.count === "number" ? data.count : data.results.length;
        setRapportsCount(total);
        return { results: data.results, count: total };
      }
      const list = Array.isArray(data) ? data : [];
      setRapports(list);
      setRapportsCount(list.length);
      return { results: list, count: list.length };
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
      setError(err.response?.data?.detail || "Erreur lors de la création du rapport");
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
      setError(err.response?.data?.detail || "Erreur lors de la mise à jour du rapport");
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
      setError(err.response?.data?.detail || "Erreur lors de la mise à jour du rapport");
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
    const response = await axios.post("/api/rapports-intervention/upload_photo/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }, []);

  const updatePhoto = useCallback(async (photoId, data) => {
    const response = await axios.patch(`/api/rapports-intervention/update_photo/${photoId}/`, data);
    return response.data;
  }, []);

  const deletePhoto = useCallback(async (photoId) => {
    await axios.delete(`/api/rapports-intervention/delete_photo/${photoId}/`);
  }, []);

  const uploadSignature = useCallback(async (rapportId, signatureBase64) => {
    const response = await axios.post(
      `/api/rapports-intervention/${rapportId}/upload_signature/`,
      { signature: signatureBase64 }
    );
    return response.data;
  }, []);

  const genererPdf = useCallback(async (rapportId) => {
    const response = await axios.post(`/api/rapports-intervention/${rapportId}/generer_pdf/`);
    return response.data;
  }, []);

  const validerRapport = useCallback(async (rapportId) => {
    const response = await axios.post(`/api/rapports-intervention/${rapportId}/valider/`);
    return response.data;
  }, []);

  const lierChantier = useCallback(async (rapportId, chantierId) => {
    const response = await axios.post(
      `/api/rapports-intervention/${rapportId}/lier_chantier/`,
      { chantier_id: chantierId }
    );
    return response.data;
  }, []);

  const fetchTitres = useCallback(async () => {
    const response = await axios.get("/api/titres-rapport/");
    return response.data;
  }, []);

  const createTitre = useCallback(async (nom) => {
    const response = await axios.post("/api/titres-rapport/", { nom });
    return response.data;
  }, []);

  const deleteTitre = useCallback(async (titreId) => {
    await axios.delete(`/api/titres-rapport/${titreId}/`);
  }, []);

  const createRapportBrouillon = useCallback(async (data) => {
    const response = await axios.post("/api/rapports-intervention-brouillons/", data);
    return response.data;
  }, []);

  const patchRapportBrouillon = useCallback(async (id, data) => {
    const response = await axios.patch(`/api/rapports-intervention-brouillons/${id}/`, data);
    return response.data;
  }, []);

  const promouvoirRapportBrouillon = useCallback(async (id, data = {}) => {
    const response = await axios.post(`/api/rapports-intervention-brouillons/${id}/promouvoir/`, data);
    return response.data;
  }, []);

  const deleteRapportBrouillon = useCallback(async (id) => {
    await axios.delete(`/api/rapports-intervention-brouillons/${id}/`);
  }, []);

  return {
    rapports,
    rapport,
    loading,
    error,
    rapportsCount,
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
    deleteTitre,
    createRapportBrouillon,
    patchRapportBrouillon,
    promouvoirRapportBrouillon,
    deleteRapportBrouillon,
  };
};
