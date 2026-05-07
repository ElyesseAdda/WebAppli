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
          <Button color="warning" variant="outlined" size="small" onClick={onClearPaymentDate}>
            Supprimer la date
          </Button>
        ) : null}
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
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
      </Box>
    </DialogActions>
  </Dialog>
);

export default PointageEditDialog;

