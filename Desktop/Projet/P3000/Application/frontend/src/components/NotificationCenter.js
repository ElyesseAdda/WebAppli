import NotificationsIcon from "@mui/icons-material/Notifications";
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  Snackbar,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  formatDevisTagDate,
  formatDevisTagsLabel,
  getDevisTagMeta,
  getDevisTagStyle,
  getTransformLabel,
  parseDevisTagsLabel,
} from "../config/devisTags";
import { useNotifications } from "../hooks/useNotifications";

const openChantierFromNotification = (notification, navigate) => {
  if (!notification?.chantier_id) return;
  localStorage.setItem(
    "last_visited_chantier",
    String(notification.chantier_id)
  );
  navigate(
    `/ChantierDetail/${notification.chantier_id}?tab=1&subtab=1`
  );
};

const getNotificationTagCombo = (notification) => {
  const fromTags = Array.isArray(notification?.old_tags)
    ? notification.old_tags
    : parseDevisTagsLabel(notification?.old_value);
  const toTags = Array.isArray(notification?.new_tags)
    ? notification.new_tags
    : parseDevisTagsLabel(notification?.new_value);
  return {
    fromTags,
    toTags,
    fromLabel: formatDevisTagsLabel(fromTags),
    toLabel: formatDevisTagsLabel(toTags),
  };
};

export const buildNotificationTitle = (notification) => {
  if (!notification) return "";
  const actor = notification.actor_name || "Un utilisateur";
  const devis = notification.devis_numero || "devis";
  const chantier = notification.chantier_name
    ? ` (${notification.chantier_name})`
    : "";
  const transformLabel = getTransformLabel(notification.transform_type);
  if (transformLabel) {
    return `${actor} — ${transformLabel.toLowerCase()} du devis ${devis}${chantier}`;
  }
  return `${actor} a modifié les tags du devis ${devis}${chantier}`;
};

export const buildNotificationMessage = (notification) => {
  if (!notification) return "";
  const { fromLabel, toLabel } = getNotificationTagCombo(notification);
  const when = formatDevisTagDate(notification.created_at);
  const documentPart = notification.document_numero
    ? ` — ${notification.document_numero}`
    : "";
  return `${buildNotificationTitle(notification)}${documentPart} : ${fromLabel} → ${toLabel}${
    when ? ` — ${when}` : ""
  }`;
};

const TagComboChips = ({ tags }) => {
  const values = tags.length ? tags : ["Aucun tag"];
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
      {values.map((tag) => {
        const meta = getDevisTagMeta(tag === "Aucun tag" ? "" : tag);
        return (
          <Box key={tag} component="span" sx={{ ...getDevisTagStyle(tag), fontSize: "0.7rem", borderRadius: "3px" }}>
            {meta.label}
          </Box>
        );
      })}
    </Box>
  );
};

const NotificationDocumentLine = ({ notification }) => {
  const transformLabel = getTransformLabel(notification?.transform_type);
  const documentNumero = notification?.document_numero || "";
  const previewUrl = notification?.preview_url || "";
  if (!transformLabel && !documentNumero) return null;

  const canOpen = Boolean(previewUrl && documentNumero);

  const handleOpen = (event) => {
    event.stopPropagation();
    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Box
      sx={{
        mt: 0.6,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 0.5,
      }}
    >
      {transformLabel && (
        <Typography
          component="span"
          variant="caption"
          sx={{ fontWeight: 700, color: "#334155" }}
        >
          {transformLabel}
        </Typography>
      )}
      {documentNumero && (
        <>
          {transformLabel && (
            <Typography component="span" variant="caption" sx={{ color: "#94a3b8" }}>
              —
            </Typography>
          )}
          <Typography
            component={canOpen ? "button" : "span"}
            type={canOpen ? "button" : undefined}
            onClick={canOpen ? handleOpen : undefined}
            variant="caption"
            sx={{
              fontWeight: 700,
              color: canOpen ? "#1565c0" : "#475569",
              textDecoration: canOpen ? "underline" : "none",
              cursor: canOpen ? "pointer" : "default",
              background: "none",
              border: "none",
              padding: 0,
              fontFamily: "inherit",
              fontSize: "0.75rem",
              "&:hover": canOpen ? { color: "#0d47a1" } : undefined,
            }}
            title={
              canOpen ? "Ouvrir le document dans un nouvel onglet" : undefined
            }
          >
            {documentNumero}
          </Typography>
        </>
      )}
    </Box>
  );
};

