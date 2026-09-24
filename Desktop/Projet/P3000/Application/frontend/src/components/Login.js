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
const theme = createTheme({
  palette: {
    primary: {
      main: '#ffffff',
    },
    secondary: {
      main: '#4a4a4a',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#95a5a6',
    },
    background: {
      default: '#2d2d2d',
    }
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          fontSize: '1rem',
          textTransform: 'none',
          borderRadius: '8px',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: '16px',
          '& .MuiOutlinedInput-root': {
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
      <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
        
        {/* --- PARTIE GAUCHE : fond blanc, logo et texte noirs --- */}
        <Grid 
          item 
          xs={12} 
          md={6} 
          sx={{
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#000000',
            position: 'relative',
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
            {/* Logo (noir sur fond blanc) */}
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
                alt="MJR Services" 
                style={{ 
                  width: '500px', 
                  height: 'auto', 
                  objectFit: 'contain'
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
                color: '#000000',
              }}
            >
              Pilotage centralisé<br />de vos chantiers.
            </Typography>
            
            <Typography variant="subtitle1" sx={{ mt: 2, color: '#333333', fontWeight: 600, fontSize: { xs: '0.875rem', md: '1.5rem' } }}>
              Suite de gestion administrative et technique
            </Typography>
          </Box>
        </Grid>

        {/* --- PARTIE DROITE : fond gris-noir, texte blanc --- */}
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
            height: { xs: '65vh', md: '100vh' },
            overflowY: 'auto',
            bgcolor: '#2d2d2d',
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
              <Typography component="h2" variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
                Connexion
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Renseignez vos identifiants pour accéder à l'application.
              </Typography>
            </Box>

            {/* Formulaire MUI */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
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
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ffffff' },
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#ffffff' },
                    '& .MuiInputBase-input': { color: '#ffffff' },
                  },
                  '& .MuiInputAdornment-root .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.7)' },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
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
                sx={{
                  '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ffffff' },
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                    '&.Mui-focused fieldset': { borderColor: '#ffffff' },
                    '& .MuiInputBase-input': { color: '#ffffff' },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !formData.username || !formData.password}
                sx={{ 
                  mt: 3, 
                  mb: 2, 
                  bgcolor: '#ffffff',
                  color: '#2d2d2d',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                    color: 'rgba(255, 255, 255, 0.5)',
                  },
                  py: 1.5
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: '#2d2d2d' }} />
                ) : (
                  'Se connecter'
                )}
              </Button>

              <Grid container alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                <Grid item>
                  <FormControlLabel
                    control={<Checkbox value="remember" sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-checked': { color: '#ffffff' } }} />}
                    label={<Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>Rester connecté</Typography>}
                  />
                </Grid>
                <Grid item>
                  <Link href="#" variant="body2" sx={{ color: '#ffffff', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    Mot de passe oublié ?
                  </Link>
                </Grid>
              </Grid>
            </Box>

            <Typography
              variant="body2"
              align="center"
              sx={{ mt: 3, color: 'rgba(255, 255, 255, 0.7)' }}
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
