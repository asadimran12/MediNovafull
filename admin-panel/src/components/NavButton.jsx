import { Link } from "react-router-dom";

export default function NavButton({ path, label, icon, active, onClick }) {
  return (
    <Link
      to={path}
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all ${
        active
          ? "bg-[#4C7A61]/10 text-[#4C7A61] border border-[#4C7A61]/20 shadow-sm"
          : "text-text-muted hover:bg-surface2 hover:text-text-primary border border-transparent"
      }`}
    >
      <span className="w-5 h-5 drop-shadow-sm flex items-center justify-center">{icon}</span>
      <span className="font-sans tracking-wide">{label}</span>
    </Link>
  );
}
