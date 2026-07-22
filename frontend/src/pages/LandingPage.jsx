import { Link } from "react-router-dom";
import heroBg from "../assets/hero-bg.webp";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-lime-500 rounded-lg flex items-center justify-center shadow-md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span className="font-extrabold text-xl text-gray-900 tracking-tight">RecrutIA</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
          <a href="#about"      className="hover:text-gray-900 transition-colors duration-200">À propos</a>
          <a href="#recruteurs" className="hover:text-gray-900 transition-colors duration-200">Pour les recruteurs</a>
          <a href="#candidats"  className="hover:text-gray-900 transition-colors duration-200">Pour les candidats</a>
          <a href="#comment"    className="hover:text-gray-900 transition-colors duration-200">Comment ça marche</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-semibold text-gray-700 hover:text-lime-600 transition-colors duration-200 px-4 py-2 rounded-full hover:bg-lime-50"
          >
            Se connecter
          </Link>
          <Link
            to="/register"
            className="text-sm font-bold bg-gray-900 hover:bg-lime-500 text-white px-5 py-2.5 rounded-full transition-all duration-300 shadow-md hover:shadow-lime-200 hover:shadow-lg"
          >
            Créer un compte
          </Link>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center pt-20 overflow-hidden">

        {/* Image de fond floutée */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${heroBg})`,
            filter: "blur(3px)",
            transform: "scale(1.05)",
          }}
        />

        {/* Overlay sombre dégradé */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-lime-900/40" />

        {/* Contenu Hero */}
        <div className="relative z-10 max-w-6xl mx-auto px-10 pt-10 pb-16 w-full">

          {/* Badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full">
              <span className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></span>
              Powered by NLP · Big Five · Scoring IA
            </span>
          </div>

          {/* Titre */}
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight drop-shadow-lg">
              Trouvez les bons{" "}
              <span className="text-lime-400">Candidats.</span>
              <br />
              Recrutez le bon Talent.
            </h1>
            <p className="text-gray-300 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              RecrutIA connecte les entreprises aux meilleurs talents grâce à l'analyse IA des CV
              et aux tests psychométriques, pour pourvoir les postes plus rapidement, sans approximation.
            </p>

            {/* Boutons */}
            <div className="flex items-center justify-center gap-4 mb-10 flex-wrap">
              
                <a href="#comment"
                className="text-sm font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/25 hover:bg-white/20 hover:border-white/40 px-7 py-3.5 rounded-full transition-all duration-300"
              >
                Comment ça marche
              </a>
              <Link
                to="/register"
                className="group text-sm font-bold bg-lime-500 hover:bg-lime-400 text-white px-7 py-3.5 rounded-full transition-all duration-300 shadow-lg hover:shadow-lime-400/40 hover:shadow-xl flex items-center gap-2"
              >
                Créer un compte gratuit
                <span className="bg-white/20 group-hover:bg-white/30 rounded-full w-6 h-6 flex items-center justify-center text-xs transition-all duration-200">↗</span>
              </Link>
            </div>

            {/* Avatars + étoiles */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {["bg-lime-400","bg-blue-400","bg-purple-400","bg-pink-400","bg-orange-400"].map((c, i) => (
                  <div key={i} className={`w-10 h-10 rounded-full ${c} border-2 border-white/30 flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                    {["R","D","A","M","F"][i]}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="text-lime-400 text-sm">★★★★★ <span className="font-bold text-white">5.0</span></div>
                <p className="text-xs text-gray-400">200+ Témoignages</p>
              </div>
            </div>
          </div>

          {/* 3 CARDS BASSES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">

            {/* Card 1 */}
            <div className="group bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:border-lime-400/40 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-lime-500/10 hover:-translate-y-1 cursor-pointer">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lime-400 text-2xl">⚡</span>
                <h3 className="font-bold text-white text-sm">Analyse IA instantanée</h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                spaCy et BERT analysent chaque CV en quelques secondes. Compétences, expérience et formation extraites automatiquement.
              </p>
              <div className="flex items-center gap-1">
                {["bg-lime-400","bg-blue-400","bg-purple-400","bg-pink-400","bg-orange-400"].map((c, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-white/20 flex items-center justify-center text-white font-bold text-xs`}>
                    {["R","D","A","M","F"][i]}
                  </div>
                ))}
              </div>
              <Link
                to="/register"
                className="mt-4 block text-center text-xs font-bold text-lime-400 border border-lime-400/30 bg-lime-400/10 hover:bg-lime-400/20 py-2 rounded-xl transition-all duration-200"
              >
                Démarrer gratuitement
              </Link>
            </div>

            {/* Card 2 */}
            <div className="group bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:border-lime-400/40 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-lime-500/10 hover:-translate-y-1">
              <div className="text-5xl font-extrabold text-white mb-2">75<span className="text-lime-400">%</span></div>
              <p className="text-xs text-gray-300 leading-relaxed mb-4">
                des organisations croient que l'IA améliore la qualité et la rapidité du recrutement.
              </p>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full" style={{width:"75%"}}></div>
              </div>
              <div className="mt-4 text-5xl font-extrabold text-white">90<span className="text-lime-400">%</span></div>
              <p className="text-xs text-gray-300 mt-1">des recruteurs préfèrent le recrutement basé sur les données.</p>
            </div>

            {/* Card 3 */}
            <div className="group bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:border-lime-400/40 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-lime-500/10 hover:-translate-y-1">
              <div className="text-5xl font-extrabold text-white mb-1">3<span className="text-lime-400">x</span></div>
              <p className="text-gray-300 text-xs mb-5">Plus rapide qu'un recrutement manuel traditionnel</p>
              <div className="bg-white/10 rounded-2xl p-4 space-y-3">
                {[
                  { label: "Compétences", val: 85, color: "bg-lime-400" },
                  { label: "Expérience",  val: 70, color: "bg-blue-400" },
                  { label: "Personnalité",val: 92, color: "bg-purple-400" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs text-gray-300 mb-1">
                      <span>{s.label}</span>
                      <span className="font-bold text-white">{s.val}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full">
                      <div className={`h-full ${s.color} rounded-full`} style={{width:`${s.val}%`}}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="about" className="bg-white py-24 px-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-lime-600 bg-lime-50 border border-lime-100 px-4 py-1.5 rounded-full uppercase tracking-widest">
              Fonctionnalités
            </span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-4 mb-3 tracking-tight">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-gray-400 text-sm max-w-lg mx-auto">
              Une plateforme complète, de la publication de l'offre au classement final des candidats.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "📄",
                title: "Analyse CV par NLP",
                desc: "spaCy et Sentence-BERT extraient compétences, expérience et formation de chaque CV automatiquement.",
                bg: "bg-lime-50", border: "border-lime-100", iconBg: "bg-lime-100",
                hover: "hover:border-lime-300 hover:shadow-lime-100",
              },
              {
                icon: "🧠",
                title: "Psychométrie Big Five",
                desc: "Test IPIP validé scientifiquement : 25 questions pour mesurer les 5 traits de personnalité OCEAN.",
                bg: "bg-blue-50", border: "border-blue-100", iconBg: "bg-blue-100",
                hover: "hover:border-blue-300 hover:shadow-blue-100",
              },
              {
                icon: "🏆",
                title: "Classement IA",
                desc: "Score multicritère pondéré : compétences 40%, expérience 25%, formation 20%, personnalité 15%.",
                bg: "bg-purple-50", border: "border-purple-100", iconBg: "bg-purple-100",
                hover: "hover:border-purple-300 hover:shadow-purple-100",
              },
            ].map((f) => (
              <div key={f.title} className={`group ${f.bg} border ${f.border} ${f.hover} rounded-2xl p-7 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-default`}>
                <div className={`w-12 h-12 ${f.iconBg} rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ÉTAPES ─────────────────────────────────────────────────────────── */}
      <section id="comment" className="py-24 px-10 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-lime-600 bg-lime-50 border border-lime-100 px-4 py-1.5 rounded-full uppercase tracking-widest">
              Processus
            </span>
            <h2 className="text-4xl font-extrabold text-gray-900 mt-4 tracking-tight">
              Le parcours en 4 étapes
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { num:"01", who:"Recruteur", title:"Publie une offre",        desc:"Définit les compétences requises, l'expérience souhaitée et le profil OCEAN idéal pour le poste.", color:"bg-lime-500",   light:"text-lime-600 bg-lime-50" },
              { num:"02", who:"Candidat",  title:"Dépose son CV",           desc:"Upload PDF ou Word. Le pipeline NLP analyse le CV automatiquement en arrière-plan.",                color:"bg-blue-500",   light:"text-blue-600 bg-blue-50" },
              { num:"03", who:"Candidat",  title:"Passe le test Big Five",  desc:"25 questions rapides pour évaluer sa personnalité selon le modèle scientifique OCEAN.",            color:"bg-purple-500", light:"text-purple-600 bg-purple-50" },
              { num:"04", who:"Recruteur", title:"Consulte le classement",  desc:"Candidats classés par score global avec le détail de chaque sous-score et profil OCEAN.",         color:"bg-gray-800",   light:"text-gray-600 bg-gray-100" },
            ].map((s) => (
              <div key={s.num} className="group flex gap-5 items-start bg-white border border-gray-100 hover:border-lime-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <div className={`w-11 h-11 ${s.color} rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-md`}>
                  {s.num}
                </div>
                <div className="flex-1">
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1 ${s.light}`}>
                    {s.who}
                  </span>
                  <div className="font-bold text-gray-900 mb-0.5">{s.title}</div>
                  <div className="text-sm text-gray-500">{s.desc}</div>
                </div>
                <div className="text-gray-200 group-hover:text-lime-400 transition-colors duration-300 text-xl self-center">
                  →
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 py-16 px-10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val:"3x",  label:"Plus rapide"          },
            { val:"75%", label:"Satisfaction RH"      },
            { val:"26+", label:"Compétences extraites" },
            { val:"5",   label:"Dimensions OCEAN"      },
          ].map((s) => (
            <div key={s.label} className="group">
              <div className="text-4xl font-extrabold text-lime-400 mb-1 group-hover:scale-110 transition-transform duration-300">
                {s.val}
              </div>
              <div className="text-xs text-gray-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-500 to-lime-600" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
            Prêt à recruter intelligemment ?
          </h2>
          <p className="text-white/80 mb-10 text-sm max-w-md mx-auto">
            Créez votre compte candidat et déposez votre premier CV en 2 minutes.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/register"
              className="group bg-white hover:bg-gray-50 text-lime-600 font-bold px-8 py-3.5 rounded-full text-sm transition-all duration-300 shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              Démarrer maintenant
              <span className="bg-lime-100 group-hover:bg-lime-200 rounded-full w-6 h-6 flex items-center justify-center text-xs transition-all duration-200">↗</span>
            </Link>
            <Link
              to="/login"
              className="text-white/90 hover:text-white border border-white/30 hover:border-white/60 font-semibold px-8 py-3.5 rounded-full text-sm transition-all duration-300"
            >
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-lime-500 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span className="font-bold text-white text-sm">RecrutIA</span>
          </div>
          <p className="text-gray-500 text-xs text-center">
            Projet de fin d'année · Master Intelligence Artificielle · Université de Dschang © 2026
          </p>
          <div className="flex gap-5 text-xs text-gray-500">
            <a href="#about"   className="hover:text-lime-400 transition-colors duration-200">À propos</a>
            <a href="#comment" className="hover:text-lime-400 transition-colors duration-200">Comment ça marche</a>
          </div>
        </div>
      </footer>

    </div>
  );
}