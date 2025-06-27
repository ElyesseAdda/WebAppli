import {
  Box,
  Button,
  Collapse,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React from "react";
import { FaTimes } from "react-icons/fa";

const RecapCategoryDetails = ({ open, documents, title, onClose }) => {
  // Log des props reçues
  console.log("[RecapCategoryDetails] props:", { open, documents, title });
  return (
    <Collapse in={open} timeout="auto" unmountOnExit>
      <Paper elevation={3} sx={{ mt: 2, p: 2 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="h6">Détails {title}</Typography>
          <Button
            onClick={onClose}
            startIcon={<FaTimes />}
            color="error"
            size="small"
          >
            Fermer
          </Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>N°</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Montant</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Agent/Sous-traitant</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents && documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.numero || "-"}</TableCell>
                    <TableCell>
                      {doc.date
                        ? new Date(doc.date).toLocaleDateString("fr-FR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {doc.montant !== undefined
                        ? Number(doc.montant).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                          }) + " €"
                        : "-"}
                    </TableCell>
                    <TableCell>{doc.statut}</TableCell>
                    <TableCell>
                      {doc.agent || doc.sous_traitant || "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Aucun document
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Collapse>
  );
};

export default RecapCategoryDetails;
