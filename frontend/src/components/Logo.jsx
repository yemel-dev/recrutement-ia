import { Link } from "react-router-dom";

/**
 * Marque "RecrutIA" : un nœud central (le candidat retenu) relié à trois
 * nœuds satellites (les profils analysés), pour évoquer le matching /
 * l'analyse par IA — plus distinctif que l'ancienne icône "éclair" générique.
 * Toujours cliquable, ramène à la landing page ("/").
 */
export default function Logo({ size = "md", dark = false }) {
  const dims = {
    sm: { box: "h-7 w-7", icon: 15, text: "text-sm" },
    md: { box: "h-8 w-8", icon: 17, text: "text-base" },
    lg: { box: "h-11 w-11", icon: 22, text: "text-2xl" },
  }[size];

  return (
    <Link to="/" className="group flex flex-shrink-0 items-center gap-2" aria-label="RecrutIA — retour à l'accueil">
      <span className={`flex ${dims.box} items-center justify-center rounded-xl bg-primary shadow-sm transition-transform duration-200 group-hover:scale-105`}>
        <svg width={dims.icon} height={dims.icon} viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
          <circle cx="5" cy="6" r="2" fill="currentColor" opacity="0.55" />
          <circle cx="19" cy="6" r="2" fill="currentColor" opacity="0.55" />
          <circle cx="12" cy="20" r="2" fill="currentColor" opacity="0.55" />
          <path d="M10.3 10.6 6.4 7.4M13.7 10.6l3.9-3.2M12 14.5V18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className={`font-extrabold tracking-tight ${dims.text} ${dark ? "text-white" : "text-card-foreground"}`}>
        Recrut<span className="text-primary">IA</span>
      </span>
    </Link>
  );
}