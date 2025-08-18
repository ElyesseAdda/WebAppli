import {
  Add as AddIcon,
  Archive as ArchiveIcon,
  AudioFile as AudioIcon,
  Code as CodeIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  InsertDriveFile as FileIcon,
  Folder as FolderIcon,
  Home as HomeIcon,
  Image as ImageIcon,
  NavigateNext as NavigateNextIcon,
  PictureAsPdf as PdfIcon,
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  VideoFile as VideoIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem as MenuItemMUI,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import React, { useCallback, useEffect, useState } from "react";

// Styles personnalisés
const DriveContainer = styled(Box)(({ theme }) => ({
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.grey[50],
}));

const DriveHeader = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: theme.spacing(2),
}));

const DriveContent = styled(Box)(({ theme }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  minHeight: "calc(100vh - 120px)", // Hauteur minimale pour la zone de drag & drop
}));

const FileGrid = styled(Grid)(({ theme }) => ({
  flex: 1,
  overflow: "auto",
  padding: theme.spacing(2),
}));

const FileCard = styled(Card)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[8],
  },
}));

const UploadArea = styled(Box)(({ theme, isDragOver }) => ({
  border: `2px dashed ${
    isDragOver ? theme.palette.primary.main : theme.palette.grey[300]
  }`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(4),
  textAlign: "center",
  backgroundColor: isDragOver
    ? theme.palette.primary.light + "20"
    : "transparent",
  transition: "all 0.2s ease-in-out",
  cursor: "pointer",
  minHeight: "400px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const Drive = () => {
  // États de base
  const [currentPath, setCurrentPath] = useState("");
  const [folderContent, setFolderContent] = useState({
    folders: [],
    files: [],
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragTimeout, setDragTimeout] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

  // Fonctions utilitaires
  const getFileIcon = (contentType, extension) => {
    if (contentType?.includes("pdf") || extension === "pdf")
      return <PdfIcon color="error" />;
    if (
      contentType?.includes("image") ||
      ["jpg", "jpeg", "png", "gif", "bmp"].includes(extension)
    )
      return <ImageIcon color="primary" />;
    if (
      contentType?.includes("video") ||
      ["mp4", "avi", "mov", "wmv"].includes(extension)
    )
      return <VideoIcon color="secondary" />;
    if (
      contentType?.includes("audio") ||
      ["mp3", "wav", "flac"].includes(extension)
    )
      return <AudioIcon color="info" />;
    if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension))
      return <DescriptionIcon color="success" />;
    if (["zip", "rar", "7z", "tar", "gz"].includes(extension))
      return <ArchiveIcon color="warning" />;
    if (
      [
        "js",
        "jsx",
        "ts",
        "tsx",
        "py",
        "java",
        "cpp",
        "c",
        "html",
        "css",
      ].includes(extension)
    )
      return <CodeIcon color="info" />;
    return <FileIcon />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Charger le contenu du dossier actuel
  const fetchFolderContent = useCallback(async (folderPath = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (folderPath) params.append("folder_path", folderPath);

      const response = await fetch(
        `/api/drive-complete/list-content/?${params}`
      );
      if (!response.ok) throw new Error("Erreur lors du chargement du contenu");

      const data = await response.json();
      setFolderContent({
        folders: data.folders || [],
        files: data.files || [],
      });
      setCurrentPath(folderPath);
    } catch (error) {
      console.error("Erreur lors du chargement du contenu:", error);
      showSnackbar("Erreur lors du chargement du contenu", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Créer un nouveau dossier
  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const response = await fetch("/api/drive-complete/create-folder/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
          },
          body: JSON.stringify({
            parent_path: currentPath,
            folder_name: newFolderName.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error("Erreur lors de la création du dossier");
        }

        const data = await response.json();

        // Mettre à jour l'état local immédiatement
        const newFolder = {
          name: newFolderName.trim(),
          path: data.folder_path,
          type: "folder",
        };

        setFolderContent((prev) => ({
          ...prev,
          folders: [...prev.folders, newFolder],
        }));

        setNewFolderName("");
        setCreateFolderDialogOpen(false);
        showSnackbar("Dossier créé avec succès", "success");
      } catch (error) {
        console.error("Erreur création dossier:", error);
        showSnackbar("Erreur lors de la création du dossier", "error");
      }
    }
  };

  // Supprimer un dossier ou fichier
  const handleDeleteItem = async (itemPath, isFolder = false) => {
    try {
      const endpoint = isFolder
        ? "/api/drive-complete/delete-folder/"
        : "/api/drive-complete/delete-file/";
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({
          folder_path: isFolder ? itemPath : undefined,
          file_path: !isFolder ? itemPath : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }

      // Mettre à jour l'état local immédiatement
      if (isFolder) {
        setFolderContent((prev) => ({
          ...prev,
          folders: prev.folders.filter((folder) => folder.path !== itemPath),
        }));
      } else {
        setFolderContent((prev) => ({
          ...prev,
          files: prev.files.filter((file) => file.path !== itemPath),
        }));
      }

      showSnackbar("Élément supprimé avec succès", "success");
    } catch (error) {
      console.error("Erreur suppression:", error);
      showSnackbar("Erreur lors de la suppression", "error");
    }
  };

  // Renommer un dossier ou fichier
  const handleRenameItem = async () => {
    if (!selectedItem || !newItemName.trim()) return;

    try {
      const response = await fetch("/api/drive-complete/rename-item/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({
          old_path: selectedItem.path,
          new_name: newItemName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du renommage");
      }

      const data = await response.json();

      // Mettre à jour l'état local avec le nouveau chemin
      if (selectedItem.isFolder) {
        setFolderContent((prev) => ({
          ...prev,
          folders: prev.folders.map((folder) =>
            folder.path === selectedItem.path
              ? { ...folder, name: newItemName.trim(), path: data.new_path }
              : folder
          ),
        }));
      } else {
        setFolderContent((prev) => ({
          ...prev,
          files: prev.files.map((file) =>
            file.path === selectedItem.path
              ? { ...file, name: newItemName.trim(), path: data.new_path }
              : file
          ),
        }));
      }

      setRenameDialogOpen(false);
      setNewItemName("");
      setSelectedItem(null);
      showSnackbar("Élément renommé avec succès", "success");
    } catch (error) {
      console.error("Erreur renommage:", error);
      showSnackbar("Erreur lors du renommage", "error");
    }
  };

  // Ouvrir le modal de renommage
  const openRenameDialog = (item) => {
    setSelectedItem(item);
    setNewItemName(item.name);
    setRenameDialogOpen(true);
    handleContextMenuClose();
  };

  // Naviguer dans un dossier
  const navigateToFolder = (folder) => {
    const newPath = folder.path;
    if (newPath !== currentPath) {
      fetchFolderContent(newPath);
    }
  };

  // Naviguer vers le dossier parent
  const navigateToParent = () => {
    const parentPath = currentPath.split("/").slice(0, -1).join("/");
    if (parentPath !== currentPath) {
      fetchFolderContent(parentPath);
    }
  };

  // Upload de fichiers
  const uploadFile = async (file) => {
    try {
      // Vérifier que le fichier a un nom
      if (!file.name) {
        throw new Error("Le fichier n'a pas de nom");
      }

      // 1. Obtenir l'URL d'upload
      const requestBody = {
        file_path: currentPath || "",
        file_name: file.name,
      };

      const uploadUrlResponse = await fetch("/api/drive-complete/upload-url/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify(requestBody),
      });

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Erreur lors de la génération de l'URL d'upload"
        );
      }

      const uploadData = await uploadUrlResponse.json();

      // 2. Upload direct vers S3
      const formData = new FormData();
      Object.keys(uploadData.fields).forEach((key) => {
        formData.append(key, uploadData.fields[key]);
      });
      formData.append("file", file);

      const uploadResponse = await fetch(uploadData.upload_url, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error("Erreur lors de l'upload vers S3");
      }

      return true;
    } catch (error) {
      throw error;
    }
  };

  // Télécharger un fichier
  const downloadFile = async (filePath, fileName) => {
    try {
      const response = await fetch(
        `/api/drive-complete/download-url/?file_path=${encodeURIComponent(
          filePath
        )}`
      );
      if (!response.ok) {
        throw new Error(
          "Erreur lors de la génération du lien de téléchargement"
        );
      }

      const data = await response.json();

      // Créer un lien temporaire pour le téléchargement
      const link = document.createElement("a");
      link.href = data.download_url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSnackbar("Téléchargement démarré", "success");
    } catch (error) {
      console.error("Erreur téléchargement:", error);
      showSnackbar("Erreur lors du téléchargement", "error");
    }
  };

  // Utilitaires
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  // Gestionnaires d'événements
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
    setUploadDialogOpen(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    // Nettoyer le timeout précédent
    if (dragTimeout) {
      clearTimeout(dragTimeout);
    }

    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();

    // Nettoyer le timeout précédent
    if (dragTimeout) {
      clearTimeout(dragTimeout);
    }

    // Vérifier si on quitte vraiment la zone de drop
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    // Si on est encore dans les limites de la zone, ne pas désactiver
    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      return;
    }

    // Ajouter un délai pour éviter le clignotement
    const timeout = setTimeout(() => {
      setIsDragOver(false);
    }, 100);

    setDragTimeout(timeout);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      setUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          showSnackbar(
            `Le fichier ${file.name} dépasse la taille maximale de 100 MB`,
            "error"
          );
          continue;
        }

        await uploadFile(file);
      }

      showSnackbar("Upload terminé avec succès", "success");
      setUploadDialogOpen(false);
      setSelectedFiles([]);
      fetchFolderContent(currentPath); // Recharger pour voir les nouveaux fichiers
    } catch (error) {
      showSnackbar("Erreur lors de l'upload", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleContextMenu = (event, item) => {
    event.preventDefault();
    setSelectedItem(item);
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Navigation via breadcrumbs
  const navigateToPath = (path) => {
    if (path !== currentPath) {
      fetchFolderContent(path);
    }
  };

  // Construire le breadcrumb
  const buildBreadcrumb = () => {
    const parts = currentPath.split("/").filter((part) => part);
    const breadcrumb = [{ name: "Documents", path: "" }];

    let currentPathPart = "";
    parts.forEach((part) => {
      currentPathPart += (currentPathPart ? "/" : "") + part;
      breadcrumb.push({
        name: part,
        path: currentPathPart,
      });
    });

    return breadcrumb;
  };

  // Effet pour charger le contenu initial
  useEffect(() => {
    fetchFolderContent("");
  }, [fetchFolderContent]);

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }
    };
  }, [dragTimeout]);

  // Rendu
  return (
    <DriveContainer>
      {/* Header */}
      <DriveHeader elevation={1}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h5" component="h1">
            Drive
          </Typography>

          {/* Breadcrumb */}
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
            {buildBreadcrumb().map((item, index) => (
              <Link
                key={index}
                component="button"
                variant="body1"
                onClick={() => navigateToPath(item.path)}
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                {index === 0 ? (
                  <HomeIcon fontSize="small" />
                ) : (
                  <FolderIcon fontSize="small" />
                )}
                {item.name}
              </Link>
            ))}
          </Breadcrumbs>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Recherche */}
          <TextField
            size="small"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "text.secondary" }}
                />
              ),
            }}
            sx={{ minWidth: 200 }}
          />

          {/* Boutons d'action */}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateFolderDialogOpen(true)}
          >
            Nouveau dossier
          </Button>

          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload
          </Button>
        </Box>
      </DriveHeader>

      {/* Content */}
      <DriveContent>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: "100%",
            minHeight: "calc(100vh - 200px)",
          }}
        >
          {/* Zone de drag & drop invisible qui couvre tout l'écran */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: isDragOver ? 10 : -1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDragOver
                ? "rgba(25, 118, 210, 0.1)"
                : "transparent",
              transition: "all 0.2s ease-in-out",
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Zone de drop visible au centre */}
            {isDragOver && (
              <Box
                sx={{
                  border: "3px dashed",
                  borderColor: "primary.main",
                  borderRadius: 3,
                  padding: 6,
                  backgroundColor: "primary.light + 20",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 300,
                  minHeight: 200,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                }}
              >
                <UploadIcon
                  sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
                />
                <Typography variant="h6" color="primary.main" gutterBottom>
                  Déposez vos fichiers ici
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Glissez-déposez vos fichiers pour les uploader
                </Typography>
              </Box>
            )}
          </Box>

          {/* Contenu normal */}
          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              height: "100%",
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : folderContent.folders.length === 0 &&
              folderContent.files.length === 0 ? (
              <Box
                sx={{
                  textAlign: "center",
                  py: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "400px",
                  border: "none",
                  borderRadius: 2,
                  backgroundColor: "transparent",
                  mx: 2,
                  my: 2,
                  transition: "all 0.2s ease-in-out",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "grey.50",
                  },
                }}
                onClick={() => {
                  if (!createFolderDialogOpen && !uploadDialogOpen) {
                    setUploadDialogOpen(true);
                  }
                }}
              >
                <UploadIcon
                  sx={{ fontSize: 80, color: "text.secondary", mb: 3 }}
                />
                <Typography variant="h5" color="text.secondary" gutterBottom>
                  Dossier vide
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  Glissez-déposez des fichiers ici
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ou cliquez pour en sélectionner
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{ p: 2, width: "100%" }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* En-tête de la liste */}
                <Paper sx={{ mb: 2, width: "100%" }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 100px 150px 120px 80px",
                      gap: 2,
                      p: 2,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "grey.50",
                      fontWeight: "bold",
                      width: "100%",
                    }}
                  >
                    <Typography variant="subtitle2">Nom</Typography>
                    <Typography variant="subtitle2">Taille</Typography>
                    <Typography variant="subtitle2">
                      Date de modification
                    </Typography>
                    <Typography variant="subtitle2">Type</Typography>
                    <Typography variant="subtitle2">Actions</Typography>
                  </Box>
                </Paper>

                {/* Liste des éléments */}
                <List sx={{ p: 0, width: "100%" }}>
                  {/* Dossiers */}
                  {folderContent.folders.map((folder) => (
                    <ListItem
                      key={folder.path}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        mb: 1,
                        borderRadius: 1,
                        cursor: "pointer",
                        width: "100%",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToFolder(folder);
                      }}
                      onContextMenu={(e) =>
                        handleContextMenu(e, { ...folder, isFolder: true })
                      }
                    >
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 100px 150px 120px 80px",
                          gap: 2,
                          alignItems: "center",
                          width: "100%",
                          p: 2,
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <FolderIcon color="primary" />
                          <Typography variant="body2" noWrap>
                            {folder.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          --
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          --
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Dossier
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(folder.path, true);
                              }}
                              sx={{ color: "error.main" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </ListItem>
                  ))}

                  {/* Fichiers */}
                  {folderContent.files.map((file) => (
                    <ListItem
                      key={file.path}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        mb: 1,
                        borderRadius: 1,
                        cursor: "pointer",
                        width: "100%",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(file.path, file.name);
                      }}
                      onContextMenu={(e) =>
                        handleContextMenu(e, { ...file, isFolder: false })
                      }
                    >
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 100px 150px 120px 80px",
                          gap: 2,
                          alignItems: "center",
                          width: "100%",
                          p: 2,
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {getFileIcon(
                            file.content_type,
                            file.name.split(".").pop()
                          )}
                          <Typography variant="body2" noWrap>
                            {file.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {formatFileSize(file.size)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(file.last_modified)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {file.name.split(".").pop()?.toUpperCase() ||
                            "Fichier"}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Tooltip title="Télécharger">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(file.path, file.name);
                              }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(file.path, false);
                              }}
                              sx={{ color: "error.main" }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </Box>
      </DriveContent>

      {/* Dialog d'upload */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload de fichiers</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
              id="file-input"
            />
            <label htmlFor="file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
              >
                Sélectionner des fichiers
              </Button>
            </label>
          </Box>

          {selectedFiles.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Fichiers sélectionnés ({selectedFiles.length})
              </Typography>
              <List dense>
                {selectedFiles.map((file, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getFileIcon(file.type, file.name.split(".").pop())}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={`${formatFileSize(file.size)} - ${
                        file.type || "Type inconnu"
                      }`}
                    />
                    {file.size > MAX_FILE_SIZE && (
                      <Chip
                        label="Trop volumineux"
                        color="error"
                        size="small"
                      />
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || selectedFiles.length === 0}
            startIcon={
              uploading ? <CircularProgress size={16} /> : <UploadIcon />
            }
          >
            {uploading ? "Upload en cours..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de création de dossier */}
      <Dialog
        open={createFolderDialogOpen}
        onClose={() => setCreateFolderDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Créer un nouveau dossier</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom du dossier"
            type="text"
            fullWidth
            variant="outlined"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleCreateFolder();
              }
            }}
            placeholder="Ex: Documents importants"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setCreateFolderDialogOpen(false);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleCreateFolder();
            }}
            variant="contained"
            disabled={!newFolderName.trim()}
            startIcon={<FolderIcon />}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de renommage */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>
          Renommer {selectedItem?.isFolder ? "le dossier" : "le fichier"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nouveau nom"
            type="text"
            fullWidth
            variant="outlined"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleRenameItem();
              }
            }}
            placeholder={`Nouveau nom pour ${selectedItem?.name}`}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setRenameDialogOpen(false);
              setNewItemName("");
              setSelectedItem(null);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleRenameItem();
            }}
            variant="contained"
            disabled={!newItemName.trim()}
            startIcon={<EditIcon />}
          >
            Renommer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu contextuel */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {selectedItem && (
          <>
            {!selectedItem.isFolder && (
              <MenuItemMUI
                onClick={() => {
                  downloadFile(selectedItem.path, selectedItem.name);
                  handleContextMenuClose();
                }}
              >
                <ListItemIcon>
                  <DownloadIcon fontSize="small" />
                </ListItemIcon>
                Télécharger
              </MenuItemMUI>
            )}
            <MenuItemMUI
              onClick={() => {
                openRenameDialog(selectedItem);
              }}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              Renommer
            </MenuItemMUI>
            <Divider />
            <MenuItemMUI
              onClick={() => {
                handleDeleteItem(selectedItem.path, selectedItem.isFolder);
                handleContextMenuClose();
              }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              Supprimer
            </MenuItemMUI>
          </>
        )}
      </Menu>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DriveContainer>
  );
};

export default Drive;
