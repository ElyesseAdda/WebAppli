# Guide d'Installation Docker et OnlyOffice - Production et Local

Ce guide vous fournit les instructions étape par étape pour installer Docker et OnlyOffice Document Server sur votre environnement de **production Linux** et pour configurer votre environnement **local**.

---

## 📍 Informations de votre Environnement

### Production
- **Serveur SSH** : `root@72.60.90.127`
- **Chemin du projet** : `/var/www/p3000/Desktop/Projet/P3000/Application`
- **Domaine** : `https://myp3000app.com/`
- **IP du serveur** : `72.60.90.127`

### Local
- **Chemin du projet** : `C:\Users\User\Desktop\Projets\WebAppli\Desktop\Projet\P3000\Application` (Windows)

---

## 🚀 PARTIE 1 : INSTALLATION EN PRODUCTION

### Étape 1 : Connexion au serveur

```bash
ssh root@72.60.90.127
```

### Étape 2 : Installation de Docker

#### 2.1 Mise à jour du système

```bash
apt update
apt upgrade -y
```

#### 2.2 Installation des dépendances

```bash
apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

#### 2.3 Ajout de la clé GPG officielle de Docker

```bash
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

#### 2.4 Configuration du dépôt Docker

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
```

**Note** : Si vous êtes sur Debian, remplacez `ubuntu` par `debian` dans l'URL.

#### 2.5 Installation de Docker Engine

```bash
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

#### 2.6 Vérification de l'installation

```bash
docker --version
docker run hello-world
```

#### 2.7 Configuration de Docker pour démarrer au boot

```bash
systemctl enable docker
systemctl start docker
```

### Étape 3 : Installation de OnlyOffice Document Server

#### 3.1 Création du répertoire OnlyOffice

**📍 Important** : OnlyOffice doit être installé dans un répertoire **séparé** de votre projet Django.

```bash
mkdir -p /opt/onlyoffice
cd /opt/onlyoffice
```

#### 3.2 Création du fichier docker-compose.yml

```bash
nano docker-compose.yml
```

Collez le contenu suivant (version complète avec PostgreSQL, Redis et RabbitMQ) :

```yaml
version: '3.8'

services:
  onlyoffice:
    image: onlyoffice/documentserver:latest
    container_name: onlyoffice
    restart: always
    ports:
      - "8080:80"
    environment:
      # Configuration JWT (IMPORTANT : Changez ces valeurs !)
      - JWT_ENABLED=true
      - JWT_SECRET=votre-secret-jwt-super-long-et-complexe-changez-moi
      - JWT_HEADER=Authorization
      # Configuration de la base de données
      - DB_TYPE=postgres
      - DB_HOST=db
      - DB_NAME=onlyoffice
      - DB_USER=onlyoffice
      - DB_PWD=onlyoffice_password_changez_moi
      # Configuration Redis
      - REDIS_SERVER=redis
      # Configuration du serveur
      - AMQP_SERVER=rabbitmq
      - AMQP_TYPE=rabbitmq
    volumes:
      - onlyoffice_data:/var/www/onlyoffice/Data
      - onlyoffice_logs:/var/log/onlyoffice
    depends_on:
      - db
      - redis
      - rabbitmq
    networks:
      - onlyoffice_network

  # Base de données PostgreSQL
  db:
    image: postgres:15
    container_name: onlyoffice_db
    restart: always
    environment:
      - POSTGRES_DB=onlyoffice
      - POSTGRES_USER=onlyoffice
      - POSTGRES_PASSWORD=onlyoffice_password_changez_moi
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - onlyoffice_network

  # Redis pour le cache
  redis:
    image: redis:7-alpine
    container_name: onlyoffice_redis
    restart: always
    networks:
      - onlyoffice_network

  # RabbitMQ pour la messagerie
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: onlyoffice_rabbitmq
    restart: always
    environment:
      - RABBITMQ_DEFAULT_USER=onlyoffice
      - RABBITMQ_DEFAULT_PASS=rabbitmq_password_changez_moi
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - onlyoffice_network

volumes:
  onlyoffice_data:
  onlyoffice_logs:
  postgres_data:
  rabbitmq_data:

networks:
  onlyoffice_network:
    driver: bridge
```

