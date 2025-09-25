import { 
  ArrowBack as ArrowBackIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
  IconButton,
  Paper,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const FileViewer = ({ filePath, fileName, onClose, totalPages, isPaginated }) => {
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageImage, setPageImage] = useState(null);

  // Fonction pour charger une page spécifique
  const fetchPageImage = async (pageNumber) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/drive-complete/page-preview/?file_path=${encodeURIComponent(
          filePath
        )}&page=${pageNumber}`
      );

      if (!response.ok) {
        throw new Error("Erreur lors du chargement de la page");
      }

      // Convertir la réponse en blob URL
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setPageImage(imageUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPaginated && totalPages) {
      // Charger la première page pour les PDFs paginés
      fetchPageImage(0);
    } else {
      // Logique normale pour les autres fichiers
      const fetchFileUrl = async () => {
        try {
          setLoading(true);
          const response = await fetch(
            `/api/drive-complete/display-url/?file_path=${encodeURIComponent(
              filePath
            )}`
          );

          if (!response.ok) {
            throw new Error("Erreur lors de la génération du lien d'affichage");
          }

          const data = await response.json();
          setFileUrl(data.display_url);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchFileUrl();
    }
  }, [filePath, isPaginated, totalPages]);

  // Fonction pour changer de page
  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      fetchPageImage(newPage);
    }
  };

  const getFileType = (fileName) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (extension === "pdf") return "pdf";
    if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(extension))
      return "image";
    if (["mp4", "webm", "ogg"].includes(extension)) return "video";
    if (["mp3", "wav", "flac"].includes(extension)) return "audio";
    if (["txt", "html", "css", "js", "json", "xml"].includes(extension))
      return "text";
    return "unknown";
  };

  const renderFileContent = () => {
    const fileType = getFileType(fileName);

    switch (fileType) {
      case "pdf":
        if (isPaginated && pageImage) {
          return (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              {/* Contrôles de pagination */}
              <Paper sx={{ p: 2, mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h6">
                  {fileName} - Page {currentPage + 1} sur {totalPages}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <IconButton
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    color="primary"
                  >
                    <NavigateBeforeIcon />
                  </IconButton>
                  <Typography variant="body2">
                    {currentPage + 1} / {totalPages}
                  </Typography>
                  <IconButton
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    color="primary"
                  >
                    <NavigateNextIcon />
                  </IconButton>
                </Box>
              </Paper>
              
              {/* Image de la page */}
              <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <img
                  src={pageImage}
                  alt={`Page ${currentPage + 1}`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
            </Box>
          );
        } else {
          return (
            <iframe
              src={fileUrl}
              width="100%"
              height="100%"
              style={{ border: "none" }}
              title={fileName}
            />
          );
        }

      case "image":
        return (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <img
              src={fileUrl}
              alt={fileName}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </Box>
        );

      case "video":
        return (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <video
              controls
              width="100%"
              height="100%"
              style={{ maxHeight: "100%" }}
            >
              <source src={fileUrl} type="video/mp4" />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          </Box>
        );

      case "audio":
        return (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              p: 4,
            }}
          >
            <audio controls style={{ width: "100%" }}>
              <source src={fileUrl} type="audio/mpeg" />
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
          </Box>
        );

      case "text":
        return (
          <iframe
            src={fileUrl}
            width="100%"
            height="100%"
            style={{ border: "none" }}
            title={fileName}
          />
        );

      default:
        return (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Typography variant="h6" color="text.secondary">
              Ce type de fichier ne peut pas être affiché dans le navigateur
            </Typography>
          </Box>
        );
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={onClose}
        >
          Retour au Drive
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 2,
          backgroundColor: "background.paper",
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={onClose}
        >
          Retour
        </Button>
        <Typography variant="h6" noWrap>
          {fileName}
        </Typography>
      </Box>

      {/* File Content */}
      <Box sx={{ flex: 1, overflow: "hidden" }}>{renderFileContent()}</Box>
    </Box>
  );
};

export default FileViewer;
