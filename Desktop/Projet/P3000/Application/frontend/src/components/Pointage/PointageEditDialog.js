import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

const PointageEditDialog = ({
  editorState,
  setEditorState,
  closeEditor,
  saveEditor,
  savingPointageKey,
  savingEmailAgentId,
  onClearPaymentDate,
}) => {
  const isSaving =
    Boolean(savingPointageKey) ||
    (savingEmailAgentId !== null && savingEmailAgentId === editorState.agentId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isSaving) {
      saveEditor();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isSaving) {
        saveEditor();
      }
    }
  };

  return (
    <Dialog open={editorState.open} onClose={closeEditor} maxWidth="xs" fullWidth>
      <DialogTitle>{editorState.label}</DialogTitle>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            type={editorState.inputType}
            value={editorState.value}
            onChange={(e) =>
              setEditorState((prev) => ({ ...prev, value: e.target.value }))
            }
            label={editorState.label}
            placeholder={editorState.isCurrency ? "0,00" : ""}
            helperText={
              editorState.isCurrency
                ? "Montant en euros"
                : editorState.field === "date_paiement"
                ? "Date à laquelle le paiement a été effectué"
                : ""
            }
            InputLabelProps={editorState.inputType === "date" ? { shrink: true } : undefined}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Box>
            {editorState.field === "date_paiement" && onClearPaymentDate ? (
              <Button
                type="button"
                color="warning"
                variant="outlined"
                size="small"
                onClick={onClearPaymentDate}
              >
                Supprimer la date
              </Button>
            ) : null}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button type="button" onClick={closeEditor}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              Enregistrer
            </Button>
          </Box>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PointageEditDialog;
