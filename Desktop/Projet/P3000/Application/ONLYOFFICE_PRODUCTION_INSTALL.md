# Guide d'Installation OnlyOffice en Production

Ce guide vous permettra d'installer Docker et OnlyOffice Document Server sur votre serveur Linux de production.

**📍 Serveur de production : 72.60.90.127**

## 🎯 Configuration Spécifique pour 72.60.90.127

### Variables d'environnement Django (.env)

```bash
# OnlyOffice - Configuration pour le serveur 72.60.90.127
ONLYOFFICE_SERVER_URL=http://72.60.90.127:8080
ONLYOFFICE_JWT_SECRET=votre-secret-jwt-super-long-et-complexe-changez-moi
ONLYOFFICE_JWT_ENABLED=true
ONLYOFFICE_JWT_HEADER=Authorization
```

### docker-compose.yml - Variables à configurer

```yaml
environment:
  - JWT_ENABLED=true
  - JWT_SECRET=votre-secret-jwt-super-long-et-complexe-changez-moi  # ⚠️ IDENTIQUE à .env Django
  - JWT_HEADER=Authorization
```

### ALLOWED_HOSTS dans settings.py

```python
ALLOWED_HOSTS = [
    'myp3000app.com',
    'www.myp3000app.com',
    '72.60.90.127',  # IP du serveur
    'localhost',
    '127.0.0.1',
]
```

### Commandes de test

```bash
# Test OnlyOffice depuis le serveur
curl http://localhost:8080/healthcheck

# Test OnlyOffice depuis l'extérieur
curl http://72.60.90.127:8080/healthcheck

# Test Django depuis l'extérieur
curl http://72.60.90.127:8000/api/drive-v2/check-onlyoffice/
```

---

## ⚡ Installation Rapide (Résumé)

Si vous êtes pressé, voici les commandes essentielles :

```bash
# 1. Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Créer le répertoire et docker-compose.yml
sudo mkdir -p /opt/onlyoffice && cd /opt/onlyoffice
# Copiez le contenu docker-compose.yml (voir section 2.2)

# 3. Démarrer OnlyOffice
sudo docker compose up -d

# 4. Vérifier
curl http://localhost:8080/healthcheck

# 5. Configurer .env Django
# Ajoutez :
# ONLYOFFICE_SERVER_URL=http://72.60.90.127:8080
# ONLYOFFICE_JWT_SECRET=votre-secret-jwt-super-long-et-complexe-changez-moi
# (identique à docker-compose.yml)
```

**⚠️ N'oubliez pas de :**
- Changer les mots de passe dans `docker-compose.yml`
- Configurer les variables d'environnement Django
- Ouvrir le port 8080 dans le firewall
- Redémarrer Django/Gunicorn après configuration

---

## 📋 Prérequis

- Serveur Linux (Ubuntu 20.04+ / Debian 11+ / CentOS 8+)
- Accès root ou utilisateur avec sudo
- Au moins 4 Go de RAM (8 Go recommandé)
- Au moins 20 Go d'espace disque libre
- Port 8080 disponible (ou un autre port de votre choix)

---

## 🔧 Étape 1 : Installation de Docker

### 1.1 Mise à jour du système

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 Installation des dépendances

```bash
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

### 1.3 Ajout de la clé GPG officielle de Docker

```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

### 1.4 Configuration du dépôt Docker

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

**Note :** Si vous êtes sur Debian, remplacez `ubuntu` par `debian` dans l'URL.

### 1.5 Installation de Docker Engine

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 1.6 Vérification de l'installation

```bash
sudo docker --version
sudo docker run hello-world
```

### 1.7 Configuration de Docker pour démarrer au boot

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

### 1.8 Ajout de l'utilisateur au groupe docker (optionnel mais recommandé)

```bash
sudo usermod -aG docker $USER
# Déconnexion/reconnexion nécessaire pour que les changements prennent effet
```

---

## 🐳 Étape 2 : Installation de OnlyOffice Document Server

### 2.1 Création du répertoire de configuration

**📍 Important :** OnlyOffice doit être installé dans un répertoire **séparé** de votre projet Django, de préférence dans `/opt/onlyoffice` (standard Linux pour les applications système).

