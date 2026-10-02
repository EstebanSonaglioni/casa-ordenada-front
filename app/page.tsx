"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "./components/ThemeToggle";
import { login } from "./lib/auth";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No pudimos iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

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
          <h2 id="login-title">Qué bueno verte</h2>
          <p className="muted">Ingresá para continuar con tu día.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="username">Usuario</label>
            <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" />
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar a mi hogar"}<span>→</span>
            </button>
          </form>
          {error && <p className="error" role="alert">{error}</p>}
        </section>
      </section>
    </main>
  );
}
