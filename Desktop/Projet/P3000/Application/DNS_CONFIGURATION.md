# 🌐 Configuration DNS avec Hostinger

## 📋 Étapes détaillées

### 1. **Récupérer l'IP de votre VPS**

- Connectez-vous à votre panneau Hostinger VPS
- Notez l'adresse IP publique de votre serveur

### 2. **Accéder au panneau DNS**

```
Hostinger.com → Se connecter → Domaines → [Votre domaine] → Gérer → DNS / Nameservers
```

### 3. **Configuration des enregistrements**

#### **Enregistrement A (domaine principal)**

```
Type: A
Nom: @ (ou laissez vide)
Valeur: [IP_DE_VOTRE_VPS]
TTL: 300
```

#### **Enregistrement CNAME (www)**

```
Type: CNAME
Nom: www
Valeur: [VOTRE_DOMAINE.com]
TTL: 300
```

### 4. **Exemple concret**

Si votre domaine est `monapp.com` et votre IP est `123.456.789.10` :

```
Enregistrement A:
- Type: A
- Nom: @
- Valeur: 123.456.789.10
- TTL: 300

Enregistrement CNAME:
- Type: CNAME
- Nom: www
- Valeur: monapp.com
- TTL: 300
```

### 5. **Vérification**

```bash
# Test de résolution
nslookup monapp.com
ping monapp.com

# Test avec le script Python
python verifier_dns.py monapp.com
```

### 6. **Temps de propagation**

- **Propagation locale** : 5-30 minutes
- **Propagation mondiale** : 24-48 heures
- **Test en ligne** : whatsmydns.net

### 7. **Mise à jour du fichier .env**

```bash
# Remplacer dans votre fichier .env
ALLOWED_HOSTS=monapp.com,www.monapp.com,123.456.789.10
CSRF_TRUSTED_ORIGINS=https://monapp.com,https://www.monapp.com
CORS_ALLOWED_ORIGINS=https://monapp.com,https://www.monapp.com
```

## 🔧 Dépannage

### Problèmes courants :

1. **DNS non propagé** : Attendre 24-48h
2. **IP incorrecte** : Vérifier l'IP du VPS
3. **Enregistrement manquant** : Vérifier les deux enregistrements A et CNAME

### Commandes de vérification :

```bash
# Vérifier la résolution DNS
dig monapp.com
nslookup monapp.com

# Vérifier la connectivité
curl -I http://monapp.com
telnet monapp.com 80
```
