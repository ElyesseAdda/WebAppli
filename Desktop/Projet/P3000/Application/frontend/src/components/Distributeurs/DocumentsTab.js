import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Chip,
  Alert,
} from "@mui/material";
import {
  MdDescription,
  MdDownload,
  MdPictureAsPdf,
  MdImage,
} from "react-icons/md";

const DocumentsTab = () => {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Récupérer les documents depuis l'API drive
      // Filtrer pour les documents comptables (factures, devis, etc.)
      const response = await axios.get("/api/drive/", {
        params: {
          category: "factures", // Filtrer par catégorie comptable
        },
      });
      
      // Si pas de résultats avec factures, récupérer tous les documents
      if (!response.data || response.data.length === 0) {
        const allResponse = await axios.get("/api/drive/");
        setDocuments(allResponse.data || []);
      } else {
        setDocuments(response.data);
      }
    } catch (error) {
      console.error("Erreur chargement documents:", error);
      setError("Erreur lors du chargement des documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document) => {
    try {
      if (document.download_url) {
        window.open(document.download_url, "_blank");
      } else {
        // Fallback : générer l'URL de téléchargement
        const response = await axios.get(`/api/drive/${document.id}/download/`);
        if (response.data.url) {
          window.open(response.data.url, "_blank");
        }
      }
    } catch (error) {
      console.error("Erreur téléchargement:", error);
    }
  };

  const getFileIcon = (contentType, filename) => {
    if (contentType?.includes("pdf") || filename?.endsWith(".pdf")) {
      return <MdPictureAsPdf size={24} color="#f44336" />;
    }
    if (
      contentType?.includes("image") ||
      filename?.match(/\.(jpg|jpeg|png|gif)$/i)
    ) {
      return <MdImage size={24} color="#4caf50" />;
    }
    return <MdDescription size={24} color="#1976d2" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 3, 
          fontWeight: 800,
          letterSpacing: "-0.5px",
          color: "text.primary"
        }}
      >
        Documents
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "16px" }}>
          {error}
        </Alert>
      )}

      {documents.length === 0 ? (
        <Paper 
          elevation={0}
          sx={{ 
            p: 6, 
            textAlign: "center", 
            borderRadius: "24px",
            border: "2px dashed",
            borderColor: "divider",
            bgcolor: "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2
          }}
        >
          <MdDescription size={48} color="#ccc" />
          <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
            Aucun document disponible
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {documents.map((doc) => (
            <Paper 
              key={doc.id} 
              elevation={0}
              sx={{ 
                p: 2,
                borderRadius: "24px",
                border: "1px solid",
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                gap: 2,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                bgcolor: "background.paper",
                "&:active": {
                  transform: "scale(0.98)",
                  bgcolor: "grey.50"
                },
                boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "18px",
                  bgcolor: "grey.50",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid",
                  borderColor: "divider"
                }}
              >
                {getFileIcon(doc.content_type, doc.filename)}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ 
                    fontWeight: 900, 
                    lineHeight: 1.2,
                    mb: 0.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "text.primary",
                    fontSize: "0.95rem"
                  }}
                >
                  {doc.filename}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: "0.7rem" }}>
                    {formatDate(doc.created_at)} • {formatFileSize(doc.size)}
                  </Typography>
                  {doc.category_display && (
                    <Box sx={{ 
                      px: 1, 
                      py: 0.2, 
                      borderRadius: "6px", 
                      bgcolor: "primary.50", 
                      color: "primary.main"
                    }}>
                      <Typography variant="caption" sx={{ fontWeight: 900, fontSize: "0.6rem", textTransform: "uppercase" }}>
                        {doc.category_display}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              <IconButton
                onClick={() => handleDownload(doc)}
                sx={{ 
                  bgcolor: "primary.50",
                  color: "primary.main",
                  width: 48,
                  height: 48,
                  borderRadius: "16px",
                  "&:hover": { bgcolor: "primary.100" },
                  transition: "all 0.2s"
                }}
              >
                <MdDownload size={24} />
              </IconButton>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default DocumentsTab;
