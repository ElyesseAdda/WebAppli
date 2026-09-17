import axios from "axios";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const NotificationsContext = createContext(null);
const POLL_INTERVAL_MS = 15000;

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNew, setLatestNew] = useState(null);
  const knownIdsRef = useRef(new Set());
  const initializedRef = useRef(false);

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    try {
      const response = await axios.get("/api/notifications/");
      const results = Array.isArray(response.data?.results)
        ? response.data.results
        : [];
      const nextUnread = response.data?.unread_count ?? 0;

      if (initializedRef.current && !silent) {
        const fresh = results.find(
          (item) => !item.is_read && !knownIdsRef.current.has(item.id)
        );
        if (fresh) {
          setLatestNew(fresh);
        }
      }

      knownIdsRef.current = new Set(results.map((item) => item.id));
      initializedRef.current = true;
      setNotifications(results);
      setUnreadCount(nextUnread);
    } catch (error) {
      if (error?.response?.status !== 401 && error?.response?.status !== 403) {
        console.error("Erreur lors du chargement des notifications:", error);
      }
    }
  }, []);

  useEffect(() => {
    fetchNotifications({ silent: true });
    const timer = setInterval(() => {
      fetchNotifications();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await axios.post(`/api/notifications/${notificationId}/read/`);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erreur lors de la lecture de la notification:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await axios.post("/api/notifications/read-all/");
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erreur lors de la lecture des notifications:", error);
    }
  }, []);

  const clearLatestNew = useCallback(() => setLatestNew(null), []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      latestNew,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      clearLatestNew,
    }),
    [
      notifications,
      unreadCount,
      latestNew,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      clearLatestNew,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      latestNew: null,
      fetchNotifications: async () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      clearLatestNew: () => {},
    };
  }
  return context;
};
