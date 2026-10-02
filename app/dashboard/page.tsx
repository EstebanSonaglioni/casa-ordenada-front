"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "../components/ThemeToggle";
import { createExpense, createPeriod, getCategories, getPeriods, getSummary, logout, Category, Summary } from "../lib/auth";
import FinanceManager from "./FinanceManager";

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState("amigo");
  const [role, setRole] = useState("member");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseAllocation, setExpenseAllocation] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.replace("/");
      return;
    }
    setUsername(localStorage.getItem("username") ?? "amigo");
    setRole(localStorage.getItem("role") ?? "member");
    getCategories().then(setCategories).catch(() => setLoadError("No pudimos cargar las categorías"));
    void loadSummary();
  }, [router]);

  async function loadSummary() {
    try {
      const today = new Date();
      const periods = await getPeriods();
      const current = periods.find((period) => period.year === today.getFullYear() && period.month === today.getMonth() + 1);
      const period = current ?? await createPeriod(today.getFullYear(), today.getMonth() + 1);
      setSummary(await getSummary(period.id));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No pudimos cargar el resumen");
    }
  }

  async function handleExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!summary || !expenseAllocation) return;
    try {
      await createExpense(summary.period.id, {
        description: expenseDescription,
        amount_cents: Math.round(Number(expenseAmount) * 100),
        expense_date: new Date().toISOString().slice(0, 10),
        allocations: [{ allocation_id: Number(expenseAllocation), amount_cents: Math.round(Number(expenseAmount) * 100) }],
      });
      setExpenseDescription("");
      setExpenseAmount("");
      await loadSummary();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No pudimos registrar el gasto");
    }
  }

  function handleLogout() {
    logout();
    router.replace("/");
  }

  return (
    <main className="dashboard-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark small">⌂</span><span>Casa Ordenada</span></div>
        <nav className="header-actions"><ThemeToggle /><button className="logout-button" type="button" onClick={handleLogout}>Salir</button></nav>
      </header>
      <section className="dashboard-content">
        <div className="welcome-row">
          <div><span className="eyebrow">Mi resumen</span><h1>¡Hola, {username}!</h1><p className="muted">Todo se ve en orden hoy.</p></div>
          <span className="role-badge">{role}</span>
        </div>
        {loadError && <p className="error" role="alert">{loadError}</p>}
        <div className="summary-grid">
          <article className="metric-card primary-metric"><span>Disponible este mes</span><strong>{formatMoney(summary?.balance_cents ?? 0)}</strong><small>{summary ? "Después de separar tus sobres" : "Cargando tu resumen..."}</small></article>
          <article className="metric-card"><span>Ingresos registrados</span><strong>{formatMoney(summary?.income_cents ?? 0)}</strong><small>De todas tus fuentes</small></article>
          <article className="metric-card"><span>Ya gastado</span><strong>{formatMoney(summary?.spent_cents ?? 0)}</strong><small>En este período</small></article>
        </div>
        <section className="dashboard-panel">
          <div className="panel-heading"><div><span className="eyebrow">Tus sobres</span><h2>Dinero separado</h2></div><span className="muted">{summary?.allocations.length ?? 0} categorías</span></div>
          {summary?.allocations.length ? summary.allocations.map((allocation) => <div className="allocation-row" key={allocation.id}><div><span>{categories.find((category) => category.id === allocation.category_id)?.name ?? `Categoría ${allocation.category_id}`}</span><small>{formatMoney(allocation.spent_amount_cents)} consumido de {formatMoney(allocation.planned_amount_cents)}</small></div><strong className={allocation.balance_cents < 0 ? "negative" : "positive"}>{formatMoney(allocation.balance_cents)}</strong></div>) : <p className="muted empty-copy">Todavía no separaste dinero para este mes.</p>}
        </section>
        <section className="dashboard-panel quick-expense">
          <div className="panel-heading"><div><span className="eyebrow">Registro diario</span><h2>¿En qué se usó el dinero hoy?</h2></div></div>
          <form onSubmit={handleExpense} className="expense-form"><input aria-label="Descripción" placeholder="Ej. Compra de carnes" value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} required /><input aria-label="Monto" type="number" min="0.01" step="0.01" placeholder="Monto" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} required /><select aria-label="Sobre" value={expenseAllocation} onChange={(event) => setExpenseAllocation(event.target.value)} required><option value="">Elegí un sobre</option>{summary?.allocations.map((allocation) => <option key={allocation.id} value={allocation.id}>{categories.find((category) => category.id === allocation.category_id)?.name ?? `Categoría ${allocation.category_id}`}</option>)}</select><button className="primary-button" type="submit">Registrar <span>→</span></button></form>
        </section>
        {summary && <FinanceManager categories={categories} summary={summary} onRefresh={loadSummary} />}
      </section>
      <button className="fab" type="button" aria-label="Agregar gasto o nota">+</button>
    </main>
  );
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(cents / 100);
}
