from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ─── Compte admin créé automatiquement au démarrage ──────────────────────
    # IMPORTANT : ces valeurs ne sont utilisées que si elles ne sont PAS
    # définies dans .env. Toujours surcharger ADMIN_PASSWORD en dehors du
    # développement local — ne jamais garder le mot de passe par défaut
    # en production.
    ADMIN_EMAIL:    str = "admin@recrut-ia.com"
    ADMIN_PASSWORD: str = "Admin@2025!"
    ADMIN_NOM:      str = "Admin"
    ADMIN_PRENOM:   str = "Super"


settings = Settings()