import axios from "axios";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const NotificationsContext = createContext(null);
const POLL_INTERVAL_MS = 15000;

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get("/api/notifications/");
      const results = Array.isArray(response.data?.results)
        ? response.data.results.filter((item) => !item.is_read)
        : [];
      const nextUnread = response.data?.unread_count ?? results.length;
      setNotifications(results);
      setUnreadCount(nextUnread);
    } catch (error) {
      if (error?.response?.status !== 401 && error?.response?.status !== 403) {
        console.error("Erreur lors du chargement des notifications:", error);
      }
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await axios.post(`/api/notifications/${notificationId}/read/`);
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erreur lors de la lecture de la notification:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await axios.post("/api/notifications/read-all/");
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Erreur lors de la lecture des notifications:", error);
    }
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead]
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
      fetchNotifications: async () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {},
    };
  }
  return context;
};
