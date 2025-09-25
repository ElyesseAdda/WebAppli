import {
  Add as AddIcon,
  Archive as ArchiveIcon,
  AudioFile as AudioIcon,
  Code as CodeIcon,
  Computer as ComputerIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  InsertDriveFile as FileIcon,
  Folder as FolderIcon,
  Home as HomeIcon,
  Image as ImageIcon,
  Language as LanguageIcon,
  NavigateNext as NavigateNextIcon,
  PictureAsPdf as PdfIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  CloudUpload as UploadIcon,
  VideoFile as VideoIcon,
  Visibility as VisibilityIcon,
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
  InputAdornment,
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import React, { useCallback, useEffect, useState } from "react";
import FileViewer from "./FileViewer";
import MobileDrive from "./MobileDrive";

// Styles personnalisés
const DriveContainer = styled(Box)(({ theme }) => ({
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[8],
  overflow: "hidden",
}));

const DriveHeader = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: theme.spacing(2),
  borderRadius: theme.spacing(1.5),
  boxShadow: theme.shadows[4],
  flexDirection: { xs: "column", sm: "row" },
  alignItems: { xs: "stretch", sm: "center" },
  "@media (max-width: 600px)": {
    padding: theme.spacing(1),
    gap: theme.spacing(1),
  },
}));

const DriveContent = styled(Box)(({ theme }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "auto", // Permettre le scroll
  minHeight: "calc(100vh - 120px)", // Hauteur minimale pour la zone de drag & drop
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(1),
}));

const FileGrid = styled(Grid)(({ theme }) => ({
  flex: 1,
  overflow: "auto",
  padding: theme.spacing(2),
  display: "grid",
  gridTemplateColumns: {
    xs: "1fr", // Mobile : 1 colonne
    sm: "repeat(2, 1fr)", // Tablette : 2 colonnes
    md: "repeat(3, 1fr)", // Desktop : 3 colonnes
    lg: "repeat(4, 1fr)", // Large : 4 colonnes
    xl: "repeat(5, 1fr)", // Extra large : 5 colonnes
  },
  gap: theme.spacing(2),
  "@media (max-width: 600px)": {
    gridTemplateColumns: "1fr",
    gap: theme.spacing(1),
    padding: theme.spacing(1),
  },
}));

