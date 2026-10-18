"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "./ThemeToggle";
import { logout } from "../lib/auth";

export function AppHeader({ section }: { section: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function signOut() {
    logout();
    router.replace("/");
  }

  return <header className="app-header"><div className="brand"><span className="brand-mark small">⌂</span><span>Casa Ordenada</span><span className="section-chip">{section}</span></div><nav className="desktop-section-links" aria-label="Secciones principales"><Link href="/home">Inicio</Link><Link href="/dashboard">Economía</Link><Link href="/inventory">Inventario</Link></nav><nav className="header-actions"><ThemeToggle /><button className="logout-button desktop-only" type="button" onClick={signOut}>Salir</button><button className="hamburger-button" type="button" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(true)}><span /><span /><span /></button></nav>{open && <><button className="drawer-backdrop" aria-label="Cerrar menú" type="button" onClick={() => setOpen(false)} /><aside className="mobile-drawer" aria-label="Menú principal"><div className="drawer-heading"><strong>Casa Ordenada</strong><button className="modal-close" type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)}>×</button></div><nav className="drawer-links"><Link href="/home" onClick={() => setOpen(false)}>Inicio</Link><Link href="/dashboard" onClick={() => setOpen(false)}>Economía</Link><Link href="/inventory" onClick={() => setOpen(false)}>Inventario</Link></nav><button className="drawer-logout" type="button" onClick={signOut}>Salir</button></aside></>}</header>;
}
