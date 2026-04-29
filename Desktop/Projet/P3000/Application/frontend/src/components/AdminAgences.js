import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const AdminAgences = () => {
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const fetchAgences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/agences/");
      setAgences(res.data || []);
      setFeedback({ type: "", message: "" });
    } catch (error) {
      setFeedback({
        type: "error",
        message: "Impossible de charger les agences.",
      });
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

  const filteredAgences = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    if (!searchLower) return sortedAgences;
    return sortedAgences.filter((agence) => {
      const values = [
        String(agence.id || ""),
        agence.nom || "",
        agence.chantier_name || "",
      ];
      return values.some((value) => value.toLowerCase().includes(searchLower));
    });
  }, [search, sortedAgences]);

  const stats = useMemo(() => {
    const total = sortedAgences.length;
    const protectedCount = sortedAgences.filter((a) => !a.can_delete).length;
    const deletable = total - protectedCount;
    return { total, protectedCount, deletable };
  }, [sortedAgences]);

  const isDefaultAgence = (agence) =>
    (agence?.nom || "").trim().toLowerCase() === "agence";

  const formatBlockers = (agence) => {
    if (!agence?.delete_blockers?.length) return "Aucun blocage.";
    return agence.delete_blockers.join(", ");
  };

  const handleDeleteAgence = async (agence) => {
    if (!agence?.id) return;
    if (!agence.can_delete) {
      setFeedback({
        type: "warning",
        message: `Suppression impossible pour "${agence.nom}". Raisons: ${formatBlockers(
          agence
        )}`,
      });
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
      setFeedback({
        type: "success",
        message: `Agence "${agence.nom}" supprimée avec succès.`,
      });
    } catch (error) {
      const blockers = error?.response?.data?.delete_blockers;
      const detail =
        error?.response?.data?.detail || "Suppression refusée par le serveur.";
      if (Array.isArray(blockers) && blockers.length) {
        setFeedback({
          type: "error",
          message: `${detail} Raisons: ${blockers.join(", ")}`,
        });
      } else {
        setFeedback({ type: "error", message: detail });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleRenameAgence = async (agence) => {
    if (!agence?.id) return;
    if (isDefaultAgence(agence)) {
      setFeedback({
        type: "warning",
        message: "Le renommage de l'agence par défaut est interdit.",
      });
      return;
    }

    const nextName = window.prompt("Nouveau nom de l'agence :", agence.nom || "");
    if (nextName === null) return;
    const trimmedName = nextName.trim();
    if (!trimmedName || trimmedName === agence.nom) return;

    try {
      await axios.patch(`/api/agences/${agence.id}/`, { nom: trimmedName });
      await fetchAgences();
      setFeedback({
        type: "success",
        message: `Agence renommée en "${trimmedName}".`,
      });
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.nom?.[0] ||
        "Renommage refusé par le serveur.";
      setFeedback({ type: "error", message: detail });
    }
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ marginBottom: "8px" }}>Admin - Gestion des agences</h2>
          <p style={{ margin: 0, color: "#4b5563" }}>
            Administration des agences, du chantier système lié, et des actions de maintenance.
          </p>
        </div>
        <button type="button" onClick={fetchAgences} style={secondaryBtnStyle}>
          Rafraîchir
        </button>
      </div>

      <div style={statsGridStyle}>
        <StatCard label="Total agences" value={stats.total} />
        <StatCard label="Protégées" value={stats.protectedCount} tone="warn" />
        <StatCard label="Supprimables" value={stats.deletable} tone="ok" />
      </div>

      <div style={infoPanelStyle}>
        <div style={legendItemStyle}>
          <span style={badgeWarnStyle}>Protégée</span>
          <span style={{ color: "#374151" }}>
            Agence par défaut: suppression et renommage bloqués.
          </span>
        </div>
        <div style={legendItemStyle}>
          <span style={badgeOkStyle}>Supprimable</span>
          <span style={{ color: "#374151" }}>
            Les autres agences peuvent être renommées/supprimées.
          </span>
        </div>
      </div>

      {feedback.message && (
        <div style={{ ...feedbackStyle, ...feedbackByType[feedback.type || "info"] }}>
          {feedback.message}
        </div>
      )}

      <div style={toolbarStyle}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par ID, nom d'agence ou chantier"
          style={searchInputStyle}
        />
        <span style={{ color: "#6b7280", fontSize: "13px" }}>
          {filteredAgences.length} résultat(s)
        </span>
      </div>

      <div style={tableWrapperStyle}>
        {loading ? (
          <p style={{ padding: "12px", margin: 0 }}>Chargement...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Agence</th>
                <th style={thStyle}>Chantier lié</th>
                <th style={thStyle}>Statut suppression</th>
                <th style={thStyle}>Avertissements</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgences.map((agence, idx) => {
                const defaultAgence = isDefaultAgence(agence);
                const rowStyle = idx % 2 === 0 ? rowEvenStyle : rowOddStyle;
                return (
                  <tr key={agence.id} style={rowStyle}>
                    <td style={tdStyle}>{agence.id}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>{agence.nom}</span>
                        {defaultAgence && (
                          <span style={defaultBadgeStyle}>Par défaut</span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>{agence.chantier_name || "-"}</td>
                    <td style={tdStyle}>
                      <span style={agence.can_delete ? badgeOkStyle : badgeWarnStyle}>
                        {agence.can_delete ? "Supprimable" : "Protégée"}
                      </span>
                    </td>
                    <td style={tdStyle}>{formatBlockers(agence)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => handleRenameAgence(agence)}
                          disabled={defaultAgence}
                          style={{
                            ...renameBtnStyle,
                            opacity: defaultAgence ? 0.5 : 1,
                            cursor: defaultAgence ? "not-allowed" : "pointer",
                          }}
                          title={
                            defaultAgence
                              ? "Renommage bloqué pour l'agence par défaut"
                              : "Renommer cette agence"
                          }
                        >
                          Renommer
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAgence(agence)}
                          disabled={!agence.can_delete || deletingId === agence.id}
                          style={{
                            ...deleteBtnStyle,
                            opacity:
                              !agence.can_delete || deletingId === agence.id ? 0.5 : 1,
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
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAgences.length === 0 && (
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
    </div>
  );
};

const StatCard = ({ label, value, tone = "neutral" }) => (
  <div style={{ ...statCardStyle, ...(tone === "ok" ? statCardOk : {}), ...(tone === "warn" ? statCardWarn : {}) }}>
    <div style={statValueStyle}>{value}</div>
    <div style={statLabelStyle}>{label}</div>
  </div>
);

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  padding: "12px 10px",
  fontWeight: 600,
  background: "#f9fafb",
  color: "#374151",
  fontSize: "13px",
};

const tdStyle = {
  borderBottom: "1px solid #f1f5f9",
  padding: "10px",
  verticalAlign: "top",
  color: "#111827",
  fontSize: "14px",
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

const renameBtnStyle = {
  border: "none",
  background: "#2563eb",
  color: "#fff",
  borderRadius: "6px",
  padding: "8px 10px",
  fontWeight: 600,
};

const defaultBadgeStyle = {
  display: "inline-block",
  padding: "3px 8px",
  borderRadius: "999px",
  background: "#e0e7ff",
  color: "#3730a3",
  fontWeight: 600,
  fontSize: "11px",
};

const infoPanelStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "10px 12px",
  marginBottom: "14px",
  background: "#f9fafb",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const legendItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const pageStyle = {
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const secondaryBtnStyle = {
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  borderRadius: "6px",
  padding: "8px 12px",
  fontWeight: 600,
  cursor: "pointer",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
};

const statCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "12px",
  background: "#fff",
};

const statCardOk = {
  borderColor: "#bbf7d0",
  background: "#f0fdf4",
};

const statCardWarn = {
  borderColor: "#fde68a",
  background: "#fffbeb",
};

const statValueStyle = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#111827",
};

const statLabelStyle = {
  fontSize: "13px",
  color: "#6b7280",
};

const feedbackStyle = {
  border: "1px solid",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
};

const feedbackByType = {
  success: { background: "#ecfdf5", borderColor: "#86efac", color: "#14532d" },
  warning: { background: "#fffbeb", borderColor: "#fcd34d", color: "#78350f" },
  error: { background: "#fef2f2", borderColor: "#fca5a5", color: "#7f1d1d" },
  info: { background: "#eff6ff", borderColor: "#93c5fd", color: "#1e3a8a" },
};

const toolbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

const searchInputStyle = {
  width: "100%",
  maxWidth: "420px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  padding: "9px 10px",
  fontSize: "14px",
};

const tableWrapperStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  overflow: "auto",
  background: "#fff",
};

const rowEvenStyle = { background: "#ffffff" };
const rowOddStyle = { background: "#fcfcfd" };

export default AdminAgences;