**Pourquoi séparé ?**
- OnlyOffice est un service indépendant qui peut servir plusieurs applications
- Facilite la maintenance et les mises à jour
- Meilleure organisation et sécurité
- Permet de redémarrer OnlyOffice sans affecter Django

```bash
# Créer le répertoire OnlyOffice (SÉPARÉ du projet Django)
sudo mkdir -p /opt/onlyoffice
cd /opt/onlyoffice
```

**Structure recommandée :**
```
/
├── opt/
│   └── onlyoffice/          # ← OnlyOffice ici (service système)
│       ├── docker-compose.yml
│       └── ...
├── home/
│   └── votre-user/
│       └── votre-projet/    # ← Votre projet Django reste ici
│           ├── Application/
│           ├── api/
│           └── ...
```

### 2.2 Création du fichier docker-compose.yml

```bash
sudo nano docker-compose.yml
```

Collez le contenu suivant :

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
      # WebSocket / reverse proxy : aide si Nginx ou Traefik gère le SSL
      - WOPI_ENABLED=true
      - USE_UNAUTHORIZED_STORAGE=true
      # Configuration de la base de données (optionnel, pour la persistance)
      - DB_TYPE=postgres
      - DB_HOST=db
      - DB_NAME=onlyoffice
      - DB_USER=onlyoffice
      - DB_PWD=onlyoffice_password_changez_moi
      # Configuration Redis (optionnel, pour le cache)
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

  # Base de données PostgreSQL (optionnel mais recommandé pour la production)
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

  # Redis pour le cache (optionnel mais recommandé)
  redis:
    image: redis:7-alpine
    container_name: onlyoffice_redis
    restart: always
    networks:
      - onlyoffice_network

  # RabbitMQ pour la messagerie (requis)
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

**⚠️ IMPORTANT :** Modifiez les mots de passe dans le fichier avant de continuer !

### 2.3 Version simplifiée (sans PostgreSQL/Redis - pour test rapide)

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
      # WebSocket / reverse proxy (Nginx ou Traefik gère le SSL)
      - WOPI_ENABLED=true
      - USE_UNAUTHORIZED_STORAGE=true
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

### 2.4 Démarrage de OnlyOffice

```bash
sudo docker compose up -d
```

### 2.5 Vérification que le conteneur fonctionne

```bash
sudo docker ps
sudo docker logs onlyoffice
```

Vous devriez voir des logs indiquant que le serveur démarre. Attendez 1-2 minutes pour que tout soit prêt.

### 2.6 Test de santé du serveur

```bash
curl http://localhost:8080/healthcheck
```

Vous devriez recevoir `true` en réponse.

---

## 🔐 Étape 3 : Configuration de la Sécurité

### 3.1 Configuration du Firewall (UFW)

```bash
# Autoriser le port 8080 (OnlyOffice)
sudo ufw allow 8080/tcp

# Vérifier le statut
sudo ufw status
```

### 3.2 Configuration SELinux (si applicable sur CentOS/RHEL)

```bash
sudo setsebool -P httpd_can_network_connect 1
```

---

## 🌐 Étape 4 : Configuration Nginx (Reverse Proxy)

Si vous utilisez déjà Nginx pour votre application Django, vous pouvez ajouter une configuration pour OnlyOffice.

### 4.1 Création du fichier de configuration Nginx

**Pour myp3000app** : la config complète (map WebSocket + `location /onlyoffice/`) est dans `nginx_myp3000app.conf`.  
Si vous créez un fichier dédié OnlyOffice, assurez-vous d’inclure la **map WebSocket** (obligatoire pour éviter « Connexion au serveur perdue »).

```bash
sudo nano /etc/nginx/sites-available/onlyoffice
```

Collez le contenu suivant (adaptez si vous avez un domaine) :

```nginx
# WebSocket : map obligatoire pour OnlyOffice (évite 400 sur handshake)
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# Configuration OnlyOffice Document Server
server {
    listen 80;
    server_name 72.60.90.127;  # OU votre-domaine.com si vous en avez un

    # Redirection vers HTTPS (recommandé en production)
    # return 301 https://$server_name$request_uri;

    # Configuration pour OnlyOffice (WebSocket + proxy)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
        client_max_body_size 100M;
    }
}
```

### 4.2 Activation du site

