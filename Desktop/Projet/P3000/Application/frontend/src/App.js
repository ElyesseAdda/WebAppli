import { Route } from "react-router-dom";
import PaiementsSousTraitantPage from "./components/PaiementsSousTraitantPage";
import PreviewDevisExistant from "./components/PreviewDevisExistant";

// Dans vos routes
<Route path="/preview-devis/:devisId" element={<PreviewDevisExistant />} />;
<Route
  path="/paiements-sous-traitant/:chantierId/:sousTraitantId"
  element={<PaiementsSousTraitantPage />}
/>;