**⚠️ IMPORTANT** : 
1. **Changez tous les mots de passe** dans ce fichier avant de continuer !
2. **Notez le JWT_SECRET** car vous devrez l'utiliser dans le fichier `.env` de Django.

#### 3.3 Version simplifiée (alternative - sans PostgreSQL/Redis)

Si vous préférez une version plus simple pour commencer :

```yaml
version: '3.8'

services:
  onlyoffice:
    image: onlyoffice/documentserver:latest
    container_name: onlyoffice
    restart: always
    ports:
      - "8080:80"
    environment:
      - JWT_ENABLED=true
      - JWT_SECRET=votre-secret-jwt-super-long-et-complexe-changez-moi
      - JWT_HEADER=Authorization
    volumes:
      - onlyoffice_data:/var/www/onlyoffice/Data
      - onlyoffice_logs:/var/log/onlyoffice
    networks:
      - onlyoffice_network

volumes:
  onlyoffice_data:
  onlyoffice_logs:

networks:
  onlyoffice_network:
    driver: bridge
```

#### 3.4 Démarrage de OnlyOffice

```bash
cd /opt/onlyoffice
docker compose up -d
```

#### 3.5 Vérification que le conteneur fonctionne

```bash
docker ps
docker logs onlyoffice
```

Attendez 1-2 minutes pour que le serveur démarre complètement.

#### 3.6 Test de santé du serveur

```bash
curl http://localhost:8080/healthcheck
```

Vous devriez recevoir `true` en réponse.

### Étape 4 : Configuration du Firewall

```bash
# Autoriser le port 8080 (OnlyOffice)
ufw allow 8080/tcp

# Vérifier le statut
ufw status
```

### Étape 5 : Configuration Django en Production

#### 5.1 Accéder au répertoire du projet

```bash
cd /var/www/p3000/Desktop/Projet/P3000/Application
```

#### 5.2 Modifier le fichier .env

```bash
nano .env
```

Ajoutez ou modifiez ces lignes (remplacez `votre-secret-jwt-super-long-et-complexe-changez-moi` par le même secret que dans `docker-compose.yml`) :

```bash
# OnlyOffice Configuration pour le serveur 72.60.90.127
ONLYOFFICE_SERVER_URL=http://72.60.90.127:8080
ONLYOFFICE_JWT_SECRET=Ayla220223@@
ONLYOFFICE_JWT_ENABLED=true
ONLYOFFICE_JWT_HEADER=Authorization
```

**⚠️ CRITIQUE** : Le `JWT_SECRET` dans `.env` doit être **EXACTEMENT IDENTIQUE** au `JWT_SECRET` dans `/opt/onlyoffice/docker-compose.yml`.

#### 5.3 Vérifier ALLOWED_HOSTS dans settings.py

```bash
nano Application/settings.py
```

Vérifiez que `ALLOWED_HOSTS` contient votre IP et domaine :

```python
ALLOWED_HOSTS = [
    'myp3000app.com',
    'www.myp3000app.com',
    '72.60.90.127',  # IP du serveur
    'localhost',
    '127.0.0.1',
]
```
x
```bash
# Si vous utilisez systemd
systemctl restart gunicorn

# OU si vous utilisez supervisor
supervisorctl restart gunicorn

# OU si vous utilisez directement
pkill -HUP gunicorn
```

### Étape 6 : Tests en Production

#### 6.1 Test depuis le serveur

```bash
# Test de santé OnlyOffice
curl http://localhost:8080/healthcheck

# Test depuis l'extérieur (depuis votre machine locale)
curl http://72.60.90.127:8080/healthcheck
```

#### 6.2 Test depuis l'application Django

1. Connectez-vous à votre application : `https://myp3000app.com/`
2. Allez dans Drive V2
3. Ouvrez un fichier Office (Word, Excel, PowerPoint) ou PDF
4. Vérifiez que OnlyOffice s'affiche correctement

#### 6.3 Vérification des logs

```bash
# Logs OnlyOffice
docker logs onlyoffice

# Logs Django (adaptez le chemin selon votre configuration)
tail -f /var/log/gunicorn/error.log
```