const FileCard = styled(Card)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
  minHeight: { xs: "120px", sm: "140px", md: "160px" },
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[8],
  },
  "@media (max-width: 600px)": {
    minHeight: "100px",
    "&:hover": {
      transform: "none", // Désactiver l'animation sur mobile
    },
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // États de base
  const [currentPath, setCurrentPath] = useState("");
  const [folderContent, setFolderContent] = useState({
    folders: [],
    files: [],
  });
  const [loading, setLoading] = useState(false);
  
  // États de pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalItems: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  });
  const [sorting, setSorting] = useState({
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [uploading, setUploading] = useState(false);
  
  // États WebSocket
  const [websocket, setWebsocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState({
    folders: [],
    files: [],
  });
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
  const [officeDialogOpen, setOfficeDialogOpen] = useState(false);
  const [officeFileData, setOfficeFileData] = useState({
    fileName: "",
    fileUrl: "",
    filePath: "",
  });
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [fileViewerData, setFileViewerData] = useState({
    filePath: "",
    fileName: "",
    contentType: "",
  });

  // État pour le modal de conflit

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

  // Fonction pour fermer la sidebar
  const closeSidebar = () => {
    // Émettre un événement personnalisé pour fermer la sidebar
    window.dispatchEvent(new CustomEvent("closeSidebar"));

    // Alternative : essayer de trouver et cliquer sur le bouton close
    const closeButton = document.querySelector(
      '.close-button, [data-testid="close-button"], button[aria-label*="close"]'
    );
    if (closeButton) {
      closeButton.click();
    }
  };

  // Fonction pour naviguer vers un chemin spécifique
  const navigateToSpecificPath = async (path) => {
    if (!path) return;

    try {
      setLoading(true);

      // Déterminer si c'est un fichier ou un dossier
      const isFile = path.includes(".") && path.split("/").pop().includes(".");

      let folderPath, fileName;

      if (isFile) {
        // Si c'est un fichier, extraire le dossier parent
        const pathParts = path.split("/");
        fileName = pathParts.pop(); // Nom du fichier
        folderPath = pathParts.join("/"); // Chemin du dossier parent

        // S'assurer que le chemin se termine par / pour ouvrir le dossier
        if (!folderPath.endsWith("/")) {
          folderPath += "/";
        }
      } else {
        // Si c'est un dossier, utiliser le chemin tel quel
        folderPath = path;
        // S'assurer que le chemin se termine par / pour l'ouvrir
        if (!folderPath.endsWith("/")) {
          folderPath += "/";
        }
      }

      console.log("Navigation vers le dossier (avec /):", folderPath);
      console.log("Fichier cible:", fileName);

      // Utiliser votre API existante pour naviguer vers le dossier
      const response = await fetch(
        `/api/drive-complete/list-content/?folder_path=${encodeURIComponent(
          folderPath
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentPath(folderPath);
        setFolderContent(data);

        // Mettre en surbrillance le fichier si focus=file est spécifié et qu'on a un nom de fichier
        const urlParams = new URLSearchParams(window.location.search);
        if (fileName && urlParams.get("focus") === "file" && data.files) {
          const targetFile = data.files.find((file) => file.name === fileName);
          if (targetFile) {
            setSelectedItem(targetFile);
            console.log("Fichier sélectionné:", targetFile);
          }
        }
      } else {
        console.error("Erreur API:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Erreur lors de la navigation:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour interpréter les paramètres d'URL
  const handleUrlParameters = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = urlParams.get("path");
    const sidebar = urlParams.get("sidebar");
    const focus = urlParams.get("focus");

    // Fermer la sidebar si demandé
    if (sidebar === "closed") {
      // Délai pour s'assurer que le composant est monté
      setTimeout(() => {
        closeSidebar();
      }, 100);
    }

    // Naviguer vers le chemin spécifié
    if (path) {
      navigateToSpecificPath(path);
    }
  };

  // Fonctions utilitaires
  const formatFileName = (fileName) => {
    // Transformer les underscores et tirets en espaces pour un affichage plus lisible
    // Garder l'extension intacte
    if (!fileName) return fileName;

    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex === -1) {
      // Pas d'extension, remplacer tous les underscores et tirets
      return fileName.replace(/[_-]/g, " ");
    } else {
      // Garder l'extension intacte, remplacer les underscores et tirets dans le nom
      const name = fileName.substring(0, lastDotIndex);
      const extension = fileName.substring(lastDotIndex);
      return name.replace(/[_-]/g, " ") + extension;
    }
  };

  // Fonction pour normaliser le texte (supprimer accents et mettre en minuscules)
  const normalizeText = (text) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
      .toLowerCase();
  };

  // Fonction de recherche intelligente dans le contenu du dossier courant
  const performSearch = (searchQuery) => {
    if (!searchQuery.trim()) {
      // Si la recherche est vide, afficher le contenu normal
      setSearchResults({ folders: [], files: [] });
      return;
    }

    console.log(
      `🔍 Recherche intelligente de "${searchQuery}" dans ${
        currentPath || "racine"
      }`
    );

    // Recherche dans le contenu du dossier courant (plus rapide)
    const normalizedQuery = normalizeText(searchQuery);

    // Recherche partielle : trouve tous les éléments contenant la chaîne
    const filteredFolders = folderContent.folders.filter((folder) =>
      normalizeText(folder.name).includes(normalizedQuery)
    );

    const filteredFiles = folderContent.files.filter((file) =>
      normalizeText(file.name).includes(normalizedQuery)
    );

    setSearchResults({
      folders: filteredFolders,
      files: filteredFiles,
    });

    console.log(
      `✅ Recherche intelligente terminée: ${filteredFolders.length} dossiers, ${filteredFiles.length} fichiers trouvés`
    );
  };

  // Fonction pour gérer la saisie et la recherche en temps réel
  const handleSearchInput = (value) => {
    setSearchTerm(value);

    // Si le champ est vide, effacer les résultats
    if (!value.trim()) {
      setSearchResults({ folders: [], files: [] });
      return;
    }

    // Recherche en temps réel avec délai pour éviter trop de requêtes
    const timeoutId = setTimeout(() => {
      if (value.trim()) {
        performSearch(value);
      }
    }, 200); // Délai de 200ms pour la fluidité

    // Nettoyer le timeout précédent
    return () => clearTimeout(timeoutId);
  };

  // Fonction pour gérer la touche Entrée (recherche immédiate)
  const handleSearchKeyPress = (event) => {
    if (event.key === "Enter") {
      if (searchTerm.trim()) {
        performSearch(searchTerm);
      } else {
        setSearchResults({ folders: [], files: [] });
      }
    }
  };

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

  // Vérifier si un fichier peut être ouvert dans le navigateur
  const canOpenInBrowser = (contentType, fileName) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    // Types de fichiers qui peuvent être ouverts dans le navigateur
    const browserSupportedTypes = [
      "pdf",
      "txt",
      "html",
      "htm",
      "css",
      "js",
      "json",
      "xml",
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "svg",
      "webp",
      "mp4",
      "webm",
      "ogg",
      "mp3",
      "wav",
      "flac",
    ];

    // Types MIME supportés
    const browserSupportedMimeTypes = [
      "text/",
      "image/",
      "video/",
      "audio/",
      "application/pdf",
      "application/json",
      "application/xml",
    ];

    return (
      browserSupportedTypes.includes(extension) ||
      browserSupportedMimeTypes.some((type) => contentType?.startsWith(type))
    );
  };

  // Vérifier si un fichier peut être ouvert avec Office Online
  const canOpenWithOfficeOnline = (fileName) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    const officeExtensions = [
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "odt",
      "ods",
      "odp", // OpenDocument formats
    ];

    return officeExtensions.includes(extension);
  };

  // Vérifier si un fichier peut être ouvert avec l'application locale
  const canOpenWithLocalApp = (fileName) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    const localAppExtensions = [
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "odt",
      "ods",
      "odp",
      "rtf",
      "csv",
    ];

    return localAppExtensions.includes(extension);
  };

  // Gestion WebSocket (seulement en production)
  const connectWebSocket = useCallback((folderPath) => {
    // Désactiver WebSockets en local
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('WebSockets désactivés en local');
      setIsConnected(false);
      return;
    }
    
    if (websocket) {
      websocket.close();
    }
    
    const wsUrl = `ws://${window.location.host}/ws/drive/${encodeURIComponent(folderPath || '')}/`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connecté');
      setIsConnected(true);
      setWebsocket(ws);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    ws.onclose = () => {
      console.log('WebSocket déconnecté');
      setIsConnected(false);
      setWebsocket(null);
    };
    
    ws.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
      setIsConnected(false);
    };
  }, [websocket]);
  
  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'file_added':
        if (data.folder_path === currentPath) {
          setFolderContent(prev => ({
            ...prev,
            files: [...prev.files, data.file]
          }));
          showSnackbar(`Nouveau fichier: ${data.file.name}`, "info");
        }
        break;
        
      case 'file_deleted':
        if (data.folder_path === currentPath) {
          setFolderContent(prev => ({
            ...prev,
            files: prev.files.filter(file => file.path !== data.file_path)
          }));
          showSnackbar("Fichier supprimé", "info");
        }
        break;
        
      case 'file_renamed':
        if (data.folder_path === currentPath) {
          setFolderContent(prev => ({
            ...prev,
            files: prev.files.map(file => 
              file.path === data.old_path 
                ? { ...file, path: data.new_path, name: data.new_path.split('/').pop() }
                : file
            )
          }));
          showSnackbar("Fichier renommé", "info");
        }
        break;
        
      case 'folder_added':
        if (data.folder_path === currentPath) {
          setFolderContent(prev => ({
            ...prev,
            folders: [...prev.folders, data.folder]
          }));
          showSnackbar(`Nouveau dossier: ${data.folder.name}`, "info");
        }
        break;
        
      case 'cache_invalidated':
        if (data.folder_path === currentPath) {
          showSnackbar("Contenu mis à jour", "info");
          // Optionnel: recharger automatiquement
          // fetchFolderContent(currentPath, pagination.page, sorting.sortBy, sorting.sortOrder);
        }
        break;
        
      default:
        console.log('Événement WebSocket non géré:', data);
    }
  }, [currentPath, pagination.page, sorting.sortBy, sorting.sortOrder]);
  
  const disconnectWebSocket = useCallback(() => {
    if (websocket) {
      websocket.close();
      setWebsocket(null);
      setIsConnected(false);
    }
  }, [websocket]);

  // Charger le contenu du dossier actuel avec pagination
  const fetchFolderContent = useCallback(async (folderPath = "", page = 1, sortBy = 'name', sortOrder = 'asc') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (folderPath) params.append("folder_path", folderPath);
      params.append("page", page.toString());
      params.append("limit", pagination.limit.toString());
      params.append("sort_by", sortBy);
      params.append("sort_order", sortOrder);

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
      
      // Mettre à jour la pagination
      if (data.pagination) {
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          totalItems: data.pagination.total_items,
          totalPages: data.pagination.total_pages,
          hasNext: data.pagination.has_next,
          hasPrevious: data.pagination.has_previous
        });
      }
      
      // Mettre à jour le tri
      if (data.sorting) {
        setSorting({
          sortBy: data.sorting.sort_by,
          sortOrder: data.sorting.sort_order
        });
      }
      
      // Connecter le WebSocket pour ce dossier
      connectWebSocket(folderPath);
    } catch (error) {
      console.error("Erreur lors du chargement du contenu:", error);
      showSnackbar("Erreur lors du chargement du contenu", "error");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

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

  // Rafraîchir le contenu du dossier actuel
  const refreshCurrentFolder = async () => {
    try {
      setLoading(true);
      await fetchFolderContent(currentPath, pagination.page, sorting.sortBy, sorting.sortOrder);
      showSnackbar("Contenu rafraîchi", "success");
    } catch (error) {
      showSnackbar("Erreur lors du rafraîchissement", "error");
    } finally {
      setLoading(false);
    }
  };

  // Navigation entre les pages
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchFolderContent(currentPath, newPage, sorting.sortBy, sorting.sortOrder);
    }
  };

  // Changer le tri
  const handleSortChange = (newSortBy) => {
    let newSortOrder = 'asc';
    if (newSortBy === sorting.sortBy) {
      // Si c'est le même critère, inverser l'ordre
      newSortOrder = sorting.sortOrder === 'asc' ? 'desc' : 'asc';
    }
    setSorting({ sortBy: newSortBy, sortOrder: newSortOrder });
    fetchFolderContent(currentPath, 1, newSortBy, newSortOrder); // Retourner à la page 1
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

      // Confirmer l'upload et invalider le cache
      try {
        await fetch("/api/drive-complete/confirm-upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
          },
          body: JSON.stringify({
            file_path: requestBody.file_path + "/" + file.name,
          }),
        });
      } catch (error) {
        console.warn("Erreur lors de la confirmation de l'upload:", error);
        // Ne pas faire échouer l'upload pour cette erreur
      }

      return true;
    } catch (error) {
      throw error;
    }
  };

  // Ouvrir un fichier dans le navigateur
  const openFile = async (filePath, fileName, contentType) => {
    try {
      // Vérifier si le fichier peut être ouvert dans le navigateur
      if (!canOpenInBrowser(contentType, fileName)) {
        showSnackbar(
          "Ce type de fichier ne peut pas être ouvert dans le navigateur",
          "warning"
        );
        return;
      }

      // Pour les PDFs, utiliser le système de pagination
      if (fileName.toLowerCase().endsWith(".pdf")) {
        try {
          // D'abord, obtenir les informations de pagination
          const previewInfoResponse = await fetch(
            `/api/drive-complete/preview-file/?file_path=${encodeURIComponent(
              filePath
            )}`
          );

          if (!previewInfoResponse.ok) {
            throw new Error("Erreur lors de la récupération des informations du PDF");
          }

          const previewInfo = await previewInfoResponse.json();

          if (previewInfo.preview_type === "paginated") {
            // Ouvrir le visualiseur de PDF avec pagination
            setFileViewerData({
              filePath: filePath,
              fileName: fileName,
              contentType: "application/pdf",
              totalPages: previewInfo.total_pages,
              isPaginated: true,
            });
            setFileViewerOpen(true);
            showSnackbar(`PDF ouvert avec ${previewInfo.total_pages} page(s)`, "success");
          } else {
            // Fallback pour les PDFs simples
            const previewUrl = `/api/drive-complete/preview-file/?file_path=${encodeURIComponent(
              filePath
            )}`;
            const newWindow = window.open(previewUrl, "_blank");
            if (newWindow) {
              showSnackbar("Prévisualisation PDF générée", "success");
            } else {
              showSnackbar("Erreur lors de l'ouverture de la prévisualisation", "error");
            }
          }
        } catch (error) {
          console.error("Erreur ouverture PDF:", error);
          showSnackbar("Erreur lors de l'ouverture du PDF", "error");
        }
      } else {
        // Pour les autres fichiers, utiliser la page dédiée
        setFileViewerData({
          filePath: filePath,
          fileName: fileName,
          contentType: contentType,
        });
        setFileViewerOpen(true);
        showSnackbar("Fichier ouvert en prévisualisation", "success");
      }
    } catch (error) {
      console.error("Erreur ouverture fichier:", error);
      showSnackbar("Erreur lors de l'ouverture du fichier", "error");
    }
  };

  // Ouvrir un fichier Office avec différentes options
  const openOfficeFile = async (filePath, fileName) => {
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
      const fileUrl = data.download_url;

      // Créer un modal pour choisir l'option d'ouverture
      setOfficeDialogOpen(true);
      setOfficeFileData({
        fileName: fileName,
        fileUrl: fileUrl,
        filePath: filePath,
      });
    } catch (error) {
      console.error("Erreur ouverture fichier Office:", error);
      showSnackbar("Erreur lors de l'ouverture du fichier", "error");
    }
  };

  // Ouvrir avec Office Online
  const openWithOfficeOnline = (fileUrl, fileName) => {
    // Encoder l'URL du fichier pour Office Online
    const encodedUrl = encodeURIComponent(fileUrl);
    const officeOnlineUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

    window.open(officeOnlineUrl, "_blank");
    setOfficeDialogOpen(false);
    showSnackbar("Fichier ouvert avec Office Online", "success");
  };

  // Ouvrir avec l'application locale
  const openWithLocalApp = (fileUrl, fileName) => {
    // Créer un lien temporaire pour ouvrir avec l'application par défaut
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName; // Force le téléchargement
    link.target = "_blank";

    // Ajouter un attribut pour ouvrir avec l'application locale
    link.setAttribute("data-action", "open-local");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setOfficeDialogOpen(false);
    showSnackbar("Fichier ouvert avec l'application locale", "success");
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

  // Envoyer un fichier par email
  const sendFileByEmail = async (filePath, fileName) => {
    try {
      // 1. Télécharger le fichier automatiquement
      const link = document.createElement("a");
      link.href = `/api/download-file-from-drive/?file_path=${encodeURIComponent(
        filePath
      )}`;
      link.download = fileName;
      link.click();

      // 2. Ouvrir l'application email avec contenu pré-rempli
      const subject = encodeURIComponent(fileName);
      const body = encodeURIComponent(
        `Bonjour,\n\nVeuillez trouver en pièce jointe le fichier ${fileName}.\n\nCordialement`
      );

      const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
      window.open(mailtoLink, "_blank");

      // 3. Afficher une notification d'aide
      showSnackbar(
        `📧 Email ouvert avec contenu pré-rempli ! Le fichier "${fileName}" a été téléchargé. Joignez-le depuis votre dossier de téléchargements.`,
        "success"
      );
    } catch (error) {
      console.error("Erreur envoi email:", error);
      showSnackbar(
        "Erreur lors de l'ouverture de l'application de mail",
        "error"
      );
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
    event.stopPropagation();

    // Nettoyer le timeout précédent
    if (dragTimeout) {
      clearTimeout(dragTimeout);
    }

    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();

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
    event.stopPropagation();
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
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          showSnackbar(
            `Le fichier ${formatFileName(
              file.name
            )} dépasse la taille maximale de 100 MB`,
            "error"
          );
          errorCount++;
          continue;
        }

        try {
          await uploadFile(file);
          successCount++;
        } catch (error) {
          showSnackbar(
            `Erreur lors de l'upload de ${formatFileName(file.name)}: ${error.message}`,
            "error"
          );
          errorCount++;
        }
      }

      // Afficher le résumé
      if (successCount > 0) {
        showSnackbar(
          `Upload terminé: ${successCount} fichier(s) uploadé(s) avec succès`,
          "success"
        );
      }

      if (errorCount > 0) {
        showSnackbar(
          `${errorCount} fichier(s) n'ont pas pu être uploadé(s)`,
          "warning"
        );
      }

      setUploadDialogOpen(false);
      setSelectedFiles([]);
      
      // Recharger le contenu du dossier pour voir les nouveaux fichiers
      await fetchFolderContent(currentPath);
      
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
      // Ajouter un / à la fin pour s'assurer que la navigation fonctionne correctement
      breadcrumb.push({
        name: part,
        path: currentPathPart + "/",
      });
    });

    return breadcrumb;
  };

  // Redirection mobile
  useEffect(() => {
    if (isMobile) {
      // Rediriger vers la version mobile
      window.location.href = '/drive?mobile=true';
    }
  }, [isMobile]);

  // Effet pour charger le contenu initial
  useEffect(() => {
    fetchFolderContent("");
  }, [fetchFolderContent]);
  
  // Nettoyer le WebSocket lors du démontage
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  // Effet pour interpréter les paramètres d'URL au chargement
  useEffect(() => {
    handleUrlParameters();
  }, []);

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
                {formatFileName(item.name)}
              </Link>
            ))}
          </Breadcrumbs>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Recherche */}
          <TextField
            size="small"
            placeholder="Rechercher en temps réel... (ou appuyez sur Entrée)"
            value={searchTerm}
            onChange={(e) => handleSearchInput(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            InputProps={{
              startAdornment: (
                <SearchIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "text.secondary" }}
                />
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (searchTerm.trim()) {
                        performSearch(searchTerm);
                      }
                    }}
                    disabled={!searchTerm.trim()}
                  >
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />

          {/* Contrôles de tri - Responsive */}
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1,
            flexWrap: { xs: "wrap", sm: "nowrap" },
            flexDirection: { xs: "column", sm: "row" },
            width: { xs: "100%", sm: "auto" }
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ 
              display: { xs: "none", sm: "block" },
              minWidth: "fit-content"
            }}>
              Trier par:
            </Typography>
            <Box sx={{ 
              display: "flex", 
              gap: 1, 
              flexWrap: "wrap",
              justifyContent: { xs: "center", sm: "flex-start" },
              width: { xs: "100%", sm: "auto" }
            }}>
              <Button
                size="small"
                variant={sorting.sortBy === 'name' ? 'contained' : 'outlined'}
                onClick={() => handleSortChange('name')}
                sx={{ 
                  minWidth: { xs: "60px", sm: "auto" },
                  px: { xs: 1, sm: 1 },
                  fontSize: { xs: "0.75rem", sm: "0.875rem" }
                }}
              >
                <Box sx={{ display: { xs: "none", sm: "inline" } }}>Nom</Box>
                <Box sx={{ display: { xs: "inline", sm: "none" } }}>A-Z</Box>
                {sorting.sortBy === 'name' && (sorting.sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                size="small"
                variant={sorting.sortBy === 'size' ? 'contained' : 'outlined'}
                onClick={() => handleSortChange('size')}
                sx={{ 
                  minWidth: { xs: "60px", sm: "auto" },
                  px: { xs: 1, sm: 1 },
                  fontSize: { xs: "0.75rem", sm: "0.875rem" }
                }}
              >
                <Box sx={{ display: { xs: "none", sm: "inline" } }}>Taille</Box>
                <Box sx={{ display: { xs: "inline", sm: "none" } }}>Size</Box>
                {sorting.sortBy === 'size' && (sorting.sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
              <Button
                size="small"
                variant={sorting.sortBy === 'date' ? 'contained' : 'outlined'}
                onClick={() => handleSortChange('date')}
                sx={{ 
                  minWidth: { xs: "60px", sm: "auto" },
                  px: { xs: 1, sm: 1 },
                  fontSize: { xs: "0.75rem", sm: "0.875rem" }
                }}
              >
                <Box sx={{ display: { xs: "none", sm: "inline" } }}>Date</Box>
                <Box sx={{ display: { xs: "inline", sm: "none" } }}>Date</Box>
                {sorting.sortBy === 'date' && (sorting.sortOrder === 'asc' ? '↑' : '↓')}
              </Button>
            </Box>
          </Box>

          {/* Indicateur de connexion WebSocket */}
          <Tooltip title={isConnected ? "Synchronisation temps réel active" : "Synchronisation temps réel inactive"}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: isConnected ? "success.main" : "error.main",
                  animation: isConnected ? "pulse 2s infinite" : "none",
                  "@keyframes pulse": {
                    "0%": { opacity: 1 },
                    "50%": { opacity: 0.5 },
                    "100%": { opacity: 1 }
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {isConnected ? "Temps réel" : "Hors ligne"}
              </Typography>
            </Box>
          </Tooltip>

          {/* Bouton de rafraîchissement */}
          <Tooltip title="Rafraîchir le contenu">
            <IconButton
              onClick={refreshCurrentFolder}
              disabled={loading}
              sx={{ 
                color: "primary.main",
                "&:hover": {
                  backgroundColor: "primary.light + 20"
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          {/* Boutons d'action - Responsive */}
          <Box sx={{ 
            display: "flex", 
            gap: 1,
            flexDirection: { xs: "column", sm: "row" },
            width: { xs: "100%", sm: "auto" }
          }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateFolderDialogOpen(true)}
              sx={{ 
                minWidth: { xs: "100%", sm: "auto" },
                fontSize: { xs: "0.75rem", sm: "0.875rem" }
              }}
            >
              <Box sx={{ display: { xs: "none", sm: "inline" } }}>Nouveau dossier</Box>
              <Box sx={{ display: { xs: "inline", sm: "none" } }}>Dossier</Box>
            </Button>

            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
              sx={{ 
                minWidth: { xs: "100%", sm: "auto" },
                fontSize: { xs: "0.75rem", sm: "0.875rem" }
              }}
            >
              <Box sx={{ display: { xs: "none", sm: "inline" } }}>Upload</Box>
              <Box sx={{ display: { xs: "inline", sm: "none" } }}>Ajouter</Box>
            </Button>
          </Box>
        </Box>
      </DriveHeader>

      {/* Content */}
      <DriveContent
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
            pointerEvents: isDragOver ? "auto" : "none",
          }}
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
            ) : (
                searchTerm.trim() &&
                (searchResults.folders.length > 0 ||
                  searchResults.files.length > 0)
                  ? searchResults.folders.length === 0 &&
                    searchResults.files.length === 0
                  : folderContent.folders.length === 0 &&
                    folderContent.files.length === 0
              ) ? (
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
                  {searchTerm.trim() &&
                  (searchResults.folders.length > 0 ||
                    searchResults.files.length > 0)
                    ? "Aucun résultat trouvé"
                    : "Dossier vide"}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  {searchTerm.trim() &&
                  (searchResults.folders.length > 0 ||
                    searchResults.files.length > 0)
                    ? `Aucun fichier ou dossier ne correspond à "${searchTerm}"`
                    : "Glissez-déposez des fichiers ici"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm.trim() &&
                  (searchResults.folders.length > 0 ||
                    searchResults.files.length > 0)
                    ? "Essayez de modifier votre recherche"
                    : "ou cliquez pour en sélectionner"}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{ p: 2, width: "100%" }}
              >
                {/* En-tête de la liste */}
                <Paper sx={{ mb: 2, width: "100%" }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 140px 100px 100px",
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
                  {(searchTerm.trim() && searchResults.folders.length > 0
                    ? searchResults.folders
                    : folderContent.folders
                  ).map((folder) => (
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
                          gridTemplateColumns: "1fr 80px 140px 100px 100px",
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
                            {formatFileName(folder.name)}
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
                  {(searchTerm.trim() && searchResults.files.length > 0
                    ? searchResults.files
                    : folderContent.files
                  ).map((file) => (
                    <ListItem
                      key={file.path}
                      data-file-name={file.name}
                      sx={{
                        border: "2px solid",
                        borderColor:
                          selectedItem && selectedItem.name === file.name
                            ? "primary.main"
                            : "divider",
                        mb: 1,
                        borderRadius: 1,
                        cursor: "pointer",
                        width: "100%",
                        backgroundColor:
                          selectedItem && selectedItem.name === file.name
                            ? "primary.light + 20"
                            : "transparent",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Vérifier si c'est un fichier Office
                        if (canOpenWithOfficeOnline(file.name)) {
                          openOfficeFile(file.path, file.name);
                        } else if (
                          canOpenInBrowser(file.content_type, file.name)
                        ) {
                          openFile(file.path, file.name, file.content_type);
                        } else {
                          showSnackbar(
                            "Ce type de fichier ne peut pas être ouvert directement",
                            "warning"
                          );
                        }
                      }}
                      onContextMenu={(e) =>
                        handleContextMenu(e, { ...file, isFolder: false })
                      }
                    >
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 80px 140px 100px 100px",
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
                            {formatFileName(file.name)}
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
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            alignItems: "center",
                          }}
                        >
                          <Tooltip title="Télécharger le fichier">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Télécharger directement dans le navigateur
                                const link = document.createElement("a");
                                link.href = `/api/download-file-from-drive/?file_path=${encodeURIComponent(
                                  file.path
                                )}`;
                                link.download = file.name;
                                link.click();
                              }}
                              sx={{ color: "success.main" }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Envoyer par email (ouvre votre client email avec contenu pré-rempli)">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                sendFileByEmail(file.path, file.name);
                              }}
                              sx={{ color: "primary.main" }}
                            >
                              <EmailIcon fontSize="small" />
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

            {/* Contrôles de pagination - Responsive */}
            {pagination.totalPages > 1 && (
              <Paper sx={{ 
                p: { xs: 1, sm: 2 }, 
                mt: 2, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 2, sm: 0 }
              }}>
                <Typography variant="body2" color="text.secondary" sx={{
                  textAlign: { xs: "center", sm: "left" },
                  fontSize: { xs: "0.75rem", sm: "0.875rem" }
                }}>
                  Page {pagination.page} sur {pagination.totalPages} ({pagination.totalItems} éléments)
                </Typography>
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: { xs: 0.5, sm: 1 },
                  flexWrap: "wrap",
                  justifyContent: { xs: "center", sm: "flex-end" }
                }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handlePageChange(1)}
                    disabled={!pagination.hasPrevious}
                    sx={{ 
                      display: { xs: "none", sm: "inline-flex" },
                      minWidth: "auto",
                      px: { xs: 1, sm: 2 }
                    }}
                  >
                    Première
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrevious}
                    sx={{ 
                      minWidth: { xs: "60px", sm: "auto" },
                      px: { xs: 1, sm: 2 }
                    }}
                  >
                    <Box sx={{ display: { xs: "none", sm: "inline" } }}>Précédent</Box>
                    <Box sx={{ display: { xs: "inline", sm: "none" } }}>‹</Box>
                  </Button>
                  <Typography variant="body2" sx={{ 
                    mx: { xs: 1, sm: 2 },
                    fontSize: { xs: "0.75rem", sm: "0.875rem" }
                  }}>
                    {pagination.page}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    sx={{ 
                      minWidth: { xs: "60px", sm: "auto" },
                      px: { xs: 1, sm: 2 }
                    }}
                  >
                    <Box sx={{ display: { xs: "none", sm: "inline" } }}>Suivant</Box>
                    <Box sx={{ display: { xs: "inline", sm: "none" } }}>›</Box>
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={!pagination.hasNext}
                    sx={{ 
                      display: { xs: "none", sm: "inline-flex" },
                      minWidth: "auto",
                      px: { xs: 1, sm: 2 }
                    }}
                  >
                    Dernière
                  </Button>
                </Box>
              </Paper>
            )}
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
                      primary={formatFileName(file.name)}
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
              <>
                {(canOpenInBrowser(
                  selectedItem.content_type,
                  selectedItem.name
                ) ||
                  canOpenWithOfficeOnline(selectedItem.name)) && (
                  <MenuItemMUI
                    onClick={() => {
                      if (canOpenWithOfficeOnline(selectedItem.name)) {
                        openOfficeFile(selectedItem.path, selectedItem.name);
                      } else {
                        openFile(
                          selectedItem.path,
                          selectedItem.name,
                          selectedItem.content_type
                        );
                      }
                      handleContextMenuClose();
                    }}
                  >
                    <ListItemIcon>
                      <VisibilityIcon fontSize="small" />
                    </ListItemIcon>
                    Ouvrir
                  </MenuItemMUI>
                )}
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
                <MenuItemMUI
                  onClick={() => {
                    sendFileByEmail(selectedItem.path, selectedItem.name);
                    handleContextMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <EmailIcon fontSize="small" />
                  </ListItemIcon>
                  Envoyer par email
                </MenuItemMUI>
              </>
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

      {/* Dialog pour les fichiers Office */}
      <Dialog
        open={officeDialogOpen}
        onClose={() => setOfficeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ouvrir le fichier Office</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Comment souhaitez-vous ouvrir "{officeFileData.fileName}" ?
          </Typography>

          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<LanguageIcon />}
              onClick={() =>
                openWithOfficeOnline(
                  officeFileData.fileUrl,
                  officeFileData.fileName
                )
              }
              sx={{ justifyContent: "flex-start", p: 2 }}
            >
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="subtitle1">Office Online</Typography>
                <Typography variant="body2" color="text.secondary">
                  Ouvrir dans le navigateur avec Office Online (lecture seule)
                </Typography>
              </Box>
            </Button>

            <Button
              variant="outlined"
              startIcon={<ComputerIcon />}
              onClick={() =>
                openWithLocalApp(
                  officeFileData.fileUrl,
                  officeFileData.fileName
                )
              }
              sx={{ justifyContent: "flex-start", p: 2 }}
            >
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="subtitle1">Application locale</Typography>
                <Typography variant="body2" color="text.secondary">
                  Télécharger et ouvrir avec l'application par défaut
                </Typography>
              </Box>
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOfficeDialogOpen(false)}>Annuler</Button>
        </DialogActions>
      </Dialog>

      {/* Modal FileViewer */}
      {fileViewerOpen && (
        <FileViewer
          filePath={fileViewerData.filePath}
          fileName={fileViewerData.fileName}
          onClose={() => setFileViewerOpen(false)}
          totalPages={fileViewerData.totalPages}
          isPaginated={fileViewerData.isPaginated}
        />
      )}

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
