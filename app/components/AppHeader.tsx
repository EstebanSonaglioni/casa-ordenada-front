"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "./ThemeToggle";
import { apiUrl, getInvitations, Invitation, logout, respondToInvitation } from "../lib/auth";
import { getSessionValue } from "../lib/session";

export function AppHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [responding, setResponding] = useState<number | null>(null);

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

  const links = <>
    <Link className="section-link" href="/tasks" onClick={() => setOpen(false)}>Tareas</Link>
    <Link className="section-link" href="/household" onClick={() => setOpen(false)}>Mi casa</Link>
  </>;

  return <header className="app-header">
    <button className="hamburger-button" type="button" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(true)}><span /><span /><span /></button>
    <div className="brand"><span className="brand-mark small">⌂</span><span>Casa Ordenada</span></div>
    <nav className="header-actions">
      <div className="notification-wrap"><button className="notification-button" type="button" aria-label={`Notificaciones${invitations.length ? `, ${invitations.length} pendientes` : ""}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}>🔔{invitations.length > 0 && <span className="notification-dot" />}</button>{notificationsOpen && <div className="notification-panel"><div className="notification-heading"><strong>Invitaciones</strong><button type="button" className="modal-close" aria-label="Cerrar notificaciones" onClick={() => setNotificationsOpen(false)}>×</button></div>{invitations.length === 0 ? <p className="muted">No tenés invitaciones pendientes.</p> : invitations.map((invitation) => <article className="notification-item" key={invitation.id}><strong>{invitation.household_name}</strong><small>{invitation.invited_by_username} te invitó como {invitation.role}.</small><div className="notification-actions"><button className="secondary-button" disabled={responding === invitation.id} onClick={() => void respond(invitation.id, "reject")}>Rechazar</button><button className="primary-button" disabled={responding === invitation.id} onClick={() => void respond(invitation.id, "accept")}>Aceptar</button></div></article>)}</div>}</div>
      <span className="desktop-only">{links}</span><ThemeToggle /><button className="logout-button" type="button" onClick={signOut}>Salir</button>
    </nav>
    {open && <><button className="drawer-backdrop" aria-label="Cerrar menú" type="button" onClick={() => setOpen(false)} /><aside className="mobile-drawer" aria-label="Menú principal"><div className="drawer-heading"><strong>Secciones</strong><button type="button" className="modal-close" aria-label="Cerrar menú" onClick={() => setOpen(false)}>×</button></div><nav className="drawer-links"><Link href="/home" onClick={() => setOpen(false)}>Inicio</Link><Link href="/dashboard" onClick={() => setOpen(false)}>Economía</Link><Link href="/inventory" onClick={() => setOpen(false)}>Inventario</Link><Link href="/health" onClick={() => setOpen(false)}>Salud</Link><Link href="/tasks" onClick={() => setOpen(false)}>Tareas</Link><Link href="/household" onClick={() => setOpen(false)}>Mi casa</Link></nav></aside></>}
  </header>;
}
