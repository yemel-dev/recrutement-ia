"""
email_service.py — Service centralisé d'envoi d'emails de notification

Fonctionnement :
    - EMAIL_MODE="console" (par défaut) : n'envoie rien, affiche l'email dans
      les logs. Pratique pour développer sans compte SMTP.
    - EMAIL_MODE="smtp" : envoi réel via un serveur SMTP (ex : Brevo, gratuit
      jusqu'à 300 emails/jour — https://app.brevo.com).

    Pour basculer de l'un à l'autre : changer UNE variable dans .env
    (EMAIL_MODE), rien d'autre à toucher dans le code.

Toutes les fonctions publiques (envoyer_xxx) sont conçues pour ne JAMAIS
lever d'exception vers l'appelant : un échec d'envoi d'email ne doit
jamais faire planter une requête HTTP (inscription, candidature, etc.).
Elles sont pensées pour être appelées via BackgroundTasks, à l'image du
pipeline NLP déjà présent dans le projet (routers/applications.py).
"""
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import settings

# ─── Configuration Jinja2 ──────────────────────────────────────────────────────

_TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates", "email")

_env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)


def _rendre_template(nom_fichier: str, **contexte) -> str:
    """Rend un template Jinja2 en HTML, avec FRONTEND_URL toujours disponible."""
    template = _env.get_template(nom_fichier)
    return template.render(frontend_url=settings.FRONTEND_URL, **contexte)


# ─── Envoi bas niveau ───────────────────────────────────────────────────────────

def _envoyer(destinataire: str, sujet: str, html: str) -> None:
    """
    Point d'entrée unique d'envoi. Bascule entre mode "console" et "smtp"
    selon settings.EMAIL_MODE. Ne lève jamais d'exception : un échec est
    seulement loggé, pour ne jamais casser le flux principal de l'app.
    """
    try:
        if settings.EMAIL_MODE == "smtp":
            _envoyer_smtp(destinataire, sujet, html)
        else:
            _envoyer_console(destinataire, sujet, html)
    except Exception as erreur:
        # On log l'erreur mais on ne la propage pas : un email raté ne doit
        # jamais faire échouer l'inscription, la candidature, etc.
        print(f"❌ [email_service] Échec d'envoi à {destinataire} : {erreur}")


def _envoyer_console(destinataire: str, sujet: str, html: str) -> None:
    """Mode développement : affiche l'email dans les logs au lieu de l'envoyer."""
    print("─" * 70)
    print(f"📧 [EMAIL SIMULÉ] À : {destinataire}")
    print(f"   Sujet : {sujet}")
    print(f"   (EMAIL_MODE=console — passer à EMAIL_MODE=smtp dans .env pour un envoi réel)")
    print("─" * 70)


def _envoyer_smtp(destinataire: str, sujet: str, html: str) -> None:
    """Envoi réel via SMTP (Brevo par défaut, ou tout autre fournisseur SMTP)."""
    message = MIMEMultipart("alternative")
    message["Subject"] = sujet
    message["From"] = f"{settings.EMAIL_FROM_NOM} <{settings.EMAIL_FROM}>"
    message["To"] = destinataire
    message.attach(MIMEText(html, "html", "utf-8"))

    contexte_ssl = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as serveur:
        serveur.starttls(context=contexte_ssl)
        serveur.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        serveur.sendmail(settings.EMAIL_FROM, destinataire, message.as_string())

    print(f"✅ [email_service] Email envoyé à {destinataire} ({sujet})")


# ═══════════════════════════════════════════════════════════════════════════════
# FONCTIONS PUBLIQUES — une par événement métier
# À appeler via background_tasks.add_task(...) depuis les routers.
# ═══════════════════════════════════════════════════════════════════════════════

def envoyer_bienvenue(destinataire: str, prenom: str) -> None:
    """Envoyé après une inscription candidat réussie."""
    html = _rendre_template("bienvenue.html", prenom=prenom)
    _envoyer(destinataire, "Bienvenue sur Recrutement IA", html)


def envoyer_candidature_recue(destinataire: str, prenom: str, offre_titre: str, cv_filename: str) -> None:
    """Envoyé au candidat juste après le dépôt de sa candidature."""
    html = _rendre_template(
        "candidature_recue.html",
        prenom=prenom, offre_titre=offre_titre, cv_filename=cv_filename,
    )
    _envoyer(destinataire, f"Candidature reçue — {offre_titre}", html)


def envoyer_nouvelle_candidature_recruteur(
    destinataire: str, recruteur_prenom: str, offre_titre: str,
    offre_id: int, candidat_nom: str, candidat_prenom: str,
) -> None:
    """Envoyé au recruteur quand un candidat postule à l'une de ses offres."""
    html = _rendre_template(
        "nouvelle_candidature_recruteur.html",
        recruteur_prenom=recruteur_prenom, offre_titre=offre_titre, offre_id=offre_id,
        candidat_nom=candidat_nom, candidat_prenom=candidat_prenom,
    )
    _envoyer(destinataire, f"Nouvelle candidature — {offre_titre}", html)


def envoyer_score_pret(destinataire: str, prenom: str, offre_titre: str, score_global: float) -> None:
    """Envoyé au candidat dès que son score global a été calculé."""
    html = _rendre_template(
        "score_pret.html",
        prenom=prenom, offre_titre=offre_titre, score_global=score_global,
    )
    _envoyer(destinataire, f"Votre score est prêt — {offre_titre}", html)


def envoyer_compte_desactive(destinataire: str, prenom: str) -> None:
    """Envoyé quand un admin désactive un compte utilisateur."""
    html = _rendre_template("compte_desactive.html", prenom=prenom)
    _envoyer(destinataire, "Votre compte a été désactivé", html)


def envoyer_compte_cree_admin(destinataire: str, prenom: str, role: str, mot_de_passe: str) -> None:
    """Envoyé quand un admin crée un compte recruteur (ou admin) avec un mot de passe provisoire."""
    html = _rendre_template(
        "compte_cree_admin.html",
        prenom=prenom, email=destinataire, role=role, mot_de_passe=mot_de_passe,
    )
    _envoyer(destinataire, "Votre compte Recrutement IA a été créé", html)


def envoyer_candidature_rejetee(destinataire: str, prenom: str, offre_titre: str) -> None:
    """Envoyé quand un admin rejette une candidature en modération."""
    html = _rendre_template(
        "candidature_rejetee.html",
        prenom=prenom, offre_titre=offre_titre,
    )
    _envoyer(destinataire, f"Mise à jour de votre candidature — {offre_titre}", html)