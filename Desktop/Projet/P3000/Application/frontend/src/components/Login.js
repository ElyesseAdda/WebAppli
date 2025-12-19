import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Checkbox, 
  FormControlLabel, 
  Link, 
  CssBaseline,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff, Person, Lock } from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import logo from '../img/logo.png';

// --- CONFIGURATION DU THÈME MUI ---
// Création d'un thème personnalisé pour intégrer les couleurs de Peinture 3000
const theme = createTheme({
  palette: {
    primary: {
      main: '#1E73BE', // Le bleu principal du logo
    },
    secondary: {
      main: '#CEDC00', // Le jaune du logo
    },
    text: {
      primary: '#2c3e50', // Texte sombre
      secondary: '#95a5a6', // Texte gris
    },
    background: {
      default: '#fdfdfd',
    }
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  components: {
    // Personnalisation globale des composants pour coller au design
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          fontSize: '1rem',
          textTransform: 'none', // Pas de MAJUSCULES forcées
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: '16px',
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
            borderRadius: '8px',
          }
        }
      }
    }
  }
});

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Neutraliser le padding-left du body pour la page de login
  useEffect(() => {
    const originalPaddingLeft = document.body.style.paddingLeft;
    const originalMaxWidth = document.body.style.maxWidth;
    
    document.body.style.paddingLeft = '0';
    document.body.style.maxWidth = 'none';
    
    return () => {
      document.body.style.paddingLeft = originalPaddingLeft;
      document.body.style.maxWidth = originalMaxWidth;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Effacer les messages d'erreur quand l'utilisateur tape
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Connexion réussie !');
        // Appeler la fonction de callback pour rediriger
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      } else {
        setError(data.error || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style>
        {`
          @keyframes shimmer {
            0% {
              background-position: 0% center;
            }
            50% {
              background-position: 100% center;
            }
            100% {
              background-position: 0% center;
            }
          }
        `}
      </style>
      <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
        
        {/* --- PARTIE GAUCHE : LA MARQUE (Bleu) --- */}
        <Grid 
          item 
          xs={12} 
          md={6} 
          sx={{
            // Dégradé identique à la version précédente
            background: 'linear-gradient(135deg, #1E73BE 0%, #16538a 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            position: 'relative',
            // Responsive : 35% de la hauteur sur mobile, 100% sur bureau
            height: { xs: '35vh', md: '100vh' },
            boxShadow: 6,
            zIndex: 10
          }}
        >
          <Box sx={{ 
            textAlign: 'center', 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            width: '100%'
          }}>
            {/* Logo */}
            <Box 
              sx={{ 
                mb: 4,
                maxWidth: { xs: 200, md: 350 },
                width: '100%',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <img 
                src={logo} 
                alt="Peinture 3000" 
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  objectFit: 'contain',
                  filter: 'brightness(0) invert(1)'
                }} 
              />
            </Box>

            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 700, 
                lineHeight: 1.2, 
                fontSize: { xs: '1.25rem', md: '2.5rem' },
                background: 'linear-gradient(90deg, #CEDC00 0%, #E8F500 50%, #CEDC00 100%)',
                backgroundSize: '200% auto',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 3s ease-in-out infinite',
                textShadow: '0 0 20px rgba(206, 220, 0, 0.3)',
              }}
            >
              Pilotage centralisé<br />de vos chantiers.
            </Typography>
            
            <Typography variant="subtitle1" sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600, fontSize: { xs: '0.875rem', md: '1.5rem' } }}>
              Suite de gestion administrative et technique
            </Typography>
          </Box>
        </Grid>

        {/* --- PARTIE DROITE : LE FORMULAIRE --- */}
        <Grid 
          item 
          xs={12} 
          md={6} 
          component={Box} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: { xs: '65vh', md: '100vh' }, // Prend le reste de la hauteur sur mobile
            overflowY: 'auto',
            bgcolor: 'background.default',
            p: { xs: 2, md: 8 }
          }}
        >
          <Box 
            sx={{ 
              width: '100%', 
              maxWidth: 400, 
              display: 'flex', 
              flexDirection: 'column' 
            }}
          >
            {/* En-tête du formulaire */}
            <Box sx={{ mb: 5, textAlign: { xs: 'center', md: 'left' } }}>
              <Typography component="h2" variant="h4" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
                Connexion
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Renseignez vos identifiants pour accéder à l'application.
              </Typography>
            </Box>

            {/* Formulaire MUI */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {/* Messages d'erreur/succès */}
              {error && (
                <Alert severity="error" sx={{ marginBottom: 2 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ marginBottom: 2 }}>
                  {success}
                </Alert>
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Nom d'utilisateur"
                name="username"
                placeholder="Ex: Jean.Dupont"
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
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="••••••••"
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
              />

              {/* Bouton avec couleur sombre par défaut, bleu au survol */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !formData.username || !formData.password}
                sx={{ 
                  mt: 3, 
                  mb: 2, 
                  bgcolor: 'text.primary',
                  '&:hover': {
                    bgcolor: 'primary.main',
                  },
                  '&:disabled': {
                    bgcolor: 'text.secondary',
                  },
                  py: 1.5
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Se connecter'
                )}
              </Button>

              <Grid container alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                <Grid item>
                  <FormControlLabel
                    control={<Checkbox value="remember" color="primary" sx={{ '&.Mui-checked': { color: 'primary.main' } }} />}
                    label={<Typography variant="body2" color="text.secondary">Rester connecté</Typography>}
                  />
                </Grid>
                <Grid item>
                  <Link href="#" variant="body2" sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    Mot de passe oublié ?
                  </Link>
                </Grid>
              </Grid>
            </Box>

            {/* Informations supplémentaires */}
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 3 }}
            >
              Contactez l'administrateur pour obtenir vos identifiants
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
};

export default Login;
