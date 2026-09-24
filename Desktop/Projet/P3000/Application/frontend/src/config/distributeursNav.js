/**
 * Navigation Distributeurs (sidebar + hub mobile + retour app).
 *
 * Identité client — protégé par deploy/update-clients.sh (PROTECTED_COMMON).
 *   - main (P3000) / client/elekable : pas de bouton sidebar ni carte mobile
 *   - client/mjrservice : bouton / carte → https://myp3000app.com/distributeurs
 * L'app Distributeurs est hébergée sur P3000 ; le retour pointe vers MJR Services.
 */
const DISTRIBUTEURS_NAV = {
  showInSidebar: true,
  /** Carte « Distributeur » sur /mobile-home → P3000. */
  showInMobileHome: true,
  label: "Distributeurs",
  /** Lien externe vers l'app hébergée sur P3000. */
  external: true,
  href: "https://myp3000app.com/distributeurs",
  to: "/distributeurs",
  returnHref: "https://mjrserviceapp.com/",
  returnLabel: "Retour à MJR Services",
  returnCaption: "Application principale",
};

export default DISTRIBUTEURS_NAV;
