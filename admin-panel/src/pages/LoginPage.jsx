import { useState } from 'react';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      onLogin();
    } else {
      setError('Invalid credentials. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #0d1726 0%, #0b0f1a 70%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-syne font-bold text-4xl text-accent mb-1">⚕ MediNova</div>
          <div className="font-mono text-xs text-text-muted uppercase tracking-widest">Admin Control Panel</div>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl px-8 py-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1.5">Username</label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-surface2 border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary
                  focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-1.5">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface2 border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary
                  focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-accent text-bg font-semibold font-syne tracking-wide
                hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-text-muted font-mono">
            default: admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
