# Résumé des Heures par Agent - Documentation

## Vue d'ensemble

Cette fonctionnalité permet de générer un résumé mensuel des heures travaillées par agent, incluant les heures normales, les heures majorées (samedi, dimanche, fériés) et les montants correspondants. Le résumé peut être exporté en PDF pour transmission au comptable.

## Fonctionnalités

### 1. Affichage du Résumé

- **Vue par agent** : Chaque agent est affiché avec ses heures et montants totaux
- **Détail des heures** : Heures normales, samedi (125%), dimanche (150%), fériés (150%)
- **Jours majorés** : Liste détaillée des jours avec majoration
- **Chantiers** : Liste des chantiers sur lesquels l'agent a travaillé

### 2. Génération PDF

- **Template professionnel** : Mise en page adaptée pour la comptabilité
- **Données complètes** : Toutes les informations nécessaires pour la paie
- **Format A4** : Optimisé pour l'impression

## Utilisation

### Accès à la fonctionnalité

1. Aller dans la section "Planning" de l'application
2. Cliquer sur le bouton **"Résumé par Agent"** (bouton vert)
3. Sélectionner le mois souhaité dans le menu déroulant
4. Cliquer sur **"Télécharger PDF"** pour générer le document

### Interface utilisateur

- **Sélection du mois** : Menu déroulant avec les 25 derniers mois
- **Affichage des données** : Accordéons par agent avec détails
- **Génération PDF** : Bouton avec indicateur de chargement

## Architecture technique

### Composants React

- `AgentHoursSummary.js` : Composant principal d'affichage
- `generate_agent_hours_pdf.js` : Script Puppeteer pour la génération PDF

### Backend Django

- `agent_hours_views.py` : Vues pour la prévisualisation et génération PDF
- `agent_hours_summary.html` : Template HTML pour le PDF

### Endpoints API

- `GET /api/preview-agent-hours-summary/?month=YYYY-MM` : Prévisualisation
- `POST /api/generate-agent-hours-pdf/` : Génération du PDF

## Données calculées

### Heures par type

- **Heures normales** : Taux horaire standard
- **Samedi** : Taux horaire × 1.25
- **Dimanche** : Taux horaire × 1.5
- **Fériés** : Taux horaire × 1.5

### Agrégation

- **Par agent** : Regroupement de toutes les heures d'un agent
- **Par chantier** : Identification des chantiers travaillés
- **Par mois** : Filtrage sur la période sélectionnée

## Configuration requise

### Dépendances

- **Puppeteer** : Pour la génération PDF
- **Node.js** : Pour l'exécution des scripts
- **Django** : Backend API
- **React** : Interface utilisateur

### Chemins de fichiers

- Script Puppeteer : `frontend/src/components/generate_agent_hours_pdf.js`
- Template HTML : `frontend/templates/agent_hours_summary.html`
- PDF généré : `frontend/src/components/agent_hours_summary.pdf`

## Format du PDF

### En-tête

- Titre : "Résumé des Heures par Agent"
- Période : Mois et année

### Section par agent

- **Nom de l'agent**
- **Liste des chantiers**
- **Résumé des heures** (normales, samedi, dimanche, fériés)
- **Montants** correspondants
- **Total** des heures et montants

### Détail des jours majorés

- **Date** (format DD/MM/YY)
- **Type** de majoration
- **Heures** travaillées
- **Taux** appliqué

## Utilisation comptable

Le PDF généré contient toutes les informations nécessaires pour :

- Calculer la paie des agents
- Vérifier les majorations
- Justifier les heures travaillées
- Archiver les données de paie

## Maintenance

### Mise à jour des taux

Les taux de majoration sont définis dans le code :

- Samedi : 125% (1.25)
- Dimanche : 150% (1.5)
- Fériés : 150% (1.5)

### Ajout de nouveaux types de majoration

1. Modifier la logique dans `agent_hours_views.py`
2. Mettre à jour le template HTML
3. Adapter l'affichage dans le composant React

## Dépannage

### Erreurs courantes

- **PDF non généré** : Vérifier que Puppeteer est installé
- **Données manquantes** : Vérifier les données de planning
- **Erreur de chemin** : Vérifier les chemins dans les vues Django

### Logs

Les erreurs sont loggées dans la console Django avec :

- URL de prévisualisation
- Chemin du script Puppeteer
- Sortie d'erreur détaillée
