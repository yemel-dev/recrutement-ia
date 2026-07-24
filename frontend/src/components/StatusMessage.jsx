export default function StatusMessage({ type = "loading", message }) {
  const config = {
    loading: { icon: "⏳", defaultMsg: "Chargement en cours..." },
    empty:   { icon: "📭", defaultMsg: "Rien à afficher pour le moment." },
    error:   { icon: "⚠️", defaultMsg: "Une erreur est survenue." },
  };
  const { icon, defaultMsg } = config[type];

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <span className="text-3xl mb-3">{icon}</span>
      <p className={`text-sm ${type === "error" ? "text-destructive" : "text-muted-foreground"}`}>
        {message || defaultMsg}
      </p>
    </div>
  );
}