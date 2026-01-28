import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Container,
} from "@mui/material";
import { Visibility, VisibilityOff, Person, Lock } from "@mui/icons-material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import logo from "../img/apple-touch-icon.png";

// Thème mobile optimisé
const mobileTheme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: "16px",
          fontSize: "1rem",
          textTransform: "none",
          borderRadius: "12px",
          fontWeight: 600,
          minHeight: 52, // Touch-friendly
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: "20px",
          "& .MuiOutlinedInput-root": {
            borderRadius: "12px",
            fontSize: "16px", // Évite le zoom sur iOS
          },
        },
      },
    },
  },
});

const LoginMobile = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Ajuster le body pour plein écran mobile
  useEffect(() => {
    const originalStyle = {
      margin: document.body.style.margin,
      padding: document.body.style.padding,
      overflow: document.body.style.overflow,
    };

    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.margin = originalStyle.margin;
      document.body.style.padding = originalStyle.padding;
      document.body.style.overflow = originalStyle.overflow;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        // Appeler le callback pour mettre à jour l'état d'authentification
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
        // Rediriger vers la page distributeurs sur mobile
        navigate("/distributeurs");
      } else {
        setError(data.error || "Identifiants incorrects");
      }
    } catch (err) {
      setError("Erreur de connexion. Vérifiez votre connexion internet.");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <ThemeProvider theme={mobileTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "background.default",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          px: 2,
          py: 4,
        }}
      >
        <Container
          maxWidth="sm"
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              mb: 4,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <img
              src={logo}
              alt="MJR SERVICES"
              style={{
                width: "120px",
                height: "120px",
                objectFit: "contain",
              }}
            />
          </Box>

          {/* Titre */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 1,
              textAlign: "center",
              color: "text.primary",
            }}
          >
            MJR SERVICES
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mb: 4,
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            Gestion des distributeurs automatiques
          </Typography>

          {/* Formulaire */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              width: "100%",
              maxWidth: 400,
            }}
          >
            {/* Message d'erreur */}
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {/* Champ nom d'utilisateur */}
            <TextField
              required
              fullWidth
              id="username"
              label="Nom d'utilisateur"
              name="username"
              placeholder="Votre nom d'utilisateur"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Champ mot de passe */}
            <TextField
              required
              fullWidth
              name="password"
              label="Mot de passe"
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            {/* Bouton de connexion */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !formData.username || !formData.password}
              sx={{
                mb: 2,
                py: 1.5,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Se connecter"
              )}
            </Button>

            {/* Message d'aide */}
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 3 }}
            >
              Contactez l'administrateur pour obtenir vos identifiants
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default LoginMobile;
