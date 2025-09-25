import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Fab,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  SwipeableDrawer,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert
} from '@mui/material';
import {
  HomeIcon,
  FolderIcon,
  UploadIcon,
  SearchIcon,
  MenuIcon,
  RefreshIcon,
  AddIcon,
  CreateNewFolderIcon,
  DownloadIcon,
  DeleteIcon,
  EditIcon,
  ShareIcon
} from '@mui/icons-material';

const MobileDrive = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // États
  const [currentPath, setCurrentPath] = useState("");
  const [folderContent, setFolderContent] = useState({ folders: [], files: [] });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [bottomNavValue, setBottomNavValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // Charger le contenu du dossier
  const fetchFolderContent = useCallback(async (folderPath = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (folderPath) params.append("folder_path", folderPath);
      params.append("page", "1");
      params.append("limit", "20"); // Moins d'éléments sur mobile
      params.append("sort_by", "name");
      params.append("sort_order", "asc");

      const response = await fetch(`/api/drive-complete/list-content/?${params}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");

      const data = await response.json();
      setFolderContent({
        folders: data.folders || [],
        files: data.files || [],
      });
      setCurrentPath(folderPath);
    } catch (error) {
      showSnackbar("Erreur lors du chargement", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Navigation
  const navigateToFolder = (folder) => {
    fetchFolderContent(folder.path);
  };

  const navigateUp = () => {
    if (currentPath) {
      const parentPath = currentPath.split('/').slice(0, -1).join('/');
      fetchFolderContent(parentPath);
    }
  };

  // Actions
  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleUpload = () => {
    // Ouvrir le sélecteur de fichiers
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      // Logique d'upload ici
      showSnackbar(`${files.length} fichier(s) sélectionné(s)`, "info");
    };
    input.click();
  };

  const handleCreateFolder = () => {
    const folderName = prompt("Nom du dossier :");
    if (folderName) {
      showSnackbar(`Dossier "${folderName}" créé`, "success");
    }
  };

  // Chargement initial
  useEffect(() => {
    fetchFolderContent("");
  }, [fetchFolderContent]);

  // Breadcrumb simplifié
  const getBreadcrumb = () => {
    if (!currentPath) return "Drive";
    const parts = currentPath.split('/').filter(Boolean);
    return parts.length > 2 ? `.../${parts.slice(-2).join('/')}` : currentPath;
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default'
    }}>
      {/* AppBar mobile */}
      <AppBar position="sticky" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1.1rem' }}>
            {getBreadcrumb()}
          </Typography>
          
          <IconButton color="inherit" onClick={() => fetchFolderContent(currentPath)}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Contenu principal */}
      <Box sx={{ flex: 1, overflow: 'auto', pb: 7 }}>
        {/* Dossiers */}
        {folderContent.folders.length > 0 && (
          <List>
            {folderContent.folders.map((folder, index) => (
              <ListItem
                key={index}
                button
                onClick={() => navigateToFolder(folder)}
                sx={{ 
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  py: 1.5
                }}
              >
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                    <FolderIcon />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={folder.name.replace(/[_-]/g, ' ')}
                  secondary="Dossier"
                  primaryTypographyProps={{ fontSize: '1rem', fontWeight: 500 }}
                />
                <Chip label="📁" size="small" />
              </ListItem>
            ))}
          </List>
        )}

        {/* Fichiers */}
        {folderContent.files.length > 0 && (
          <List>
            {folderContent.files.map((file, index) => (
              <ListItem
                key={index}
                sx={{ 
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  py: 1.5
                }}
              >
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 40, height: 40 }}>
                    📄
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={file.name.replace(/[_-]/g, ' ')}
                  secondary={`${(file.size / 1024).toFixed(1)} KB`}
                  primaryTypographyProps={{ fontSize: '1rem', fontWeight: 500 }}
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" color="primary">
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="secondary">
                    <ShareIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        )}

        {/* Message vide */}
        {folderContent.folders.length === 0 && folderContent.files.length === 0 && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '50vh',
            textAlign: 'center',
            px: 3
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Dossier vide
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Glissez-déposez des fichiers ou créez un dossier
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bottom Navigation */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
        <BottomNavigation
          value={bottomNavValue}
          onChange={(event, newValue) => setBottomNavValue(newValue)}
        >
          <BottomNavigationAction
            label="Accueil"
            icon={<HomeIcon />}
            onClick={() => fetchFolderContent("")}
          />
          <BottomNavigationAction
            label="Rechercher"
            icon={<SearchIcon />}
          />
          <BottomNavigationAction
            label="Upload"
            icon={<UploadIcon />}
            onClick={handleUpload}
          />
        </BottomNavigation>
      </Paper>

      {/* FAB pour actions rapides */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 1000
        }}
        onClick={handleCreateFolder}
      >
        <AddIcon />
      </Fab>

      {/* Drawer latéral */}
      <SwipeableDrawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
      >
        <Box sx={{ width: 280, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Navigation
          </Typography>
          <List>
            <ListItem button onClick={() => { fetchFolderContent(""); setDrawerOpen(false); }}>
              <ListItemIcon><HomeIcon /></ListItemIcon>
              <ListItemText primary="Accueil" />
            </ListItem>
            <ListItem button onClick={() => { setDrawerOpen(false); }}>
              <ListItemIcon><SearchIcon /></ListItemIcon>
              <ListItemText primary="Rechercher" />
            </ListItem>
            <ListItem button onClick={() => { handleUpload(); setDrawerOpen(false); }}>
              <ListItemIcon><UploadIcon /></ListItemIcon>
              <ListItemText primary="Upload" />
            </ListItem>
            <ListItem button onClick={() => { handleCreateFolder(); setDrawerOpen(false); }}>
              <ListItemIcon><CreateNewFolderIcon /></ListItemIcon>
              <ListItemText primary="Nouveau dossier" />
            </ListItem>
          </List>
        </Box>
      </SwipeableDrawer>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MobileDrive;
