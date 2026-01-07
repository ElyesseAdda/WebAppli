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
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { generatePDFDrive } from "../utils/universalDriveGenerator";

const GlobalConflictModal = () => {
  const [open, setOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [actionMode, setActionMode] = useState("replace"); // "replace" ou "rename"
  const [newFileName, setNewFileName] = useState("");

  // Fonction pour générer un nom de fichier avec suffixe (1), (2), etc.
  const generateNewFileName = (originalFileName, suffix = 1) => {
    if (!originalFileName) return `document_(${suffix}).pdf`;
    
    const lastDotIndex = originalFileName.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return `${originalFileName} (${suffix})`;
    }
    
    const nameWithoutExt = originalFileName.substring(0, lastDotIndex);
    const extension = originalFileName.substring(lastDotIndex);
    return `${nameWithoutExt} (${suffix})${extension}`;
  };

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
      case "rapport_agents": // Support du nouveau type
        folderPath = `Agents/Document_Generaux/Rapport_mensuel/${year}/`;
        const monthNames = [
          "Janvier",
          "Février",
          "Mars",
          "Avril",
          "Mai",
          "Juin",
          "Juillet",
          "Août",
          "Septembre",
          "Octobre",
          "Novembre",
          "Décembre",
        ];
        const monthName = monthNames[month - 1] || `Mois_${month}`;
        fileName = `RapportComptable_${monthName}_${String(year).slice(
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
      // Ne pas vérifier le conflictId pour éviter que le modal se ferme immédiatement
      // Le modal doit s'ouvrir à chaque fois qu'un conflit est détecté

      // Utiliser le nom du fichier et le chemin qui viennent du backend (détecté dans le drive)
      let fileName, folderPath, fullPath;

      // Si le backend fournit directement le nom du fichier et le chemin, les utiliser
      if (event.detail.fileName || event.detail.file_path) {
        // Extraire le nom du fichier depuis file_path ou utiliser fileName
        if (event.detail.file_path) {
          // Extraire le nom du fichier depuis le chemin complet
          const pathParts = event.detail.file_path.split('/');
          fileName = pathParts[pathParts.length - 1] || event.detail.fileName || event.detail.displayFileName;
          // Extraire le chemin du dossier (sans le nom du fichier)
          folderPath = event.detail.file_path.substring(0, event.detail.file_path.lastIndexOf('/') + 1);
          fullPath = event.detail.file_path;
        } else {
          // Utiliser fileName si disponible
          fileName = event.detail.fileName || event.detail.displayFileName;
          
          // Construire le chemin du dossier si nécessaire
          if (event.detail.existingFilePath) {
            folderPath = event.detail.existingFilePath;
            fullPath = `${folderPath}${fileName}`;
          } else {
            // Fallback: construire le chemin avec buildFilePath
            const paths = buildFilePath(event.detail);
            folderPath = paths.folderPath;
            fullPath = `${folderPath}${fileName}`;
          }
        }
      } else {
        // Fallback: construire le chemin avec buildFilePath si aucune info du backend
        const paths = buildFilePath(event.detail);
        fileName = paths.fileName;
        folderPath = paths.folderPath;
        fullPath = paths.fullPath;
      }

      // Mettre à jour les données avec les chemins corrects
      // Utiliser le drive_url du backend s'il est disponible, sinon le construire
      const driveUrl = event.detail.drive_url || `/drive-v2?path=${fullPath}&focus=file&_t=${Date.now()}`;
      
      const updatedData = {
        ...event.detail,
        folderPath: folderPath,
        fileName: fileName, // Utiliser le nom du fichier existant (venant du backend)
        fullPath: fullPath,
        drive_url: driveUrl,
      };

      // Initialiser le mode d'action et le nouveau nom de fichier
      setActionMode("replace");
      setNewFileName(generateNewFileName(fileName, 1));
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
    setActionMode("replace");
    setNewFileName("");
  };

  const handleReplace = async () => {
    if (!conflictData) return;

    try {
      console.log(
        "🚀 Remplacement du fichier avec le nouveau système universel"
      );

      // Pour les nouveaux types, utiliser le système universel
      if (
        ["devis_chantier", "devis_travaux", "devis_marche", "devis_normal", "planning_hebdo", "rapport_agents", "bon_commande", "situation"].includes(
          conflictData.documentType
        )
      ) {
        // Construire les données pour le système universel selon le type
        let documentData = {};

        if (conflictData.documentType === "devis_chantier" || conflictData.documentType === "devis_travaux" || conflictData.documentType === "devis_marche") {
          documentData = {
            devisId: conflictData.devisId,
            appelOffresId: conflictData.appelOffresId,
            appelOffresName: conflictData.appelOffresName,
            societeName: conflictData.societeName,
            numero: conflictData.numero,
          };
        } else if (conflictData.documentType === "devis_normal") {
          documentData = {
            devisId: conflictData.devisId,
            chantierId: conflictData.chantierId,
            chantierName: conflictData.chantierName,
            societeName: conflictData.societeName,
            numero: conflictData.numero,
          };
        } else if (conflictData.documentType === "planning_hebdo") {
          documentData = {
            week: conflictData.week,
            year: conflictData.year,
            agent_ids: conflictData.agent_ids, // NOUVEAU : Conserver les agent_ids
          };
        } else if (conflictData.documentType === "rapport_agents") {
          documentData = {
            month: conflictData.month,
            year: conflictData.year,
          };
        } else if (conflictData.documentType === "bon_commande") {
          documentData = {
            bonCommandeId: conflictData.bonCommandeId,
            chantierId: conflictData.chantierId,
            chantierName: conflictData.chantierName,
            societeName: conflictData.societeName,
            numeroBonCommande: conflictData.numeroBonCommande,
            fournisseurName: conflictData.fournisseurName,
          };
        } else if (conflictData.documentType === "situation") {
          documentData = {
            situationId: conflictData.situationId,
            chantierId: conflictData.chantierId,
            chantierName: conflictData.chantierName,
            societeName: conflictData.societeName,
            numeroSituation: conflictData.numeroSituation,
          };
        }

        // Utiliser le système universel avec force_replace = true
        await generatePDFDrive(
          conflictData.documentType,
          documentData,
          {
            onSuccess: (response) => {

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

  const handleRename = async () => {
    if (!conflictData || !newFileName || !newFileName.trim()) {
      const errorEvent = new CustomEvent("showNotification", {
        detail: {
          message: "❌ Veuillez saisir un nom de fichier valide",
          type: "error",
        },
      });
      document.dispatchEvent(errorEvent);
      return;
    }

    try {
      console.log("🚀 Création du fichier avec un nouveau nom:", newFileName);

      // Pour les nouveaux types, utiliser le système universel avec custom_filename
      if (
        ["devis_chantier", "devis_travaux", "devis_marche", "devis_normal", "planning_hebdo", "rapport_agents", "bon_commande", "situation"].includes(
          conflictData.documentType
        )
      ) {
        // Construire les données pour le système universel selon le type
        let documentData = {};

        if (conflictData.documentType === "devis_chantier" || conflictData.documentType === "devis_travaux" || conflictData.documentType === "devis_marche") {
          documentData = {
            devisId: conflictData.devisId,
            appelOffresId: conflictData.appelOffresId,
            appelOffresName: conflictData.appelOffresName,
            societeName: conflictData.societeName,
            numero: conflictData.numero,
            custom_filename: newFileName.trim(), // Nom personnalisé pour éviter le conflit
          };
        } else if (conflictData.documentType === "planning_hebdo") {
          documentData = {
            week: conflictData.week,
            year: conflictData.year,
            agent_ids: conflictData.agent_ids,
            custom_filename: newFileName.trim(),
          };
        } else if (conflictData.documentType === "rapport_agents") {
          documentData = {
            month: conflictData.month,
            year: conflictData.year,
            custom_filename: newFileName.trim(),
          };
        } else if (conflictData.documentType === "bon_commande") {
          documentData = {
            bonCommandeId: conflictData.bonCommandeId,
            chantierId: conflictData.chantierId,
            chantierName: conflictData.chantierName,
            societeName: conflictData.societeName,
            numeroBonCommande: conflictData.numeroBonCommande,
            fournisseurName: conflictData.fournisseurName,
            custom_filename: newFileName.trim(),
          };
        } else if (conflictData.documentType === "situation") {
          documentData = {
            situationId: conflictData.situationId,
            chantierId: conflictData.chantierId,
            chantierName: conflictData.chantierName,
            societeName: conflictData.societeName,
            numeroSituation: conflictData.numeroSituation,
            custom_filename: newFileName.trim(),
          };
        }

        // Utiliser le système universel avec custom_filename (pas de force_replace)
        await generatePDFDrive(
          conflictData.documentType,
          documentData,
          {
            onSuccess: (response) => {
              // Afficher une notification de succès
              const successEvent = new CustomEvent("showNotification", {
                detail: {
                  message: `✅ Fichier créé avec succès sous le nom "${newFileName.trim()}" !`,
                  type: "success",
                },
              });
              document.dispatchEvent(successEvent);

              // Fermer le modal
              handleClose();
            },
            onError: (error) => {
              console.error("❌ Erreur lors de la création avec nouveau nom:", error);

              const errorEvent = new CustomEvent("showNotification", {
                detail: {
                  message: `❌ Erreur lors de la création: ${error.message || "Erreur inconnue"}`,
                  type: "error",
                },
              });
              document.dispatchEvent(errorEvent);
            },
          },
          false // forceReplace = false (on veut créer avec un nouveau nom)
        );
      } else {
        // Pour les anciens types, utiliser l'ancien système avec custom_filename
        const requestBody = {
          document_type: conflictData.documentType,
          file_path: conflictData.folderPath,
          file_name: newFileName.trim(),
          preview_url: conflictData.previewUrl,
          societe_name: conflictData.societeName,
          custom_filename: newFileName.trim(),
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

        console.log("🚀 Création du fichier avec l'ancien système:", requestBody);

        // Appeler l'API pour créer le fichier avec un nouveau nom
        const response = await fetch("/api/generate-pdf-drive/", {
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
              message: `✅ Fichier créé avec succès sous le nom "${newFileName.trim()}" !`,
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
              message: `❌ Erreur lors de la création: ${error.error || "Erreur inconnue"}`,
              type: "error",
            },
          });
          document.dispatchEvent(errorEvent);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la création avec nouveau nom:", error);
      const errorEvent = new CustomEvent("showNotification", {
        detail: {
          message: "❌ Erreur lors de la création du fichier",
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
            bgcolor: "grey.50",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "grey.200",
            mb: 3,
          }}
        >
          <FormControl component="fieldset" sx={{ width: "100%" }}>
            <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
              Que souhaitez-vous faire ?
            </FormLabel>
            <RadioGroup
              value={actionMode}
              onChange={(e) => setActionMode(e.target.value)}
              sx={{ gap: 2 }}
            >
              <FormControlLabel
                value="replace"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      🔄 Remplacer le fichier existant
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                      L'ancien fichier sera déplacé dans le dossier "Historique" et le nouveau fichier le remplacera à l'emplacement original
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="rename"
                control={<Radio />}
                label={
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      📝 Créer avec un nouveau nom
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 1 }}>
                      Le fichier sera créé avec un nom différent pour éviter le conflit
                    </Typography>
                    {actionMode === "rename" && (
                      <TextField
                        fullWidth
                        label="Nouveau nom de fichier"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1, ml: 4 }}
                        helperText="Le fichier sera créé avec ce nom dans le même dossier"
                      />
                    )}
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
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
            💡 <strong>Information :</strong>
            <br />
            {actionMode === "replace" ? (
              <>
                • L'ancien fichier sera déplacé dans le dossier "Historique" avec un
                timestamp
                <br />
                • Il sera automatiquement supprimé après 30 jours par le système de
                nettoyage
                <br />
                • Le nouveau fichier remplacera l'ancien à l'emplacement original
                <br />• Vous pourrez toujours accéder à l'historique via le Drive
              </>
            ) : (
              <>
                • Le nouveau fichier sera créé avec le nom que vous avez choisi
                <br />
                • Le fichier existant restera inchangé dans le Drive
                <br />
                • Les deux fichiers coexisteront dans le même dossier
              </>
            )}
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
        {actionMode === "replace" ? (
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
        ) : (
          <Button
            onClick={handleRename}
            variant="contained"
            color="primary"
            size="large"
            startIcon={<span style={{ fontSize: "1.2rem" }}>📝</span>}
            disabled={!newFileName || !newFileName.trim()}
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "1rem",
              boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
            }}
          >
            Créer avec ce nom
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GlobalConflictModal;