```bash
sudo ln -s /etc/nginx/sites-available/onlyoffice /etc/nginx/sites-enabled/
sudo nginx -t  # Vérifier la configuration
sudo systemctl reload nginx
```

### 4.3 Configuration HTTPS avec Let's Encrypt (recommandé)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d onlyoffice.votre-domaine.com
```

---

## ⚙️ Étape 5 : Configuration Django

### 5.1 Mise à jour du fichier .env de production

Ajoutez ou modifiez ces variables dans votre fichier `.env` de production :

```bash
# OnlyOffice Configuration pour le serveur 72.60.90.127
# Option 1 : Utiliser l'IP du serveur (recommandé)
ONLYOFFICE_SERVER_URL=http://72.60.90.127:8080

# Option 2 : Utiliser un domaine (si vous avez configuré Nginx avec un domaine)
# ONLYOFFICE_SERVER_URL=https://onlyoffice.votre-domaine.com

# Option 3 : Utiliser localhost (si Django et OnlyOffice sont sur le même serveur)
# ONLYOFFICE_SERVER_URL=http://localhost:8080

# Configuration JWT (DOIT être identique à docker-compose.yml)
ONLYOFFICE_JWT_SECRET=votre-secret-jwt-super-long-et-complexe-changez-moi
ONLYOFFICE_JWT_ENABLED=true
ONLYOFFICE_JWT_HEADER=Authorization
```

**⚠️ IMPORTANT :** 
- Le `JWT_SECRET` dans `.env` Django doit être **identique** au `JWT_SECRET` dans `docker-compose.yml`
- Pour votre serveur **72.60.90.127**, utilisez : `ONLYOFFICE_SERVER_URL=http://72.60.90.127:8080`
- Si Django et OnlyOffice sont sur le même serveur, vous pouvez aussi utiliser `localhost:8080` (le code détectera automatiquement)
- Si vous utilisez un domaine, utilisez l'URL complète avec `https://`
- Le code Django détecte automatiquement l'environnement et ajuste les URLs de callback pour Docker

### 5.2 Mise à jour de ALLOWED_HOSTS

Dans `Application/settings.py`, assurez-vous que votre IP serveur ou domaine est dans `ALLOWED_HOSTS` :

```python
ALLOWED_HOSTS = [
    'myp3000app.com',
    'www.myp3000app.com',
    'votre-ip-serveur',  # Ajoutez votre IP
    'localhost',
    '127.0.0.1',
]
```

### 5.3 Configuration réseau Docker (Important pour les callbacks)

En production Linux, Docker peut accéder au host Django de plusieurs façons :

**Option A : Via localhost (si Django écoute sur 0.0.0.0)**
- Django doit écouter sur `0.0.0.0:8000` (pas seulement `127.0.0.1:8000`)
- OnlyOffice pourra accéder à Django via `http://localhost:8000` ou `http://127.0.0.1:8000`

**Option B : Via l'IP du serveur**
- Utilisez l'IP interne du serveur dans les URLs de callback
- Le code Django détecte automatiquement l'environnement et ajuste les URLs

**Option C : Via le réseau Docker (avancé)**
- Créez un réseau Docker partagé entre OnlyOffice et Django (si Django est aussi dans Docker)
- Utilisez les noms de conteneurs comme hostnames

**Vérification :**
```bash
# Depuis le conteneur OnlyOffice, tester l'accès à Django
sudo docker exec onlyoffice curl -I http://localhost:8000/api/drive-v2/check-onlyoffice/

# OU depuis l'extérieur (remplacez par votre domaine si vous en avez un)
curl -I http://72.60.90.127:8000/api/drive-v2/check-onlyoffice/
```

### 5.4 Redémarrage de Django/Gunicorn

```bash
# Si vous utilisez systemd
sudo systemctl restart gunicorn

# OU si vous utilisez supervisor
sudo supervisorctl restart gunicorn

# OU si vous utilisez directement
pkill -HUP gunicorn
```

---

## 🧪 Étape 6 : Tests et Vérification

### 6.1 Test depuis le serveur

```bash
# Test de santé
curl http://localhost:8080/healthcheck

# Test depuis l'extérieur (remplacez par votre IP)
curl http://votre-ip-serveur:8080/healthcheck
```

