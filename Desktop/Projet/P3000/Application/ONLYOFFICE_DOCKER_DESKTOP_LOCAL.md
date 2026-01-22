# Configuration OnlyOffice pour Docker Desktop (Local)

## 📋 Configuration requise depuis votre `.env`

Assurez-vous que votre `.env` contient ces lignes (lignes 36-42) :

```bash
# OnlyOffice Configuration pour le local
ONLYOFFICE_SERVER_URL=http://localhost:8080
ONLYOFFICE_JWT_SECRET=votre-secret-jwt-local-changez-moi
ONLYOFFICE_JWT_ENABLED=true
ONLYOFFICE_JWT_HEADER=Authorization
```

## 🐳 Étape 1 : Localiser ou créer le répertoire OnlyOffice

### Option A : Créer un répertoire séparé (recommandé)

```powershell
# Créer un répertoire pour OnlyOffice
mkdir C:\onlyoffice
cd C:\onlyoffice
```

### Option B : Dans votre projet Django

```powershell
# Dans votre projet
cd C:\Users\User\Desktop\Projets\WebAppli\Desktop\Projet\P3000\Application
mkdir onlyoffice-docker
cd onlyoffice-docker
```

## 📝 Étape 2 : Créer ou modifier le fichier `docker-compose.yml`

Créez un fichier `docker-compose.yml` dans le répertoire choisi :

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
      # ⚠️ IMPORTANT : Ces valeurs DOIVENT correspondre à votre .env Django
      - JWT_ENABLED=true
      - JWT_SECRET=votre-secret-jwt-local-changez-moi  # ⚠️ IDENTIQUE à ONLYOFFICE_JWT_SECRET dans .env
      - JWT_HEADER=Authorization
      # Configuration pour Docker Desktop (Windows/Mac)
      - USE_UNAUTHORIZED_STORAGE=true
      # Désactiver les vérifications SSL pour le développement local
      - NODE_TLS_REJECT_UNAUTHORIZED=0
    volumes:
      - onlyoffice_data:/var/www/onlyoffice/Data
      - onlyoffice_logs:/var/log/onlyoffice
    networks:
      - onlyoffice_network
    # Configuration pour Docker Desktop : permettre l'accès à host.docker.internal
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  onlyoffice_data:
  onlyoffice_logs:

networks:
  onlyoffice_network:
    driver: bridge
```

## ⚙️ Étape 3 : Remplacer les valeurs

**⚠️ CRITIQUE :** Remplacez `votre-secret-jwt-local-changez-moi` par la **MÊME** valeur que `ONLYOFFICE_JWT_SECRET` dans votre `.env` Django.

Exemple :
- Si dans votre `.env` : `ONLYOFFICE_JWT_SECRET=mon-secret-super-securise-123`
- Alors dans `docker-compose.yml` : `JWT_SECRET=mon-secret-super-securise-123`

## 🚀 Étape 4 : Démarrer OnlyOffice

```powershell
# Si vous êtes dans C:\onlyoffice
docker compose up -d

# Ou si vous êtes dans votre projet
cd C:\onlyoffice  # ou le chemin que vous avez choisi
docker compose up -d
```

## ✅ Étape 5 : Vérifier que OnlyOffice fonctionne

```powershell
# Vérifier que le conteneur tourne
docker ps | findstr onlyoffice

# Tester l'endpoint de santé
curl http://localhost:8080/healthcheck
# Ou dans PowerShell :
Invoke-WebRequest -Uri http://localhost:8080/healthcheck
```

Vous devriez voir : `true`

## 🔄 Étape 6 : Redémarrer OnlyOffice après modification

Si vous modifiez le `docker-compose.yml` :

```powershell
cd C:\onlyoffice  # ou votre répertoire
docker compose down
docker compose up -d
```

## 📊 Vérifier les logs

```powershell
# Voir les logs OnlyOffice
docker logs onlyoffice

# Suivre les logs en temps réel
docker logs -f onlyoffice
```

## 🔧 Configuration complète avec base de données (optionnel)

Si vous voulez une configuration complète avec PostgreSQL, Redis et RabbitMQ :

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
      # JWT (⚠️ IDENTIQUE à votre .env Django)
      - JWT_ENABLED=true
      - JWT_SECRET=votre-secret-jwt-local-changez-moi
      - JWT_HEADER=Authorization
      # Base de données
      - DB_TYPE=postgres
      - DB_HOST=db
      - DB_NAME=onlyoffice
      - DB_USER=onlyoffice
      - DB_PWD=onlyoffice_password
      # Redis
      - REDIS_SERVER=redis
      # RabbitMQ
      - AMQP_SERVER=rabbitmq
      - AMQP_TYPE=rabbitmq
      # Docker Desktop
      - USE_UNAUTHORIZED_STORAGE=true
      - NODE_TLS_REJECT_UNAUTHORIZED=0
    volumes:
      - onlyoffice_data:/var/www/onlyoffice/Data
      - onlyoffice_logs:/var/log/onlyoffice
    depends_on:
      - db
      - redis
      - rabbitmq
    networks:
      - onlyoffice_network
    extra_hosts:
      - "host.docker.internal:host-gateway"

  db:
    image: postgres:15
    container_name: onlyoffice_db
    restart: always
    environment:
      - POSTGRES_DB=onlyoffice
      - POSTGRES_USER=onlyoffice
      - POSTGRES_PASSWORD=onlyoffice_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - onlyoffice_network

  redis:
    image: redis:7-alpine
    container_name: onlyoffice_redis
    restart: always
    networks:
      - onlyoffice_network

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: onlyoffice_rabbitmq
    restart: always
    ports:
      - "15672:15672"  # Interface de gestion RabbitMQ
    networks:
      - onlyoffice_network

volumes:
  onlyoffice_data:
  onlyoffice_logs:
  postgres_data:

networks:
  onlyoffice_network:
    driver: bridge
```

## 🐛 Dépannage

### OnlyOffice ne démarre pas

```powershell
# Vérifier les logs
docker logs onlyoffice

# Redémarrer
docker compose restart onlyoffice
```

### Erreur JWT -20

Vérifiez que :
1. `JWT_SECRET` dans `docker-compose.yml` = `ONLYOFFICE_JWT_SECRET` dans `.env`
2. `JWT_ENABLED=true` dans les deux endroits
3. Redémarrez OnlyOffice après modification

### Port 8080 déjà utilisé

```powershell
# Vérifier ce qui utilise le port 8080
netstat -ano | findstr :8080

# Changer le port dans docker-compose.yml (ex: 8081:80)
# Et mettre à jour ONLYOFFICE_SERVER_URL dans .env
```

## 📝 Checklist de configuration

- [ ] `docker-compose.yml` créé avec la bonne configuration
- [ ] `JWT_SECRET` identique dans `docker-compose.yml` et `.env`
- [ ] `JWT_ENABLED=true` dans les deux endroits
- [ ] OnlyOffice démarré : `docker compose up -d`
- [ ] Healthcheck OK : `curl http://localhost:8080/healthcheck`
- [ ] Django redémarré pour charger la nouvelle configuration
