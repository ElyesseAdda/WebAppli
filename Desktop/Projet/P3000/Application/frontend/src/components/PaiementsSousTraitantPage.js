import React from "react";
import { useParams } from "react-router-dom";
import TableauPaiementSousTraitant from "./TableauPaiementSousTraitant";

const PaiementsSousTraitantPage = () => {
  const { chantierId, sousTraitantId, contratId } = useParams();
  return (
    <TableauPaiementSousTraitant
      chantierId={chantierId}
      sousTraitantId={sousTraitantId}
      contratId={contratId}
    />
  );
};

export default PaiementsSousTraitantPage;
