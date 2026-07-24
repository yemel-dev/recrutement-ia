import { Link } from "react-router-dom";
import { Search, FileText, UserRound, Sparkles } from "lucide-react";
import PerformanceGauge from "./PerformanceGauge";

const shortcuts = [
  { icon: Search, label: "Trouver des offres", to: "/candidat/offres" },
  { icon: FileText, label: "Mes candidatures", to: "/candidat/mes-candidatures" },
  { icon: UserRound, label: "Mon profil", to: "/candidat/profil" },
];

export default function LeftSidebar({ average, breakdown }) {
  return (
    <aside className="flex w-full flex-col gap-5 lg:w-[300px] lg:shrink-0">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-accent to-card p-6 shadow-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-4.5 w-4.5" strokeWidth={2.2} />
          </span>
          <span className="text-base font-bold tracking-tight text-card-foreground">RecrutIA</span>
        </div>

        <h2 className="text-balance text-2xl font-bold leading-snug text-card-foreground">
          Prêt à trouver ton prochain poste ?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Explore de nouvelles offres et garde un œil sur tes candidatures en cours.
        </p>

        <nav className="mt-6 flex flex-col gap-2.5">
          {shortcuts.map(({ icon: Icon, label, to }) => (
            <Link
              key={label}
              to={to}
              className="flex items-center gap-3 rounded-2xl bg-card/70 px-4 py-3 text-left text-sm font-medium text-card-foreground shadow-sm backdrop-blur transition hover:bg-card"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <PerformanceGauge average={average} breakdown={breakdown} />
    </aside>
  );
}