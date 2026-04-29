import { useState, useEffect } from 'react';
import { fetchUsers, createUser, deleteUser } from '../api';
import UserTable from '../components/UserTable';
import UserModal from '../components/UserModal';
import { showToast } from '../components/Toast';

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ username:'', password:'', age:'', gender:'', conditions:'', severity:'' });
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({...f, [k]: v})); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username || !form.password) { showToast('Username and password are required', 'error'); return; }
    try {
      setLoading(true);
      await createUser(form);
      showToast(`User "${form.username}" created!`, 'success');
      onCreated();
      onClose();
    } catch(e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <span className="font-syne font-bold text-text-primary text-xl">Add User</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-2xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Username *</label>
              <input required className="input-base" value={form.username} onChange={e => set('username', e.target.value)} placeholder="johndoe" />
            </div>
            <div className="col-span-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Password *</label>
              <input required type="password" className="input-base" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Age</label>
              <input className="input-base" value={form.age} onChange={e => set('age', e.target.value)} placeholder="25" />
            </div>
            <div>
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Gender</label>
              <select className="input-base" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Conditions</label>
              <textarea className="input-base resize-none" rows={2} value={form.conditions} onChange={e => set('conditions', e.target.value)} placeholder="Diabetes, Hypertension…" />
            </div>
            <div className="col-span-2">
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Severity</label>
              <select className="input-base" value={form.severity} onChange={e => set('severity', e.target.value)}>
                <option value="">—</option><option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-accent text-bg font-semibold text-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
            >{loading ? 'Creating…' : 'Create User'}</button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-lg bg-surface2 border border-border text-text-muted text-sm hover:text-text-primary"
            >Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await fetchUsers();
      setUsers(res.users || []);
    } catch(e) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const q = search.toLowerCase();
  const filtered = users.filter(u =>
    (u.primary_username || '').toLowerCase().includes(q) ||
    (u.profile?.conditions || '').toLowerCase().includes(q)
  );

  async function handleDelete(username) {
    try {
      await deleteUser(username);
      showToast(`Deleted "${username}"`, 'success');
      load();
    } catch(e) { showToast(e.message, 'error'); }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-syne font-bold text-3xl text-text-primary">Users</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-lg bg-accent text-bg font-semibold text-sm hover:opacity-90 transition-opacity"
        >+ Add User</button>
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
        onDelete={handleDelete}
      />

      {modal && (
        <UserModal
          user={modal}
          onClose={() => setModal(null)}
          onUpdated={load}
          onDeleted={() => { setModal(null); load(); }}
        />
      )}

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load(); }}
        />
      )}
    </div>
  );
}
