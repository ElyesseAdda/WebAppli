# Commandes d'Installation OnlyOffice - Copier/Coller

## 🚀 PRODUCTION (Serveur 72.60.90.127)

### 1. Connexion au serveur
```bash
ssh root@72.60.90.127
```

### 2. Installation Docker
```bash
apt update
apt upgrade -y
apt install -y ca-certificates curl gnupg lsb-release
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
docker --version
```

### 3. Installation OnlyOffice
```bash
mkdir -p /opt/onlyoffice
cd /opt/onlyoffice
nano docker-compose.yml
```

**Collez ce contenu dans docker-compose.yml** (⚠️ CHANGEZ LES MOTS DE PASSE !) :

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

**Puis démarrez OnlyOffice :**
```bash
docker compose up -d
docker ps
docker logs onlyoffice
```

**Attendez 1-2 minutes, puis testez :**
```bash
curl http://localhost:8080/healthcheck
```

### 4. Configuration Firewall
```bash
ufw allow 8080/tcp
ufw status
```

### 5. Configuration Django
```bash
cd /var/www/p3000/Desktop/Projet/P3000/Application
nano .env
```

**Ajoutez ces lignes dans .env** (⚠️ Utilisez le MÊME JWT_SECRET que dans docker-compose.yml) :

```bash
ONLYOFFICE_SERVER_URL=http://72.60.90.127:8080
ONLYOFFICE_JWT_SECRET=votre-secret-jwt-super-long-et-complexe-changez-moi
ONLYOFFICE_JWT_ENABLED=true
ONLYOFFICE_JWT_HEADER=Authorization
```

**Redémarrez Django/Gunicorn :**
```bash
systemctl restart gunicorn
# OU
supervisorctl restart gunicorn
# OU
pkill -HUP gunicorn
```

### 6. Tests
```bash
# Test OnlyOffice
curl http://localhost:8080/healthcheck
curl http://72.60.90.127:8080/healthcheck

# Test Django
curl http://72.60.90.127:8000/api/drive-v2/check-onlyoffice/
```

---

## 💻 LOCAL (Windows)

### 1. Vérifier Docker Desktop
Assurez-vous que Docker Desktop est installé et en cours d'exécution.

### 2. Créer OnlyOffice
```powershell
mkdir C:\onlyoffice
cd C:\onlyoffice
```

**Créez le fichier docker-compose.yml** avec ce contenu :

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

**Démarrez OnlyOffice :**
```powershell
docker compose up -d
docker ps
```

**Testez :**
```powershell
curl http://localhost:8080/healthcheck
```

### 3. Configuration Django Local
Ouvrez le fichier `.env` dans votre projet Django et ajoutez :

```bash
ONLYOFFICE_SERVER_URL=http://localhost:8080
ONLYOFFICE_JWT_SECRET=votre-secret-jwt-local-changez-moi
ONLYOFFICE_JWT_ENABLED=true
ONLYOFFICE_JWT_HEADER=Authorization
```

**⚠️ IMPORTANT** : Le JWT_SECRET doit être identique à celui dans docker-compose.yml.

Redémarrez votre serveur Django local.

---

## 🔧 COMMANDES UTILES

### Production
```bash
# Voir les logs
docker logs onlyoffice

# Redémarrer
cd /opt/onlyoffice
docker compose restart

# Arrêter
cd /opt/onlyoffice
docker compose down

# Démarrer
cd /opt/onlyoffice
docker compose up -d
```

### Local
```powershell
# Voir les logs
docker logs onlyoffice

# Redémarrer
cd C:\onlyoffice
docker compose restart

# Arrêter
cd C:\onlyoffice
docker compose down

# Démarrer
cd C:\onlyoffice
docker compose up -d
```

---

## ⚠️ POINTS CRITIQUES

1. **JWT_SECRET** : Doit être **IDENTIQUE** dans :
   - `/opt/onlyoffice/docker-compose.yml` (production)
   - `/var/www/p3000/Desktop/Projet/P3000/Application/.env` (production)
   - `C:\onlyoffice\docker-compose.yml` (local)
   - `.env` de votre projet Django (local)

2. **Mots de passe** : Changez tous les mots de passe par défaut dans docker-compose.yml

3. **ALLOWED_HOSTS** : Vérifiez que `72.60.90.127` est dans `Application/settings.py`

4. **Port 8080** : Doit être ouvert dans le firewall en production

---

## 📍 CHEMINS IMPORTANTS

### Production
- Projet : `/var/www/p3000/Desktop/Projet/P3000/Application`
- .env : `/var/www/p3000/Desktop/Projet/P3000/Application/.env`
- OnlyOffice : `/opt/onlyoffice`
- docker-compose.yml : `/opt/onlyoffice/docker-compose.yml`

### Local
- Projet : `C:\Users\User\Desktop\Projets\WebAppli\Desktop\Projet\P3000\Application`
- .env : `C:\Users\User\Desktop\Projets\WebAppli\Desktop\Projet\P3000\Application\.env`
- OnlyOffice : `C:\onlyoffice`
- docker-compose.yml : `C:\onlyoffice\docker-compose.yml`

