import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage    from './pages/LoginPage';
import UsersPage    from './pages/UsersPage';
import Sidebar      from './components/Sidebar';
import Toast        from './components/Toast';

import DashboardPage from './pages/DashboardPage';

export default function App() {
  const [authed,    setAuthed]    = useState(false);
  const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Poll backend connection status
  useEffect(() => {
    if (!authed) return;
    const check = async () => {
      try {
        const res = await fetch('/admin/stats');
        setConnected(res.ok);
      } catch { setConnected(false); }
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [authed]);

  if (!authed) {
    return (
      <>
        <LoginPage onLogin={() => setAuthed(true)} />
        <Toast />
      </>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-bg">
        <Sidebar
          connected={connected}
          onSignOut={() => { setAuthed(false); }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        {/* Main content — offset by sidebar width on desktop */}
        <main className="flex-1 md:ml-64 min-h-screen overflow-y-auto flex flex-col">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between bg-surface border-b border-border px-4 py-3 sticky top-0 z-30">
            <div className="font-syne font-bold text-xl text-text-primary">Admin</div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface2 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>

          <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            <Routes>
              <Route path="/admin/dashboard" element={<DashboardPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </div>
        </main>
        <Toast />
      </div>
    </BrowserRouter>
  );
}
