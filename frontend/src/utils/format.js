// Petits helpers de formatage réutilisables dans tout le front.

/**
 * Formate une date ISO en temps relatif français ("Il y a 10 min", "Hier", "12 juin 2026"...).
 */
export function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffJ = Math.floor(diffH / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH} h`;
  if (diffJ === 1) return "Hier";
  if (diffJ < 7) return `Il y a ${diffJ} j`;

  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Formate une date ISO en "12 juin 2026" */
export function formatDateLong(dateStr) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

/** Clé "YYYY-MM" pour grouper par mois */
export function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Label court du mois en français, ex: "Juin" */
export function monthLabel(date) {
  const label = date.toLocaleDateString("fr-FR", { month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

/** Clé "YYYY-MM-DD" pour grouper par jour */
export function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

/** Label court du jour, ex: "24 juil." */
export function dayLabel(date) {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}