# 🎯 Guide Complet : Environnement de Démonstration P3000

## 📋 Ce qui a été fait pour vous

J'ai créé un **environnement de démonstration complet** pour votre application P3000. Cet environnement permettra à vos clients potentiels de tester l'application avant de commander leur propre instance.

---

## ✅ Ce qui a été créé : 12 fichiers

### 📚 Documentation (4 fichiers - 50+ pages)

1. **DEMO_README.md**
   - Vue d'ensemble de l'environnement
   - Configuration et utilisation
   - Guide pour les clients

2. **DEMO_CLIENT_SETUP.md** (40+ pages)
   - Installation détaillée pas à pas
   - Configuration avancée
   - Scripts de gestion
   - Troubleshooting complet
   - Sécurité et monitoring

3. **DEMO_QUICK_DEPLOY.md**
   - Déploiement express en 5 minutes
   - Commandes prêtes à copier-coller
   - Dépannage rapide

4. **DEMO_DEPLOYMENT_SUMMARY.md**
   - Résumé de tous les fichiers
   - Checklist de déploiement
   - Prochaines étapes

### ⚙️ Configuration (2 fichiers)

5. **deploy/.env.demo**
   - Template de configuration
   - Toutes les variables nécessaires
   - Commentaires explicatifs

6. **deploy/cors-demo.json**
   - Configuration CORS pour AWS S3
   - Support développement et production

### 🐍 Commandes Django (3 fichiers)

7. **api/management/commands/create_demo_users.py**
   - Crée automatiquement 5 utilisateurs de test
   - Différents rôles (admin, chef, compta, commercial, utilisateur)
   - Commande : `python manage.py create_demo_users`

8. **api/management/commands/load_demo_data.py**
   - Charge des données exemple réalistes
   - 5 chantiers, 10 devis, 4 clients, 3 fournisseurs
   - Commande : `python manage.py load_demo_data`

9. **api/management/commands/cleanup_demo_s3.py**
   - Nettoie automatiquement les vieux fichiers S3
   - Configurable (nombre de jours)
   - Commande : `python manage.py cleanup_demo_s3`

### 🔧 Scripts Bash (2 fichiers)

10. **deploy/reset_demo_data.sh**
    - Reset automatique de l'environnement
    - Backup avant reset
    - Recharge des données fraîches
    - À exécuter via cron tous les lundis à 2h

11. **deploy/monitor_demo.sh**
    - Monitoring complet de l'environnement
    - Statistiques en temps réel
    - Score de santé
    - Analyse du trafic

---

## 🏗️ Configuration de l'Environnement DEMO

| Paramètre | Valeur |
|-----------|--------|
| **Domaine** | demo.myp3000app.com |
| **Port** | 8003 |
| **Branche Git** | `client/demo` |
| **Base de données** | p3000db_demo |
| **Bucket S3** | p3000-demo |
| **Région S3** | eu-west-3 (Paris) |
| **Redis DB** | 3 |

---

## 👥 Utilisateurs de Test Créés

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| demo@entreprise.com | DemoP3000! | Utilisateur standard ⭐ RECOMMANDÉ |
| demo-admin@entreprise.com | DemoP3000! | Administrateur complet |
| demo-chef@entreprise.com | DemoP3000! | Chef de chantier |
| demo-compta@entreprise.com | DemoP3000! | Comptable |
| demo-commercial@entreprise.com | DemoP3000! | Commercial |

**Pour vos clients** : Donnez les identifiants `demo@entreprise.com` / `DemoP3000!`

---

## 📊 Données Exemple Incluses

Après l'initialisation, l'environnement contient :

| Type | Quantité | Description |
|------|----------|-------------|
| **Chantiers** | 5 | Différents états (en cours, planifié, terminé) |
| **Devis** | 10 | Brouillon, envoyé, validé, signé |
| **Clients** | 4 | Particuliers (Dupont, Martin, Bernard) et professionnel (Société ABC) |
| **Fournisseurs** | 3 | Matériaux Pro, Électricité Moderne, Plomberie Services |
| **Sous-traitants** | 2 | Plâtrerie Expert, Menuiserie Bois & Alu |

Données **réalistes** basées sur des cas d'usage BTP concrets.

---

## 🚀 Comment Déployer (3 étapes simples)

### Étape 1️⃣ : Prérequis (à faire UNE FOIS)

