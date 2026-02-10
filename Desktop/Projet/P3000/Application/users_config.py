"""
Configuration partagée des utilisateurs P3000 et Elekable.
Mêmes identifiants (username + mot de passe) sur les deux plateformes.
"""

# Utilisateurs communs P3000 / Elekable — même liste, mêmes mots de passe
USERS_SHARED = [
    {
        "username": "amajri",
        "first_name": "Amajri",
        "last_name": "User",
        "password": "K9#mP2$vL8@nQ4",
    },
    {
        "username": "abelaoued",
        "first_name": "Abelaoued",
        "last_name": "User",
        "password": "R7#tN5$wX2@kM9",
    },
    {
        "username": "saitatmane",
        "first_name": "Saitatmane",
        "last_name": "User",
        "password": "H4#jF8$qZ6@bP3",
    },
    {
        "username": "rkefi",
        "first_name": "Rkefi",
        "last_name": "User",
        "password": "GZ$F8l5keQfl3nQ",  # Même mot de passe que P3000
    },
]

# Admin Elekable
USER_ADMIN_ELEKABLE = {
    "username": "admin",
    "first_name": "Administrateur",
    "last_name": "Elekable",
    "password": "admin123",
    "is_staff": True,
    "is_superuser": True,
    "email": "admin@elekable.fr",
}
