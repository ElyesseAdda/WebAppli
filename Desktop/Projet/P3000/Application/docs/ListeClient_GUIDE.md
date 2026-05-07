# Guide de recréation : Composant `ListeClient` (Gestion Clients / Sociétés)

Ce document décrit **intégralement** le composant `ListeClient` et tout son écosystème (frontend + backend) pour qu'une IA puisse le recréer à l'identique dans une nouvelle application React + Django REST Framework.

---

## Table des matières

1. [Vue d'ensemble fonctionnelle](#1-vue-densemble-fonctionnelle)
2. [Stack technique](#2-stack-technique)
3. [Dépendances npm à installer](#3-dépendances-npm-à-installer)
4. [Constantes de couleurs](#4-constantes-de-couleurs-srcconstantscolorsjs)
5. [Backend Django — Modèles](#5-backend-django--modèles)
6. [Backend Django — Serializers](#6-backend-django--serializers)
7. [Backend Django — ViewSets & actions custom](#7-backend-django--viewsets--actions-custom)
8. [Backend Django — URLs](#8-backend-django--urls)
9. [Backend Django — Stockage S3 (logos)](#9-backend-django--stockage-s3-logos)
10. [Frontend — Composant `ListeClient.js` complet](#10-frontend--composant-listeclientjs-complet)
11. [Comportement détaillé fonction par fonction](#11-comportement-détaillé-fonction-par-fonction)
12. [Structure des données (API)](#12-structure-des-données-api)
13. [Points d'attention et erreurs fréquentes](#13-points-dattention-et-erreurs-fréquentes)

---

## 1. Vue d'ensemble fonctionnelle

Le composant `ListeClient` est une page de **gestion CRUD des sociétés clientes**.

### Ce qu'il fait :
- **Liste** toutes les sociétés dans un tableau MUI avec leurs informations et leur logo
- **Crée** une nouvelle société via une modale (Dialog MUI)
- **Modifie** une société existante via la même modale
- **Supprime** une société (avec confirmation `window.confirm`)
- **Upload un logo** pour chaque société : sélection de fichier image → recadrage interactif (crop) → upload en multipart vers l'API → stockage sur S3
- **Supprime le logo** d'une société
- Affiche des **notifications** (Snackbar MUI) pour chaque action

### Relations :
- Une `Societe` est liée à un `Client` (FK obligatoire)
- La liste des clients est chargée en parallèle pour peupler le `<Select>` dans le formulaire

---

## 2. Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, MUI v5, react-icons, react-easy-crop, axios |
| Backend | Django 4.x, Django REST Framework |
| Stockage logos | AWS S3 (via boto3) avec URLs présignées |
| Routing API | DRF Router + actions custom (`@action`) |

---

## 3. Dépendances npm à installer

```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install react-icons
npm install react-easy-crop
npm install axios
```

### Versions minimales recommandées :
```json
{
  "@mui/material": "^5.x",
  "react-icons": "^5.x",
  "react-easy-crop": "^5.x",
  "axios": "^1.x"
}
```

> **Important** : `react-easy-crop` est **indispensable** pour la fonctionnalité de recadrage de logo. Sans ce package, le composant ne compilera pas.

---

## 4. Constantes de couleurs (`src/constants/colors.js`)

Créer ce fichier pour centraliser la palette de couleurs de l'application :

```js
export const COLORS = {
  primary: '#001514',
  primaryDark: '#000d0c',
  primaryLight: '#002a28',

  progress: '#46acc2',
  progressDark: '#3a8fa5',
  progressLight: '#6bbdd4',

  textOnDark: '#fcfcfc',

  secondary: '#CAC4CE',
  secondaryDark: '#B5AEB9',
  secondaryLight: '#DDD9DF',

  accent: '#46acc2',
  accentDark: '#3a8fa5',
  accentLight: '#6bbdd4',

  success: '#4CAF50',
  successDark: '#2e7d32',
  successLight: '#81c784',

  error: '#f15152',
  errorDark: '#d94546',
  errorLight: '#f37374',

  warning: '#46acc2',
  info: '#46acc2',
  infoDark: '#3a8fa5',

  text: '#001514',
  textMuted: '#333333',
  textLight: '#666666',

  border: '#dee2e6',
  borderLight: '#e5e7eb',
  borderDark: '#001514',

  background: '#ffffff',
  backgroundAlt: '#f8f9fa',
  backgroundHover: '#f3f4f6',
  backgroundDark: '#e9ecef',

  white: '#ffffff',
  black: '#000000',

  actionButtonInfo: '#1976d2',
  actionButtonInfoHover: '#1565c0',
  actionButtonSuccess: '#2e7d32',
  actionButtonSuccessHover: '#1b5e20',
  actionButtonWarning: '#FF9800',
  actionButtonWarningHover: '#ef6c00',
  actionButtonDark: '#333333',
  actionButtonAccent: '#E53D00',
  actionButtonAccentHover: '#CC3600',
};

export default COLORS;
```

---

## 5. Backend Django — Modèles

### `models.py`

```python
from django.db import models
from django.core.validators import RegexValidator


class Client(models.Model):
    CIVILITE_CHOICES = [
        ('', ''),
        ('M.', 'Monsieur'),
        ('Mme', 'Madame'),
        ('Mlle', 'Mademoiselle'),
    ]

    civilite = models.CharField(
        max_length=10, choices=CIVILITE_CHOICES,
        blank=True, default='', verbose_name="Civilité"
    )
    name = models.CharField(max_length=100)
    surname = models.CharField(max_length=25)
    client_mail = models.EmailField()
    phone_Number = models.IntegerField()
    poste = models.CharField(max_length=100, blank=True, default='', verbose_name="Poste")

    def __str__(self):
        civilite_display = f"{self.civilite} " if self.civilite else ""
        return f"{civilite_display}{self.name} {self.surname}"


class Societe(models.Model):
    nom_societe = models.CharField(max_length=100)
    ville_societe = models.CharField(max_length=100, blank=True, default="")
    rue_societe = models.CharField(max_length=100, blank=True, default="")
    codepostal_societe = models.CharField(
        max_length=10,
        validators=[RegexValidator(
            regex=r'^\d{5}$',
            message='Le code postal doit être exactement 5 chiffres.',
            code='invalid_codepostal'
        )],
        blank=True, null=True
    )
    # FK vers Client (obligatoire — on_delete=CASCADE)
    client_name = models.ForeignKey(Client, on_delete=models.CASCADE)
    # Clé S3 du logo (chemin dans le bucket, pas l'URL)
    logo_s3_key = models.CharField(
        max_length=500, blank=True, null=True, verbose_name="Clé S3 du logo"
    )

    def __str__(self):
        return self.nom_societe
```

> **Note** : `client_name` est le nom du champ FK dans la base. Dans le serializer et le frontend, il est transmis comme un entier (l'ID du client).

### Migration à appliquer :
```bash
python manage.py makemigrations
python manage.py migrate
```

---

## 6. Backend Django — Serializers

### `serializers.py`

```python
from rest_framework import serializers
from .models import Client, Societe


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'


class SocieteSerializer(serializers.ModelSerializer):
    # Champ calculé : URL présignée S3 du logo (lecture seule)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Societe
        fields = '__all__'

    def get_logo_url(self, obj):
        """Génère une URL présignée S3 valable 1h si un logo existe."""
        if obj.logo_s3_key:
            try:
                from .utils import generate_presigned_url_for_display
                return generate_presigned_url_for_display(obj.logo_s3_key, expires_in=3600)
            except Exception:
                return None
        return None
```

---

## 7. Backend Django — ViewSets & actions custom

### `views.py`

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Client, Societe
from .serializers import ClientSerializer, SocieteSerializer
import uuid


class ClientViewSet(viewsets.ModelViewSet):
    """CRUD complet pour les clients."""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [AllowAny]  # Adapter selon votre système d'auth


class SocieteViewSet(viewsets.ModelViewSet):
    """CRUD complet pour les sociétés + actions logo."""
    queryset = Societe.objects.all()
    serializer_class = SocieteSerializer
    permission_classes = [AllowAny]  # Adapter selon votre système d'auth

    @action(detail=True, methods=['post'])
    def upload_logo(self, request, pk=None):
        """
        Upload d'un logo pour une société.
        Endpoint : POST /api/societe/{id}/upload_logo/
        Body : multipart/form-data avec le champ 'logo' (fichier image)
        Retourne : { success, logo_s3_key, logo_url }
        """
        societe = self.get_object()
        file = request.FILES.get('logo')
        if not file:
            return Response({'error': 'Fichier logo requis'}, status=400)

        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display

            if not is_s3_available():
                return Response({'error': 'S3 non disponible'}, status=503)

            # Génération d'une clé S3 unique
            ext = file.name.split('.')[-1] if '.' in file.name else 'png'
            s3_key = f"societes/logos/{societe.id}_{uuid.uuid4().hex[:8]}.{ext}"

            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()

            # Suppression de l'ancien logo S3 si existant
            if societe.logo_s3_key:
                try:
                    s3_client.delete_object(Bucket=bucket_name, Key=societe.logo_s3_key)
                except Exception:
                    pass

            # Upload du nouveau logo
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or 'image/png'
            )

            societe.logo_s3_key = s3_key
            societe.save()

            logo_url = generate_presigned_url_for_display(s3_key, expires_in=3600)
            return Response({'success': True, 'logo_s3_key': s3_key, 'logo_url': logo_url})

        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['delete'])
    def delete_logo(self, request, pk=None):
        """
        Suppression du logo d'une société.
        Endpoint : DELETE /api/societe/{id}/delete_logo/
        Retourne : { success: true }
        """
        societe = self.get_object()
        if not societe.logo_s3_key:
            return Response({'error': 'Aucun logo'}, status=400)

        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available
            if is_s3_available():
                s3_client = get_s3_client()
                bucket_name = get_s3_bucket_name()
                s3_client.delete_object(Bucket=bucket_name, Key=societe.logo_s3_key)
        except Exception:
            pass

        societe.logo_s3_key = None
        societe.save()
        return Response({'success': True})
```

---

## 8. Backend Django — URLs

### `urls.py`

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, SocieteViewSet

router = DefaultRouter()
router.register(r'client', ClientViewSet, basename='client')
router.register(r'societe', SocieteViewSet, basename='societe')

urlpatterns = [
    path('api/', include(router.urls)),
]
```

### Endpoints générés automatiquement :

| Méthode | URL | Action |
|---------|-----|--------|
| GET | `/api/client/` | Liste tous les clients |
| POST | `/api/client/` | Crée un client |
| GET | `/api/client/{id}/` | Détail d'un client |
| PUT | `/api/client/{id}/` | Modifie un client |
| DELETE | `/api/client/{id}/` | Supprime un client |
| GET | `/api/societe/` | Liste toutes les sociétés |
| POST | `/api/societe/` | Crée une société |
| GET | `/api/societe/{id}/` | Détail d'une société |
| PUT | `/api/societe/{id}/` | Modifie une société |
| DELETE | `/api/societe/{id}/` | Supprime une société |
| POST | `/api/societe/{id}/upload_logo/` | Upload logo (multipart) |
| DELETE | `/api/societe/{id}/delete_logo/` | Supprime le logo |

---

## 9. Backend Django — Stockage S3 (logos)

Créer un fichier `utils.py` dans l'app Django avec les fonctions utilitaires S3 :

```python
import boto3
from django.conf import settings


def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )


def get_s3_bucket_name():
    return settings.AWS_STORAGE_BUCKET_NAME


def is_s3_available():
    """Vérifie que les credentials S3 sont configurés."""
    return bool(
        getattr(settings, 'AWS_ACCESS_KEY_ID', None) and
        getattr(settings, 'AWS_SECRET_ACCESS_KEY', None) and
        getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
    )


def generate_presigned_url_for_display(s3_key, expires_in=3600):
    """Génère une URL présignée pour afficher un objet S3."""
    s3 = get_s3_client()
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': get_s3_bucket_name(), 'Key': s3_key},
        ExpiresIn=expires_in,
    )
    return url
```

### Variables d'environnement Django (`settings.py`) :

```python
AWS_ACCESS_KEY_ID = 'votre_access_key'
AWS_SECRET_ACCESS_KEY = 'votre_secret_key'
AWS_S3_REGION_NAME = 'eu-west-3'          # ou votre région
AWS_STORAGE_BUCKET_NAME = 'votre_bucket'
```

> **Alternative sans S3** : Si vous ne voulez pas utiliser S3, vous pouvez stocker les logos directement avec `ImageField` Django (FileSystem). Dans ce cas, modifiez `logo_s3_key` en `logo = models.ImageField(upload_to='logos/', blank=True, null=True)` et retournez `request.build_absolute_uri(obj.logo.url)` dans le serializer.

### Dépendance Python à installer :
```bash
pip install boto3
```

---

## 10. Frontend — Composant `ListeClient.js` complet

Placer ce fichier dans `src/components/ListeClient.js` :

```jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert, CircularProgress, Slider,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import {
  MdAdd, MdEdit, MdDelete, MdBusiness, MdImage, MdDeleteForever,
  MdCrop, MdZoomIn,
} from "react-icons/md";
import Cropper from "react-easy-crop";
import axios from "axios";
import { COLORS } from "../constants/colors";

// ─── Utilitaire : recadrage d'image via Canvas ─────────────────────────────
const createCroppedImage = (imageSrc, pixelCrop) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height
      );
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Canvas vide"));
        resolve(blob);
      }, "image/png", 1);
    };
    image.onerror = reject;
    image.crossOrigin = "anonymous";
    image.src = imageSrc;
  });
};

// ─── Composant principal ────────────────────────────────────────────────────
const ListeClient = () => {
  // État principal
  const [societes, setSocietes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal CRUD
  const [openModal, setOpenModal] = useState(false);
  const [editingSociete, setEditingSociete] = useState(null);
  const [formData, setFormData] = useState({
    nom_societe: "",
    ville_societe: "",
    rue_societe: "",
    codepostal_societe: "",
    client_name: "",   // ID entier du Client (FK)
  });

  // Données de référence
  const [clients, setClients] = useState([]);
  const [uploadingLogo, setUploadingLogo] = useState(null); // ID de la société en cours d'upload

  // Notifications
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Refs pour l'input fichier caché
  const fileInputRef = useRef(null);
  const logoTargetId = useRef(null); // Mémorise l'ID de la société cible du logo

  // État du crop (recadrage)
  const [cropDialog, setCropDialog] = useState(false);
  const [cropImage, setCropImage] = useState(null);     // DataURL de l'image à recadrer
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? `${client.name} ${client.surname}` : "-";
  };

  // ── Chargement des données ────────────────────────────────────────────────
  const fetchSocietes = useCallback(async () => {
    setLoading(true);
    try {
      const [socRes, clientRes] = await Promise.all([
        axios.get("/api/societe/"),
        axios.get("/api/client/"),
      ]);
      // Compatible avec pagination DRF (results) ou liste directe
      setSocietes(socRes.data?.results || socRes.data || []);
      setClients(clientRes.data?.results || clientRes.data || []);
    } catch (err) {
      showSnackbar("Erreur lors du chargement", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSocietes();
  }, [fetchSocietes]);

  // ── CRUD Société ──────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingSociete(null);
    setFormData({ nom_societe: "", ville_societe: "", rue_societe: "", codepostal_societe: "", client_name: "" });
    setOpenModal(true);
  };

  const handleOpenEdit = (societe) => {
    setEditingSociete(societe);
    setFormData({
      nom_societe: societe.nom_societe || "",
      ville_societe: societe.ville_societe || "",
      rue_societe: societe.rue_societe || "",
      codepostal_societe: societe.codepostal_societe || "",
      client_name: societe.client_name != null ? societe.client_name : "",
    });
    setOpenModal(true);
  };

  const buildSocietePayload = () => {
    const cp = formData.codepostal_societe.trim();
    return {
      nom_societe: formData.nom_societe.trim(),
      ville_societe: formData.ville_societe.trim(),
      rue_societe: formData.rue_societe.trim(),
      codepostal_societe: cp.length === 5 ? cp : null,
      client_name: formData.client_name,
    };
  };

  const formatSaveError = (err) => {
    const d = err.response?.data;
    if (!d) return "Erreur lors de la sauvegarde";
    if (typeof d === "string") return d;
    if (d.detail) return String(d.detail);
    const [field, messages] = Object.entries(d)[0] || [];
    if (field && messages != null) {
      const m = Array.isArray(messages) ? messages[0] : messages;
      return `${field}: ${m}`;
    }
    return "Erreur lors de la sauvegarde";
  };

  const handleSave = async () => {
    if (!formData.nom_societe.trim()) {
      showSnackbar("Le nom de la societe est requis", "error");
      return;
    }
    if (formData.client_name === "" || formData.client_name == null) {
      showSnackbar("Veuillez selectionner un client", "error");
      return;
    }
    const payload = buildSocietePayload();
    try {
      if (editingSociete) {
        await axios.put(`/api/societe/${editingSociete.id}/`, payload);
        showSnackbar("Societe mise a jour");
      } else {
        await axios.post("/api/societe/", payload);
        showSnackbar("Societe creee");
      }
      setOpenModal(false);
      fetchSocietes();
    } catch (err) {
      showSnackbar(formatSaveError(err), "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette societe ?")) return;
    try {
      await axios.delete(`/api/societe/${id}/`);
      showSnackbar("Societe supprimee");
      fetchSocietes();
    } catch {
      showSnackbar("Erreur lors de la suppression", "error");
    }
  };

  // ── Gestion logo ──────────────────────────────────────────────────────────
  const handleLogoClick = (societeId) => {
    logoTargetId.current = societeId;
    fileInputRef.current?.click();
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // Reset pour permettre de re-sélectionner le même fichier
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!cropImage || !croppedAreaPixels || !logoTargetId.current) return;
    const societeId = logoTargetId.current;
    setCropDialog(false);
    setUploadingLogo(societeId);
    try {
      const croppedBlob = await createCroppedImage(cropImage, croppedAreaPixels);
      const fd = new FormData();
      fd.append("logo", croppedBlob, "logo.png");
      await axios.post(`/api/societe/${societeId}/upload_logo/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showSnackbar("Logo mis a jour");
      fetchSocietes();
    } catch {
      showSnackbar("Erreur lors de l'upload du logo", "error");
    } finally {
      setUploadingLogo(null);
      setCropImage(null);
    }
  };

  const handleCropCancel = () => {
    setCropDialog(false);
    setCropImage(null);
  };

  const handleDeleteLogo = async (societeId) => {
    try {
      await axios.delete(`/api/societe/${societeId}/delete_logo/`);
      showSnackbar("Logo supprime");
      fetchSocietes();
    } catch {
      showSnackbar("Erreur lors de la suppression du logo", "error");
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      {/* Input fichier caché (déclenché programmatiquement) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoFileChange}
        style={{ display: "none" }}
      />

      {/* En-tête */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdBusiness size={32} color={COLORS.accent} />
          <Typography variant="h4" component="h1" sx={{ color: COLORS.textOnDark }}>
            Liste Client / Societes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<MdAdd />}
          onClick={handleOpenCreate}
          sx={{ backgroundColor: COLORS.infoDark, "&:hover": { backgroundColor: "#1565c0" } }}
        >
          Nouvelle societe
        </Button>
      </Box>

      {/* Tableau principal */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>Logo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Nom societe</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Ville</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Adresse</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Code postal</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : societes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary">Aucune societe</Typography>
                </TableCell>
              </TableRow>
            ) : (
              societes.map((societe) => (
                <TableRow key={societe.id} hover>

                  {/* Cellule Logo */}
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {uploadingLogo === societe.id ? (
                        <CircularProgress size={40} />
                      ) : societe.logo_s3_key ? (
                        // Logo existant : Avatar cliquable + bouton suppression
                        <Box sx={{ position: "relative" }}>
                          <Avatar
                            src={societe.logo_url || ""}
                            variant="rounded"
                            sx={{ width: 50, height: 50, cursor: "pointer", border: "2px solid #e0e0e0" }}
                            onClick={() => handleLogoClick(societe.id)}
                          >
                            <MdBusiness />
                          </Avatar>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteLogo(societe.id)}
                            sx={{
                              position: "absolute", top: -8, right: -8,
                              backgroundColor: "#fff", border: "1px solid #e0e0e0",
                              padding: "2px", "&:hover": { backgroundColor: "#ffebee" },
                            }}
                          >
                            <MdDeleteForever size={14} color="#c62828" />
                          </IconButton>
                        </Box>
                      ) : (
                        // Pas de logo : Avatar placeholder cliquable
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 50, height: 50, cursor: "pointer",
                            backgroundColor: "#f0f0f0", color: "#999",
                            border: "2px dashed #ccc",
                            "&:hover": { borderColor: COLORS.accent, color: COLORS.accent },
                          }}
                          onClick={() => handleLogoClick(societe.id)}
                        >
                          <MdImage size={24} />
                        </Avatar>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell sx={{ fontWeight: 600 }}>{societe.nom_societe}</TableCell>
                  <TableCell>{getClientName(societe.client_name)}</TableCell>
                  <TableCell>{societe.ville_societe || "-"}</TableCell>
                  <TableCell>{societe.rue_societe || "-"}</TableCell>
                  <TableCell>{societe.codepostal_societe || "-"}</TableCell>

                  {/* Actions */}
                  <TableCell sx={{ textAlign: "center", whiteSpace: "nowrap" }}>
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(societe)}>
                      <MdEdit />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(societe.id)}>
                      <MdDelete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Modal Créer / Modifier une société ── */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSociete ? "Modifier la societe" : "Nouvelle societe"}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth margin="normal" label="Nom de la societe *"
            value={formData.nom_societe}
            onChange={(e) => setFormData((p) => ({ ...p, nom_societe: e.target.value }))}
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="societe-client-label">Client *</InputLabel>
            <Select
              labelId="societe-client-label"
              label="Client *"
              value={formData.client_name === "" ? "" : formData.client_name}
              onChange={(e) => {
                const v = e.target.value;
                setFormData((p) => ({
                  ...p,
                  client_name: v === "" ? "" : Number(v),
                }));
              }}
            >
              <MenuItem value=""><em>Choisir un client</em></MenuItem>
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} {c.surname}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth margin="normal" label="Ville"
            value={formData.ville_societe}
            onChange={(e) => setFormData((p) => ({ ...p, ville_societe: e.target.value }))}
          />
          <TextField
            fullWidth margin="normal" label="Rue"
            value={formData.rue_societe}
            onChange={(e) => setFormData((p) => ({ ...p, rue_societe: e.target.value }))}
          />
          <TextField
            fullWidth margin="normal" label="Code postal"
            value={formData.codepostal_societe}
            onChange={(e) => setFormData((p) => ({ ...p, codepostal_societe: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingSociete ? "Mettre a jour" : "Creer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal Recadrage du logo ── */}
      <Dialog open={cropDialog} onClose={handleCropCancel} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdCrop size={22} /> Recadrer le logo
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {/* Zone de crop (hauteur fixe, fond sombre) */}
          <Box sx={{ position: "relative", width: "100%", height: 350, backgroundColor: "#333" }}>
            {cropImage && (
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={1}              // Carré (1:1)
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="rect"
                showGrid
              />
            )}
          </Box>
          {/* Slider de zoom */}
          <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <MdZoomIn size={22} color="#666" />
            <Slider
              value={zoom}
              min={1} max={4} step={0.1}
              onChange={(_, val) => setZoom(val)}
              sx={{ flex: 1 }}
            />
            <Typography variant="body2" sx={{ minWidth: 40, textAlign: "right" }}>
              {Math.round(zoom * 100)}%
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCropCancel}>Annuler</Button>
          <Button variant="contained" onClick={handleCropConfirm}>
            Valider et enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar notifications ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ListeClient;
```

---

## 11. Comportement détaillé fonction par fonction

### `fetchSocietes()`
- Appels parallèles `GET /api/societe/` et `GET /api/client/`
- Supporte les réponses paginées DRF (`{ results: [...] }`) et les listes directes
- Met à jour `societes` et `clients` dans l'état

### `handleOpenCreate()` / `handleOpenEdit(societe)`
- Réinitialise ou pré-remplit `formData`
- Ouvre la modale CRUD

### `handleSave()`
- Validation côté client : nom obligatoire + client sélectionné obligatoire
- `PUT /api/societe/{id}/` si modification, `POST /api/societe/` si création
- Gestion d'erreur : parse la réponse Django (champ invalide ou message global)

### `handleDelete(id)`
- Confirmation native `window.confirm`
- `DELETE /api/societe/{id}/`

### Flux upload logo (3 étapes) :
1. **`handleLogoClick(societeId)`** : mémorise la société cible et déclenche l'input file caché
2. **`handleLogoFileChange(e)`** : lit le fichier avec `FileReader`, affiche la modale de crop
3. **`handleCropConfirm()`** :
   - Appelle `createCroppedImage()` → rogne l'image via Canvas HTML → retourne un `Blob`
   - `POST /api/societe/{id}/upload_logo/` avec `FormData` multipart
   - Le backend upload sur S3 et sauvegarde la clé S3 en base

### `createCroppedImage(imageSrc, pixelCrop)`
- Fonction pure (Promise) qui utilise un `<canvas>` pour découper l'image
- Retourne un `Blob` PNG qualité 1 (maximum)
- `image.crossOrigin = "anonymous"` nécessaire pour les images provenant de domaines différents

---

## 12. Structure des données (API)

### Objet `Client` retourné par `GET /api/client/` :
```json
{
  "id": 1,
  "civilite": "M.",
  "name": "Jean",
  "surname": "Dupont",
  "client_mail": "jean.dupont@example.com",
  "phone_Number": 612345678,
  "poste": "Directeur"
}
```

### Objet `Societe` retourné par `GET /api/societe/` :
```json
{
  "id": 5,
  "nom_societe": "BTP Construction",
  "ville_societe": "Paris",
  "rue_societe": "12 rue de la Paix",
  "codepostal_societe": "75001",
  "client_name": 1,
  "logo_s3_key": "societes/logos/5_a3f2bc12.png",
  "logo_url": "https://s3.amazonaws.com/bucket/societes/logos/5_a3f2bc12.png?X-Amz-..."
}
```

> `logo_url` est calculé côté serializer (URL présignée S3, valable 1h). `logo_s3_key` est la clé de stockage brute.

### Payload `POST/PUT /api/societe/` :
```json
{
  "nom_societe": "BTP Construction",
  "ville_societe": "Paris",
  "rue_societe": "12 rue de la Paix",
  "codepostal_societe": "75001",
  "client_name": 1
}
```

### Upload logo `POST /api/societe/{id}/upload_logo/` :
- **Content-Type** : `multipart/form-data`
- **Champ** : `logo` (fichier image PNG)
- **Réponse** : `{ success: true, logo_s3_key: "...", logo_url: "..." }`

---

## 13. Points d'attention et erreurs fréquentes

### 1. `react-easy-crop` manquant
**Erreur Webpack** : `Can't resolve 'react-easy-crop'`
**Solution** : `npm install react-easy-crop`

### 2. Le champ `client_name` dans le formulaire
Le `<Select>` MUI peut retourner des chaînes vides ou des nombres. Le composant gère cela explicitement avec `Number(v)` lors de la sélection. Ne pas oublier de convertir.

### 3. Code postal : validation stricte
Le backend valide que `codepostal_societe` fait exactement 5 chiffres (regex Django). Le frontend envoie `null` si le champ est vide ou ne fait pas 5 caractères.

### 4. Logo : `logo_s3_key` vs `logo_url`
- **`logo_s3_key`** : chemin permanent en base (ex: `societes/logos/5_abc.png`)
- **`logo_url`** : URL présignée temporaire (expire en 1h), générée à chaque appel GET
- Utiliser `logo_url` pour afficher l'image dans l'`<Avatar>`

### 5. Input file caché + `ref`
Le pattern `fileInputRef.current?.click()` est utilisé pour déclencher la sélection de fichier sans bouton `<input type="file">` visible. `e.target.value = ""` est reset pour permettre de re-sélectionner le même fichier.

### 6. Axios et proxy
En développement, configurer le proxy dans `package.json` pour rediriger `/api/` vers le backend Django :
```json
{
  "proxy": "http://localhost:8000"
}
```

### 7. CORS Django
S'assurer que `django-cors-headers` est installé et configuré :
```python
# settings.py
INSTALLED_APPS = [..., "corsheaders"]
MIDDLEWARE = ["corsheaders.middleware.CorsMiddleware", ...]
CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]
```

### 8. Permissions DRF
Le code utilise `permission_classes = [AllowAny]`. En production, remplacer par `IsAuthenticated` ou un système de permissions personnalisé selon votre architecture d'authentification.