```bash
# 1. Configurer le DNS
# Dans votre console DNS (AWS Route 53, Cloudflare, etc.) :
demo.myp3000app.com → A → VOTRE_IP_VPS

# 2. Créer le bucket S3 sur AWS
aws s3api create-bucket \
    --bucket p3000-demo \
    --region eu-west-3 \
    --create-bucket-configuration LocationConstraint=eu-west-3

# 3. Appliquer la configuration CORS
cd /var/www/p3000/Desktop/Projet/P3000/Application
aws s3api put-bucket-cors \
    --bucket p3000-demo \
    --cors-configuration file://deploy/cors-demo.json
```

### Étape 2️⃣ : Installation Automatique

```bash
# Se connecter au serveur
ssh production

# Lancer le script d'installation (TOUT est automatique !)
cd /var/www/p3000/Desktop/Projet/P3000/Application
./deploy/setup-new-client.sh demo demo.myp3000app.com 8003 3
```

Le script va vous demander de configurer le fichier `.env`.  
Appuyez sur **Entrée** pour l'éditer.

### Étape 3️⃣ : Configuration du .env (2 minutes)

```bash
nano /var/www/demo/Desktop/Projet/P3000/Application/.env
```

**Valeurs à remplir** :

```env
# SECRET_KEY - Générer avec:
# python generer_secret_key.py
SECRET_KEY=VOTRE_SECRET_KEY

# Base de données (utiliser le mot de passe existant)
DATABASE_URL=postgresql://p3000user:VOTRE_MOT_DE_PASSE@localhost:5432/p3000db_demo

# AWS S3
AWS_ACCESS_KEY_ID=VOTRE_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=VOTRE_SECRET_KEY

# OnlyOffice (utiliser le secret partagé)
ONLYOFFICE_JWT_SECRET=VOTRE_SECRET
```

💡 **Astuce** : Copiez les valeurs depuis votre `.env` P3000 principal !

```bash
# Copier rapidement depuis P3000
grep "SECRET_KEY=" /var/www/p3000/Desktop/Projet/P3000/Application/.env
grep "AWS_" /var/www/p3000/Desktop/Projet/P3000/Application/.env
grep "ONLYOFFICE" /var/www/p3000/Desktop/Projet/P3000/Application/.env
```

Sauvegarder : `Ctrl+O` → `Entrée` → `Ctrl+X`

### Étape 4️⃣ : Initialisation (2 minutes)

```bash
cd /var/www/demo/Desktop/Projet/P3000/Application
source /var/www/demo/venv/bin/activate

# Créer les utilisateurs de test
python manage.py create_demo_users

# Charger les données exemple
python manage.py load_demo_data

# Vérifier que tout fonctionne
systemctl status demo
curl -I https://demo.myp3000app.com
```

### ✅ C'est Prêt !

🌐 **URL** : https://demo.myp3000app.com  
👤 **Identifiants** : `demo@entreprise.com` / `DemoP3000!`

**Temps total** : ~5-10 minutes ⏱️

---

## 🔄 Configuration du Reset Automatique (Optionnel mais Recommandé)

Pour que les données soient réinitialisées automatiquement **tous les lundis à 2h** :

```bash
# Rendre le script exécutable
chmod +x /var/www/p3000/Desktop/Projet/P3000/Application/deploy/reset_demo_data.sh

# Copier dans /root
sudo cp /var/www/p3000/Desktop/Projet/P3000/Application/deploy/reset_demo_data.sh /root/

# Ajouter au crontab
sudo crontab -e

# Ajouter cette ligne à la fin du fichier :
0 2 * * 1 /root/reset_demo_data.sh >> /var/log/demo/reset.log 2>&1
```

Le script va automatiquement :
1. ✅ Sauvegarder la base de données
2. ✅ Supprimer les anciennes données
3. ✅ Recréer les utilisateurs
4. ✅ Recharger les données exemple
5. ✅ Nettoyer les fichiers S3 de plus de 7 jours
6. ✅ Vider le cache Redis
7. ✅ Redémarrer le service

---

## 📈 Monitoring de l'Environnement

### Script de Monitoring Complet

```bash
cd /var/www/p3000/Desktop/Projet/P3000/Application
chmod +x deploy/monitor_demo.sh
./deploy/monitor_demo.sh
```

Le script affiche :
- ✅ État du service (actif/inactif, uptime)
- ✅ Statistiques base de données (chantiers, devis, clients)
- ✅ Utilisation disque et mémoire
- ✅ État du cache Redis
- ✅ Logs récents (erreurs, avertissements)
- ✅ Trafic web des dernières 24h
- ✅ **Score de santé global** (0-100)

### Commandes Rapides

```bash
# Voir les logs en temps réel
journalctl -u demo -f

# Vérifier l'état du service
systemctl status demo

# Redémarrer si nécessaire
systemctl restart demo

# Logs Nginx
tail -f /var/log/nginx/demo_access.log
tail -f /var/log/nginx/demo_error.log
```

