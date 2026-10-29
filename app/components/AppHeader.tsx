"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ThemeToggle } from "./ThemeToggle";
import { apiUrl, getInvitations, Invitation, logout, respondToInvitation } from "../lib/auth";
import { getSessionValue } from "../lib/session";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [responding, setResponding] = useState<number | null>(null);

  useEffect(() => {
    setSidebarPinned(window.localStorage.getItem("casa-ordenada.sidebar-pinned") === "true");
  }, []);

  useEffect(() => {
    if (sidebarPinned) setOpen(true);
    window.localStorage.setItem("casa-ordenada.sidebar-pinned", String(sidebarPinned));
  }, [sidebarPinned]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    let socket: WebSocket | undefined;
    let cancelled = false;
    let reconnectTimer: number | undefined;
    const load = () => void getInvitations().then((items) => { if (!cancelled) setInvitations(items); }).catch(() => undefined);
    const connect = (token: string) => {
      if (cancelled) return;
      load();
      socket = new WebSocket(`${apiUrl.replace(/^http/, "ws")}/api/v1/ws/notifications?token=${encodeURIComponent(token)}`);
      socket.onmessage = load;
      socket.onclose = () => { if (!cancelled) reconnectTimer = window.setTimeout(() => connect(token), 5000); };
    };
    void getSessionValue("access_token").then((token) => { if (token) connect(token); });
    return () => { cancelled = true; if (reconnectTimer) window.clearTimeout(reconnectTimer); socket?.close(); };
  }, []);

  function signOut() { logout(); router.replace("/"); }

  async function respond(id: number, action: "accept" | "reject") {
    setResponding(id);
    try { await respondToInvitation(id, action); setInvitations((items) => items.filter((item) => item.id !== id)); }
    finally { setResponding(null); }
  }

  const links = [
    { href: "/home", label: "Inicio", icon: "⌂" },
    { href: "/dashboard", label: "Economía", icon: "$" },
    { href: "/inventory", label: "Inventario", icon: "▣" },
    { href: "/health", label: "Salud", icon: "+" },
    { href: "/tasks", label: "Tareas", icon: "✓" },
    { href: "/household", label: "Mi casa", icon: "♧" },
  ];

  const navigation = links.map((link) => {
    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
    return <Link className={`sidebar-link${active ? " active" : ""}`} href={link.href} aria-current={active ? "page" : undefined} onClick={() => { if (!sidebarPinned) setOpen(false); }} key={link.href}><span className="sidebar-icon" aria-hidden="true">{link.icon}</span><span>{link.label}</span></Link>;
  });

  const togglePinned = () => setSidebarPinned((value) => !value);

  return <header className="app-header">
    <button className="hamburger-button" type="button" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-controls="app-sidebar" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span /><span /><span /></button>
    <div className="brand"><span className="brand-mark small">⌂</span><span>Casa Ordenada</span></div>
    <nav className="header-actions">
      <div className="notification-wrap"><button className="notification-button" type="button" aria-label={`Notificaciones${invitations.length ? `, ${invitations.length} pendientes` : ""}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}>🔔{invitations.length > 0 && <span className="notification-dot" />}</button>{notificationsOpen && <div className="notification-panel"><div className="notification-heading"><strong>Invitaciones</strong><button type="button" className="modal-close" aria-label="Cerrar notificaciones" onClick={() => setNotificationsOpen(false)}>×</button></div>{invitations.length === 0 ? <p className="muted">No tenés invitaciones pendientes.</p> : invitations.map((invitation) => <article className="notification-item" key={invitation.id}><strong>{invitation.household_name}</strong><small>{invitation.invited_by_username} te invitó como {invitation.role}.</small><div className="notification-actions"><button className="secondary-button" disabled={responding === invitation.id} onClick={() => void respond(invitation.id, "reject")}>Rechazar</button><button className="primary-button" disabled={responding === invitation.id} onClick={() => void respond(invitation.id, "accept")}>Aceptar</button></div></article>)}</div>}</div>
      <ThemeToggle /><button className="logout-button" type="button" onClick={signOut}>Salir</button>
    </nav>
    <aside id="app-sidebar" className={`app-sidebar${open ? " open" : ""}`} aria-label="Navegación principal"><div className="sidebar-inner"><div className="sidebar-heading"><span className="brand-mark small">⌂</span><strong>Casa Ordenada</strong><button type="button" className="sidebar-close" aria-label="Cerrar menú" onClick={() => setOpen(false)}>×</button></div><nav className="sidebar-nav">{navigation}</nav><div className="sidebar-footer"><span className="sidebar-caption">Tu hogar, en orden</span><button className={`sidebar-pin${sidebarPinned ? " active" : ""}`} type="button" aria-pressed={sidebarPinned} onClick={togglePinned}>{sidebarPinned ? "Cerrar barra lateral" : "Mantener abierta"}</button><button className="sidebar-logout" type="button" onClick={signOut}>Salir de la cuenta</button></div></div></aside>
    {open && <button className={`drawer-backdrop${sidebarPinned ? " drawer-backdrop-pinned" : ""}`} aria-label="Cerrar menú" type="button" onClick={() => setOpen(false)} />}
  </header>;
}
