import {
  Users,
  UserCheck,
  Briefcase,
  CheckCircle2,
  FileText,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const tints = {
  primary: "bg-primary/15 text-primary",
  sky:     "bg-sky-100 text-sky-600",
  violet:  "bg-violet-100 text-violet-600",
  amber:   "bg-warning/20 text-warning",
  emerald: "bg-emerald-100 text-emerald-600",
  rose:    "bg-destructive/10 text-destructive",
};

function Card({ icon: Icon, tint, value, label, delta }) {
  const up = delta?.trend === "up";
  return (
    <article className="rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tints[tint]}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
        {delta && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              up ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            {up ? <ArrowUpRight className="h-3 w-3" strokeWidth={2.6} /> : <ArrowDownRight className="h-3 w-3" strokeWidth={2.6} />}
            {delta.label}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </article>
  );
}

/**
 * Calcule une évolution "ce mois-ci vs mois dernier" en % pour un sous-ensemble d'utilisateurs.
 */
function calcDelta(users) {
  const now = new Date();
  const debutMoisCourant = new Date(now.getFullYear(), now.getMonth(), 1);
  const debutMoisDernier = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const moisCourant = users.filter((u) => new Date(u.created_at) >= debutMoisCourant).length;
  const moisDernier = users.filter((u) => {
    const d = new Date(u.created_at);
    return d >= debutMoisDernier && d < debutMoisCourant;
  }).length;

  if (moisDernier === 0) {
    return moisCourant > 0
      ? { trend: "up", label: "Nouveau" }
      : null;
  }

  const pct = Math.round(((moisCourant - moisDernier) / moisDernier) * 100);
  return { trend: pct >= 0 ? "up" : "down", label: `${pct >= 0 ? "+" : ""}${pct}%` };
}

export default function AdminStats({ utilisateurs, offresActives }) {
  const candidats  = utilisateurs.filter((u) => u.role === "candidat");
  const recruteurs = utilisateurs.filter((u) => u.role === "recruteur");
  const actifs     = utilisateurs.filter((u) => u.is_active);

  const septJoursAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const nouveauxSemaine = utilisateurs.filter((u) => new Date(u.created_at) >= septJoursAgo).length;

  const cards = [
    { icon: Users, tint: "primary", value: utilisateurs.length, label: "Utilisateurs totaux", delta: calcDelta(utilisateurs) },
    { icon: UserCheck, tint: "sky", value: candidats.length, label: "Candidats", delta: calcDelta(candidats) },
    { icon: Briefcase, tint: "violet", value: recruteurs.length, label: "Recruteurs", delta: calcDelta(recruteurs) },
    { icon: CheckCircle2, tint: "emerald", value: actifs.length, label: "Comptes actifs" },
    { icon: FileText, tint: "amber", value: offresActives.length, label: "Offres actives" },
    { icon: UserPlus, tint: "rose", value: nouveauxSemaine, label: "Nouveaux (7 jours)" },
  ];

  return (
    <section aria-label="Statistiques de la plateforme" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label} {...c} />
      ))}
    </section>
  );
}