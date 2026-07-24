import { useEffect, useState } from "react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import AdminHeader from "../../components/admin/AdminHeader";
import AdminStats from "../../components/admin/AdminStats";
import ActivityChart from "../../components/admin/ActivityChart";
import RecentActivity from "../../components/admin/RecentActivity";
import UsersTable from "../../components/admin/UsersTable";
import SignupsList from "../../components/admin/SignupsList";
import CreateUserModal from "../../components/admin/CreateUserModal";

export default function AdminDashboard() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [offres, setOffres]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [showModal, setShowModal]       = useState(false);

  const charger = async () => {
    try {
      const [usersRes, offresRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/offers/"),
      ]);
      setUtilisateurs(usersRes.data);
      setOffres(offresRes.data);
    } catch {
      setError("Impossible de charger le tableau de bord admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const handleToggle = async (id, prenom, isActive) => {
    const action = isActive ? "désactiver" : "réactiver";
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} le compte de ${prenom} ?`)) return;
    try {
      await api.patch(`/admin/users/${id}`);
      charger();
    } catch {
      alert("Impossible de modifier ce compte.");
    }
  };

  const handleSupprimer = async (id, prenom) => {
    if (!window.confirm(`Supprimer définitivement le compte de ${prenom} ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      charger();
    } catch {
      alert("Impossible de supprimer ce compte.");
    }
  };

  if (loading) return <StatusMessage type="loading" />;
  if (error)   return <StatusMessage type="error" message={error} />;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <AdminHeader utilisateurs={utilisateurs} onCreer={() => setShowModal(true)} />

      <AdminStats utilisateurs={utilisateurs} offresActives={offres} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart utilisateurs={utilisateurs} />
        </div>
        <RecentActivity utilisateurs={utilisateurs} offres={offres} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UsersTable utilisateurs={utilisateurs} onToggle={handleToggle} onSupprimer={handleSupprimer} />
        </div>
        <SignupsList utilisateurs={utilisateurs} />
      </div>

      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); charger(); }}
        />
      )}
    </div>
  );
}