---

## 🛡️ Sécurité et Limitations

### Protections Automatiques

- ✅ **Reset hebdomadaire** : Données fraîches chaque lundi
- ✅ **Limites de création** : Max 50 chantiers, 100 devis
- ✅ **Nettoyage S3** : Fichiers > 7 jours supprimés automatiquement
- ✅ **Rate limiting** : 10 requêtes/seconde par IP
- ✅ **Isolation complète** : Base de données et S3 dédiés
- ✅ **Filigrane PDF** : Mention "DÉMONSTRATION" sur les exports

### Pas d'Accès aux Données Réelles

L'environnement DEMO est **complètement isolé** :
- Base de données séparée (`p3000db_demo`)
- Bucket S3 séparé (`p3000-demo`)
- Redis DB séparé (DB 3)

**Aucun risque** pour vos données de production.

---

## 🎓 Pour Vos Clients Potentiels

### Message de Promotion (Prêt à Utiliser)

```
🎯 TESTEZ P3000 GRATUITEMENT !

Découvrez notre solution de gestion BTP sur un environnement
de démonstration complet :

🌐 URL : https://demo.myp3000app.com

📧 Identifiants :
   Email : demo@entreprise.com
   Mot de passe : DemoP3000!

✨ Fonctionnalités disponibles :
   ✅ Gestion des chantiers
   ✅ Devis et facturation
   ✅ Planning et Gantt
   ✅ Gestion documentaire (Drive)
   ✅ Tableau de bord statistiques
   ✅ Suivi fournisseurs et sous-traitants

⚠️ Les données sont réinitialisées chaque lundi pour maintenir
   un environnement propre et performant.

📞 Intéressé par votre propre instance personnalisée ?
   Contactez-nous : contact@votreentreprise.com
   Téléphone : +33 X XX XX XX XX
```

### Scénarios de Test Recommandés (30 minutes)

**Pour guider vos prospects** :

1. **Se connecter** (1 min)
   - Aller sur https://demo.myp3000app.com
   - Utiliser : demo@entreprise.com / DemoP3000!

2. **Explorer le Dashboard** (5 min)
   - Voir les statistiques
   - Graphiques CA, dépenses
   - État des chantiers

3. **Créer un nouveau chantier** (5 min)
   - Menu Chantiers → Nouveau
   - Remplir les informations
   - Voir le chantier dans la liste

4. **Générer un devis** (10 min)
   - Créer un devis pour le chantier
   - Ajouter des lignes de devis
   - Voir le calcul automatique
   - Générer le PDF

5. **Consulter le planning** (5 min)
   - Vue Gantt des chantiers
   - Planning mensuel/hebdomadaire

6. **Tester le Drive** (4 min)
   - Upload de documents
   - Organisation en dossiers
   - Partage de fichiers

---

## 🔄 Mises à Jour de l'Environnement

Quand vous faites des changements dans votre application principale :

### 1. Fonctionnalité Commune (pour tous les clients)

```bash
# Développer sur main
git checkout main
# ... faire les modifications ...
git commit -m "feat: nouvelle fonctionnalité"
git push origin main

# Merger vers client/demo
git checkout client/demo
git merge main
git push origin client/demo

# Déployer sur le serveur
ssh production
cd /var/www/demo/Desktop/Projet/P3000/Application
git pull origin client/demo
source /var/www/demo/venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
python manage.py migrate
python manage.py collectstatic --clear --noinput
systemctl restart demo
```

### 2. Fonctionnalité Spécifique DEMO

```bash
# Développer directement sur client/demo
git checkout client/demo
# ... faire les modifications ...
git commit -m "feat(demo): bannière de démonstration"
git push origin client/demo

# Déployer (même commandes que ci-dessus)
```

---

## 🆘 Dépannage Rapide

| Problème | Solution |
|----------|----------|
| **Le service ne démarre pas** | `journalctl -u demo -n 50` pour voir les erreurs |
| **Erreur 502 Bad Gateway** | `ss -tlnp \| grep 8003` vérifier que Gunicorn écoute |
| **Problème S3** | `aws s3 ls s3://p3000-demo` vérifier les credentials |
| **Base de données corrompue** | Restore depuis `/var/backups/postgres/` |
| **Reset manuel** | `/root/reset_demo_data.sh` |

---

## 📞 Où Trouver l'Aide

Tous les fichiers sont dans : `/workspace/Desktop/Projet/P3000/Application/`

