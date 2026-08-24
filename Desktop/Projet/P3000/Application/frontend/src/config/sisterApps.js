/**
 * Liens vers les autres instances P3000 (ouverture nouvel onglet).
 *
 * Identité client — protégé par deploy/update-clients.sh (PROTECTED_COMMON).
 * Adapter ce fichier sur chaque branche client (elekable / mjrservice) :
 *   - main (P3000)     → Elekable + MJR Services
 *   - client/elekable  → P3000 + MJR Services
 *   - client/mjrservice → P3000 + Elekable
 */
const SISTER_APPS = [
  { label: "P3000", url: "https://myp3000app.com" },
  { label: "Elekable", url: "https://elekable.fr" },
];

export default SISTER_APPS;
