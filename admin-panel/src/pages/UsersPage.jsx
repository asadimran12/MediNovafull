import { useState, useEffect } from 'react';
import { fetchUsers } from '../api';
import UserTable from '../components/UserTable';
import UserModal from '../components/UserModal';
import { showToast } from '../components/Toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetchUsers();
      setUsers(Array.isArray(res) ? res : res.users || []);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const q = search.toLowerCase();
  const filtered = users.filter(u =>
    (u.primary_username || '').toLowerCase().includes(q) ||
    (u.profile?.conditions || '').toLowerCase().includes(q)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-syne font-bold text-3xl text-text-primary">Users</h1>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by username or conditions…"
          className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary
            focus:border-accent outline-none transition-colors placeholder:text-text-muted"
        />
        <span className="font-mono text-xs text-text-muted whitespace-nowrap">
          {filtered.length} of {users.length}
        </span>
      </div>

      <UserTable
        users={filtered}
        loading={loading}
        onView={u => setModal(u)}
      />

      {modal && (
        <UserModal
          user={modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
