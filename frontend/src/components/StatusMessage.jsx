export default function StatusMessage({ type = "loading", message }) {
  const config = {
    loading: { icon: "⏳", defaultMsg: "Chargement en cours..." },
    empty: { icon: "📭", defaultMsg: "Rien à afficher pour le moment." },
    error: { icon: "⚠️", defaultMsg: "Une erreur est survenue." },
  };
  const { icon, defaultMsg } = config[type];

  return (
    <div className={`status-message status-${type}`}>
      <span className="status-icon">{icon}</span>
      <p>{message || defaultMsg}</p>
    </div>
  );
}