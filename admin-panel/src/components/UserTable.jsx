function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

function SeverityBadge({ severity }) {
  const s = (severity || '').toLowerCase();
  if (s === 'high')   return <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-red-500/20 text-red-400">High</span>;
  if (s === 'medium') return <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber/20 text-amber">Medium</span>;
  if (s === 'low')    return <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-green/20 text-green">Low</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-surface2 text-text-muted">—</span>;
}

export default function UserTable({ users = [], onView, onDelete, loading }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted font-mono text-xs uppercase tracking-wider">
              {['Username', 'Age', 'Gender', 'Conditions', 'Severity', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <>{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-text-muted">
                  <div className="text-4xl mb-3">🔍</div>
                  <div>No users found</div>
                </td>
              </tr>
            ) : (
              users.map(u => {
                const profile = u.profile || {};
                const conditions = (profile.conditions || '').slice(0, 30) + ((profile.conditions || '').length > 30 ? '…' : '');
                return (
                  <tr
                    key={u.primary_username}
                    className="hover:bg-surface2 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <button
                        className="font-mono text-accent hover:underline"
                        onClick={() => onView?.(u)}
                      >
                        {u.primary_username}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{profile.age || '—'}</td>
                    <td className="px-4 py-3 text-text-muted">{profile.gender || '—'}</td>
                    <td className="px-4 py-3 text-text-muted max-w-[160px] truncate" title={profile.conditions}>{conditions || '—'}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={profile.severity} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          title="View & Edit user"
                          onClick={() => onView?.(u)}
                          className="p-1.5 rounded hover:bg-accent/10 text-accent transition-colors"
                        >✏️</button>
                        <button
                          title="Delete user"
                          onClick={() => {
                            if (window.confirm(`Delete user "${u.primary_username}"? This cannot be undone.`)) {
                              onDelete?.(u.primary_username);
                            }
                          }}
                          className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                        >🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
