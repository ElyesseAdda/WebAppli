import React from "react";
import ClassementTiers from "./ClassementTiers";

const ClassementFournisseurs = ({ classement = [], loading }) => (
  <ClassementTiers classement={classement} loading={loading} nomLabel="fournisseur" />
);

export default ClassementFournisseurs;