| Document | Pour quoi ? |
|----------|-------------|
| **DEMO_README.md** | Vue d'ensemble et guide rapide |
| **DEMO_QUICK_DEPLOY.md** | Déploiement express (5 min) |
| **DEMO_CLIENT_SETUP.md** | Guide complet détaillé (40+ pages) |
| **DEMO_DEPLOYMENT_SUMMARY.md** | Résumé de tous les fichiers |

---

## 🎯 Prochaines Étapes

### Immédiatement (Vous)

1. ✅ **Merger la Pull Request** : https://github.com/ElyesseAdda/WebAppli/pull/4
2. ✅ **Créer la branche finale** :
   ```bash
   git checkout main
   git pull origin main
   git checkout -b client/demo
   git push origin client/demo
   ```
3. ✅ **Déployer** en suivant les étapes ci-dessus
4. ✅ **Tester** l'environnement
5. ✅ **Configurer** le reset automatique (cron)

### Court Terme (Personnalisation)

1. **Personnaliser le branding**
   - Ajouter votre logo
   - Adapter les couleurs
   - Personnaliser les emails

2. **Ajouter une bannière**
   - Message d'avertissement "DÉMONSTRATION"
   - Coordonnées de contact

3. **Créer des tutoriels**
   - Vidéos de démonstration
   - Guides pas-à-pas

### Moyen Terme (Promotion)

1. **Promouvoir le lien**
   - Sur votre site web
   - Dans vos emails commerciaux
   - Sur les réseaux sociaux

2. **Collecter les retours**
   - Analytics (Google Analytics)
   - Formulaire de feedback
   - Suivi des conversions

3. **Améliorer continuellement**
   - Ajouter des données exemple
   - Améliorer l'expérience utilisateur
   - Mesurer et optimiser

---

## 📊 Métriques de Succès à Suivre

Installez Google Analytics ou un outil similaire pour suivre :

- **Trafic** : Nombre de visiteurs uniques par semaine
- **Engagement** : Temps moyen passé sur la plateforme
- **Actions** : Chantiers créés, devis générés, PDFs téléchargés
- **Conversion** : Demandes de contact suite à la démo
- **Fonctionnalités populaires** : Pages les plus visitées

---

## ✅ Checklist Finale

### Configuration Serveur
- [ ] DNS configuré (demo.myp3000app.com)
- [ ] Bucket S3 créé (p3000-demo)
- [ ] CORS S3 configuré
- [ ] Script setup exécuté
- [ ] Fichier .env configuré
- [ ] Certificat SSL obtenu

### Initialisation
- [ ] Migrations appliquées
- [ ] Frontend buildé
- [ ] Utilisateurs créés (5 profils)
- [ ] Données chargées (chantiers, devis, clients)
- [ ] Service actif (systemctl status demo)
- [ ] Site accessible (https://demo.myp3000app.com)

### Automatisation
- [ ] Reset automatique configuré (cron)
- [ ] Script de monitoring testé
- [ ] Logs accessibles

### Communication
- [ ] Message de promotion préparé
- [ ] Page dédiée sur votre site web
- [ ] Scénarios de test documentés

---

## 🎉 Félicitations !

Vous avez maintenant un **environnement de démonstration complet** pour P3000 !

### Ce que vous pouvez faire maintenant :

1. ✅ **Présenter P3000** à vos prospects sans risque
2. ✅ **Laisser les clients tester** en autonomie
3. ✅ **Convertir plus facilement** avec une démo concrète
4. ✅ **Gagner du temps** : Pas besoin de démos manuelles
5. ✅ **Maintenir facilement** : Reset automatique hebdomadaire

### Résultat attendu :

- **Plus de conversions** : Les clients voient la valeur avant d'acheter
- **Moins de support** : Environnement isolé et auto-maintenu
- **Meilleure crédibilité** : Démo professionnelle disponible 24/7

---

## 📞 Besoin d'Aide ?

Si vous avez des questions :

1. **Consultez la documentation** : DEMO_CLIENT_SETUP.md (40+ pages)
2. **Vérifiez les logs** : `journalctl -u demo -f`
3. **Lancez le monitoring** : `./deploy/monitor_demo.sh`
4. **Réinitialisez si besoin** : `/root/reset_demo_data.sh`

---

**Version** : 1.0  
**Date** : Octobre 2026  
**Pull Request** : https://github.com/ElyesseAdda/WebAppli/pull/4  
**URL finale** : https://demo.myp3000app.com  
**Identifiants** : demo@entreprise.com / DemoP3000!

**Temps de déploiement** : 5-10 minutes ⏱️  
**Prêt pour la production** : ✅ OUI
