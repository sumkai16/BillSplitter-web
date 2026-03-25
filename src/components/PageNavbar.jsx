import { Link } from "react-router-dom";

const TONE_STYLES = {
  default:
    "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-900",
  subtle:
    "border-slate-800/80 bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/60",
  danger:
    "border-rose-500/25 bg-rose-500/5 text-rose-300 hover:bg-rose-500/10",
  primary:
    "border-emerald-500/30 bg-emerald-500 text-black hover:bg-emerald-400",
};

export function BrandLogo({ to = "/", className = "" }) {
  return (
    <Link to={to} className={`flex items-center ${className}`}>
      <img src="/hlogo.png" alt="Splitify" className="h-10 w-auto object-contain" />
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
      className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${TONE_STYLES[tone]} ${className}`}
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
      className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${TONE_STYLES[tone]} ${className}`}
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
      className={`${positionClass} z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl ${className}`}
    >
      <div
        className={`mx-auto flex ${maxWidthClass} items-center justify-between gap-4 px-6 py-4 ${innerClassName}`}
      >
        <div className="min-w-0 flex items-center gap-3">{left}</div>
        {center ? <div className="hidden min-w-0 items-center gap-6 md:flex">{center}</div> : <div />} 
        <div className="flex flex-wrap items-center justify-end gap-2">{right}</div>
      </div>
    </header>
  );
}
