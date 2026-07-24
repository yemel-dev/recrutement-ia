import { Loader2, InboxIcon, AlertTriangle } from "lucide-react";

export default function StatusMessage({ type = "loading", message }) {
  const config = {
    loading: { icon: Loader2, defaultMsg: "Chargement en cours...", spin: true, color: "text-lime-500" },
    empty:   { icon: InboxIcon, defaultMsg: "Rien à afficher pour le moment.", color: "text-gray-300" },
    error:   { icon: AlertTriangle, defaultMsg: "Une erreur est survenue.", color: "text-red-400" },
  };
  const { icon: Icon, defaultMsg, spin, color } = config[type];

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <Icon className={`w-9 h-9 mb-3 ${color} ${spin ? "animate-spin" : ""}`} strokeWidth={1.75} />
      <p className={`text-sm ${type === "error" ? "text-red-500" : "text-gray-500"}`}>
        {message || defaultMsg}
      </p>
    </div>
  );
}