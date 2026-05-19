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

export default function UserTable({ users = [], onView, loading }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted font-mono text-xs uppercase tracking-wider">
              {['Username', 'Age', 'Gender', 'Conditions', 'Severity', 'Revenue'].map(h => (
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
                const unlockedModels = profile.unlockedModels || [];
                const revenue = unlockedModels.reduce((sum, m) => sum + (m.amount || 0), 0);
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
                    <td className="px-4 py-3 text-green-400 font-mono">{revenue > 0 ? `$${revenue}` : '—'}</td>
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
