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

    # ─── Notifications par email ──────────────────────────────────────────────
    # EMAIL_MODE :
    #   "console" → n'envoie rien, affiche l'email dans les logs (dev, par défaut)
    #   "smtp"    → envoi réel via un serveur SMTP (ex : Brevo, gratuit jusqu'à
    #               300 emails/jour, voir https://app.brevo.com)
    EMAIL_MODE: str = "console"

    SMTP_HOST:     str = "smtp-relay.brevo.com"
    SMTP_PORT:     int = 587
    SMTP_USER:     str = ""   # ton identifiant SMTP Brevo (visible dans SMTP & API > SMTP)
    SMTP_PASSWORD: str = ""   # ta clé SMTP Brevo (PAS ton mot de passe de compte)

    EMAIL_FROM:     str = "no-reply@recrut-ia.com"
    EMAIL_FROM_NOM: str = "Recrutement IA"

    # Utilisée dans les emails pour construire des liens vers l'app
    # (ex : "Voir mon offre" → FRONTEND_URL + "/offres/12")
    FRONTEND_URL: str = "http://localhost:5173"

    # ─── Connexion via Google ──────────────────────────────────────────────────
    # Le "Client ID" de ton projet Google Cloud (console.cloud.google.com →
    # APIs & Services → Identifiants → ID client OAuth 2.0). C'est le MÊME
    # Client ID que celui utilisé côté frontend pour afficher le bouton Google —
    # il n'est pas secret, mais il doit correspondre exactement, sinon la
    # vérification du jeton échouera.
    GOOGLE_CLIENT_ID: str = ""


settings = Settings()