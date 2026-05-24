# 🤖 Recrutement Intelligent par IA

> Plateforme intelligente de recrutement — Analyse NLP de CV + Test psychométrique Big Five (OCEAN) + Scoring multicritère

**Projet de Fin d'Année | Master Intelligence Artificielle | Université de Dschang | 2024-2025**

---

## 📌 Description

Cette plateforme automatise et optimise le processus de recrutement en combinant :

- **Analyse NLP des CV** : extraction automatique des compétences, expériences et formations grâce à spaCy et CamemBERT
- **Test psychométrique Big Five (OCEAN)** : évaluation des traits de personnalité des candidats via le questionnaire IPIP-NEO
- **Algorithme de scoring multicritère** : classement objectif et configurable des candidats par rapport aux exigences du poste

L'objectif est de réduire le temps de présélection de **70%** tout en limitant les biais humains dans le processus de recrutement.

---

## 🏗️ Architecture du Projet

```
recrutement-ia/
├── backend/                  # API FastAPI (Python 3.11)
│   ├── app/
│   │   ├── main.py           # Point d'entrée FastAPI
│   │   ├── config.py         # Variables d'environnement
│   │   ├── database.py       # Connexion base de données
│   │   ├── models/           # Modèles SQLAlchemy (tables BDD)
│   │   ├── schemas/          # Schémas Pydantic (validation des données)
│   │   ├── routers/          # Endpoints REST de l'API
│   │   ├── services/         # Logique métier (NLP, scoring, psychométrie)
│   │   └── utils/            # Fonctions utilitaires
│   ├── alembic/              # Migrations base de données
│   ├── requirements.txt      # Dépendances Python
│   └── .env.example          # Template des variables d'environnement
└── frontend/                 # Interface React 18 + Vite + Tailwind CSS
```

---

## ⚙️ Stack Technologique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Backend API** | FastAPI (Python 3.11) | Serveur REST, orchestration de la logique |
| **Base de données** | SQLite (dev) / PostgreSQL (prod) | Stockage des données |
| **Migrations BDD** | Alembic | Versionnement du schéma de base de données |
| **NLP / IA** | spaCy + Sentence-BERT + scikit-learn | Analyse des CV, extraction de compétences |
| **Frontend** | React 18 + Vite + Tailwind CSS | Interface candidats et recruteurs |
| **Hébergement Backend** | Railway.app | Serveur FastAPI + PostgreSQL en ligne |
| **Hébergement Frontend** | Vercel | Application React en ligne, CDN mondial |
| **Versioning** | Git + GitHub | Collaboration et sauvegarde du code |

---

## 🧠 Fonctionnalités Principales

### Pour le Candidat
- Création de compte et dépôt de CV (PDF / DOCX)
- Passage du test de personnalité Big Five (25 questions)
- Consultation de son profil et de ses scores

### Pour le Recruteur
- Publication d'offres d'emploi avec profil OCEAN idéal configurable
- Tableau de bord avec classement automatique des candidats
- Visualisation des profils (graphiques radar personnalité)
- Export du classement en CSV
- Génération de rapports RH

### Moteur IA
- Extraction NLP : compétences, expériences, formations, entités nommées
- Scoring Big Five avec correction des items inversés (IPIP-NEO)
- Algorithme de scoring global configurable :

```
Score_Global = 0.40 × Score_Compétences
             + 0.25 × Score_Expérience
             + 0.20 × Score_Formation
             + 0.15 × Score_Personnalité
```

---

## 👥 Équipe Projet

| Membre | Rôle | Responsabilités |
|--------|------|-----------------|
| **Membre 1** | Chef de projet / Architecture | Structure du projet, algorithme de scoring, fusion des modules, rapport final |
| **Membre 2** | Développeur NLP/IA | Pipeline extraction CV, spaCy, Sentence-BERT, TF-IDF, évaluation NLP |
| **Membre 3** | Développeur Backend | FastAPI, base de données, auth JWT, endpoints REST, test Big Five |
| **Membre 4** | Développeur Frontend | React 18, Tailwind, pages candidat/recruteur, dashboard, graphiques |

---

## 🚀 Installation et Lancement

### Prérequis

- Python 3.10+
- Node.js 18+
- Git

### 1. Cloner le projet

```bash
git clone https://github.com/yemel-dev/recrutement-ia.git
cd recrutement-ia
```

### 2. Configurer le Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Windows (Git Bash)
# source venv/bin/activate         # Linux / macOS
pip install -r requirements.txt
python -m spacy download fr_core_news_lg
```

### 3. Variables d'environnement

```bash
cp .env.example .env
```

Remplis le fichier `.env` :

```env
DATABASE_URL=sqlite:///./recrutement_ia.db
SECRET_KEY=ta_cle_secrete_tres_longue_ici
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 4. Lancer le serveur de développement

```bash
uvicorn app.main:app --reload
```

- API disponible sur : `http://localhost:8000`
- Documentation Swagger : `http://localhost:8000/docs`

### 5. Configurer le Frontend *(Semaine 3)*

```bash
cd ../frontend
npm install
npm run dev
```

---

## 🌐 Endpoints API Principaux

| Méthode | URL | Description | Accès |
|---------|-----|-------------|-------|
| `POST` | `/auth/register` | Inscription | Public |
| `POST` | `/auth/login` | Connexion (retourne JWT) | Public |
| `POST` | `/job-offers` | Créer une offre d'emploi | Recruteur |
| `GET` | `/job-offers` | Lister les offres | Candidat |
| `POST` | `/applications` | Déposer un CV | Candidat |
| `POST` | `/personality-test` | Soumettre le test Big Five | Candidat |
| `GET` | `/ranking/{offer_id}` | Classement des candidats | Recruteur |
| `GET` | `/ranking/{offer_id}/export` | Export CSV du classement | Recruteur |

---

## 📅 Roadmap

- [x] **Semaine 1** — Initialisation, structure du projet, base de données, pipeline NLP
- [ ] **Semaine 2** — Algorithme de scoring, test psychométrique, API complète
- [ ] **Semaine 3** — Frontend React, intégration des modules, interface recruteur/candidat
- [ ] **Semaine 4** — Tests, déploiement (Railway + Vercel), documentation finale, rapport

---

## 🤝 Règles de Contribution

- Tout le code est versionné sur GitHub — aucun fichier ne reste uniquement en local
- Chaque membre travaille sur sa propre branche : `feature/nlp`, `feature/backend`, `feature/frontend`
- On ne merge sur `develop` qu'après avoir testé que le code fonctionne
- Messages de commit clairs et descriptifs :
  - `feat: ajout NER spaCy`
  - `fix: correction endpoint login`
  - `docs: mise à jour README`
- En cas de blocage : demander immédiatement, ne pas rester bloqué seul

---

## 📄 Licence

Projet académique — Université de Dschang © 2025. Tous droits réservés.