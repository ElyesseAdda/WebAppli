import { Box, Button } from "@mui/material";
import React, { useEffect, useState } from "react";
import { FiPlusCircle } from "react-icons/fi";
import { bonCommandeService } from "../services/bonCommandeService";
import ProduitSelectionTable from "./ProduitSelectionTable";
import SelectionFournisseurModal from "./SelectionFournisseurModal";

function BonCommandeForm({ onBonCommandeCreated, modal }) {
  const [step, setStep] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [numeroBC, setNumeroBC] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
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
      fournisseur: data.fournisseur, // ID pour la création du BC
      fournisseurName: data.fournisseurName, // Nom pour l'API produits
      chantier: data.chantier,
      emetteur: data.emetteur,
      numero_bon_commande: data.numero_bon_commande,
      date_commande: data.date_commande,
      date_creation_personnalisee: data.date_creation_personnalisee,
      contact_type: data.contact_type,
      contact_agent: data.contact_agent,
      contact_sous_traitant: data.contact_sous_traitant,
    });
    setStep(2);
    setIsModalOpen(true);
    handleCloseModal();
    if (onBonCommandeCreated) {
      onBonCommandeCreated();
    }
  };

  const handleProductSelection = (products) => {
    setSelectedProducts(products);
    handlePreviewBonCommande(products);
  };

  const handlePreviewBonCommande = (products) => {
    if (!Array.isArray(products)) {
      console.error("Products is not an array:", products);
      return;
    }
    const bonCommandeData = {
      numero: selectedData.numero_bon_commande,
      fournisseur: selectedData.fournisseur,
      fournisseurName: selectedData.fournisseurName,
      chantier: selectedData.chantier,
      emetteur: selectedData.emetteur,
      date_creation_personnalisee: selectedData.date_creation_personnalisee,
      contact_type: selectedData.contact_type,
      contact_agent: selectedData.contact_agent,
      contact_sous_traitant: selectedData.contact_sous_traitant,
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

  const handleSaveBonCommande = async () => {
    const numeroFinal = selectedData.numero_bon_commande || numeroBC;
    const bonCommandeData = {
      numero: numeroFinal,
      fournisseur: selectedData.fournisseur,
      fournisseurName: selectedData.fournisseurName,
      chantier: selectedData.chantier,
      emetteur: selectedData.emetteur,
      date_creation_personnalisee: selectedData.date_creation_personnalisee,
      contact_type: selectedData.contact_type,
      contact_agent: selectedData.contact_agent,
      contact_sous_traitant: selectedData.contact_sous_traitant,
      lignes: selectedProducts.map((product) => ({
        produit: product.produit,
        designation: product.designation,
        quantite: product.quantite,
        prix_unitaire: product.prix_unitaire,
        total: product.quantite * product.prix_unitaire,
      })),
      montant_total: selectedProducts.reduce(
        (acc, curr) => acc + curr.quantite * curr.prix_unitaire,
        0
      ),
    };
    try {
      await bonCommandeService.createBonCommande(bonCommandeData);
      if (onBonCommandeCreated) {
        onBonCommandeCreated();
      }
    } catch (error) {
      console.error("Erreur lors de la création du bon de commande:", error);
    }
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
  };

  // --- Affichage spécifique pour la modale ---
  if (modal) {
    return (
      <SelectionFournisseurModal
        open={true}
        onClose={onBonCommandeCreated}
        onSubmit={handleInitialSelection}
        numeroBC={numeroBC}
      />
    );
  }

  // --- Affichage standard (autonome) ---
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
            fournisseur={selectedData?.fournisseurName}
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
        numeroBC={numeroBC}
      />
    </Box>
  );
}

export default BonCommandeForm;
