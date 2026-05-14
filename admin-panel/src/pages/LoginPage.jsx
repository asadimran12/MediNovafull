import { useState } from 'react';
import splash_logo from '../assets/splash_logo.png';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #0d1726 0%, #0b0f1a 100%)' }}
    >
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center text-center mb-10">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full"></div>
            <img
              src={splash_logo}
              alt="MediNova Logo"
              className="relative w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(0,229,255,0.2)] hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="font-mono text-xs text-text-muted mt-2 uppercase tracking-[0.25em] font-semibold bg-surface2/50 py-1.5 px-4 rounded-full border border-border/50 backdrop-blur-sm shadow-sm">
            Admin Control Panel
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface/70 backdrop-blur-xl border border-border/80 rounded-3xl px-8 py-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
          {/* Subtle top highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent"></div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-2 ml-1">Username</label>
              <div className="relative">
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-surface2/50 backdrop-blur-sm border border-border rounded-xl px-4 py-3 text-sm text-text-primary
                    focus:border-accent focus:ring-1 focus:ring-accent/30 focus:bg-surface2 outline-none transition-all placeholder:text-text-muted/50"
                />
              </div>
            </div>
            <div>
              <label className="font-mono text-xs text-text-muted uppercase tracking-wider block mb-2 ml-1">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface2/50 backdrop-blur-sm border border-border rounded-xl px-4 py-3 text-sm text-text-primary
                    focus:border-accent focus:ring-1 focus:ring-accent/30 focus:bg-surface2 outline-none transition-all placeholder:text-text-muted/50"
                />
              </div>
            </div>

            {error && (
              <div className="text-red/90 text-xs font-mono bg-red/10 border border-red/20 rounded-xl px-4 py-3 flex items-start gap-2 backdrop-blur-md">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl bg-accent text-bg font-bold font-syne tracking-wider text-[15px]
                hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              {/* Button inner glow */}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-xl"></div>

              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                    Authenticating…
                  </>
                ) : 'Authenticate Access'}
              </span>
            </button>
          </form>

          <p className="mt-6 text-center text-[10px] text-text-muted/60 font-mono uppercase tracking-widest">
            default: admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
