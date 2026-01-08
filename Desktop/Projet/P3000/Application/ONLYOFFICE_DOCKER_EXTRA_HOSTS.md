# Configuration Docker Extra Hosts pour OnlyOffice

## 🎯 Problème
OnlyOffice (Docker) ne peut pas accéder à `myp3000app.com` depuis son conteneur car Docker utilise un réseau isolé. Le conteneur doit pouvoir résoudre le nom de domaine public pour accéder au proxy Django.

## ✅ Solution : Ajouter `extra_hosts` dans docker-compose.yml

### Étape 1 : Accéder au répertoire OnlyOffice sur le serveur

```bash
ssh root@72.60.90.127
cd /opt/onlyoffice
```

### Étape 2 : Modifier le fichier docker-compose.yml

```bash
nano docker-compose.yml
```

### Étape 3 : Ajouter `extra_hosts` dans la section `onlyoffice`

**Version moderne (Docker 20.10+) :**

```yaml
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
      # ... autres variables d'environnement
    volumes:
      - onlyoffice_data:/var/www/onlyoffice/Data
      - onlyoffice_logs:/var/log/onlyoffice
    depends_on:
      - db
      - redis
      - rabbitmq
    networks:
      - onlyoffice_network
    # SOLUTION : Ajouter extra_hosts pour résoudre le domaine public
    extra_hosts:
      - "myp3000app.com:host-gateway"
      - "www.myp3000app.com:host-gateway"
```

**Version ancienne Docker Linux (si `host-gateway` ne fonctionne pas) :**

```yaml
services:
  onlyoffice:
    # ... autres configurations
    extra_hosts:
      - "myp3000app.com:172.17.0.1"
      - "www.myp3000app.com:172.17.0.1"
```

**Note :** `172.17.0.1` est l'IP par défaut de l'interface Docker sur Linux. Vous pouvez vérifier avec :

```bash
ip addr show docker0 | grep inet
```

### Étape 4 : Redémarrer le conteneur OnlyOffice

```bash
cd /opt/onlyoffice
docker compose down
docker compose up -d
```

### Étape 5 : Vérifier que la configuration fonctionne

```bash
# Tester depuis l'intérieur du conteneur
docker exec -it onlyoffice ping -c 1 myp3000app.com

# Vérifier les logs
docker logs onlyoffice | tail -20
```

## 🔍 Explication technique

- **`extra_hosts`** : Ajoute des entrées dans `/etc/hosts` du conteneur Docker
- **`host-gateway`** : Résout automatiquement vers l'IP de l'hôte Docker (fonctionne sur Docker 20.10+)
- **`172.17.0.1`** : IP par défaut de l'interface `docker0` sur Linux (alternative si `host-gateway` ne fonctionne pas)

Avec cette configuration, OnlyOffice peut maintenant accéder à `https://myp3000app.com` via Internet, ce qui permet au proxy Django de fonctionner correctement.

