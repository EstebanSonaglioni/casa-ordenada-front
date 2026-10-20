"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "./components/ThemeToggle";
import { useToast } from "./components/ToastProvider";
import { login, register } from "./lib/auth";
import { getSessionValue } from "./lib/session";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [registerMode, setRegisterMode] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const showToast = useToast();

  useEffect(() => {
    void getSessionValue("access_token").then((token) => {
      if (token) {
        router.replace("/home");
        return;
      }
      setCheckingSession(false);
    });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (registerMode) {
        if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden");
        await register(username, displayName, password);
        showToast("Cuenta creada correctamente.");
      } else {
        await login(username, password);
        showToast("Sesión iniciada correctamente.");
      }
      router.replace("/home");
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "No pudimos iniciar sesión";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) return null;

  return (
    <main className="login-shell">
      <div className="login-topbar"><ThemeToggle /></div>
      <section className="login-layout">
        <div className="login-intro">
          <span className="eyebrow">Tu hogar, más liviano</span>
          <h1>Ordenar la casa también es cuidar de vos.</h1>
          <p>Un lugar tranquilo para tener tus gastos, compras y pendientes a mano.</p>
          <div className="intro-note"><span>✦</span><span>Pequeños pasos, una casa más en orden.</span></div>
        </div>
        <section className="auth-card" aria-labelledby="login-title">
          <div className="brand-mark">⌂</div>
          <p className="eyebrow">Casa Ordenada</p>
          <h2 id="login-title">{registerMode ? "Creá tu cuenta" : "Qué bueno verte"}</h2>
          <p className="muted">{registerMode ? "Después podrás crear o aceptar una invitación a una casa." : "Ingresá para continuar con tu día."}</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="username">Usuario</label>
            <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" />
            {registerMode && <><label htmlFor="display-name">Nombre visible</label><input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required autoComplete="name" /></>}
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
            {registerMode && <><label htmlFor="confirm-password">Repetir contraseña</label><input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" /></>}
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Procesando..." : registerMode ? "Crear cuenta" : "Ingresar a mi hogar"}<span>→</span>
            </button>
          </form>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="auth-switch" type="button" onClick={() => { setRegisterMode((value) => !value); setError(""); }}>{registerMode ? "Ya tengo una cuenta" : "Soy nuevo, quiero registrarme"}</button>
        </section>
      </section>
    </main>
  );
}
