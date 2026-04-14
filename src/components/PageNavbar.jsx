import { Link } from "react-router-dom";

const TONE_STYLES = {
  default:
    "border-slate-800/60 bg-slate-900/40 text-slate-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-300",
  subtle:
    "border-transparent bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40",
  danger:
    "border-rose-500/20 bg-rose-500/5 text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200",
  primary:
    "border-emerald-400/50 bg-emerald-500 text-emerald-950 hover:bg-emerald-400 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
};

export function BrandLogo({ to = "/", className = "" }) {
  return (
    <Link to={to} className={`flex items-center outline-none border-none focus:outline-none focus:ring-0 group ${className}`}>
      <img src="/hlogo.png" alt="Splitify" className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]" />
    </Link>
  );
}

export function NavbarLink({
  to,
  children,
  tone = "default",
  className = "",
  ...props
}) {
  return (
    <Link
      to={to}
      className={`relative inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${TONE_STYLES[tone]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}

export function NavbarButton({
  children,
  tone = "default",
  className = "",
  ...props
}) {
  return (
    <button
      className={`relative inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${TONE_STYLES[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default function PageNavbar({
  left,
  center,
  right,
  fixed = false,
  sticky = false,
  maxWidthClass = "max-w-7xl",
  className = "",
  innerClassName = "",
}) {
  const positionClass = fixed
    ? "fixed top-0 left-0 right-0"
    : sticky
      ? "sticky top-0"
      : "relative";

  return (
    <header
      className={`${positionClass} z-50 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-2xl ${className}`}
    >
      <div
        className={`mx-auto flex h-20 ${maxWidthClass} items-center justify-between gap-4 px-6 sm:px-8 ${innerClassName}`}
      >
        <div className="min-w-0 flex items-center gap-6">{left}</div>
        {center ? <div className="hidden min-w-0 items-center gap-6 md:flex">{center}</div> : <div className="flex-1" />} 
        <div className="flex flex-wrap items-center justify-end gap-3">{right}</div>
      </div>
    </header>
  );
}
