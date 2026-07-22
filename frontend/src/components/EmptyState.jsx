export default function EmptyState({ title, subtitle, icon = "offres" }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <svg width="180" height="140" viewBox="0 0 180 140" fill="none" className="mb-6">
        {/* Cercle de fond */}
        <circle cx="90" cy="70" r="62" className="fill-lime-50" />

        {icon === "offres" && (
          <>
            {/* Dossier */}
            <rect x="46" y="52" width="88" height="62" rx="8" className="fill-white stroke-gray-300" strokeWidth="2" />
            <path d="M46 66h88" className="stroke-gray-200" strokeWidth="2" />
            <rect x="58" y="78" width="40" height="6" rx="3" className="fill-gray-200" />
            <rect x="58" y="90" width="56" height="6" rx="3" className="fill-gray-200" />
            {/* Loupe */}
            <circle cx="118" cy="94" r="16" className="fill-white stroke-lime-500" strokeWidth="3" />
            <line x1="129" y1="105" x2="140" y2="116" className="stroke-lime-500" strokeWidth="4" strokeLinecap="round" />
          </>
        )}

        {icon === "candidatures" && (
          <>
            <rect x="52" y="40" width="76" height="90" rx="10" className="fill-white stroke-gray-300" strokeWidth="2" />
            <rect x="66" y="56" width="48" height="6" rx="3" className="fill-gray-200" />
            <rect x="66" y="70" width="48" height="6" rx="3" className="fill-gray-200" />
            <rect x="66" y="84" width="30" height="6" rx="3" className="fill-gray-200" />
            <circle cx="118" cy="106" r="15" className="fill-lime-100 stroke-lime-500" strokeWidth="2.5" />
            <path d="M112 106l4 4 8-8" className="stroke-lime-600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}
      </svg>

      <h3 className="text-base font-bold text-gray-900 mb-1.5">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 max-w-xs">{subtitle}</p>}
    </div>
  );
}