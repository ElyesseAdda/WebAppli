import React from "react";
import { Box, Typography, Paper, Chip, Divider } from "@mui/material";
import { COLORS } from "../../constants/colors";

const TYPE_LABELS = {
  avant: "Avant travaux",
  en_cours: "En cours",
  apres: "Apres travaux",
};

const RapportPreview = ({ rapport }) => {
  if (!rapport) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 800,
        mx: "auto",
        p: 4,
        border: "1px solid #e0e0e0",
        borderRadius: 2,
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3, borderBottom: `3px solid ${COLORS.infoDark || "#1976d2"}`, pb: 2 }}>
        <Box>
          {rapport.client_societe_logo_url && (
            <img
              src={rapport.client_societe_logo_url}
              alt="Logo"
              style={{ maxHeight: 60, maxWidth: 180, objectFit: "contain" }}
            />
          )}
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.infoDark || "#1976d2", textTransform: "uppercase" }}>
          Rapport d'intervention
        </Typography>
      </Box>

      {/* Infos generales */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 3 }}>
        <InfoBlock title="Client / Bailleur">
          <Typography sx={{ fontWeight: 600 }}>{rapport.client_societe_nom || "-"}</Typography>
        </InfoBlock>

        <InfoBlock title="Intervention">
          <InfoRow label="Date" value={rapport.date ? new Date(rapport.date).toLocaleDateString("fr-FR") : "-"} />
          <InfoRow label="Technicien" value={rapport.technicien_nom || rapport.technicien || "-"} />
        </InfoBlock>

        <InfoBlock title="Residence">
          <InfoRow label="Nom" value={rapport.residence_nom || "-"} />
          <InfoRow label="Adresse" value={rapport.residence_adresse || "-"} />
          {rapport.logement && <InfoRow label="Logement" value={rapport.logement} />}
        </InfoBlock>

        <InfoBlock title="Locataire">
          {rapport.locataire_nom || rapport.locataire_prenom ? (
            <>
              <InfoRow label="Nom" value={`${rapport.locataire_prenom || ""} ${rapport.locataire_nom || ""}`} />
              {rapport.locataire_telephone && <InfoRow label="Tel" value={rapport.locataire_telephone} />}
              {rapport.locataire_email && <InfoRow label="Email" value={rapport.locataire_email} />}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">-</Typography>
          )}
        </InfoBlock>
      </Box>

      <InfoBlock title="Objet de la recherche" fullWidth>
        <Typography sx={{ whiteSpace: "pre-wrap" }}>{rapport.objet_recherche || "-"}</Typography>
      </InfoBlock>

      {rapport.resultat && (
        <InfoBlock title="Resultat" fullWidth sx={{ mt: 2 }}>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{rapport.resultat}</Typography>
        </InfoBlock>
      )}

      {/* Prestations */}
      {rapport.prestations?.map((prestation, index) => (
        <Box key={prestation.id || index} sx={{ mt: 3 }}>
          <Box sx={{ backgroundColor: COLORS.infoDark || "#1976d2", color: "#fff", px: 2, py: 1, borderRadius: "6px 6px 0 0", fontWeight: 700 }}>
            Prestation {index + 1} - {prestation.localisation}
          </Box>
          <Box sx={{ border: "1px solid #e0e0e0", borderTop: "none", borderRadius: "0 0 6px 6px", p: 2 }}>
            <PreviewField label="Probleme constate" value={prestation.probleme} />
            <PreviewField label="Solution" value={prestation.solution} />
            {prestation.commentaire && <PreviewField label="Commentaire" value={prestation.commentaire} />}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#555", textTransform: "uppercase" }}>
                Prestation possible
              </Typography>
              <Box>
                <Chip
                  label={prestation.prestation_possible ? "Oui" : "Non"}
                  size="small"
                  color={prestation.prestation_possible ? "success" : "error"}
                  variant="outlined"
                />
              </Box>
            </Box>
            {prestation.prestation_realisee && (
              <PreviewField label="Prestations realisees" value={prestation.prestation_realisee} />
            )}

            {/* Photos */}
            {prestation.photos?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.infoDark || "#1976d2" }}>
                  Photos
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {["avant", "en_cours", "apres"].map((type) => {
                    const typePhotos = prestation.photos.filter((p) => p.type_photo === type);
                    if (!typePhotos.length) return null;
                    return (
                      <Box key={type}>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", color: "#666" }}>
                          {TYPE_LABELS[type]}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                          {typePhotos.map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.image_url}
                              alt={photo.filename}
                              style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                            />
                          ))}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      ))}

      {/* Signature */}
      {rapport.signature_url && (
        <Box sx={{ mt: 4, textAlign: "right" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: COLORS.infoDark || "#1976d2", mb: 1 }}>
            Signature
          </Typography>
          <img
            src={rapport.signature_url}
            alt="Signature"
            style={{ maxWidth: 250, maxHeight: 120, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </Box>
      )}
    </Paper>
  );
};

const InfoBlock = ({ title, children, fullWidth, sx }) => (
  <Box
    sx={{
      backgroundColor: "#f8f9fa",
      border: "1px solid #e0e0e0",
      borderRadius: 1.5,
      p: 1.5,
      ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
      ...sx,
    }}
  >
    <Typography
      variant="caption"
      sx={{ fontWeight: 700, color: COLORS.infoDark || "#1976d2", textTransform: "uppercase", display: "block", mb: 0.5, borderBottom: "1px solid #e0e0e0", pb: 0.5 }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: "flex", mb: 0.3 }}>
    <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100, color: "#666" }}>{label} :</Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

const PreviewField = ({ label, value }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="caption" sx={{ fontWeight: 700, color: "#555", textTransform: "uppercase" }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{value || "-"}</Typography>
  </Box>
);

export default RapportPreview;
