import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const AdminAgences = () => {
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAgences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/agences/");
      setAgences(res.data || []);
    } catch (error) {
      alert("Impossible de charger les agences.");
      setAgences([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgences();
  }, [fetchAgences]);

  const sortedAgences = useMemo(
    () => [...agences].sort((a, b) => Number(a.id) - Number(b.id)),
    [agences]
  );

  const formatBlockers = (agence) => {
    if (!agence?.delete_blockers?.length) return "Aucun blocage.";
    return agence.delete_blockers.join(", ");
  };

  const handleDeleteAgence = async (agence) => {
    if (!agence?.id) return;
    if (!agence.can_delete) {
      alert(
        `Suppression impossible pour "${agence.nom}".\n\nRaisons: ${formatBlockers(agence)}`
      );
      return;
    }

    const confirmation = window.confirm(
      `Attention: vous allez supprimer définitivement l'agence "${agence.nom}" et son chantier système.\n\nConfirmer la suppression ?`
    );
    if (!confirmation) return;

    setDeletingId(agence.id);
    try {
      await axios.delete(`/api/agences/${agence.id}/`);
      await fetchAgences();
      alert(`Agence "${agence.nom}" supprimée avec succès.`);
    } catch (error) {
      const blockers = error?.response?.data?.delete_blockers;
      const detail =
        error?.response?.data?.detail || "Suppression refusée par le serveur.";
      if (Array.isArray(blockers) && blockers.length) {
        alert(`${detail}\n\nRaisons: ${blockers.join(", ")}`);
      } else {
        alert(detail);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ marginBottom: "8px" }}>Admin - Gestion des agences</h2>
      <p style={{ marginTop: 0, marginBottom: "16px", color: "#555" }}>
        Suppression sécurisée avec avertissements. Une agence protégée ne peut pas être supprimée.
      </p>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Agence</th>
              <th style={thStyle}>Chantier lié</th>
              <th style={thStyle}>Statut suppression</th>
              <th style={thStyle}>Avertissements</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedAgences.map((agence) => (
              <tr key={agence.id}>
                <td style={tdStyle}>{agence.id}</td>
                <td style={tdStyle}>{agence.nom}</td>
                <td style={tdStyle}>{agence.chantier_name || "-"}</td>
                <td style={tdStyle}>
                  <span style={agence.can_delete ? badgeOkStyle : badgeWarnStyle}>
                    {agence.can_delete ? "Supprimable" : "Protégée"}
                  </span>
                </td>
                <td style={tdStyle}>{formatBlockers(agence)}</td>
                <td style={tdStyle}>
                  <button
                    type="button"
                    onClick={() => handleDeleteAgence(agence)}
                    disabled={!agence.can_delete || deletingId === agence.id}
                    style={{
                      ...deleteBtnStyle,
                      opacity: !agence.can_delete || deletingId === agence.id ? 0.5 : 1,
                      cursor:
                        !agence.can_delete || deletingId === agence.id
                          ? "not-allowed"
                          : "pointer",
                    }}
                    title={
                      agence.can_delete
                        ? "Supprimer cette agence"
                        : `Suppression bloquée: ${formatBlockers(agence)}`
                    }
                  >
                    {deletingId === agence.id ? "Suppression..." : "Supprimer"}
                  </button>
                </td>
              </tr>
            ))}
            {sortedAgences.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={6}>
                  Aucune agence trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "10px 8px",
  fontWeight: 600,
};

const tdStyle = {
  borderBottom: "1px solid #eee",
  padding: "10px 8px",
  verticalAlign: "top",
};

const badgeOkStyle = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: "999px",
  background: "#dcfce7",
  color: "#166534",
  fontWeight: 600,
  fontSize: "12px",
};

const badgeWarnStyle = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: "999px",
  background: "#fef3c7",
  color: "#92400e",
  fontWeight: 600,
  fontSize: "12px",
};

const deleteBtnStyle = {
  border: "none",
  background: "#b91c1c",
  color: "#fff",
  borderRadius: "6px",
  padding: "8px 10px",
  fontWeight: 600,
};

export default AdminAgences;
