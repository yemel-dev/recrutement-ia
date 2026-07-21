"""
questions.py — Le questionnaire de personnalité Big Five (modèle OCEAN)
---------
Membre 2 - Backend | Recrutement Intelligent | Université de Dschang 2024-2025



Ce module ne fait qu'UNE seule chose : définir les 25 questions du test.
Il ne calcule rien — c'est juste la "matière première" utilisée par
big_five_service.py pour transformer les réponses du candidat en scores.

Structure du modèle OCEAN (5 dimensions, 5 questions chacune = 25 questions) :
    O = Ouverture à l'expérience
    C = Conscienciosité (rigueur, organisation)
    E = Extraversion
    A = Agréabilité
    N = Névrosisme (stabilité émotionnelle inversée)

Chaque question est notée par le candidat sur une échelle de Likert 1 à 5 :
    1 = Pas du tout d'accord
    5 = Tout à fait d'accord

Le champ "reverse" (question à score inversé) est essentiel à comprendre :
    - Une question "directe" (reverse=False) : plus le candidat est d'accord,
      plus son score sur la dimension est élevé.
      Ex: "J'ai une imagination riche" → répondre 5 = très ouvert.
    - Une question "inversée" (reverse=True) : c'est l'inverse.
      Ex: "Je parle peu" → répondre 5 (très d'accord) = PEU extraverti.
      On doit donc inverser la note avant de l'additionner (voir big_five_service.py).

Mélanger questions directes et inversées est une pratique standard en
psychométrie : ça évite qu'un candidat réponde "en pilote automatique"
(toujours 5) sans lire les questions.
"""

QUESTIONS = [
    # ─── O — Ouverture à l'expérience ──────────────────────────────────────
    {"id": "q1",  "dimension": "O", "reverse": False, "texte": "J'ai une imagination riche et fertile."},
    {"id": "q2",  "dimension": "O", "reverse": True,  "texte": "Je préfère garder mes habitudes plutôt que d'essayer de nouvelles choses."},
    {"id": "q3",  "dimension": "O", "reverse": False, "texte": "J'aime découvrir des œuvres artistiques ou des idées originales."},
    {"id": "q4",  "dimension": "O", "reverse": True,  "texte": "Je me concentre sur des faits concrets plutôt que sur des possibilités abstraites."},
    {"id": "q5",  "dimension": "O", "reverse": False, "texte": "J'aime réfléchir à des théories et des concepts nouveaux."},

    # ─── C — Conscienciosité ────────────────────────────────────────────────
    {"id": "q6",  "dimension": "C", "reverse": False, "texte": "Je suis toujours bien préparé(e) avant de commencer une tâche."},
    {"id": "q7",  "dimension": "C", "reverse": True,  "texte": "Je laisse souvent traîner mes affaires."},
    {"id": "q8",  "dimension": "C", "reverse": False, "texte": "Je fais attention aux détails dans mon travail."},
    {"id": "q9",  "dimension": "C", "reverse": True,  "texte": "J'ai tendance à repousser les tâches au dernier moment."},
    {"id": "q10", "dimension": "C", "reverse": False, "texte": "Je respecte scrupuleusement mes engagements et mes délais."},

    # ─── E — Extraversion ───────────────────────────────────────────────────
    {"id": "q11", "dimension": "E", "reverse": False, "texte": "Je me sens à l'aise en société, même avec des inconnus."},
    {"id": "q12", "dimension": "E", "reverse": True,  "texte": "Je parle peu, je préfère écouter."},
    {"id": "q13", "dimension": "E", "reverse": False, "texte": "Je me sens énergisé(e) au milieu d'un groupe."},
    {"id": "q14", "dimension": "E", "reverse": True,  "texte": "J'ai tendance à rester en retrait lors des réunions."},
    {"id": "q15", "dimension": "E", "reverse": False, "texte": "Je prends facilement la parole devant un public."},

    # ─── A — Agréabilité ────────────────────────────────────────────────────
    {"id": "q16", "dimension": "A", "reverse": False, "texte": "Je m'intéresse sincèrement aux problèmes des autres."},
    {"id": "q17", "dimension": "A", "reverse": True,  "texte": "Je ne me préoccupe pas vraiment des sentiments des autres."},
    {"id": "q18", "dimension": "A", "reverse": False, "texte": "Je fais facilement confiance aux personnes que je rencontre."},
    {"id": "q19", "dimension": "A", "reverse": True,  "texte": "Il m'arrive de critiquer durement les autres."},
    {"id": "q20", "dimension": "A", "reverse": False, "texte": "Je prends volontiers du temps pour aider mes collègues."},

    # ─── N — Névrosisme (stabilité émotionnelle) ───────────────────────────
    {"id": "q21", "dimension": "N", "reverse": False, "texte": "Je me sens souvent stressé(e) ou tendu(e)."},
    {"id": "q22", "dimension": "N", "reverse": True,  "texte": "Je reste calme même dans les situations difficiles."},
    {"id": "q23", "dimension": "N", "reverse": False, "texte": "Je m'inquiète facilement pour des détails."},
    {"id": "q24", "dimension": "N", "reverse": True,  "texte": "Il est rare que je me sente triste ou déprimé(e)."},
    {"id": "q25", "dimension": "N", "reverse": False, "texte": "Mon humeur change facilement d'un moment à l'autre."},
]

# Liste des 5 dimensions, dans l'ordre utilisé partout dans le projet
DIMENSIONS = ["O", "C", "E", "A", "N"]

# Nombre de questions attendu par dimension (utilisé pour valider une réponse)
QUESTIONS_PAR_DIMENSION = 5

# Bornes de l'échelle de Likert
LIKERT_MIN = 1
LIKERT_MAX = 5
