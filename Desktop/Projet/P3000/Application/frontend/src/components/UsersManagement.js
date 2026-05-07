import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  InfoOutlined as InfoOutlinedIcon,
  LockReset as LockResetIcon,
  MoreVert as MoreVertIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  PersonOff as PersonOffIcon,
  PersonAdd as PersonAddIcon,
  PhoneAndroid as PhoneAndroidIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { Navigate } from "react-router-dom";
import axios from "../utils/axios";
import { useAuth, userHasAppAdminAccess } from "../hooks/useAuth";

const TAB_USERS = 0;
const TAB_EMETTEURS = 1;

const UsersManagement = () => {
  const { user: currentUser } = useAuth();
  const isSuperuser = Boolean(currentUser?.is_superuser);

  const [mainTab, setMainTab] = useState(TAB_USERS);
  const [userActionAnchor, setUserActionAnchor] = useState(null);
  const [userActionRow, setUserActionRow] = useState(null);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [emetteurs, setEmetteurs] = useState([]);
  const [emetteursLoading, setEmetteursLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createEmetteurLoading, setCreateEmetteurLoading] = useState(false);
  const [toggleEmetteurLoading, setToggleEmetteurLoading] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [mobileAccessDialogOpen, setMobileAccessDialogOpen] = useState(false);
  const [mobileAccessUser, setMobileAccessUser] = useState(null);
  const [mobileAccessLoading, setMobileAccessLoading] = useState(false);
  const [mobileAccessData, setMobileAccessData] = useState({
    can_access_rapports: false,
    can_access_distributeur: false,
    can_access_drive: false,
  });

  const [newEmetteurData, setNewEmetteurData] = useState({
    name: "",
    surname: "",
    email: "",
    phone_Number: "",
  });

  const generateRandomPassword = (length = 12) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < length; i += 1) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };
  const [newUserData, setNewUserData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    is_staff: false,
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/auth/users/");
      setUsers(response.data?.users || []);
      setFeedback({ type: "", message: "" });
    } catch (error) {
      const errorMessage = error?.response?.data?.error || "Impossible de charger les utilisateurs.";
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const loadEmetteurs = async () => {
    try {
      setEmetteursLoading(true);
      const response = await axios.get("/auth/emetteurs/");
      setEmetteurs(response.data?.emetteurs || []);
    } catch (error) {
      const errorMessage = error?.response?.data?.error || "Impossible de charger les émetteurs.";
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setEmetteursLoading(false);
    }
  };

  useEffect(() => {
    if (!userHasAppAdminAccess(currentUser)) {
      return;
    }
    loadUsers();
    loadEmetteurs();
  }, [currentUser]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => String(a.username || "").localeCompare(String(b.username || ""), "fr")),
    [users]
  );

  const handleToggleActive = async (user) => {
    try {
      setActionLoading(true);
      const response = await axios.post(`/auth/users/${user.id}/toggle-active/`);
      setFeedback({ type: "success", message: response.data?.message || "Statut utilisateur mis à jour." });
      await loadUsers();
    } catch (error) {
      const errorMessage = error?.response?.data?.error || "Erreur lors de la mise à jour du statut.";
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setActionLoading(false);
    }
  };

  const openResetPasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowResetPassword(false);
    setPasswordDialogOpen(true);
  };

  const closeResetPasswordDialog = () => {
    setPasswordDialogOpen(false);
    setSelectedUser(null);
    setNewPassword("");
    setShowResetPassword(false);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (!newPassword) {
      setFeedback({ type: "error", message: "Le nouveau mot de passe est requis." });
      return;
    }

    try {
      setActionLoading(true);
      const response = await axios.post(`/auth/users/${selectedUser.id}/reset-password/`, {
        new_password: newPassword,
      });
      setFeedback({ type: "success", message: response.data?.message || "Mot de passe réinitialisé." });
      closeResetPasswordDialog();
    } catch (error) {
      const errorMessage = error?.response?.data?.error || "Erreur lors de la réinitialisation du mot de passe.";
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUserField = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUserData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreateUser = async () => {
    if (!newUserData.username || !newUserData.password) {
      setFeedback({ type: "error", message: "Nom d'utilisateur et mot de passe requis." });
      return;
    }

    try {
      setCreateLoading(true);
      const response = await axios.post("/auth/create-user/", newUserData);
      setFeedback({
        type: "success",
        message: response.data?.message || "Utilisateur créé avec succès.",
      });
      setNewUserData({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        is_staff: false,
      });
      setShowCreatePassword(false);
      await loadUsers();
    } catch (error) {
      const errorMessage = error?.response?.data?.error || "Erreur lors de la création de l'utilisateur.";
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleGenerateCreatePassword = () => {
    const generated = generateRandomPassword();
    setNewUserData((prev) => ({
      ...prev,
      password: generated,
    }));
    setShowCreatePassword(true);
  };

  const handleGenerateResetPassword = () => {
    const generated = generateRandomPassword();
    setNewPassword(generated);
    setShowResetPassword(true);
  };

  const handleCreateEmetteurField = (e) => {
    const { name, value } = e.target;
    setNewEmetteurData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateEmetteur = async () => {
    if (!newEmetteurData.name || !newEmetteurData.surname || !newEmetteurData.email || !newEmetteurData.phone_Number) {
      setFeedback({ type: "error", message: "Tous les champs émetteur sont requis." });
      return;
    }

    try {
      setCreateEmetteurLoading(true);
      const response = await axios.post("/auth/emetteurs/", newEmetteurData);
      setFeedback({
        type: "success",
        message: response.data?.message || "Émetteur créé avec succès.",
      });
      setNewEmetteurData({
        name: "",
        surname: "",
        email: "",
        phone_Number: "",
      });
      await loadEmetteurs();
    } catch (error) {
      const errorMessage = error?.response?.data?.error || "Erreur lors de la création de l'émetteur.";
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setCreateEmetteurLoading(false);
    }
  };

  const handleToggleEmetteurActive = async (emetteur) => {
    try {
      setToggleEmetteurLoading(true);
      const response = await axios.post(`/auth/emetteurs/${emetteur.id}/toggle-active/`);
      setFeedback({ type: "success", message: response.data?.message || "Statut émetteur mis à jour." });
      await loadEmetteurs();
    } catch (error) {
      const errorMessage = error?.response?.data?.error || "Erreur lors de la mise à jour du statut émetteur.";
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setToggleEmetteurLoading(false);
    }
  };

  const canManageSimpleAccount = (row) =>
    isSuperuser || (!row.is_superuser && !row.is_staff);

  const canToggleAdminRole = (row) =>
    !row.is_superuser && row.id !== currentUser?.id;

  const handleToggleAdminRole = async (rowUser) => {
    try {
      setActionLoading(true);
      const response = await axios.post(`/auth/users/${rowUser.id}/toggle-staff/`);
      setFeedback({
        type: "success",
        message: response.data?.message || "Rôle administrateur mis à jour.",
      });
      await loadUsers();
    } catch (error) {
      const errorMessage = error?.response?.data?.error || "Erreur lors de la mise à jour du rôle administrateur.";
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setActionLoading(false);
    }
  };

  const openMobileAccessDialog = async (targetUser) => {
    setMobileAccessUser(targetUser);
    setMobileAccessLoading(true);
    setMobileAccessDialogOpen(true);
    try {
      const response = await axios.get(`/auth/users/${targetUser.id}/mobile-access/`);
      setMobileAccessData(response.data?.mobile_access ?? {
        can_access_rapports: false,
        can_access_distributeur: false,
        can_access_drive: false,
      });
    } catch (error) {
      setFeedback({ type: "error", message: "Impossible de charger les droits mobiles." });
      setMobileAccessDialogOpen(false);
    } finally {
      setMobileAccessLoading(false);
    }
  };

  const closeMobileAccessDialog = () => {
    setMobileAccessDialogOpen(false);
    setMobileAccessUser(null);
    setMobileAccessData({ can_access_rapports: false, can_access_distributeur: false, can_access_drive: false });
  };

  const handleSaveMobileAccess = async () => {
    if (!mobileAccessUser) return;
    try {
      setActionLoading(true);
      await axios.put(`/auth/users/${mobileAccessUser.id}/mobile-access/`, mobileAccessData);
      setFeedback({ type: "success", message: "Droits mobiles mis à jour." });
      closeMobileAccessDialog();
      await loadUsers();
    } catch (error) {
      const errorMessage = error?.response?.data?.error || "Erreur lors de la mise à jour des droits mobiles.";
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setActionLoading(false);
    }
  };

  const openUserActionMenu = (event, row) => {
    setUserActionAnchor(event.currentTarget);
    setUserActionRow(row);
  };

  const closeUserActionMenu = () => {
    setUserActionAnchor(null);
    setUserActionRow(null);
  };

  const runFromUserMenu = (fn) => {
    if (!userActionRow) return;
    const row = userActionRow;
    closeUserActionMenu();
    fn(row);
  };

  const helpTooltipText =
    "Comptes : activer ou désactiver, réinitialiser le mot de passe, gérer le rôle administrateur (menu latéral Admin). " +
    "Les comptes superutilisateur ne sont pas modifiables ici. " +
    "Sans droit superuser, vous ne gérez que les utilisateurs sans rôle administrateur.";

  if (!currentUser) {
    return null;
  }
  if (!userHasAppAdminAccess(currentUser)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: "lg", mx: "auto" }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Gestion des utilisateurs
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Comptes applicatifs et émetteurs des bons de commande.
          </Typography>
        </Box>
        <Tooltip title={helpTooltipText} placement="left" arrow enterTouchDelay={0}>
          <IconButton aria-label="Aide sur cette page" size="small" sx={{ mt: 0.5 }}>
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Paper elevation={0} variant="outlined" sx={{ borderRadius: 1, overflow: "hidden" }}>
        <Tabs
          value={mainTab}
          onChange={(_, v) => setMainTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
          aria-label="Sections gestion"
        >
          <Tab label="Utilisateurs" id="users-management-tab-users" aria-controls="users-management-panel-users" />
          <Tab
            label="Émetteurs"
            id="users-management-tab-emetteurs"
            aria-controls="users-management-panel-emetteurs"
          />
        </Tabs>

        {feedback.message ? (
          <Box sx={{ px: 2, pt: 2 }}>
            <Alert severity={feedback.type || "info"} onClose={() => setFeedback({ type: "", message: "" })}>
              {feedback.message}
            </Alert>
          </Box>
        ) : null}

        <Divider />

        <Box
          role="tabpanel"
          id="users-management-panel-users"
          aria-labelledby="users-management-tab-users"
          hidden={mainTab !== TAB_USERS}
          sx={{ p: 2, display: mainTab === TAB_USERS ? "block" : "none" }}
        >
          <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1, mb: 2, "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="create-user-content" id="create-user-header">
              <Typography fontWeight={600}>Créer un utilisateur</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.5 }}>
                <TextField
                  label="Nom d'utilisateur"
                  name="username"
                  value={newUserData.username}
                  onChange={handleCreateUserField}
                  required
                  size="small"
                />
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <TextField
                    label="Mot de passe"
                    name="password"
                    type={showCreatePassword ? "text" : "password"}
                    value={newUserData.password}
                    onChange={handleCreateUserField}
                    required
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowCreatePassword((prev) => !prev)}
                            edge="end"
                            aria-label="Afficher ou masquer le mot de passe"
                            size="small"
                          >
                            {showCreatePassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button variant="outlined" onClick={handleGenerateCreatePassword} size="small" sx={{ flexShrink: 0, mt: 0.5 }}>
                    Générer
                  </Button>
                </Box>
                <TextField
                  label="Prénom"
                  name="first_name"
                  value={newUserData.first_name}
                  onChange={handleCreateUserField}
                  size="small"
                />
                <TextField
                  label="Nom"
                  name="last_name"
                  value={newUserData.last_name}
                  onChange={handleCreateUserField}
                  size="small"
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={newUserData.email}
                  onChange={handleCreateUserField}
                  size="small"
                />
                <FormControlLabel
                  sx={{ alignSelf: "center" }}
                  control={
                    <Checkbox
                      name="is_staff"
                      checked={newUserData.is_staff}
                      onChange={handleCreateUserField}
                      disabled={!isSuperuser}
                      size="small"
                    />
                  }
                  label="Rôle administrateur à la création"
                />
              </Box>
              {!isSuperuser && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  Seul un superutilisateur peut cocher cette case ; vous pouvez promouvoir un utilisateur depuis le tableau.
                </Typography>
              )}
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={handleCreateUser} disabled={createLoading}>
                  {createLoading ? "Création…" : "Créer l'utilisateur"}
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Utilisateur</TableCell>
                    <TableCell>Nom</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right" width={56}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || "—"}</TableCell>
                      <TableCell>{user.email || "—"}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {user.is_superuser && <Chip size="small" color="error" label="Superuser" />}
                          {user.is_staff && !user.is_superuser && <Chip size="small" color="primary" label="Admin" />}
                          {!user.is_staff && !user.is_superuser && <Chip size="small" label="Utilisateur" />}
                          {!user.is_superuser && !user.is_staff && user.mobile_access && (
                            <Tooltip
                              title={[
                                user.mobile_access.can_access_rapports ? "Rapports" : null,
                                user.mobile_access.can_access_distributeur ? "Distributeur" : null,
                                user.mobile_access.can_access_drive ? "Drive" : null,
                              ].filter(Boolean).join(", ") || "Aucun accès mobile"}
                              placement="top"
                            >
                              <Chip
                                size="small"
                                icon={<PhoneAndroidIcon style={{ fontSize: 12 }} />}
                                label={[
                                  user.mobile_access.can_access_rapports ? "R" : null,
                                  user.mobile_access.can_access_distributeur ? "D" : null,
                                  user.mobile_access.can_access_drive ? "Drive" : null,
                                ].filter(Boolean).join("/") || "—"}
                                color={
                                  user.mobile_access.can_access_rapports ||
                                  user.mobile_access.can_access_distributeur ||
                                  user.mobile_access.can_access_drive
                                    ? "info"
                                    : "default"
                                }
                                variant="outlined"
                              />
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Chip size="small" color="success" label="Actif" />
                        ) : (
                          <Chip size="small" color="default" label="Inactif" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Actions sur ce compte">
                          <span>
                            <IconButton
                              size="small"
                              aria-label={`Actions pour ${user.username}`}
                              onClick={(e) => openUserActionMenu(e, user)}
                              disabled={actionLoading}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        Aucun utilisateur trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        <Box
          role="tabpanel"
          id="users-management-panel-emetteurs"
          aria-labelledby="users-management-tab-emetteurs"
          hidden={mainTab !== TAB_EMETTEURS}
          sx={{ p: 2, display: mainTab === TAB_EMETTEURS ? "block" : "none" }}
        >
          <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1, mb: 2, "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="create-emetteur-content" id="create-emetteur-header">
              <Stack direction="row" alignItems="center" spacing={1} sx={{ pr: 1 }}>
                <Typography fontWeight={600}>Ajouter un émetteur</Typography>
                <Typography variant="caption" color="text.secondary">
                  (bons de commande)
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.5 }}>
                <TextField
                  label="Prénom"
                  name="name"
                  value={newEmetteurData.name}
                  onChange={handleCreateEmetteurField}
                  required
                  size="small"
                />
                <TextField
                  label="Nom"
                  name="surname"
                  value={newEmetteurData.surname}
                  onChange={handleCreateEmetteurField}
                  required
                  size="small"
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={newEmetteurData.email}
                  onChange={handleCreateEmetteurField}
                  required
                  size="small"
                />
                <TextField
                  label="Téléphone"
                  name="phone_Number"
                  value={newEmetteurData.phone_Number}
                  onChange={handleCreateEmetteurField}
                  required
                  size="small"
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={handleCreateEmetteur} disabled={createEmetteurLoading}>
                  {createEmetteurLoading ? "Création…" : "Ajouter l'émetteur"}
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>

          {emetteursLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nom complet</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Téléphone</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {emetteurs.map((emetteur) => (
                    <TableRow key={emetteur.id} hover>
                      <TableCell>{`${emetteur.name || ""} ${emetteur.surname || ""}`.trim()}</TableCell>
                      <TableCell>{emetteur.email || "—"}</TableCell>
                      <TableCell>{emetteur.phone_Number || "—"}</TableCell>
                      <TableCell>
                        {emetteur.is_active ? (
                          <Chip size="small" color="success" label="Actif" />
                        ) : (
                          <Chip size="small" color="default" label="Inactif" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={emetteur.is_active ? "Désactiver cet émetteur" : "Activer cet émetteur"}>
                          <span>
                            <IconButton
                              size="small"
                              color={emetteur.is_active ? "warning" : "success"}
                              aria-label={emetteur.is_active ? "Désactiver" : "Activer"}
                              onClick={() => handleToggleEmetteurActive(emetteur)}
                              disabled={toggleEmetteurLoading}
                            >
                              {emetteur.is_active ? <PersonOffIcon fontSize="small" /> : <PersonAddIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {emetteurs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Aucun émetteur trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      <Menu anchorEl={userActionAnchor} open={Boolean(userActionAnchor)} onClose={closeUserActionMenu} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        {userActionRow && (
          <>
            <MenuItem
              disabled={actionLoading || !canToggleAdminRole(userActionRow)}
              onClick={() => runFromUserMenu((row) => handleToggleAdminRole(row))}
            >
              <ListItemIcon>
                <AdminPanelSettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  userActionRow.is_superuser
                    ? "Superuser (non modifiable)"
                    : userActionRow.is_staff && !userActionRow.is_superuser
                      ? "Retirer le rôle admin"
                      : "Donner le rôle admin"
                }
              />
            </MenuItem>
            <MenuItem
              disabled={actionLoading || !canManageSimpleAccount(userActionRow)}
              onClick={() => runFromUserMenu((row) => handleToggleActive(row))}
            >
              <ListItemIcon>
                {userActionRow.is_active ? <PersonOffIcon fontSize="small" /> : <PersonAddIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText primary={userActionRow.is_active ? "Désactiver le compte" : "Activer le compte"} />
            </MenuItem>
            <MenuItem
              disabled={actionLoading || !canManageSimpleAccount(userActionRow)}
              onClick={() => runFromUserMenu((row) => openResetPasswordDialog(row))}
            >
              <ListItemIcon>
                <LockResetIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Réinitialiser le mot de passe" />
            </MenuItem>
            {!userActionRow.is_superuser && !userActionRow.is_staff && (
              <MenuItem
                disabled={actionLoading}
                onClick={() => runFromUserMenu((row) => openMobileAccessDialog(row))}
              >
                <ListItemIcon>
                  <PhoneAndroidIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Accès mobile (PWA)" />
              </MenuItem>
            )}
          </>
        )}
      </Menu>

      <Dialog open={mobileAccessDialogOpen} onClose={closeMobileAccessDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PhoneAndroidIcon color="primary" />
            <span>Accès mobile (PWA)</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {mobileAccessLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Sections accessibles pour <strong>{mobileAccessUser?.username || "—"}</strong> sur l'application mobile.
              </Typography>
              <Stack spacing={1}>
                {[
                  { key: "can_access_rapports", label: "Rapports d'intervention" },
                  { key: "can_access_distributeur", label: "Distributeur" },
                  { key: "can_access_drive", label: "Drive" },
                ].map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Switch
                        checked={Boolean(mobileAccessData[key])}
                        onChange={(e) =>
                          setMobileAccessData((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                        size="small"
                      />
                    }
                    label={label}
                  />
                ))}
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMobileAccessDialog}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveMobileAccess} disabled={actionLoading || mobileAccessLoading}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordDialogOpen} onClose={closeResetPasswordDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Utilisateur cible : <strong>{selectedUser?.username || "—"}</strong>
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Nouveau mot de passe"
              type={showResetPassword ? "text" : "password"}
              fullWidth
              size="small"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowResetPassword((prev) => !prev)}
                      edge="end"
                      aria-label="Afficher ou masquer le mot de passe"
                      size="small"
                    >
                      {showResetPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="outlined" onClick={handleGenerateResetPassword} size="small" sx={{ flexShrink: 0, mt: 0.5 }}>
              Générer
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeResetPasswordDialog}>Annuler</Button>
          <Button variant="contained" onClick={handleResetPassword} disabled={actionLoading}>
            Valider
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersManagement;
