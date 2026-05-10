import splash_logo from "../assets/splash_logo.png";

export default function Sidebar({ connected, onSignOut }) {
  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-surface/95 backdrop-blur-md border-r border-border flex flex-col z-50 shadow-[4px_0_24px_-12px_rgba(76,122,97,0.1)] transition-all">
      {/* Logo Area */}
      <div className="px-6 pt-8 pb-6 border-b border-border/60">
        <div className="flex items-center gap-4">
          <img 
            src={splash_logo} 
            alt="Logo" 
            className="w-12 h-12 object-contain drop-shadow-md" 
          />
          <div className="flex flex-col justify-center">
            <span className="font-syne text-[#4C7A61] font-bold text-lg tracking-wide">
              Admin
            </span>
            <span className="font-mono text-[10px] text-[#4C7A61]/70 uppercase tracking-widest font-semibold">
              Portal
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
        {/* Active Nav Item */}
        <div className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-left bg-[#4C7A61]/10 text-[#4C7A61] border border-[#4C7A61]/20 shadow-sm transition-all cursor-default">
          <span className="text-lg drop-shadow-sm">👥</span>
          <span className="font-sans tracking-wide">Manage Users</span>
        </div>
      </nav>

      {/* Bottom Area */}
      <div className="px-6 py-6 border-t border-border/60 flex flex-col gap-4 bg-gradient-to-t from-surface to-transparent">
        {/* Connection status */}
        <div className="flex items-center justify-between bg-background/50 px-3 py-2 rounded-lg border border-border/40">
          <span className="font-mono text-xs text-text-muted font-medium">
            System Status
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full shadow-sm ${connected ? 'bg-[#4C7A61] shadow-[#4C7A61]/40 pulse-dot' : 'bg-red-500 shadow-red-500/40'
                }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              {connected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all py-2.5 rounded-lg border border-transparent hover:border-red-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
