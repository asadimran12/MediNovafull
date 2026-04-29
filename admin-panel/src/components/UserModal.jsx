import { useState } from 'react';
import { updateProfile, updatePassword, deleteUser } from '../api';
import { showToast } from './Toast';

function Field({ label, value }) {
  return (
    <div className="bg-surface2 rounded-lg px-4 py-3">
      <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-text-primary text-sm break-words">{value || '—'}</div>
    </div>
  );
}

export default function UserModal({ user, onClose, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...(user.profile || {}) });
  const [pwEdit, setPwEdit] = useState(false);
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);

  const profile = user.profile || {};
  const authEntry = (user.auth || [])[0] || {};

  async function saveProfile() {
    try {
      setSaving(true);
      await updateProfile(user.primary_username, form);
      showToast('Profile updated!', 'success');
      setEditing(false);
      onUpdated?.();
    } catch(e) {
      showToast(e.message, 'error');
    } finally { setSaving(false); }
  }

  async function savePassword() {
    if (!pw.trim()) {
      showToast('Password cannot be empty', 'error');
      return;
    }
    try {
      setSaving(true);
      await updatePassword(user.primary_username, pw);
      showToast('Password updated!', 'success');
      setPwEdit(false);
      setPw('');
    } catch(e) {
      showToast(e.message, 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!window.confirm(`Permanently delete user "${user.primary_username}"? This cannot be undone.`)) return;
    try {
      await deleteUser(user.primary_username);
      showToast(`User "${user.primary_username}" deleted`, 'success');
      onDeleted?.();
      onClose();
    } catch(e) { showToast(e.message, 'error'); }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border">
          <div>
            <div className="font-syne font-bold text-2xl text-text-primary">{user.primary_username}</div>
            <div className="font-mono text-xs text-text-muted mt-1">
              ID: {user._id || '—'} · Joined: {authEntry.createdAt ? new Date(authEntry.createdAt).toLocaleDateString() : '—'}
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-2xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {editing ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Username</label>
                <input
                  disabled
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text-muted opacity-60"
                  value={user.primary_username}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Age</label>
                  <input
                    className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent outline-none"
                    value={form.age || ''}
                    onChange={e => setForm(f => ({...f, age: e.target.value}))}
                  />
                </div>
                <div>
                  <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Gender</label>
                  <select
                    className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent outline-none"
                    value={form.gender || ''}
                    onChange={e => setForm(f => ({...f, gender: e.target.value}))}
                  >
                    <option value="">—</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Severity</label>
                <select
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent outline-none"
                  value={form.severity || ''}
                  onChange={e => setForm(f => ({...f, severity: e.target.value}))}
                >
                  <option value="">—</option>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div>
                <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1">Conditions</label>
                <textarea
                  rows={4}
                  className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent outline-none resize-none"
                  value={form.conditions || ''}
                  onChange={e => setForm(f => ({...f, conditions: e.target.value}))}
                  placeholder="List medical conditions..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-accent text-bg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >{saving ? 'Saving…' : 'Save Changes'}</button>
                <button
                  onClick={() => { setEditing(false); setForm({...profile}); }}
                  className="px-4 py-2 rounded-lg bg-surface2 border border-border text-sm text-text-muted hover:text-text-primary"
                >Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username" value={user.primary_username} />
                <Field label="Age" value={profile.age} />
                <Field label="Gender" value={profile.gender} />
                <Field label="Severity" value={profile.severity} />
              </div>
              <Field label="Conditions" value={profile.conditions} />
              <Field label="Account Created" value={authEntry.createdAt ? new Date(authEntry.createdAt).toLocaleString() : '—'} />

              <button
                onClick={() => setEditing(true)}
                className="w-full px-4 py-2 rounded-lg bg-accent/10 text-accent border border-accent/30 text-sm font-medium hover:bg-accent/20 transition-colors"
              >Edit Profile</button>

              {pwEdit ? (
                <div className="flex gap-3 items-center bg-surface2 border border-border rounded-lg p-3">
                  <input
                    type="password"
                    placeholder="New password"
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent outline-none"
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                  />
                  <button
                    onClick={savePassword}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-accent text-bg text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
                  >{saving ? 'Saving…' : 'Update'}</button>
                  <button
                    onClick={() => { setPwEdit(false); setPw(''); }}
                    className="px-4 py-2 rounded-lg bg-surface border border-border text-sm text-text-muted whitespace-nowrap"
                  >Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setPwEdit(true)}
                  className="w-full px-4 py-2 rounded-lg bg-surface2 border border-border text-sm text-text-muted hover:text-text-primary transition-colors"
                >Change Password</button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <button
            onClick={handleDelete}
            className="px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/20 transition-colors"
          >Delete User</button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface2 border border-border text-sm text-text-muted hover:text-text-primary transition-colors"
          >Close</button>
        </div>
      </div>
    </div>
  );
}
