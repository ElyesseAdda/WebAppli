/**
 * Calcul de la mise en page d'un diagramme de Gantt.
 *
 * Fonctions pures, sans dépendance à React : la même logique est reproduite
 * côté Python dans `api/views_gantt.py` (`_calculer_layout`) pour le rendu PDF,
 * qui ne peut pas exécuter de JavaScript React. Toute modification ici doit
 * être répercutée là-bas pour que l'écran et le PDF restent identiques.
 */

const MOIS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** Convertit "YYYY-MM-DD" en Date UTC (midi, pour neutraliser les fuseaux). */
export function parseDate(valeur) {
  if (!valeur) return null;
  if (valeur instanceof Date) {
    return new Date(
      Date.UTC(valeur.getFullYear(), valeur.getMonth(), valeur.getDate(), 12)
    );
  }
  const [annee, mois, jour] = String(valeur).slice(0, 10).split("-").map(Number);
  if (!annee || !mois || !jour) return null;
  return new Date(Date.UTC(annee, mois - 1, jour, 12));
}

export function toISO(date) {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export function ajouterJours(date, nombre) {
  const copie = new Date(date.getTime());
  copie.setUTCDate(copie.getUTCDate() + nombre);
  return copie;
}

/** Nombre de jours entre deux dates, bornes incluses. */
export function nbJours(debut, fin) {
  return Math.round((fin - debut) / 86400000) + 1;
}

/** Lundi de la semaine contenant la date. */
function debutSemaine(date) {
  const jour = date.getUTCDay();
  return ajouterJours(date, jour === 0 ? -6 : 1 - jour);
}

function debutMois(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

/** Numéro de semaine ISO 8601. */
function numeroSemaine(date) {
  const cible = new Date(date.getTime());
  const jour = (date.getUTCDay() + 6) % 7;
  cible.setUTCDate(cible.getUTCDate() - jour + 3);
  const premierJeudi = new Date(Date.UTC(cible.getUTCFullYear(), 0, 4, 12));
  const decalage = (premierJeudi.getUTCDay() + 6) % 7;
  premierJeudi.setUTCDate(premierJeudi.getUTCDate() - decalage + 3);
  return 1 + Math.round((cible - premierJeudi) / (7 * 86400000));
}

export function formatDateFr(valeur) {
  const date = parseDate(valeur);
  if (!date) return "";
  const jour = String(date.getUTCDate()).padStart(2, "0");
  const mois = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${jour}/${mois}/${date.getUTCFullYear()}`;
}

/** Date courte JJ/MM affichée aux extrémités des barres. */
export function formatDateCourte(valeur) {
  const date = parseDate(valeur);
  if (!date) return "";
  const jour = String(date.getUTCDate()).padStart(2, "0");
  const mois = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${jour}/${mois}`;
}

/** Durée affichée à côté de la désignation (écran + PDF). */
export function libelleDatesPlage(ligne) {
  if (!ligne?.barre?.duree) return "";
  return `${ligne.barre.duree} j`;
}

/**
 * Affichage des dates JJ/MM sous une barre selon sa largeur (% de la timeline).
 * Aligné sur ``_mode_dates_barre`` dans ``api/views_gantt.py``.
 */
export function modeDatesBarre(largeurPct, dateDebut, dateFin) {
  const debut = formatDateCourte(dateDebut);
  const fin = formatDateCourte(dateFin);
  if (!debut && !fin) return { mode: "none" };
  if (debut === fin) return { mode: "unique", texte: debut };

  const largeur = Number(largeurPct) || 0;
  if (largeur < 11) return { mode: "combinee", texte: `${debut} → ${fin}` };
  return { mode: "separees", debut, fin };
}

/** Bornes du diagramme : première date de début et dernière date de fin. */
export function calculerBornes(elements) {
  const debuts = [];
  const fins = [];
  (elements || []).forEach((element) => {
    const debut = parseDate(element.date_debut);
    const fin = parseDate(element.date_fin);
    if (debut) debuts.push(debut);
    if (fin) fins.push(fin);
  });
  if (!debuts.length || !fins.length) return null;
  return {
    debut: new Date(Math.min(...debuts.map((d) => d.getTime()))),
    fin: new Date(Math.max(...fins.map((d) => d.getTime()))),
  };
}

/**
 * Découpe l'axe temporel en périodes selon l'échelle choisie.
 * Renvoie les périodes (colonnes) et les groupes d'en-tête (mois ou année).
 */
export function calculerPeriodes(bornes, echelle) {
  if (!bornes) return { periodes: [], groupes: [], debut: null, fin: null };

  let curseur;
  if (echelle === "mois") curseur = debutMois(bornes.debut);
  else if (echelle === "semaine") curseur = debutSemaine(bornes.debut);
  else curseur = bornes.debut;

  const periodes = [];
  let garde = 0;
  while (curseur <= bornes.fin && garde < 800) {
    garde += 1;
    let finPeriode;
    let libelle;
    let groupe;

    if (echelle === "mois") {
      finPeriode = ajouterJours(
        new Date(
          Date.UTC(curseur.getUTCFullYear(), curseur.getUTCMonth() + 1, 1, 12)
        ),
        -1
      );
      libelle = MOIS_FR[curseur.getUTCMonth()].slice(0, 4);
      groupe = String(curseur.getUTCFullYear());
    } else if (echelle === "semaine") {
      finPeriode = ajouterJours(curseur, 6);
      libelle = `S${numeroSemaine(curseur)}`;
      groupe = `${MOIS_FR[curseur.getUTCMonth()]} ${curseur.getUTCFullYear()}`;
    } else {
      finPeriode = curseur;
      libelle = String(curseur.getUTCDate()).padStart(2, "0");
      groupe = `${MOIS_FR[curseur.getUTCMonth()]} ${curseur.getUTCFullYear()}`;
    }

    periodes.push({
      cle: toISO(curseur),
      debut: curseur,
      fin: finPeriode,
      libelle,
      groupe,
    });
    curseur = ajouterJours(finPeriode, 1);
  }

  const groupes = [];
  periodes.forEach((periode) => {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.libelle === periode.groupe) dernier.nbPeriodes += 1;
    else groupes.push({ libelle: periode.groupe, nbPeriodes: 1 });
  });

  const debut = periodes.length ? periodes[0].debut : null;
  const fin = periodes.length ? periodes[periodes.length - 1].fin : null;
  return { periodes, groupes, debut, fin };
}

/** Position et largeur d'une barre, en pourcentage de la largeur totale. */
export function calculerBarre(dateDebut, dateFin, axe) {
  const debut = parseDate(dateDebut);
  const fin = parseDate(dateFin);
  if (!debut || !fin || !axe.debut || !axe.fin) return null;

  const total = nbJours(axe.debut, axe.fin);
  if (total <= 0) return null;

  const decalage = Math.max(0, nbJours(axe.debut, debut) - 1);
  const duree = Math.max(1, nbJours(debut, fin));
  const gauche = (decalage / total) * 100;
  const largeur = Math.min(100 - gauche, (duree / total) * 100);

  return { gauche, largeur, duree, centre: gauche + largeur / 2 };
}

/**
 * Organise les éléments en arbre à deux niveaux (titres puis lignes) et
 * calcule les barres récapitulatives des titres.
 */
export function construireLignes(elements, axe) {
  const tries = [...(elements || [])].sort(
    (a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || (a.id ?? 0) - (b.id ?? 0)
  );

  const titres = tries.filter((e) => e.type_element === "titre");
  const lignes = tries.filter((e) => e.type_element !== "titre");

  const resultat = [];

  const ajouterLigne = (ligne, indente) => {
    resultat.push({
      ...ligne,
      estTitre: false,
      indente,
      barre: axe ? calculerBarre(ligne.date_debut, ligne.date_fin, axe) : null,
    });
  };

  titres.forEach((titre) => {
    const enfants = lignes.filter((l) => l.parent === titre.id);
    const bornes = calculerBornes(enfants);
    resultat.push({
      ...titre,
      estTitre: true,
      indente: false,
      barre:
        axe && bornes
          ? calculerBarre(toISO(bornes.debut), toISO(bornes.fin), axe)
          : null,
      date_debut: bornes ? toISO(bornes.debut) : null,
      date_fin: bornes ? toISO(bornes.fin) : null,
    });
    enfants.forEach((enfant) => ajouterLigne(enfant, true));
  });

  // Lignes sans titre parent (ou dont le titre a été supprimé)
  const idsTitres = new Set(titres.map((t) => t.id));
  lignes
    .filter((l) => !l.parent || !idsTitres.has(l.parent))
    .forEach((ligne) => ajouterLigne(ligne, false));

  return resultat;
}

/** Point d'entrée : calcule tout ce qu'il faut pour afficher un diagramme. */
export function calculerLayout(elements, echelle) {
  const lignesDatees = (elements || []).filter(
    (e) => e.type_element !== "titre" && e.date_debut && e.date_fin
  );
  const bornes = calculerBornes(lignesDatees);
  const axe = calculerPeriodes(bornes, echelle || "semaine");
  return { axe, lignes: construireLignes(elements, axe), bornes };
}
