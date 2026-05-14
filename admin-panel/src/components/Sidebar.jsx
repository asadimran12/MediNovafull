import splash_logo from "../assets/splash_logo.png";
import NavButton from "./NavButton";
import { useLocation } from "react-router-dom";

export default function Sidebar({ connected, onSignOut, isOpen, onClose }) {

  const location = useLocation();

  const Menu = [
    {
      path: "/admin/dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l-7 7-7-7m3-3v10a1 1 0 001 1h3m0 0h.01M17 15h.01" />
        </svg>
      )
    },
    {
      path: "/admin/users",
      label: "Users",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-surface/95 backdrop-blur-md border-r border-border flex flex-col z-50 shadow-[4px_0_24px_-12px_rgba(76,122,97,0.1)] transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
        {Menu.map((item, index) => (
          <NavButton
            key={index}
            path={item.path}
            label={item.label}
            icon={item.icon}
            active={location.pathname === item.path}
            onClick={onClose}
          />
        ))}
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
    </>
  );
}
