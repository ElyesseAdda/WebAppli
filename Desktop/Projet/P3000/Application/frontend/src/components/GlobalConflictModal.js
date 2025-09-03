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

const GlobalConflictModal = () => {
  const [open, setOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  useEffect(() => {
    // Écouter l'événement global de conflit
    const handleConflictEvent = async (event) => {
      // Fermer le modal existant s'il est ouvert
      if (open) {
        setOpen(false);
        setConflictData(null);
        // Attendre un peu avant de rouvrir
        setTimeout(() => {
          processConflictEvent(event);
        }, 100);
      } else {
        // Modal fermé, traiter directement
        processConflictEvent(event);
      }
    };

    const processConflictEvent = async (event) => {
      // Vérifier si les données ont réellement changé
      if (conflictData && conflictData.conflictId === event.detail.conflictId) {
        return;
      }

      // Récupérer le nom réel du fichier existant dans S3
      try {
        // Construire l'URL avec tous les paramètres nécessaires
        const params = new URLSearchParams({
          folder_path: event.detail.existingFilePath,
          document_type: event.detail.documentType,
        });

        // Ajouter les paramètres spécifiques selon le type de document
        if (event.detail.week !== undefined) {
          params.append("week", event.detail.week);
        }
        if (event.detail.month !== undefined) {
          params.append("month", event.detail.month);
        }
        if (event.detail.year !== undefined) {
          params.append("year", event.detail.year);
        }

        const url = `/api/get-existing-file-name/?${params.toString()}`;

        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.existing_file_name) {
            // Mettre à jour le nom du fichier avec le vrai nom
            event.detail.fileName = result.existing_file_name;
          }
        }
      } catch (error) {
        console.error(
          "❌ Erreur lors de la récupération du nom du fichier:",
          error
        );
      }

      // Mettre à jour l'état avec les nouvelles données
      setConflictData(event.detail);
      setOpen(true);
    };

    // Écouter sur document ET window pour s'assurer que l'événement soit capturé
    // Nettoyer les anciens événements avant d'en ajouter de nouveaux
    document.removeEventListener("openConflictDialog", handleConflictEvent);
    window.removeEventListener("openConflictDialog", handleConflictEvent);

    document.addEventListener("openConflictDialog", handleConflictEvent);
    window.addEventListener("openConflictDialog", handleConflictEvent);

    return () => {
      document.removeEventListener("openConflictDialog", handleConflictEvent);
      window.removeEventListener("openConflictDialog", handleConflictEvent);
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
    setConflictData(null);
  };

  const handleReplace = async () => {
    if (!conflictData) return;

    try {
      const requestBody = {
        document_type: conflictData.documentType,
        societe_name: conflictData.societeName,
        preview_url: conflictData.previewUrl, // Utiliser previewUrl (avec majuscule)
        ...conflictData,
      };

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
              href={`/drive?path=${encodeURIComponent(
                conflictData.existingFilePath + conflictData.fileName
              )}&sidebar=closed&focus=file`}
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
            • L'ancien fichier sera déplacé dans un dossier "Historique"
            <br />
            • Il sera automatiquement supprimé après 30 jours
            <br />• Le nouveau fichier remplacera l'ancien
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
