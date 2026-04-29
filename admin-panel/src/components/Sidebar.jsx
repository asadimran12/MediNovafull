export default function Sidebar({ connected, onSignOut }) {
  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-surface border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5 border-b border-border">
        <div className="font-syne font-bold text-xl text-accent tracking-wide">⚕ MediNova</div>
        <div className="font-mono text-xs text-text-muted mt-1">User Manager</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <div className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-left">
          <span className="text-base">👥</span>
          <span className="font-sans text-accent">Manage Users</span>
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-6 py-5 border-t border-border flex flex-col gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400 pulse-dot' : 'bg-red-500'}`}
          />
          <span className="font-mono text-xs text-text-muted">
            {connected ? 'Backend connected' : 'Backend offline'}
          </span>
        </div>
        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full text-sm font-medium text-text-muted hover:text-red-400 transition-colors text-left py-1"
        >
          ← Sign Out
        </button>
      </div>
    </aside>
  );
}