---

## 💻 PARTIE 2 : CONFIGURATION EN LOCAL (Windows)

### Étape 1 : Vérifier que Docker Desktop est installé

Assurez-vous que Docker Desktop est installé et en cours d'exécution sur Windows.

### Étape 2 : Créer le répertoire OnlyOffice (optionnel - si vous voulez le séparer)

```powershell
# Créer un répertoire pour OnlyOffice (par exemple dans C:\)
mkdir C:\onlyoffice
cd C:\onlyoffice
```

**Note** : Vous pouvez aussi créer le `docker-compose.yml` directement dans votre projet Django si vous préférez.

### Étape 3 : Créer le fichier docker-compose.yml

Créez un fichier `docker-compose.yml` dans `C:\onlyoffice` (ou dans votre projet) :

```yaml
version: '3.8'

services:
  onlyoffice:
    image: onlyoffice/documentserver:latest
    container_name: onlyoffice
    restart: always
    ports:
      - "8080:80"
    environment:
      - JWT_ENABLED=true
      - JWT_SECRET=votre-secret-jwt-local-changez-moi
      - JWT_HEADER=Authorization
    volumes:
      - onlyoffice_data:/var/www/onlyoffice/Data
      - onlyoffice_logs:/var/log/onlyoffice
    networks:
      - onlyoffice_network

volumes:
  onlyoffice_data:
  onlyoffice_logs:

networks:
  onlyoffice_network:
    driver: bridge
```

### Étape 4 : Démarrer OnlyOffice en local

```powershell
cd C:\onlyoffice
docker compose up -d
```

### Étape 5 : Vérifier que OnlyOffice fonctionne

```powershell
# Test de santé
curl http://localhost:8080/healthcheck
```

### Étape 6 : Configuration Django en Local

#### 6.1 Accéder au répertoire du projet

```powershell
cd C:\Users\User\Desktop\Projets\WebAppli\Desktop\Projet\P3000\Application
```

#### 6.2 Modifier le fichier .env

Ouvrez le fichier `.env` et ajoutez ou modifiez ces lignes :

```bash
# OnlyOffice Configuration pour le local
ONLYOFFICE_SERVER_URL=http://localhost:8080
ONLYOFFICE_JWT_SECRET=votre-secret-jwt-local-changez-moi
ONLYOFFICE_JWT_ENABLED=true
ONLYOFFICE_JWT_HEADER=Authorization
```

**⚠️ IMPORTANT** : Le `JWT_SECRET` dans `.env` doit être **identique** au `JWT_SECRET` dans votre `docker-compose.yml` local.

#### 6.3 Redémarrer Django

Redémarrez votre serveur Django local.

### Étape 7 : Tests en Local

1. Démarrez votre application Django en local
2. Allez dans Drive V2
3. Ouvrez un fichier Office
4. Vérifiez que OnlyOffice s'affiche correctement

---

## 🔧 COMMANDES UTILES

### Production

```bash
# Voir les conteneurs en cours d'exécution
docker ps

# Voir les logs OnlyOffice
docker logs onlyoffice

# Redémarrer OnlyOffice
cd /opt/onlyoffice
docker compose restart

# Arrêter OnlyOffice
cd /opt/onlyoffice
docker compose down

# Démarrer OnlyOffice
cd /opt/onlyoffice
docker compose up -d

# Mettre à jour OnlyOffice
cd /opt/onlyoffice
docker compose pull
docker compose up -d
```

### Local (Windows PowerShell)

```powershell
# Voir les conteneurs en cours d'exécution
docker ps

# Voir les logs OnlyOffice
docker logs onlyoffice

# Redémarrer OnlyOffice
cd C:\onlyoffice
docker compose restart

# Arrêter OnlyOffice
cd C:\onlyoffice
docker compose down

# Démarrer OnlyOffice
cd C:\onlyoffice
docker compose up -d
```

---

## 🐛 DÉPANNAGE

### Problème : OnlyOffice ne démarre pas

**Production :**
```bash
# Vérifier les logs
docker logs onlyoffice

# Vérifier que le port est libre
netstat -tulpn | grep 8080

# Redémarrer le conteneur
docker restart onlyoffice
```