const NotificationTagChange = ({ notification }) => {
  const { fromTags, toTags } = getNotificationTagCombo(notification);
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75, mt: 0.5 }}>
      <TagComboChips tags={fromTags} />
      <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
        →
      </Typography>
      <TagComboChips tags={toTags} />
    </Box>
  );
};

export const NotificationBell = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleClickNotification = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    handleClose();
    openChantierFromNotification(notification, navigate);
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        size="small"
        title="Alertes devis"
        sx={{
          color: "#fff",
          backgroundColor: "rgba(255,255,255,0.16)",
          border: "1px solid rgba(255,255,255,0.28)",
          width: 32,
          height: 32,
          "&:hover": { backgroundColor: "rgba(255,255,255,0.26)" },
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          overlap="circular"
        >
          <NotificationsIcon sx={{ fontSize: 18 }} />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 430, maxHeight: 520, mt: 1 },
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Alertes tags devis
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllAsRead}>
              Tout lu
            </Button>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Aucune alerte pour le moment.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {notifications.map((notification) => (
              <ListItemButton
                key={notification.id}
                onClick={() => handleClickNotification(notification)}
                sx={{
                  alignItems: "flex-start",
                  backgroundColor: notification.is_read
                    ? "transparent"
                    : "rgba(25, 118, 210, 0.08)",
                }}
              >
                <ListItemText
                  primary={buildNotificationTitle(notification)}
                  secondary={
                    <>
                      <NotificationDocumentLine notification={notification} />
                      <NotificationTagChange notification={notification} />
                      {formatDevisTagDate(notification.created_at) ? (
                        <Typography variant="caption" color="text.secondary">
                          {formatDevisTagDate(notification.created_at)}
                        </Typography>
                      ) : null}
                    </>
                  }
                  primaryTypographyProps={{
                    variant: "body2",
                    fontWeight: notification.is_read ? 400 : 600,
                  }}
                  secondaryTypographyProps={{ component: "div" }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
};

export const NotificationBanner = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    latestNew,
    markAsRead,
    clearLatestNew,
  } = useNotifications();

  const latestUnread = useMemo(
    () => notifications.find((item) => !item.is_read) || null,
    [notifications]
  );

  const handleOpen = async (notification) => {
    if (!notification) return;
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    clearLatestNew();
    openChantierFromNotification(notification, navigate);
  };

  return (
    <>
      {latestUnread && unreadCount > 0 && (
        <Alert
          severity="info"
          sx={{
            mb: 2,
            cursor: "pointer",
            alignItems: "center",
          }}
          onClick={() => handleOpen(latestUnread)}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                handleOpen(latestUnread);
              }}
            >
              Ouvrir le chantier
            </Button>
          }
        >
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {buildNotificationTitle(latestUnread)}
              {unreadCount > 1 ? ` — +${unreadCount - 1} autre(s)` : ""}
            </Typography>
            <NotificationDocumentLine notification={latestUnread} />
            <NotificationTagChange notification={latestUnread} />
          </Box>
        </Alert>
      )}
      <Snackbar
        open={Boolean(latestNew)}
        autoHideDuration={8000}
        onClose={clearLatestNew}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity="warning"
          onClose={clearLatestNew}
          onClick={() => handleOpen(latestNew)}
          sx={{ cursor: "pointer", minWidth: 320 }}
        >
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {buildNotificationTitle(latestNew)}
            </Typography>
            <NotificationDocumentLine notification={latestNew} />
            <NotificationTagChange notification={latestNew} />
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
};
