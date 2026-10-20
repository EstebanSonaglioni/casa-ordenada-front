"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "../components/AppHeader";
import { createHousehold, getHouseholds, logout } from "../lib/auth";
import { getSessionValue } from "../lib/session";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    void Promise.all([getSessionValue("access_token"), getHouseholds()]).then(([token, households]) => {
      if (!token) router.replace("/");
      else if (households.length) router.replace("/home");
    }).catch(() => undefined);
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createHousehold(name);
      router.replace("/home");
    } catch (value) {
      setError(value instanceof Error ? value.message : "No pudimos crear la casa");
    } finally {
      setLoading(false);
    }
  }

  async function checkInvitations() {
    setWaiting(true);
    setError("");
    try {
      const households = await getHouseholds();
      if (households.length) router.replace("/home");
      else setError("Todavía no tenés una casa asignada ni una invitación aceptada.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "No pudimos revisar tu estado");
    } finally {
      setWaiting(false);
    }
  }

  function signOut() {
    logout();
    router.replace("/");
  }

  return <main className="login-shell"><AppHeader /><section className="auth-card onboarding-card"><div className="brand-mark">⌂</div><p className="eyebrow">Primer paso</p><h1>{waiting ? "Esperando una invitación" : "Prepará tu hogar"}</h1>{waiting ? <><p className="muted">No tenés una casa asignada todavía. Cuando alguien te invite, aceptá la invitación desde la campana de notificaciones.</p><button className="primary-button" type="button" onClick={() => void checkInvitations()} disabled={waiting}>Revisar si ya tengo una casa<span>↻</span></button></> : <><p className="muted">Podés crear una casa ahora o esperar una invitación de otra persona.</p><form onSubmit={submit}><label htmlFor="household-name">Nombre de la casa</label><input id="household-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /><button className="primary-button" disabled={loading}>{loading ? "Creando..." : "Crear casa"}<span>→</span></button></form><button className="auth-switch" type="button" onClick={() => setWaiting(true)}>Esperar una invitación</button></>}{error && <p className="error" role="alert">{error}</p>}<button className="auth-switch" type="button" onClick={signOut}>Cerrar sesión</button></section></main>;
}