### 6.2 Test depuis le navigateur

1. Ouvrez votre application Django
2. Allez dans Drive V2
3. Ouvrez un fichier Office (Word, Excel, PowerPoint) ou PDF
4. Vérifiez que OnlyOffice s'affiche correctement

### 6.3 Vérification des logs

```bash
# Logs OnlyOffice
sudo docker logs onlyoffice

# Logs Django
tail -f /var/log/gunicorn/error.log  # Adaptez le chemin selon votre configuration
```

---

## 🔧 Étape 7 : Configuration Avancée (Optionnel)

### 7.1 Limitation des ressources Docker

Modifiez `docker-compose.yml` pour limiter l'utilisation des ressources :

```yaml
services:
  onlyoffice:
    # ... autres configurations ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### 7.2 Configuration de la sauvegarde automatique

Créez un script de sauvegarde :

```bash
sudo nano /opt/onlyoffice/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/onlyoffice"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Sauvegarde des volumes Docker
docker run --rm \
  -v onlyoffice_onlyoffice_data:/data \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/onlyoffice_data_$DATE.tar.gz -C /data .

echo "Backup completed: $BACKUP_DIR/onlyoffice_data_$DATE.tar.gz"
```

```bash
sudo chmod +x /opt/onlyoffice/backup.sh
```

Ajoutez au crontab pour une sauvegarde quotidienne :

```bash
sudo crontab -e
# Ajoutez cette ligne (sauvegarde tous les jours à 2h du matin)
0 2 * * * /opt/onlyoffice/backup.sh
```

### 7.3 Mise à jour de OnlyOffice

```bash
cd /opt/onlyoffice
sudo docker compose pull
sudo docker compose up -d
```

---

## 🐛 Dépannage

### Problème : OnlyOffice ne démarre pas

```bash
# Vérifier les logs
sudo docker logs onlyoffice

# Vérifier que le port est libre
sudo netstat -tulpn | grep 8080

# Redémarrer le conteneur
sudo docker restart onlyoffice
```

### Problème : Erreur de connexion depuis Django

1. Vérifiez que `ONLYOFFICE_SERVER_URL` dans `.env` est correct
2. Vérifiez que le `JWT_SECRET` est identique dans Django et Docker
3. Vérifiez les logs Django pour les erreurs de connexion
4. Testez la connectivité : `curl http://72.60.90.127:8080/healthcheck`

### Problème : Les fichiers ne se sauvegardent pas

1. Vérifiez les logs OnlyOffice : `sudo docker logs onlyoffice`
2. Vérifiez que le callback URL est accessible depuis Docker
3. Vérifiez la configuration CORS de S3 (si vous utilisez S3 direct)
4. Utilisez le proxy Django (`use_proxy: true`) si nécessaire

### Problème : Performance lente

1. Augmentez les ressources Docker (CPU/RAM)
2. Utilisez PostgreSQL au lieu de SQLite (dans docker-compose.yml)
3. Activez Redis pour le cache
4. Vérifiez la connexion réseau entre Django et OnlyOffice

### Problème : WebSocket / "Connexion au serveur perdue"

L’erreur **"Connexion au serveur perdue"** ou des échecs **WebSocket** (`wss://...`) viennent souvent des en-têtes **Upgrade** / **Connection** qui ne sont pas correctement transmis par le reverse proxy (Nginx, ou Traefik → Nginx).

**1. Nginx (architecture actuelle myp3000app)**  
Le fichier `nginx_myp3000app.conf` doit contenir :

- Une **map** pour `Connection` (uniquement `upgrade` quand `Upgrade` est présent) :
  ```nginx
  map $http_upgrade $connection_upgrade {
      default upgrade;
      ''      close;
  }
  ```
- Dans `location /onlyoffice/` :
  - `proxy_http_version 1.1;`
  - `proxy_set_header Upgrade $http_upgrade;`
  - `proxy_set_header Connection $connection_upgrade;`
  - `proxy_set_header X-Forwarded-Proto $scheme;` (HTTPS essentiel pour `wss://`)

Sans la map, envoyer `Connection "upgrade"` pour toutes les requêtes peut provoquer **400** sur le handshake WebSocket.

**2. Si Traefik est devant Nginx**

