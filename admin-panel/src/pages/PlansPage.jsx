import { useState, useEffect } from 'react';
import { fetchUsers } from '../api';
import { showToast } from '../components/Toast';

const TYPE_FILTERS = ['All', 'Diet', 'Exercise'];

function TypeBadge({ type }) {
  const t = (type || '').toLowerCase();
  if (t.includes('exercise')) return <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-400">Exercise</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-green/20 text-green">Diet</span>;
}

export default function PlansPage() {
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [type,    setType]    = useState('All');
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchUsers();
        const flat = [];
        for (const u of (res.users || [])) {
          for (const p of Object.values(u.plans || {})) {
            flat.push({ ...p, ownerUsername: u.primary_username });
          }
        }
        setPlans(flat);
      } catch(e) { showToast(e.message, 'error'); }
      finally { setLoading(false); }
    })();
  }, []);

  const q = search.toLowerCase();
  const filtered = plans.filter(p => {
    const matchType = type === 'All' || (p.type || '').toLowerCase().includes(type.toLowerCase());
    const matchSearch = (p.title || '').toLowerCase().includes(q) || (p.ownerUsername || '').toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne font-bold text-3xl text-text-primary">Plans</h1>
          <div className="font-mono text-xs text-text-muted mt-1">{plans.length} total plans</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setType(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                type === f ? 'bg-accent text-bg' : 'text-text-muted hover:text-text-primary'
              }`}
            >{f}</button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search plans…"
          className="flex-1 min-w-[200px] bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text-primary
            focus:border-accent outline-none placeholder:text-text-muted"
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted font-mono text-xs uppercase tracking-wider">
              {['Title','Type','Owner','Created'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>{[...Array(4)].map((_,j) => (
                  <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-16 text-center text-text-muted">
                <div className="text-4xl mb-3">📋</div>
                <div>No plans match current filters</div>
              </td></tr>
            ) : filtered.map((p, i) => (
              <tr key={p.id || i} className="hover:bg-surface2 transition-colors">
                <td className="px-4 py-3 text-text-primary max-w-[260px] truncate" title={p.title}>{p.title}</td>
                <td className="px-4 py-3"><TypeBadge type={p.type} /></td>
                <td className="px-4 py-3 font-mono text-accent text-xs">{p.ownerUsername}</td>
                <td className="px-4 py-3 text-text-muted font-mono text-xs">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
