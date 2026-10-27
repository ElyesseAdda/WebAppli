# Drive et chemins de fichiers

## Drive (ordinateur)

**Où :** menu **Drive**.

Parcourir les dossiers, envoyer, chercher, copier, coller, déplacer, renommer, supprimer. Tout utilisateur connecté y a accès.

**Barre :** **Rechercher...**, **Rechercher**, **Actualiser**, **Nouveau dossier**, **Upload**.

**Fil d'Ariane :** **Racine** puis les dossiers. **Dossier précédent**, **Dossier parent**, **Dossier suivant** (dernier visité).

**Menu d'un fichier ou d'un dossier** (clic droit ou barre **Actions**) :

- **Prévisualiser**
- **Télécharger**
- **Télécharger le dossier**
- **Imprimer**
- **Copier**
- **Coller**
- **Renommer**
- **Déplacer**
- **Supprimer**

La sélection affiche **X sélectionné(s)**. On peut aussi glisser des fichiers vers le fil d'Ariane pour les déplacer. Un dossier protégé affiche **(protégé)** : on ne le renomme pas et on ne le supprime pas.

### Recherche

Taper le nom puis **Rechercher** ou Entrée. La recherche ne se lance pas à chaque lettre.

Résultat : **Résultats pour "…"**, **X dossier(s) et Y fichier(s) trouvé(s)**, sections **Dossiers** et **Fichiers**. **Aucun résultat trouvé** ou **Erreur lors de la recherche**. Un clic ouvre le dossier qui contient l'élément. La croix ferme la recherche.

### Envoi de fichiers

Bouton **Upload** ou glisser-déposer.

- Mode **Fichiers** ou **Dossier**.
- **Fichiers sélectionnés** / **Contenu du dossier**.
- **Annuler**. **Fermer** pendant l'envoi. Barre de progression.
- Si le nom existe déjà : **Fichiers existants détectés**.

Pour garder l'arborescence d'un dossier Windows, utiliser **Upload → Dossier**. Coller avec Ctrl+V envoie les fichiers mais perd la structure des dossiers. Les fichiers système du type dossiers cachés sont ignorés.

### Aperçu et édition

**Prévisualiser** ouvre images, PDF et documents Office.

- **Retour**, **Retour à la liste**, **Télécharger**.
- Word, Excel et PowerPoint passent par l'éditeur en ligne. S'il ne démarre pas, le message **OnlyOffice non disponible** indique quoi vérifier (serveur, port). Sur téléphone, cet éditeur n'est pas proposé dans l'aperçu.
- L'éditeur affiche **Initialisation de l'éditeur OnlyOffice**. En cas d'échec, un bouton de rechargement est proposé. L'écran est prévu pour un ordinateur (environ 800×600 au minimum).

## Conflit quand un PDF est généré

Fenêtre **Conflit de fichier détecté**, partout dans l'application (devis, planning, rapports, etc.) quand le fichier existe déjà dans le Drive.

- **Fichier existant :** et lien **Voir dans le Drive**.
- **Que souhaitez-vous faire ?**
- **Remplacer le fichier existant** : l'ancien fichier va dans **Historique** et peut être supprimé au bout de 30 jours.
- **Créer avec un nouveau nom** : champ **Nouveau nom de fichier**.
- **Annuler**, puis **Remplacer le fichier** ou valider le nouveau nom.

Ce n'est pas la même fenêtre que **Fichiers existants détectés** de l'envoi manuel dans le Drive.

## Drive sur téléphone

Accueil mobile → carte **Drive**, si l'accès **Drive** est coché pour le compte (ou si le compte est staff / superuser).

Barre **Drive** : **Retour**, **Accueil mobile**, **Rafraîchir**, **Nouveau dossier**, **Déconnexion**. Fil **Racine**. Bouton **Envoyer des fichiers** (plusieurs fichiers, pas un dossier entier). Menu **Aperçu**, **Télécharger**. **Nouveau dossier** : **Nom du dossier**, **Annuler**, **Créer**. État **Dossier vide**.

Pas de recherche globale, ni copier / coller / déplacer comme sur ordinateur.

## Chemins Drive des chantiers

Pas à pas (modifier, transférer les fichiers, réinitialiser) : `11-depenses-chantier-agence-drive-agents.md`, chapitre 6.

**Où :** menu **Chemins Drive**. Titre **Chemins de Drive par Chantier**.

Voir et changer le dossier Drive de chaque chantier, puis l'ouvrir au bon endroit.

Recherche : **Rechercher par nom de chantier, société ou chemin de drive...**

Colonnes : identifiant, **Nom du Chantier**, **Société**, **État**, **Date de Début**, **Chemin de Drive**, **Actions**.

- **Modifier le chemin** : **Sélectionner un nouveau chemin**, **Modifier le chemin sélectionné**, **Réinitialiser au chemin par défaut**, **Annuler**, **Enregistrer**. Si rien n'a changé : **Le chemin n'a pas changé**. Un changement peut déplacer automatiquement les fichiers déjà rangés.
- **Copier le chemin**
- **Ouvrir dans le Drive**

La liste ne montre que les chantiers, pas les appels d'offres. Lors de la transformation d'un appel d'offres en chantier, le chemin se choisit à ce moment-là.

Depuis une fiche chantier, **Accéder au Drive** ouvre le dossier du chantier.

## Récupérer un fichier supprimé

**Où :** **Admin → Récupération Drive** (menu visible pour staff ou superuser). Titre **Récupération de fichiers supprimés**.

Utile seulement si l'historique des versions du stockage est activé. L'écran l'indique : **Versioning** **Activé**, **Désactivé** ou **Erreur**.

- Compteurs **Total supprimés**, dossiers et fichiers de l'emplacement courant.
- **Tout restaurer ici**, **Remettre dans le Drive**, **Restaurer simple**, **Actualiser**.
- Par dossier : restaurer tout le dossier. Par fichier : télécharger ou restaurer.

Si le versioning est désactivé, la restauration n'est pas possible depuis cet écran.