OnlyOffice reçoit du HTTP depuis Nginx et peut ignorer que l’origine est en HTTPS. Il faut forcer `X-Forwarded-Proto=https` :

- Dans les **labels Traefik** du service OnlyOffice (`docker-compose`) :
  ```yaml
  - "traefik.http.middlewares.onlyoffice-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
  - "traefik.http.routers.onlyoffice-secure.middlewares=onlyoffice-headers"
  ```
- Dans Nginx, pour le proxy vers OnlyOffice :  
  `proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;`  
  (au lieu de `$scheme` si Traefik envoie déjà l’en-tête).

**3. Variables d’environnement OnlyOffice**

Dans `docker-compose.yml`, pour le service `onlyoffice` :

```yaml
environment:
  - WOPI_ENABLED=true
  - USE_UNAUTHORIZED_STORAGE=true
```

**4. Vérification dans le navigateur**

Ouvrir F12 → Console.  
- `WebSocket connection to 'wss://...' failed: Unexpected response code: 400` → problème d’en-têtes (Nginx / map, ou Traefik + `X-Forwarded-Proto`).  
- Erreurs "Mixed Content" ou connexion fermée sans 400 → souvent `X-Forwarded-Proto` manquant (Traefik ou Nginx).

Après modification de Nginx : `sudo nginx -t && sudo systemctl reload nginx`.

---

## ✅ Commandes de vérification en production

À exécuter sur le serveur de production (ex. 72.60.90.127) après déploiement ou modification.

### OnlyOffice (Docker)

```bash
# Santé du Document Server
curl -s http://localhost:8080/healthcheck
# Attendu : true

# Conteneur actif
sudo docker ps | grep onlyoffice

# Logs récents (erreurs WebSocket, callback, etc.)
sudo docker logs --tail 100 onlyoffice
```

### Nginx

```bash
# Test de la configuration (inclut la map WebSocket)
sudo nginx -t

# Recharger après modification
sudo systemctl reload nginx

# Erreurs Nginx (proxy, WebSocket, 502, etc.)
sudo tail -n 50 /var/log/nginx/error.log
```

### Django / API

```bash
# Endpoint de vérification OnlyOffice (depuis le serveur)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/drive-v2/check-onlyoffice/
# Attendu : 200

# Ou avec réponse complète
curl -s http://127.0.0.1:8000/api/drive-v2/check-onlyoffice/
```

### Depuis l’extérieur (HTTPS)

```bash
# OnlyOffice via reverse proxy (remplacer par votre domaine)
curl -sI https://myp3000app.com/onlyoffice/healthcheck

# Check-onlyoffice (nécessite souvent une session / auth)
curl -sI https://myp3000app.com/api/drive-v2/check-onlyoffice/
```

### Résumé rapide

```bash
curl -s http://localhost:8080/healthcheck && \
sudo nginx -t && \
echo "OnlyOffice + Nginx OK"
```

---

## 📝 Checklist de Déploiement

- [ ] Docker installé et fonctionnel
- [ ] OnlyOffice conteneur démarré et accessible
- [ ] Port 8080 ouvert dans le firewall
- [ ] Variables d'environnement Django configurées
- [ ] JWT_SECRET identique dans Django et Docker
- [ ] ALLOWED_HOSTS mis à jour
- [ ] Nginx configuré avec map WebSocket + `Connection $connection_upgrade` pour `/onlyoffice/`
- [ ] HTTPS configuré (recommandé)
- [ ] Test de santé OnlyOffice réussi
- [ ] Test d'édition de document réussi (pas de « Connexion au serveur perdue »)
- [ ] Logs vérifiés et sans erreur

---

## 🔗 Ressources Utiles

- [Documentation OnlyOffice](https://api.onlyoffice.com/)
- [Docker Documentation](https://docs.docker.com/)
- [OnlyOffice GitHub](https://github.com/ONLYOFFICE/DocumentServer)

---

## 📞 Support

En cas de problème, vérifiez :
1. Les logs Docker : `sudo docker logs onlyoffice`
2. Les logs Django/Gunicorn
3. Les logs Nginx : `sudo tail -f /var/log/nginx/error.log`
4. La connectivité réseau : `curl http://localhost:8080/healthcheck`
