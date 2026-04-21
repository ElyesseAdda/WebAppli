import React from "react";
import {
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
}) => (
  <Dialog open={editorState.open} onClose={closeEditor} maxWidth="xs" fullWidth>
    <DialogTitle>{editorState.label}</DialogTitle>
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
        helperText={editorState.isCurrency ? "Montant en euros" : ""}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={closeEditor}>Annuler</Button>
      <Button
        variant="contained"
        onClick={saveEditor}
        disabled={
          Boolean(savingPointageKey) ||
          (savingEmailAgentId !== null && savingEmailAgentId === editorState.agentId)
        }
      >
        Enregistrer
      </Button>
    </DialogActions>
  </Dialog>
);

export default PointageEditDialog;

