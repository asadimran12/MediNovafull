import { useState, useEffect } from 'react';
import { fetchUsers } from '../api';
import StatCard from '../components/StatCard';
import UserTable from '../components/UserTable';
import UserModal from '../components/UserModal';
import { showToast } from '../components/Toast';

export default function DashboardPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetchUsers();
      setData(res);
    } catch(e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const users = data?.users || [];

  // Compute stats from users array
  const totalPlans  = users.reduce((a, u) => a + Object.keys(u.plans  || {}).length, 0);
  const totalChats  = users.reduce((a, u) => a + Object.keys(u.chats  || {}).length, 0);
  const withCond    = users.filter(u => (u.profile?.conditions || '').trim()).length;

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-syne font-bold text-3xl text-text-primary">Dashboard</h1>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg bg-surface2 border border-border text-sm text-text-muted hover:text-text-primary hover:border-accent/40 transition-colors"
        >⟳ Refresh</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users"      value={loading ? '…' : users.length} color="cyan"   />
        <StatCard label="Total Plans"      value={loading ? '…' : totalPlans}   color="green"  />
        <StatCard label="Total Chats"      value={loading ? '…' : totalChats}   color="purple" />
        <StatCard label="With Conditions"  value={loading ? '…' : withCond}     color="amber"  />
      </div>

      {/* User table */}
      <UserTable
        users={users}
        loading={loading}
        onView={u => setModal(u)}
        onDelete={async (username) => {
          try {
            const { deleteUser } = await import('../api');
            await deleteUser(username);
            showToast(`Deleted "${username}"`, 'success');
            load();
          } catch(e) { showToast(e.message, 'error'); }
        }}
      />

      {/* User modal */}
      {modal && (
        <UserModal
          user={modal}
          onClose={() => setModal(null)}
          onUpdated={load}
          onDeleted={load}
        />
      )}
    </div>
  );
}
