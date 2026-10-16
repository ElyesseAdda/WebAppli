
from .settings import *  # noqa
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
# Accélérer les tests
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
