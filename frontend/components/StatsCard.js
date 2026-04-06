export default function StatsCard({ title, count, icon: Icon }) {
  return (
    <div className="border border-terminal-border rounded bg-terminal-surface p-4 terminal-hover cursor-pointer">
      <div className="text-terminal-muted text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={11} />}
        {title}
      </div>
      <div className="text-terminal-bright text-2xl font-bold glow">
        {typeof count === 'number' ? count.toLocaleString() : count}
      </div>
    </div>
  );
}
