import { useState, useEffect } from 'react';
import LoginPage    from './pages/LoginPage';
import UsersPage    from './pages/UsersPage';
import Sidebar      from './components/Sidebar';
import Toast        from './components/Toast';

export default function App() {
  const [authed,    setAuthed]    = useState(false);
  const [connected, setConnected] = useState(false);

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
    <div className="flex min-h-screen bg-bg">
      <Sidebar
        connected={connected}
        onSignOut={() => { setAuthed(false); }}
      />
      {/* Main content — offset by sidebar width */}
      <main className="flex-1 ml-60 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <UsersPage />
        </div>
      </main>
      <Toast />
    </div>
  );
}
