/**
 * Navigation Distributeurs (sidebar + hub mobile + retour app).
 *
 * Identité client — protégé par deploy/update-clients.sh (PROTECTED_COMMON).
 *   - main (P3000) / client/elekable : pas de bouton sidebar ni carte mobile
 *   - client/mjrservice : bouton / carte → https://myp3000app.com/distributeurs
 * L'app Distributeurs est hébergée sur P3000 ; le retour pointe vers MJR Services.
 */
const DISTRIBUTEURS_NAV = {
  showInSidebar: false,
  /** Carte « Distributeur » sur /mobile-home (MJR uniquement). */
  showInMobileHome: false,
  label: "Distributeurs",
  /** Si true + href : lien externe. Sinon route interne `to`. */
  external: false,
  href: null,
  to: "/distributeurs",
  returnHref: "https://mjrserviceapp.com/",
  returnLabel: "Retour à MJR Services",
  returnCaption: "Application principale",
};

export default DISTRIBUTEURS_NAV;
