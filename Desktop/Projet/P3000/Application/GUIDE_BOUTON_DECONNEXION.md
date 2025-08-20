# Guide du Bouton de Déconnexion

## Vue d'ensemble

Un bouton de déconnexion statique a été ajouté en haut à droite de l'application pour résoudre le problème de déconnexion automatique qui laissait les utilisateurs dans un état incohérent.

## Fonctionnalités

### Bouton de Déconnexion

- **Position** : En haut à droite de l'application
- **Style** : Bouton rouge avec icône de déconnexion
- **Responsive** : S'adapte aux écrans mobiles
- **Visibilité** : Affiche le nom de l'utilisateur connecté

### Fonctionnement

1. **Clic sur le bouton** : Déclenche la déconnexion complète
2. **Suppression des cookies** : Supprime les cookies de session côté serveur
3. **Nettoyage local** : Supprime les données utilisateur du localStorage
4. **Redirection** : Redirige automatiquement vers la page de connexion

## Implémentation Technique

### Composants Modifiés

#### 1. Header.js

```javascript
const Header = ({ user, onLogout }) => {
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="header">
      <div className="header-content">
        <div className="header-right">
          {user && (
            <div className="user-section">
              <span className="user-name">
                {user.first_name || user.username || "Utilisateur"}
              </span>
              <button className="logout-button" onClick={handleLogout}>
                <svg>...</svg>
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

#### 2. header.css

- Styles modernes avec effets de survol
- Design responsive pour mobile
- Z-index ajusté pour la visibilité

#### 3. App.js

- Fonction `handleLogout` déjà implémentée
- Toutes les routes protégées utilisent le Layout avec les props nécessaires

### Backend

- Route `/api/auth/logout/` déjà configurée
- Suppression complète des cookies de session
- Gestion des erreurs robuste

## Utilisation

### Pour les Utilisateurs

1. Cliquez sur le bouton "Déconnexion" en haut à droite
2. Vous serez automatiquement redirigé vers la page de connexion
3. Toutes vos sessions seront fermées

### Pour les Développeurs

Le bouton est automatiquement disponible sur toutes les pages protégées. Aucune configuration supplémentaire n'est nécessaire.

## Tests

### Script de Test

Un script de test est disponible dans `test_logout.js` :

```javascript
// Dans la console du navigateur
testLogout(); // Teste la déconnexion
testAuthCheck(); // Vérifie l'authentification
```

### Tests Manuels

1. Connectez-vous à l'application
2. Naviguez sur différentes pages
3. Cliquez sur le bouton de déconnexion
4. Vérifiez que vous êtes redirigé vers la page de connexion
5. Vérifiez que vous ne pouvez plus accéder aux pages protégées

## Résolution de Problèmes

### Le bouton n'apparaît pas

- Vérifiez que vous êtes connecté
- Vérifiez que le composant Layout reçoit les props `user` et `onLogout`
- Vérifiez les styles CSS

### La déconnexion ne fonctionne pas

- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que la route `/api/auth/logout/` est accessible
- Utilisez le script de test pour diagnostiquer

### Problèmes de cookies

- Vérifiez que les cookies sont bien supprimés après déconnexion
- Vérifiez les paramètres de sécurité du navigateur
- Testez avec le script `testLogout()`

## Sécurité

### Mesures Implémentées

- Suppression complète des cookies de session
- Nettoyage du localStorage
- Redirection forcée vers la page de connexion
- Gestion des erreurs côté serveur

### Bonnes Pratiques

- Le bouton n'est visible que pour les utilisateurs connectés
- La déconnexion est sécurisée côté serveur
- Les cookies sont expirés immédiatement

## Maintenance

### Mises à Jour

- Le bouton utilise les props existantes du Layout
- Aucune modification des routes existantes nécessaire
- Compatible avec les futures mises à jour

### Monitoring

- Surveillez les logs de déconnexion côté serveur
- Vérifiez régulièrement le bon fonctionnement
- Testez après les déploiements

## Support

En cas de problème :

1. Vérifiez ce guide
2. Utilisez le script de test
3. Consultez les logs du serveur
4. Contactez l'équipe de développement
