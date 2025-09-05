import { FolderOpen as FolderIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { generatePDFDrive } from "../utils/universalDriveGenerator";

const GlobalConflictModal = () => {
  const [open, setOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  // Fonction utilitaire pour construire les chemins (unifiée)
  const buildFilePath = (data) => {
    const {
      documentType,
      societeName,
      appelOffresName,
      appelOffresId,
      devisId,
      week,
      month,
      year,
    } = data;

    // Fonction custom_slugify (identique au backend)
    const customSlugify = (text) => {
      if (!text) return "";
      text = text.replace(/\s+/g, " ").trim();
      text = text.replace(/\s+/g, "-");
      text = text.replace(/[^a-zA-Z0-9\-_.]/g, "");
      text = text.replace(/-+/g, "-");
      text = text.trim("-");
      if (text) {
        const parts = text.split("-");
        const capitalizedParts = [];
        for (const part of parts) {
          if (part) {
            capitalizedParts.push(
              part[0].toUpperCase() + part.slice(1).toLowerCase()
            );
          }
        }
        text = capitalizedParts.join("-");
      }
      return text || "Dossier";
    };

    let folderPath = "";
    let fileName = "";

    switch (documentType) {
      case "planning_hebdo":
        folderPath = `Agents/Document_Generaux/PlanningHebdo/${year}/`;
        fileName = `PH S${week} ${String(year).slice(-2)}.pdf`;
        break;

      case "rapport_mensuel":
        folderPath = `Agents/Document_Generaux/RapportMensuel/${year}/`;
        fileName = `RM ${String(month).padStart(2, "0")} ${String(year).slice(
          -2
        )}.pdf`;
        break;

      case "devis_marche":
      case "devis_chantier": // Support du nouveau type
        const societeSlug = customSlugify(societeName);
        const appelOffresSlug = customSlugify(appelOffresName);
        folderPath = `Appels_Offres/${societeSlug}/${appelOffresSlug}/Devis/Devis_Marche/`;
        fileName = `DEV-${String(devisId).padStart(
          3,
          "0"
        )}-25 - ${appelOffresName}.pdf`;
        break;

      default:
        folderPath = "Documents/";
        fileName = "document.pdf";
    }

    return {
      folderPath,
      fileName,
      fullPath: `${folderPath}${fileName}`,
    };
  };

  useEffect(() => {
    const handleConflictEvent = async (event) => {
      // Fermer le modal existant s'il est ouvert
      if (open) {
        setOpen(false);
        setConflictData(null);
        setTimeout(() => {
          processConflictEvent(event);
        }, 100);
      } else {
        processConflictEvent(event);
      }
    };

    const processConflictEvent = async (event) => {
      // Vérifier si les données ont réellement changé
      if (conflictData && conflictData.conflictId === event.detail.conflictId) {
        return;
      }

      // Pour les appels d'offres, utiliser le nom du fichier existant
      let fileName, folderPath, fullPath;

      if (
        event.detail.documentType === "devis_marche" ||
        event.detail.documentType === "devis_chantier"
      ) {
        // Utiliser le nom du fichier existant (celui qui cause le conflit)
        fileName = event.detail.fileName || event.detail.displayFileName;

        // Construire le chemin du dossier (sans le nom du fichier)
        const paths = buildFilePath(event.detail);
        folderPath = paths.folderPath;
        fullPath = `${folderPath}${fileName}`;
      } else {
        // Pour les autres types, utiliser la logique normale
        const paths = buildFilePath(event.detail);
        fileName = paths.fileName;
        folderPath = paths.folderPath;
        fullPath = paths.fullPath;
      }

      // Mettre à jour les données avec les chemins corrects
      const updatedData = {
        ...event.detail,
        folderPath: folderPath,
        fileName: fileName, // Utiliser le nom du fichier existant
        fullPath: fullPath,
        drive_url: `/drive?path=${fullPath}&sidebar=closed&focus=file&_t=${Date.now()}`,
      };

      console.log("📋 Données du conflit mises à jour:", updatedData);
      console.log("📋 Nom du fichier existant:", fileName);
      console.log("📋 Chemin du fichier:", fullPath);

      setConflictData(updatedData);
      setOpen(true);
    };

    // Écouter les événements de conflit
    document.removeEventListener("openConflictDialog", handleConflictEvent);
    window.removeEventListener("openConflictDialog", handleConflictEvent);

    document.addEventListener("openConflictDialog", handleConflictEvent);
    window.addEventListener("openConflictDialog", handleConflictEvent);

    return () => {
      document.removeEventListener("openConflictDialog", handleConflictEvent);
      window.removeEventListener("openConflictDialog", handleConflictEvent);
    };
  }, [open, conflictData]);

  const handleClose = () => {
    setOpen(false);
    setConflictData(null);
  };

  const handleReplace = async () => {
    if (!conflictData) return;

    try {
      console.log(
        "🚀 Remplacement du fichier avec le nouveau système universel"
      );

      // Pour les nouveaux types (devis_chantier), utiliser le système universel
      if (conflictData.documentType === "devis_chantier") {
        // Construire les données pour le système universel
        const documentData = {
          devisId: conflictData.devisId,
          appelOffresId: conflictData.appelOffresId,
          appelOffresName: conflictData.appelOffresName,
          societeName: conflictData.societeName,
          numero: conflictData.numero,
        };

        // Utiliser le système universel avec force_replace = true
        await generatePDFDrive(
          "devis_chantier",
          documentData,
          {
            onSuccess: (response) => {
              console.log("✅ NOUVEAU: Fichier remplacé avec succès", response);

              // Afficher une notification de succès
              const successEvent = new CustomEvent("showNotification", {
                detail: {
                  message: "✅ Fichier remplacé avec succès !",
                  type: "success",
                },
              });
              document.dispatchEvent(successEvent);

              // Fermer le modal
              handleClose();
            },
            onError: (error) => {
              console.error("❌ NOUVEAU: Erreur lors du remplacement:", error);

              const errorEvent = new CustomEvent("showNotification", {
                detail: {
                  message: `❌ Erreur lors du remplacement: ${error.message}`,
                  type: "error",
                },
              });
              document.dispatchEvent(errorEvent);
            },
          },
          true // forceReplace = true
        );
      } else {
        // Pour les anciens types, utiliser l'ancien système
        const requestBody = {
          document_type: conflictData.documentType,
          file_path: conflictData.fullPath,
          file_name: conflictData.fileName,
          preview_url: conflictData.previewUrl,
          societe_name: conflictData.societeName,
          // Paramètres spécifiques selon le type
          ...(conflictData.week !== undefined && { week: conflictData.week }),
          ...(conflictData.month !== undefined && {
            month: conflictData.month,
          }),
          ...(conflictData.year !== undefined && { year: conflictData.year }),
          ...(conflictData.appelOffresId !== undefined && {
            appel_offres_id: conflictData.appelOffresId,
          }),
          ...(conflictData.appelOffresName !== undefined && {
            appel_offres_name: conflictData.appelOffresName,
          }),
          ...(conflictData.devisId !== undefined && {
            devis_id: conflictData.devisId,
          }),
        };

        console.log(
          "🚀 Remplacement du fichier avec l'ancien système:",
          requestBody
        );

        // Appeler l'API pour remplacer le fichier
        const response = await fetch("/api/replace-file-after-confirmation/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const result = await response.json();

          // Afficher une notification de succès
          const successEvent = new CustomEvent("showNotification", {
            detail: {
              message: "✅ Fichier remplacé avec succès !",
              type: "success",
            },
          });
          document.dispatchEvent(successEvent);

          // Fermer le modal
          handleClose();

          // Rediriger vers le Drive si demandé
          if (result.drive_url) {
            window.open(result.drive_url, "_blank");
          }
        } else {
          const error = await response.json();
          const errorEvent = new CustomEvent("showNotification", {
            detail: {
              message: `❌ Erreur lors du remplacement: ${error.error}`,
              type: "error",
            },
          });
          document.dispatchEvent(errorEvent);
        }
      }
    } catch (error) {
      console.error("Erreur lors du remplacement:", error);
      const errorEvent = new CustomEvent("showNotification", {
        detail: {
          message: "❌ Erreur lors du remplacement du fichier",
          type: "error",
        },
      });
      document.dispatchEvent(errorEvent);
    }
  };

  const handleCancel = () => {
    // Afficher une notification d'annulation
    const cancelEvent = new CustomEvent("showNotification", {
      detail: {
        message: "❌ Remplacement annulé par l'utilisateur",
        type: "info",
      },
    });
    document.dispatchEvent(cancelEvent);

    handleClose();
  };

  if (!conflictData) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: "primary.main",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 2,
          px: 3,
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>⚠️</span>
        <Typography variant="h6" component="span">
          Conflit de fichier détecté
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Typography
          variant="body1"
          gutterBottom
          sx={{ mb: 3, fontSize: "1.1rem" }}
        >
          {conflictData.conflictMessage}
        </Typography>

        <Box
          sx={{
            p: 3,
            bgcolor: "grey.50",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "grey.200",
            mb: 3,
          }}
        >
          <Typography
            variant="subtitle1"
            color="text.primary"
            gutterBottom
            sx={{ fontWeight: 600 }}
          >
            📄 Fichier existant :
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: "monospace",
              bgcolor: "white",
              p: 2,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "grey.300",
              fontSize: "1rem",
            }}
          >
            {conflictData.fileName}
          </Typography>

          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <FolderIcon color="primary" fontSize="medium" />
            <Link
              href={conflictData.drive_url}
              target="_blank"
              underline="hover"
              sx={{
                color: "primary.main",
                fontWeight: 500,
                "&:hover": { color: "primary.dark" },
              }}
            >
              Voir dans le Drive
            </Link>
          </Box>
        </Box>

        <Box
          sx={{
            p: 3,
            bgcolor: "info.50",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "info.200",
          }}
        >
          <Typography
            variant="body2"
            color="info.main"
            sx={{ fontWeight: 500 }}
          >
            💡 <strong>Que se passe-t-il ?</strong>
            <br />
            • L'ancien fichier sera déplacé dans le dossier "Historique" avec un
            timestamp
            <br />
            • Il sera automatiquement supprimé après 30 jours par le système de
            nettoyage
            <br />
            • Le nouveau fichier remplacera l'ancien à l'emplacement original
            <br />• Vous pourrez toujours accéder à l'historique via le Drive
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2, bgcolor: "grey.50" }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          color="secondary"
          size="large"
          sx={{
            px: 3,
            py: 1.5,
            borderRadius: 2,
            textTransform: "none",
            fontSize: "1rem",
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleReplace}
          variant="contained"
          color="primary"
          size="large"
          startIcon={<span style={{ fontSize: "1.2rem" }}>🔄</span>}
          sx={{
            px: 3,
            py: 1.5,
            borderRadius: 2,
            textTransform: "none",
            fontSize: "1rem",
            boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
          }}
        >
          Remplacer le fichier
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GlobalConflictModal;
