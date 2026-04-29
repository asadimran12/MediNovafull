import { useState, useEffect } from 'react';
import { fetchUsers } from '../api';
import { showToast } from '../components/Toast';

function ChatViewer({ chat, onClose }) {
  const messages = chat.messages || [];
  return (
    <div
      className="fixed inset-0 z-[200] bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-xl h-[70vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div className="font-syne font-bold text-text-primary">{chat.title}</div>
            <div className="font-mono text-xs text-text-muted">{messages.length} messages · {chat.ownerUsername}</div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-2xl ml-4">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="text-center text-text-muted py-12">No messages in this chat</div>
          )}
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id || i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isUser
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-surface2 text-text-primary border border-border'
                }`}>
                  <div>{msg.text}</div>
                  {msg.timestamp && (
                    <div className="text-xs text-text-muted mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ChatsPage() {
  const [chats,   setChats]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState(null);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchUsers();
        const flat = [];
        for (const u of (res.users || [])) {
          for (const c of Object.values(u.chats || {})) {
            flat.push({ ...c, ownerUsername: u.primary_username });
          }
        }
        setChats(flat);
      } catch(e) { showToast(e.message, 'error'); }
      finally { setLoading(false); }
    })();
  }, []);

  const q = search.toLowerCase();
  const filtered = chats.filter(c =>
    (c.title || '').toLowerCase().includes(q) ||
    (c.ownerUsername || '').toLowerCase().includes(q)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne font-bold text-3xl text-text-primary">Chats</h1>
          <div className="font-mono text-xs text-text-muted mt-1">{chats.length} total chats</div>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search chats…"
          className="bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text-primary
            focus:border-accent outline-none placeholder:text-text-muted w-56"
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted font-mono text-xs uppercase tracking-wider">
              {['Title','Owner','Messages','Last Updated','Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((_,j) => (
                  <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-16 text-center text-text-muted">
                <div className="text-4xl mb-3">💬</div>
                <div>No chats found</div>
              </td></tr>
            ) : filtered.map((c, i) => (
              <tr
                key={c.id || i}
                className="hover:bg-surface2 transition-colors cursor-pointer"
                onClick={() => setActive(c)}
              >
                <td className="px-4 py-3 text-text-primary max-w-[240px] truncate" title={c.title}>{c.title}</td>
                <td className="px-4 py-3 font-mono text-accent text-xs">{c.ownerUsername}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-purple/20 text-purple">
                    {(c.messages || []).length}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted font-mono text-xs">
                  {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  {c.isFull
                    ? <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-400">Full</span>
                    : <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber/20 text-amber">Partial</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && <ChatViewer chat={active} onClose={() => setActive(null)} />}
    </div>
  );
}
