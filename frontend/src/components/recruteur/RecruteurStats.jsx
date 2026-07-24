import { Briefcase, Users, Trophy, Clock, Layers, Target } from "lucide-react";

const tints = {
  primary: "bg-primary/15 text-primary",
  violet:  "bg-violet-100 text-violet-600",
  amber:   "bg-warning/20 text-warning",
  rose:    "bg-destructive/10 text-destructive",
  sky:     "bg-sky-100 text-sky-600",
  emerald: "bg-emerald-100 text-emerald-600",
};

function Card({ icon: Icon, tint, value, label, sub }) {
  return (
    <article className="rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tints[tint]}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        {sub && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {sub}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </article>
  );
}

export default function RecruteurStats({ offres, toutesCandidatures }) {
  const offresActives = offres.filter((o) => o.is_active);
  const scoreEleve     = toutesCandidatures.filter((c) => c.score_global >= 0.7).length;
  const enAttente      = toutesCandidatures.filter((c) => !c.score_global).length;
  const meilleurScore  = toutesCandidatures.length
    ? Math.max(...toutesCandidatures.map((c) => c.score_global || 0))
    : 0;
  const scoreMoyen = toutesCandidatures.length
    ? Math.round(
        (toutesCandidatures.reduce((s, c) => s + (c.score_global || 0), 0) / toutesCandidatures.length) * 100
      )
    : 0;

  const cards = [
    { icon: Briefcase, tint: "primary", value: offresActives.length, label: "Offres actives", sub: `${offres.length} au total` },
    { icon: Users,     tint: "violet",  value: toutesCandidatures.length, label: "Candidatures reçues" },
    { icon: Trophy,    tint: "amber",   value: scoreEleve, label: "Score ≥ 70%" },
    { icon: Clock,     tint: "rose",    value: enAttente, label: "En attente d'analyse" },
    { icon: Target,    tint: "emerald", value: `${scoreMoyen}%`, label: "Score moyen" },
    { icon: Layers,    tint: "sky",     value: `${Math.round(meilleurScore * 100)}%`, label: "Meilleur score" },
  ];

  return (
    <section aria-label="Statistiques de recrutement" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label} {...c} />
      ))}
    </section>
  );
}