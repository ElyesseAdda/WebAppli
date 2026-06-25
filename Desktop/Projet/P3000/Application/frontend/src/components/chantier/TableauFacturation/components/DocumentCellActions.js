import { Download as DownloadIcon } from "@mui/icons-material";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import React from "react";

const previewButtonSx = {
  color: "rgba(27, 120, 188, 1)",
  fontWeight: "bold",
  fontSize: "0.75rem",
  textTransform: "none",
  minWidth: "auto",
  padding: "2px 8px",
  "&:hover": {
    backgroundColor: "rgba(27, 120, 188, 0.1)",
  },
};

const DocumentCellActions = ({ label, onPreview, onDownload }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.25,
      maxWidth: "100%",
    }}
  >
    <Button size="small" onClick={onPreview} sx={previewButtonSx}>
      {label}
    </Button>
    {onDownload && (
      <Tooltip title="Télécharger le PDF">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          sx={{
            padding: "2px",
            color: "rgba(27, 120, 188, 0.65)",
            "&:hover": {
              color: "rgba(27, 120, 188, 1)",
              backgroundColor: "rgba(27, 120, 188, 0.08)",
            },
          }}
        >
          <DownloadIcon sx={{ fontSize: "0.95rem" }} />
        </IconButton>
      </Tooltip>
    )}
  </Box>
);

export default DocumentCellActions;
