import React from "react";
import { Box, Typography, Paper, Chip, Divider } from "@mui/material";
import { COLORS } from "../../constants/colors";

const TYPE_LABELS = {
  avant: "Avant travaux",
  en_cours: "En cours",
  apres: "Apres travaux",
};

const buildInterventionDateRows = (rapport) => {
  const raw = rapport.dates_intervention;
  if (Array.isArray(raw) && raw.length) {
    return raw.map((ds, i) => {
      const s = String(ds).slice(0, 10);
      let value = s;
      try {
        value = new Date(`${s}T12:00:00`).toLocaleDateString("fr-FR");
      } catch {
        /* keep s */
      }
      return { key: `d-${i}`, label: i === 0 ? "Date" : `Passage ${i + 1}`, value };
    });
  }
  if (rapport.date) {
    return [
      {
        key: "d-0",
        label: "Date",
        value: new Date(rapport.date).toLocaleDateString("fr-FR"),
      },
    ];
  }
  return [{ key: "d-0", label: "Date", value: "-" }];
};

const RapportPreview = ({ rapport }) => {
  if (!rapport) return null;

  const interventionDateRows = buildInterventionDateRows(rapport);

  return (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 800,
        mx: "auto",
        p: { xs: 2, sm: 4 },
        border: "1px solid #e0e0e0",
        borderRadius: 2,
        backgroundColor: "#fff",
      }}
    >
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

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 3 }}>
        <InfoBlock title="Client / Bailleur">
          <Typography sx={{ fontWeight: 600 }}>{rapport.client_societe_nom || "-"}</Typography>
        </InfoBlock>

        <InfoBlock title="Intervention">
          {interventionDateRows.map((row) => (
            <InfoRow key={row.key} label={row.label} value={row.value} />
          ))}
          <InfoRow label="Technicien" value={rapport.technicien_nom || rapport.technicien || "-"} />
        </InfoBlock>

        <InfoBlock title="Residence">
          <InfoRow label="Nom" value={rapport.residence_nom || "-"} />
          <InfoRow label="Adresse" value={rapport.residence_adresse || "-"} />
          {rapport.logement && <InfoRow label="Lieu d'intervention" value={rapport.logement} />}
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

      {rapport.type_rapport === "vigik_plus" && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ backgroundColor: COLORS.infoDark || "#1976d2", color: "#fff", px: 2, py: 1, borderRadius: "6px 6px 0 0", fontWeight: 700 }}>
            Rapport Vigik+
          </Box>
          <Box sx={{ border: "1px solid #e0e0e0", borderTop: "none", borderRadius: "0 0 6px 6px", p: 2 }}>
            <InfoRow label="Adresse" value={rapport.adresse_vigik || "-"} />
            <InfoRow label="Numero batiment" value={rapport.numero_batiment || "-"} />
            {rapport.type_installation && <InfoRow label="Type d'installation" value={rapport.type_installation} />}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.infoDark || "#1976d2" }}>
                Presence de platine
              </Typography>
              <Chip
                label={rapport.presence_platine === true ? "Oui" : rapport.presence_platine === false ? "Non" : "-"}
                size="small"
                color={rapport.presence_platine === true ? "success" : rapport.presence_platine === false ? "error" : "default"}
                variant="outlined"
                sx={{ mr: 1 }}
              />
              {(rapport.vigik_platine_photos || []).filter((x) => x?.url).map((row, idx) => (
                <Box key={row.s3_key || idx} sx={{ mt: 1 }}>
                  <img
                    src={row.url}
                    alt={`Photo platine ${idx + 1}`}
                    style={{ maxWidth: "100%", width: 280, height: 210, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                  />
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.infoDark || "#1976d2" }}>
                Presence d&apos;un portail
              </Typography>
              <Chip
                label={rapport.presence_portail === true ? "Oui" : rapport.presence_portail === false ? "Non" : "-"}
                size="small"
                color={rapport.presence_portail === true ? "success" : rapport.presence_portail === false ? "error" : "default"}
                variant="outlined"
                sx={{ mr: 1, mb: 1 }}
              />
              {rapport.presence_portail === false &&
                (rapport.vigik_platine_portail_photos || []).filter((x) => x?.url).map((row, idx) => (
                  <Box key={row.s3_key || idx} sx={{ mt: 1 }}>
                    <img
                      src={row.url}
                      alt={`Photo contexte site ${idx + 1}`}
                      style={{ maxWidth: "100%", width: 280, height: 210, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                    />
                  </Box>
                ))}
            </Box>
            {(rapport.presence_portail === true || (rapport.presence_portail == null && rapport.presence_platine_portail != null)) && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.infoDark || "#1976d2" }}>
                  Presence de platine Vigik+ au portail
                </Typography>
                <Chip
                  label={rapport.presence_platine_portail === true ? "Oui" : rapport.presence_platine_portail === false ? "Non" : "-"}
                  size="small"
                  color={rapport.presence_platine_portail === true ? "success" : rapport.presence_platine_portail === false ? "error" : "default"}
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                {rapport.presence_platine_portail === true &&
                  (rapport.vigik_platine_portail_photos || []).filter((x) => x?.url).map((row, idx) => (
                    <Box key={row.s3_key || idx} sx={{ mt: 1 }}>
                      <img
                        src={row.url}
                        alt={`Photo platine portail ${idx + 1}`}
                        style={{ maxWidth: "100%", width: 280, height: 210, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                      />
                    </Box>
                  ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

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
