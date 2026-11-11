"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { FallingLeaves, Icon, Logo, type IconName } from "./Icons";
import type { Store } from "@/lib/client";
import type { Task, Priority } from "@/lib/tasks";
import { localDate } from "@/lib/tasks";

export type Tab = "home" | "plans" | "calendar" | "tasks" | "analytics" | "explore" | "map" | "profile";
export const navigation: { id: Tab; label: string; icon: IconName }[] = [
  { id: "home", label: "Dashboard", icon: "dashboard" }, { id: "plans", label: "My Day", icon: "sun" },
  { id: "calendar", label: "Calendar", icon: "calendar" }, { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "analytics", label: "Analytics", icon: "chart" }, { id: "explore", label: "Explore", icon: "compass" },
  { id: "map", label: "Map", icon: "map" }, { id: "profile", label: "Settings", icon: "settings" },
];
export function Dialog({ title, onClose, children, className = "" }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null); const heading = useId();
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const focusables = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, textarea, [tabindex="0"]') ?? []).filter((e) => e.getAttribute("aria-hidden") !== "true");
    (ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0] ?? ref.current)?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      if (e.key === "Tab") { const items = focusables(), first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handle);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", handle); previous?.focus(); };
  }, []);
  return <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div ref={ref} role="dialog" aria-modal="true" aria-labelledby={heading} tabIndex={-1} className={`dialog-panel ${className}`}><div className="dialog-heading"><h2 id={heading}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>{children}</div></div>;
}

export function Workspace({ s, tab, nav, start, addTask, search, theme, children, tools }: { s: Store; tab: Tab; nav: (t: Tab) => void; start: () => void; addTask: () => void; search: () => void; theme: () => void; children: ReactNode; tools?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false), [mobile, setMobile] = useState(false), [focus, setFocus] = useState(false);
  useEffect(() => { try { setCollapsed(localStorage.getItem("dayflow:sidebar") === "collapsed"); } catch {} }, []);
  const toggleSidebar = () => setCollapsed((value) => { try { localStorage.setItem("dayflow:sidebar", value ? "expanded" : "collapsed"); } catch {} return !value; });
  const name = s.profile?.name || "Guest";
  const item = (t: typeof navigation[number]) => <button key={t.id} title={collapsed ? t.label : undefined} aria-label={t.label} aria-current={tab === t.id ? "page" : undefined} className={`nav-item ${tab === t.id ? "is-active" : ""}`} onClick={() => { nav(t.id); setMobile(false); }}><Icon name={t.icon} /><span>{t.label}</span>{t.id === "tasks" && <span className="nav-shortcut">T</span>}</button>;
  const sidebar = <><div className="sidebar-brand"><Logo compact={collapsed} /><button className="icon-button sidebar-collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleSidebar}><Icon name="panel" size={17} /></button></div><div className="workspace-label"><span className="workspace-dot" /><span>Personal workspace</span><span className="workspace-chevron">⌄</span></div><div className="nav-caption">WORKSPACE</div><nav aria-label="Workspace navigation">{navigation.slice(0, 4).map(item)}<button className="nav-item planner-nav" title="AI Planner" onClick={() => { start(); setMobile(false); }}><Icon name="sparkles" /><span>AI Planner</span><span className="nav-new">NEW</span></button>{item(navigation[4])}</nav><div className="nav-caption">DISCOVER</div><nav aria-label="Discovery navigation">{navigation.slice(5, 7).map(item)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><span className="little-orbit"><Icon name="sparkles" size={22} /></span><h3>A little less planning.<br />A little more living.</h3><p>Make room for what matters.</p><button onClick={start}>Plan something good <Icon name="arrow" size={14} /></button></div>{item(navigation[7])}<button className="sidebar-profile" onClick={() => { nav("profile"); setMobile(false); }} aria-label="Open your profile"><span className="avatar">{name.slice(0, 1).toUpperCase()}</span><span><strong>{name}</strong><small>Your personal space</small></span><Icon name="chevron" size={16} /></button></div></>;
  return <div className={`workspace ${collapsed ? "sidebar-is-collapsed" : ""} ${focus ? "focus-mode" : ""}`}><FallingLeaves /><a className="skip-link" href="#main-content">Skip to content</a><aside className="sidebar">{sidebar}</aside>{mobile && <Dialog title="Your workspace" onClose={() => setMobile(false)} className="mobile-drawer"><div className="mobile-nav">{navigation.map(item)}<button className="nav-item" onClick={() => { start(); setMobile(false); }}><Icon name="sparkles" /><span>AI Planner</span></button></div></Dialog>}<div className="workspace-main"><header className="topbar"><div className="topbar-location"><button className="icon-button mobile-menu" onClick={() => setMobile(true)} aria-label="Open navigation"><Icon name="menu" /></button><span className="topbar-workspace">Workspace</span><span className="breadcrumb-slash">/</span><strong>{navigation.find((n) => n.id === tab)?.label}</strong><span className="topbar-dot" /></div><button className="global-search" onClick={search}><Icon name="search" size={16} /><span>Search anything...</span><kbd>⌘ K</kbd></button><div className="topbar-actions"><button className="icon-button" aria-label={focus ? "Exit focus mode" : "Enter focus mode"} aria-pressed={focus} onClick={() => setFocus(!focus)}><Icon name="focus" size={19} /></button><button className="icon-button" aria-label={`Theme: ${s.theme ?? (s.dark ? "dark" : "light")}. Switch theme`} onClick={theme}><Icon name={s.theme === "system" ? "monitor" : s.dark ? "sun" : "moon"} size={19} /></button><div className="topbar-extras">{tools}</div><span className="topbar-divider" /><button className="btn-primary quick-add" onClick={addTask}><Icon name="plus" size={16} /><span>Quick add</span></button><button className="avatar topbar-avatar" aria-label="Open your profile" onClick={() => nav("profile")}>{name.slice(0, 1).toUpperCase()}</button></div></header><main id="main-content" tabIndex={-1} className="page-content">{children}</main><footer className="workspace-footer"><span><span className="status-dot" />{process.env.NEXT_PUBLIC_PAGES_PREVIEW === "true" ? "Browser preview · Demo places · Saved on this device" : "Your space to make every day flow"}</span><span>Thoughtfully planned. Beautifully lived.</span></footer></div><nav className="mobile-bottom" aria-label="Mobile navigation">{[navigation[0], navigation[1], navigation[3], navigation[5]].map(item)}<button className="nav-item" aria-label="More navigation" onClick={() => setMobile(true)}><Icon name="menu" /><span>More</span></button></nav></div>;
}

