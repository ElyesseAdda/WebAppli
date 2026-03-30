import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import axios from "../utils/axios";

const UsersManagement = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

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

  useEffect(() => {
    loadUsers();
  }, []);

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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Gestion des utilisateurs
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Interface administrateur pour activer/desactiver des comptes et reinitialiser les mots de passe.
      </Typography>

      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Creer un utilisateur
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.5 }}>
          <TextField
            label="Nom d'utilisateur"
            name="username"
            value={newUserData.username}
            onChange={handleCreateUserField}
            required
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Mot de passe"
              name="password"
              type={showCreatePassword ? "text" : "password"}
              value={newUserData.password}
              onChange={handleCreateUserField}
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCreatePassword((prev) => !prev)}
                      edge="end"
                      aria-label="Afficher ou masquer le mot de passe"
                    >
                      {showCreatePassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="outlined" onClick={handleGenerateCreatePassword}>
              Générer
            </Button>
          </Box>
          <TextField
            label="Prenom"
            name="first_name"
            value={newUserData.first_name}
            onChange={handleCreateUserField}
          />
          <TextField
            label="Nom"
            name="last_name"
            value={newUserData.last_name}
            onChange={handleCreateUserField}
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={newUserData.email}
            onChange={handleCreateUserField}
          />
          <FormControlLabel
            control={
              <Checkbox
                name="is_staff"
                checked={newUserData.is_staff}
                onChange={handleCreateUserField}
              />
            }
            label="Acces staff"
          />
        </Box>
        <Box sx={{ mt: 1.5 }}>
          <Button variant="contained" onClick={handleCreateUser} disabled={createLoading}>
            {createLoading ? "Creation..." : "Creer l'utilisateur"}
          </Button>
        </Box>
      </Paper>

      {feedback.message && (
        <Alert severity={feedback.type || "info"} sx={{ mb: 2 }} onClose={() => setFeedback({ type: "", message: "" })}>
          {feedback.message}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Nom</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || "-"}</TableCell>
                  <TableCell>{user.email || "-"}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {user.is_superuser && <Chip size="small" color="error" label="Superuser" />}
                      {user.is_staff && !user.is_superuser && <Chip size="small" color="primary" label="Staff" />}
                      {!user.is_staff && !user.is_superuser && <Chip size="small" label="Utilisateur" />}
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
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        color={user.is_active ? "warning" : "success"}
                        onClick={() => handleToggleActive(user)}
                        disabled={actionLoading}
                      >
                        {user.is_active ? "Desactiver" : "Activer"}
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => openResetPasswordDialog(user)}
                        disabled={actionLoading}
                      >
                        Reset mot de passe
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {sortedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Aucun utilisateur trouve
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={passwordDialogOpen} onClose={closeResetPasswordDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Reinitialiser le mot de passe</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Utilisateur cible : <strong>{selectedUser?.username || "-"}</strong>
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Nouveau mot de passe"
              type={showResetPassword ? "text" : "password"}
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowResetPassword((prev) => !prev)}
                      edge="end"
                      aria-label="Afficher ou masquer le mot de passe"
                    >
                      {showResetPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="outlined" onClick={handleGenerateResetPassword}>
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
