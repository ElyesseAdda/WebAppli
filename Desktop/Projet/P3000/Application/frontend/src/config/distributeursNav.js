/**
 * Navigation Distributeurs (sidebar + retour app).
 *
 * Identité client — protégé par deploy/update-clients.sh (PROTECTED_COMMON).
 *   - main (P3000) / client/elekable : pas de bouton sidebar
 *   - client/mjrservice : bouton → https://myp3000app.com/distributeurs
 * L'app Distributeurs est hébergée sur P3000 ; le retour pointe vers MJR Services.
 */
const DISTRIBUTEURS_NAV = {
  showInSidebar: false,
  label: "Distributeurs",
  /** Si true + href : lien externe (nouvel onglet). Sinon route interne `to`. */
  external: false,
  href: null,
  to: "/distributeurs",
  returnHref: "https://mjrserviceapp.com/",
  returnLabel: "Retour à MJR Services",
  returnCaption: "Application principale",
};

export default DISTRIBUTEURS_NAV;
