"""
Script de diagnostic + réinitialisation du compte admin.
À lancer depuis le dossier backend/ (là où se trouve ton .env) :

    python diagnostic_admin.py

Ce script :
1. Affiche les comptes admin existants en base (email, actif ou non).
2. Réinitialise le mot de passe du compte admin pour qu'il corresponde
   exactement à ADMIN_PASSWORD défini dans ton .env (via app.config.settings).
"""
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.services.auth_service import hasher_mot_de_passe
from app.config import settings

db = SessionLocal()

print("── Comptes admin en base ─────────────────────────────")
admins = db.query(User).filter(User.role == UserRole.admin).all()
if not admins:
    print("Aucun compte admin trouvé en base !")
else:
    for a in admins:
        print(f"  id={a.id}  email={a.email}  is_active={a.is_active}")

print()
print(f"── .env ── ADMIN_EMAIL = {settings.ADMIN_EMAIL}")

cible = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()

if not cible:
    print("❌ Aucun utilisateur avec cet email. Redémarre le serveur : "
          "le compte sera créé automatiquement au prochain démarrage.")
else:
    if cible.role != UserRole.admin:
        print(f"⚠️  Ce compte existe mais a le rôle '{cible.role}', pas 'admin'.")
        cible.role = UserRole.admin

    if not cible.is_active:
        print("⚠️  Ce compte était désactivé (is_active=False). Réactivation…")
        cible.is_active = True

    ancien_hash = cible.hashed_password
    cible.hashed_password = hasher_mot_de_passe(settings.ADMIN_PASSWORD)
    db.commit()

    print(f"✅ Mot de passe de {cible.email} réinitialisé pour correspondre à ADMIN_PASSWORD du .env.")
    print(f"   Tu peux maintenant te connecter avec :")
    print(f"     email    : {settings.ADMIN_EMAIL}")
    print(f"     password : {settings.ADMIN_PASSWORD}")

db.close()