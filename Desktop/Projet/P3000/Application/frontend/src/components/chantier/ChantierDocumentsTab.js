import {
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Upload as UploadIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const DOCUMENT_CATEGORIES = [
  { value: "devis", label: "Devis" },
  { value: "facture", label: "Facture" },
  { value: "contrat", label: "Contrat" },
  { value: "photo", label: "Photo" },
  { value: "autre", label: "Autre" },
];

const ChantierDocumentsTab = ({ chantierData }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentInfo, setDocumentInfo] = useState({
    nom: "",
    description: "",
    categorie: "",
  });

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `/api/chantiers/${chantierData?.id}/documents/`
        );
        setDocuments(response.data);
      } catch (error) {
        console.error("Erreur lors du chargement des documents:", error);
        setError("Impossible de charger les documents. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    if (chantierData?.id) {
      fetchDocuments();
    }
  }, [chantierData?.id]);

  const getDocumentIcon = (type) => {
    switch (type) {
      case "pdf":
        return <PdfIcon color="error" />;
      case "image":
        return <ImageIcon color="primary" />;
      default:
        return <DescriptionIcon />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDownload = async (documentId) => {
    try {
      const response = await axios.get(
        `/api/documents/${documentId}/download/`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `document-${documentId}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
    }
  };

  const handleView = (documentId) => {
    window.open(`/api/documents/${documentId}/view/`, "_blank");
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setDocumentInfo((prev) => ({
        ...prev,
        nom: file.name,
      }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentInfo.nom || !documentInfo.categorie) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("nom", documentInfo.nom);
    formData.append("description", documentInfo.description);
    formData.append("categorie", documentInfo.categorie);
    formData.append("chantier", chantierData.id);

    try {
      const response = await axios.post("/api/documents/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setDocuments([...documents, response.data]);
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDocumentInfo({
        nom: "",
        description: "",
        categorie: "",
      });
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      alert("Erreur lors de l'upload du document");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">Documents du Chantier</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialogOpen(true)}
                >
                  Ajouter un document
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {documents.length === 0 ? (
                <Typography color="text.secondary">
                  Aucun document disponible
                </Typography>
              ) : (
                <List>
                  {documents.map((doc) => (
                    <React.Fragment key={doc.id}>
                      <ListItem>
                        <ListItemIcon>{getDocumentIcon(doc.type)}</ListItemIcon>
                        <ListItemText
                          primary={doc.nom}
                          secondary={`Ajouté le ${formatDate(
                            doc.date_ajout
                          )} - ${doc.description}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            aria-label="view"
                            onClick={() => handleView(doc.id)}
                            sx={{ mr: 1 }}
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            aria-label="download"
                            onClick={() => handleDownload(doc.id)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog pour l'upload de document */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
      >
        <DialogTitle>Ajouter un document</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              style={{ display: "none" }}
              id="document-upload"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="document-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                fullWidth
              >
                Sélectionner un fichier
              </Button>
            </label>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Fichier sélectionné: {selectedFile.name}
              </Typography>
            )}
          </Box>
          <TextField
            fullWidth
            label="Nom du document"
            value={documentInfo.nom}
            onChange={(e) =>
              setDocumentInfo({ ...documentInfo, nom: e.target.value })
            }
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={documentInfo.description}
            onChange={(e) =>
              setDocumentInfo({ ...documentInfo, description: e.target.value })
            }
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            select
            label="Catégorie"
            value={documentInfo.categorie}
            onChange={(e) =>
              setDocumentInfo({ ...documentInfo, categorie: e.target.value })
            }
            margin="normal"
            required
          >
            {DOCUMENT_CATEGORIES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleUpload} variant="contained" color="primary">
            Uploader
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChantierDocumentsTab;
