import { Box, Button } from "@mui/material";
import React, { useEffect, useState } from "react";
import { FiPlusCircle } from "react-icons/fi";
import { bonCommandeService } from "../services/bonCommandeService";
import ProduitSelectionTable from "./ProduitSelectionTable";
import SelectionFournisseurModal from "./SelectionFournisseurModal";

function BonCommandeForm({ onBonCommandeCreated }) {
  const [step, setStep] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [numeroBC, setNumeroBC] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Générer un numéro de bon de commande lors du montage du composant
    bonCommandeService
      .generateBonCommandeNumber()
      .then((data) => setNumeroBC(data.numero))
      .catch((error) => console.error("Erreur:", error));
  }, []);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => {
    setOpenModal(false);
    if (step !== 1) setStep(1);
  };

  const handleInitialSelection = (data) => {
    setSelectedData({
      fournisseur: data.fournisseur,
      chantier: data.chantier,
      agent: data.agent,
    });
    setStep(2);
    setIsModalOpen(true);
    handleCloseModal();
  };

  const handleProductSelection = (products) => {
    setSelectedProducts(products);
    handlePreviewBonCommande(products);
    if (onBonCommandeCreated) {
      onBonCommandeCreated();
    }
  };

  const handlePreviewBonCommande = (products) => {
    const bonCommandeData = {
      numero: numeroBC,
      fournisseur: selectedData.fournisseur,
      chantier: selectedData.chantier,
      agent: selectedData.agent,
      lignes: products.map((product) => ({
        produit: product.produit,
        designation: product.designation,
        quantite: product.quantite,
        prix_unitaire: product.prix_unitaire,
        total: product.quantite * product.prix_unitaire,
      })),
      montant_total: products.reduce(
        (acc, curr) => acc + curr.quantite * curr.prix_unitaire,
        0
      ),
    };

    const queryString = encodeURIComponent(JSON.stringify(bonCommandeData));
    const previewUrl = `/api/preview-bon-commande/?bon_commande=${queryString}`;
    window.open(previewUrl, "_blank");
  };

  const handleAgentSelect = (agent) => {
    setSelectedData((prev) => ({
      ...prev,
      agent: {
        id: agent.id,
        name: agent.name,
      },
    }));
  };

  const handleValidate = (products) => {
    setSelectedProducts(products);
    handlePreviewBonCommande(products);
    if (onBonCommandeCreated) {
      onBonCommandeCreated();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Button
            variant="contained"
            onClick={handleOpenModal}
            startIcon={<FiPlusCircle />}
            sx={{
              backgroundColor: "rgba(27, 120, 188, 1)",
              alignSelf: "flex-end",
              "&:hover": {
                backgroundColor: "rgba(27, 120, 188, 0.8)",
              },
            }}
          >
            Nouveau Bon de Commande
          </Button>
        );
      case 2:
        return (
          <ProduitSelectionTable
            open={true}
            onClose={() => {
              setStep(1);
              setIsModalOpen(false);
            }}
            fournisseur={selectedData.fournisseur}
            onValidate={handleValidate}
            numeroBC={numeroBC}
            selectedData={selectedData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        maxWidth: "1430px",
        margin: "0 auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {renderStep()}

      <SelectionFournisseurModal
        open={openModal}
        onClose={handleCloseModal}
        onSubmit={handleInitialSelection}
      />
    </Box>
  );
}

export default BonCommandeForm;