export function CommandPalette({ s, tasks, nav, start, addTask, openPlan, onClose }: { s: Store; tasks: Task[]; nav: (tab: Tab) => void; start: () => void; addTask: () => void; openPlan: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState(""); const [active, setActive] = useState(0);
  const entries = [
    ...navigation.map((n) => ({ title: n.label, detail: "Go to page", icon: n.icon, action: () => nav(n.id) })),
    { title: "Plan my day", detail: "Open planner", icon: "sparkles" as IconName, action: start },
    { title: "Add a task", detail: "Quick capture", icon: "plus" as IconName, action: addTask },
    ...s.plans.map((p) => ({ title: p.title, detail: `Plan · ${p.date}`, icon: "calendar" as IconName, action: () => openPlan(p.id) })),
    ...tasks.map((t) => ({ title: t.title, detail: `Task · ${t.date}`, icon: "tasks" as IconName, action: () => nav("tasks") })),
    ...s.savedPlaces.map((p) => ({ title: p.name, detail: "Saved place · Map", icon: "pin" as IconName, action: () => nav("map") })),
  ].filter((e) => `${e.title} ${e.detail}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  const execute = (i: number) => { const entry = entries[i]; if (entry) { onClose(); entry.action(); } };
  return <Dialog title="Find your flow" onClose={onClose} className="command-dialog"><div className="command-input"><Icon name="search" /><input data-autofocus aria-label="Search pages, tasks and plans" placeholder="Search pages, tasks, plans..." value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, entries.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); } if (e.key === "Enter") { e.preventDefault(); execute(active); } }} /></div><div className="command-results">{entries.map((entry, i) => <button key={`${entry.detail}-${entry.title}-${i}`} className={i === active ? "selected" : ""} onClick={() => execute(i)}><Icon name={entry.icon} /><span>{entry.title}<small>{entry.detail}</small></span><Icon name="arrow" size={15} /></button>)}{!entries.length && <p className="empty-inline">No matches. Try a page name or a saved plan.</p>}</div><div className="command-footer"><span>↑ ↓ to navigate</span><span>↵ to open</span><span>esc to close</span></div></Dialog>;
}

export function TaskDialog({ onClose, add }: { onClose: () => void; add: (title: string, date: string, priority: Priority) => void }) {
  const [title, setTitle] = useState(""), [date, setDate] = useState(localDate()), [priority, setPriority] = useState<Priority>("medium");
  return <Dialog title="Make a little space for it." onClose={onClose}><p className="dialog-subtitle">Capture a task now. Find your flow later.</p><form className="task-form" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { add(title, date, priority); onClose(); } }}><label>What would you like to do?<input data-autofocus className="input" placeholder="Give your task a name" maxLength={180} required value={title} onChange={(e) => setTitle(e.target.value)} /></label><div className="grid grid-cols-2 gap-4"><label>Due date<input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Priority<select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option></select></label></div><p className="text-xs text-muted">Tasks are saved on this device for your profile.</p><div className="dialog-buttons"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={!title.trim()}><Icon name="plus" size={17} />Add task</button></div></form></Dialog>;
}
