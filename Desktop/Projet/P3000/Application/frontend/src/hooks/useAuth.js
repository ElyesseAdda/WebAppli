import { useCallback, useEffect, useState } from "react";
import authService from "../services/authService";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuth();
  }, []);

  // Écouter les changements d'état d'authentification
  useEffect(() => {
    const unsubscribe = authService.addListener((auth, userData) => {
      setIsAuthenticated(auth);
      setUser(userData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Vérification périodique de l'authentification (toutes les 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated) {
        checkAuth(); // Vérifier côté serveur
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const checkAuth = useCallback(async () => {
    try {
      const isAuth = await authService.checkAuth();
      setIsAuthenticated(isAuth);
      if (isAuth) {
        setUser(authService.getAuthStatus().user);
      }
    } catch (error) {
      console.error("Erreur vérification auth:", error);
      // En cas d'erreur, considérer comme non authentifié
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const result = await authService.login(credentials);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const result = await authService.logout();
      if (result.success) {
        setIsAuthenticated(false);
        setUser(null);
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    checkAuth,
  };
};
