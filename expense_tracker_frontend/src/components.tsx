import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, WalletCards, ReceiptText, ChartNoAxesCombined,
  Settings, Plus, Menu, X, CircleHelp, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, Search, CalendarDays, ChevronDown, Sparkles
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/accounts", label: "My accounts", icon: WalletCards },
  { to: "/expenses", label: "Expense history", icon: ReceiptText },
  { to: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    {open && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><WalletCards size={21} /></div>
        <span>ledgerly<span className="brand-dot">.</span></span>
        <button className="icon-button mobile-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={19}/></button>
      </div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">
        {navItems.map(item => <NavLink key={item.to} to={item.to} end={item.end}
          onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <item.icon size={18} strokeWidth={1.9}/><span>{item.label}</span>
        </NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card">
          <div className="help-icon"><CircleHelp size={17}/></div>
          <strong>Need a hand?</strong>
          <p>Keep your spending organized, one entry at a time.</p>
        </div>
        <div className="profile-row">
          <div className="avatar">ME</div>
          <div className="profile-copy"><strong>My workspace</strong><span>Personal tracker</span></div>
          <MoreHorizontal size={18} className="muted"/>
        </div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <button className="icon-button menu-trigger" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20}/></button>
        <div className="breadcrumb">Workspace <span>/</span> <b>Expense tracker</b></div>
        <div className="topbar-right"><span className="secure-pill"><span/> Your data, organized</span><div className="avatar small-avatar">ME</div></div>
      </header>
      <div className="page-wrap">{children}</div>
    </main>
  </div>;
}

export function PageHeading({ eyebrow, title, description, action }: {
  eyebrow?: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return <div className="page-heading">
    <div><div className="eyebrow">{eyebrow || "YOUR FINANCES"}</div><h1>{title}</h1>
      {description && <p>{description}</p>}</div>
    {action && <div className="heading-action">{action}</div>}
  </div>;
}

export function Button({ children, onClick, variant = "primary", type = "button", disabled = false }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "button" | "submit"; disabled?: boolean;
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`btn btn-${variant}`}>{children}</button>;
}

export function StatCard({ label, value, icon: Icon, tone, footnote }: {
  label: string; value: string; icon: React.ElementType; tone: string; footnote?: string;
}) {
  return <div className="stat-card">
    <div className="stat-top"><span>{label}</span><div className={`stat-icon ${tone}`}><Icon size={18}/></div></div>
    <div className="stat-value">{value}</div>
    {footnote && <div className="stat-footnote">{footnote}</div>}
  </div>;
}

export function EmptyState({ title, description, action }: {
  title: string; description: string; action?: React.ReactNode;
}) {
  return <div className="empty-state"><div className="empty-art"><Sparkles size={24}/></div>
    <h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function Modal({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void;
}) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19}/></button></div>
      {children}
    </section>
  </div>;
}

export const DecorativeIcons = { Plus, ArrowUpRight, ArrowDownRight, Search, CalendarDays, ChevronDown };