**Local :**
```powershell
# Vérifier les logs
docker logs onlyoffice

# Vérifier que le port est libre
netstat -ano | findstr :8080

# Redémarrer le conteneur
docker restart onlyoffice
```

### Problème : Erreur de connexion depuis Django

1. Vérifiez que `ONLYOFFICE_SERVER_URL` dans `.env` est correct
2. Vérifiez que le `JWT_SECRET` est **identique** dans Django et Docker
3. Vérifiez les logs Django pour les erreurs de connexion
4. Testez la connectivité :
   - **Production** : `curl http://72.60.90.127:8080/healthcheck`
   - **Local** : `curl http://localhost:8080/healthcheck`

### Problème : Les fichiers ne se sauvegardent pas

1. Vérifiez les logs OnlyOffice : `docker logs onlyoffice`
2. Vérifiez que le callback URL est accessible depuis Docker
3. Vérifiez la configuration CORS de S3 (si vous utilisez S3 direct)
4. Le code Django détecte automatiquement l'environnement et ajuste les URLs de callback

---

## ✅ CHECKLIST DE DÉPLOIEMENT

### Production
- [ ] Docker installé et fonctionnel
- [ ] OnlyOffice conteneur démarré et accessible
- [ ] Port 8080 ouvert dans le firewall
- [ ] Variables d'environnement Django configurées dans `/var/www/p3000/Desktop/Projet/P3000/Application/.env`
- [ ] JWT_SECRET identique dans Django et Docker
- [ ] ALLOWED_HOSTS mis à jour dans `Application/settings.py`
- [ ] Test de santé OnlyOffice réussi : `curl http://localhost:8080/healthcheck`
- [ ] Test d'édition de document réussi depuis l'application
- [ ] Logs vérifiés et sans erreur

### Local
- [ ] Docker Desktop installé et en cours d'exécution
- [ ] OnlyOffice conteneur démarré et accessible
- [ ] Variables d'environnement Django configurées dans `.env`
- [ ] JWT_SECRET identique dans Django et Docker
- [ ] Test de santé OnlyOffice réussi : `curl http://localhost:8080/healthcheck`
- [ ] Test d'édition de document réussi depuis l'application locale

---

## 📝 RÉSUMÉ DES CHEMINS

### Production
- **Projet Django** : `/var/www/p3000/Desktop/Projet/P3000/Application`
- **Fichier .env** : `/var/www/p3000/Desktop/Projet/P3000/Application/.env`
- **Settings.py** : `/var/www/p3000/Desktop/Projet/P3000/Application/Application/settings.py`
- **OnlyOffice** : `/opt/onlyoffice`
- **docker-compose.yml** : `/opt/onlyoffice/docker-compose.yml`

### Local
- **Projet Django** : `C:\Users\User\Desktop\Projets\WebAppli\Desktop\Projet\P3000\Application`
- **Fichier .env** : `C:\Users\User\Desktop\Projets\WebAppli\Desktop\Projet\P3000\Application\.env`
- **Settings.py** : `C:\Users\User\Desktop\Projets\WebAppli\Desktop\Projet\P3000\Application\Application\settings.py`
- **OnlyOffice** : `C:\onlyoffice` (ou dans votre projet)
- **docker-compose.yml** : `C:\onlyoffice\docker-compose.yml` (ou dans votre projet)

---

## 🔐 SÉCURITÉ

**⚠️ IMPORTANT** :
1. **Changez tous les mots de passe** par défaut dans `docker-compose.yml`
2. **Utilisez un JWT_SECRET fort et unique** (minimum 32 caractères)
3. **Ne commitez jamais** le fichier `.env` dans Git
4. **En production**, considérez l'utilisation de HTTPS pour OnlyOffice via Nginx reverse proxy

---

## 📞 SUPPORT

En cas de problème :
1. Vérifiez les logs Docker : `docker logs onlyoffice`
2. Vérifiez les logs Django/Gunicorn
3. Vérifiez la connectivité réseau : `curl http://localhost:8080/healthcheck`
4. Vérifiez que les variables d'environnement sont correctement configurées

