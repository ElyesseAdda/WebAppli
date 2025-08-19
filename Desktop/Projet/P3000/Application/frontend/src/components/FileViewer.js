import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const FileViewer = ({ filePath, fileName, onClose }) => {
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
  }, [filePath]);

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
        return (
          <iframe
            src={fileUrl}
            width="100%"
            height="100%"
            style={{ border: "none" }}
            title={fileName}
          />
        );

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
