import { useState } from 'react';

const MODEL_NAMES = {
  "qwen-0.5b": "MediQ Mini",
  "medinova-master": "MediNova AI",
  "qwen-1.5b": "MediQ Pro"
};

function Field({ label, value }) {
  return (
    <div className="bg-surface2 rounded-lg px-4 py-3">
      <div className="font-mono text-xs text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="text-text-primary text-sm break-words">{value || '—'}</div>
    </div>
  );
}

export default function UserModal({ user, onClose }) {
  const profile = user.profile || {};
  const authEntry = (user.auth || [])[0] || {};
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
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Username" value={user.primary_username} />
              <Field label="Age" value={profile.age} />
              <Field label="Gender" value={profile.gender} />
              <Field label="Severity" value={profile.severity} />
            </div>
            <Field label="Model Downloaded" value={user.activeModelName} />

            <Field label="Conditions" value={profile.conditions} />
            <Field 
              label="Unlocked Paid Models" 
              value={profile.unlockedModels && profile.unlockedModels.length > 0 
                ? profile.unlockedModels.map(m => `${MODEL_NAMES[m.modelId] || m.modelId} ($${m.amount})`).join(', ') 
                : 'None'} 
            />
            <Field label="Account Created" value={user.timestamp ? new Date(user.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-surface2 border border-border text-sm font-semibold text-text-primary hover:bg-border transition-colors"
          >Close</button>
        </div>
      </div>
    </div>
  );
}
