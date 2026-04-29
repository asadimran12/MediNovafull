const GLOW_COLORS = {
  cyan:   'bg-accent',
  green:  'bg-green',
  purple: 'bg-purple',
  amber:  'bg-amber',
};

const TEXT_COLORS = {
  cyan:   'text-accent',
  green:  'text-green',
  purple: 'text-purple',
  amber:  'text-amber',
};

export default function StatCard({ label, value, color = 'cyan' }) {
  return (
    <div className="relative bg-surface border border-border rounded-xl px-6 py-5 overflow-hidden">
      {/* Decorative corner glow */}
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${GLOW_COLORS[color]} opacity-10 blur-2xl pointer-events-none`}
      />
      <div className={`font-mono text-xs uppercase tracking-widest ${TEXT_COLORS[color]} mb-2`}>
        {label}
      </div>
      <div className={`font-syne font-bold text-5xl ${TEXT_COLORS[color]}`}>
        {value ?? '—'}
      </div>
    </div>
  );
}
