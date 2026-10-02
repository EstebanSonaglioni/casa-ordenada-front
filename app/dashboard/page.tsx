"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "../components/ThemeToggle";
import {
  Allocation,
  Category,
  createExpense,
  createPeriod,
  deleteAllocation,
  Currency,
  getCategories,
  getCalendarEvents,
  getCurrencies,
  getMovements,
  getPeriods,
  getSummary,
  logout,
  Movement,
  CalendarEvent,
  setCalendarPayment,
  Summary,
  updateAllocation,
} from "../lib/auth";
import FinanceManager from "./FinanceManager";

type EconomyView = "summary" | "envelopes" | "calendar" | "movements" | "manage";

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState("amigo");
  const [role, setRole] = useState("member");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<EconomyView>("summary");
  const [movementAllocation, setMovementAllocation] = useState("");
  const [movementKind, setMovementKind] = useState("");
  const [loadError, setLoadError] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseAllocation, setExpenseAllocation] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState("1");

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.replace("/");
      return;
    }
    setUsername(localStorage.getItem("username") ?? "amigo");
    setRole(localStorage.getItem("role") ?? "member");
    void loadInitialData();
  }, [router]);

  useEffect(() => {
    if (view === "movements") void loadMovements();
  }, [view, movementAllocation, movementKind, summary]);

  useEffect(() => {
    if (view === "calendar") void loadCalendar();
  }, [view]);

  async function loadInitialData() {
    try {
      const [categoryItems, currencyItems] = await Promise.all([getCategories(), getCurrencies()]);
      setCategories(categoryItems);
      setCurrencies(currencyItems);
      await loadSummary();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No pudimos cargar la economía");
    }
  }

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

  async function loadMovements() {
    try {
      setMovements(await getMovements({
        allocation_id: movementAllocation ? Number(movementAllocation) : undefined,
        kind: movementKind || undefined,
      }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No pudimos cargar los movimientos");
    }
  }

  async function loadCalendar() {
    try {
      const today = new Date();
      setCalendarEvents(await getCalendarEvents(today.getFullYear(), today.getMonth() + 1));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No pudimos cargar el calendario");
    }
  }

  async function handleExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!summary || !expenseAllocation) return;
    try {
      await createExpense(summary.period.id, {
        description: expenseDescription,
        amount_cents: Math.round(Number(expenseAmount) * 100),
        currency_id: Number(expenseCurrency),
        expense_date: new Date().toISOString().slice(0, 10),
        allocations: [{ allocation_id: Number(expenseAllocation), amount_cents: Math.round(Number(expenseAmount) * 100) }],
      });
      setExpenseDescription("");
      setExpenseAmount("");
      await loadSummary();
      if (view === "movements") await loadMovements();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No pudimos registrar el gasto");
    }
  }

  async function handleAllocationUpdate(allocationId: number, plannedAmount: string, reservedAmount: string) {
    try {
      await updateAllocation(allocationId, {
        planned_amount_cents: Math.round(Number(plannedAmount) * 100),
        reserved_amount_cents: Math.round(Number(reservedAmount) * 100),
      });
      await loadSummary();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No pudimos editar el sobre");
    }
  }

  async function handleAllocationDelete(allocationId: number) {
    if (!window.confirm("¿Eliminar este sobre? Solo se puede eliminar si no tiene movimientos.")) return;
    try {
      await deleteAllocation(allocationId);
      await loadSummary();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No pudimos eliminar el sobre");
    }
  }

  async function handleCalendarPayment(event: CalendarEvent) {
    try {
      const updated = await setCalendarPayment({ kind: event.kind, source_id: event.source_id, due_date: event.due_date, paid: event.status !== "paid" });
      setCalendarEvents((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No pudimos actualizar el pago");
    }
  }

  function handleLogout() {
    logout();
    router.replace("/");
  }

  return (
    <main className="dashboard-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark small">⌂</span><span>Casa Ordenada</span><span className="section-chip">Economía</span></div>
        <nav className="header-actions"><ThemeToggle /><button className="logout-button" type="button" onClick={handleLogout}>Salir</button></nav>
      </header>
      <section className="dashboard-content">
        <div className="welcome-row">
          <div><span className="eyebrow">Economía familiar</span><h1>¡Hola, {username}!</h1><p className="muted">Tu dinero, tus sobres y tus movimientos en un mismo lugar.</p></div>
          <span className="role-badge">{role}</span>
        </div>
        <nav className="economy-nav" aria-label="Secciones de Economía">
          <EconomyNavButton active={view === "summary"} onClick={() => setView("summary")}>Resumen</EconomyNavButton>
          <EconomyNavButton active={view === "envelopes"} onClick={() => setView("envelopes")}>Sobres</EconomyNavButton>
          <EconomyNavButton active={view === "calendar"} onClick={() => setView("calendar")}>Calendario</EconomyNavButton>
          <EconomyNavButton active={view === "movements"} onClick={() => setView("movements")}>Movimientos</EconomyNavButton>
          <EconomyNavButton active={view === "manage"} onClick={() => setView("manage")}>Gestionar</EconomyNavButton>
        </nav>
        {loadError && <p className="error" role="alert">{loadError}</p>}
        {summary && view === "summary" && <SummaryView summary={summary} categories={categories} currencies={currencies} />}
        {summary && view === "envelopes" && <EnvelopeView allocations={summary.allocations} categories={categories} currencies={currencies} onShowMovements={(id) => { setMovementAllocation(String(id)); setView("movements"); }} onUpdate={handleAllocationUpdate} onDelete={handleAllocationDelete} />}
        {view === "calendar" && <CalendarView events={calendarEvents} categories={categories} currencies={currencies} onTogglePayment={handleCalendarPayment} />}
        {summary && view === "movements" && <MovementView movements={movements} allocations={summary.allocations} categories={categories} currencies={currencies} allocation={movementAllocation} kind={movementKind} onAllocation={setMovementAllocation} onKind={setMovementKind} />}
        {summary && view === "manage" && <FinanceManager categories={categories} currencies={currencies} summary={summary} onRefresh={loadSummary} />}
        {summary && <section className="quick-expense dashboard-panel">
          <div className="panel-heading"><div><span className="eyebrow">Registro diario</span><h2>¿En qué se usó el dinero hoy?</h2></div></div>
          <form onSubmit={handleExpense} className="expense-form"><input aria-label="Descripción" placeholder="Ej. Compra de carnes" value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} required /><MoneyInput label="Monto" value={expenseAmount} onChange={setExpenseAmount} currencies={currencies} currencyId={expenseCurrency} onCurrencyChange={setExpenseCurrency} required /><SelectInput label="Sobre" value={expenseAllocation} onChange={setExpenseAllocation}><option value="">Elegí un sobre</option>{summary.allocations.filter((allocation) => allocation.currency_id === Number(expenseCurrency)).map((allocation) => <option key={allocation.id} value={allocation.id}>{categoryName(allocation.category_id, categories)}</option>)}</SelectInput><button className="primary-button" type="submit">Registrar <span>→</span></button></form>
        </section>}
      </section>
      <button className="fab" type="button" onClick={() => setView("manage")} aria-label="Gestionar economía">+</button>
    </main>
  );
}

function SummaryView({ summary, categories, currencies }: { summary: Summary; categories: Category[]; currencies: Currency[] }) {
  return <><div className="summary-grid"><article className="metric-card primary-metric"><span>Disponible este mes</span><strong>{formatMoney(summary.balance_cents, summary.base_currency_id, currencies)}</strong><small>Después de separar tus sobres</small></article><article className="metric-card"><span>Ingresos registrados</span><strong>{formatMoney(summary.income_cents, summary.base_currency_id, currencies)}</strong><small>De todas tus fuentes</small></article><article className="metric-card"><span>Ya gastado</span><strong>{formatMoney(summary.spent_cents, summary.base_currency_id, currencies)}</strong><small>En este período</small></article></div><section className="dashboard-panel compact-envelopes"><div className="panel-heading"><div><span className="eyebrow">Vista rápida</span><h2>Sobres de este mes</h2></div><span className="muted">{summary.allocations.length} categorías</span></div><EnvelopeRows allocations={summary.allocations.slice(0, 4)} categories={categories} currencies={currencies} /></section></>;
}

function EnvelopeView({ allocations, categories, currencies, onShowMovements, onUpdate, onDelete }: { allocations: Allocation[]; categories: Category[]; currencies: Currency[]; onShowMovements: (id: number) => void; onUpdate: (id: number, planned: string, reserved: string) => Promise<void>; onDelete: (id: number) => Promise<void> }) {
  return <section className="envelope-grid">{allocations.length ? allocations.map((allocation) => <EnvelopeCard key={allocation.id} allocation={allocation} categories={categories} currencies={currencies} onShowMovements={onShowMovements} onUpdate={onUpdate} onDelete={onDelete} />) : <EmptyState title="Todavía no hay sobres" text="En Gestionar podés separar dinero para cada necesidad." />}</section>;
}

function EnvelopeCard({ allocation, categories, currencies, onShowMovements, onUpdate, onDelete }: { allocation: Allocation; categories: Category[]; currencies: Currency[]; onShowMovements: (id: number) => void; onUpdate: (id: number, planned: string, reserved: string) => Promise<void>; onDelete: (id: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [planned, setPlanned] = useState(String(allocation.planned_amount_cents / 100));
  const [reserved, setReserved] = useState(String(allocation.reserved_amount_cents / 100));
  const percentage = allocation.planned_amount_cents ? Math.min(100, Math.round((allocation.spent_amount_cents / allocation.planned_amount_cents) * 100)) : 0;
  return <article className="envelope-card"><div className="envelope-card-top"><span className="category-dot" style={{ background: categories.find((category) => category.id === allocation.category_id)?.color ?? "#5B8266" }} /><span>{categoryName(allocation.category_id, categories)}</span><small>{currencyCode(allocation.currency_id, currencies)}</small></div><strong className={allocation.balance_cents < 0 ? "negative" : "positive"}>{formatMoney(allocation.balance_cents, allocation.currency_id, currencies)}</strong><p>Disponible</p><div className="progress-track"><span className={allocation.balance_cents < 0 ? "negative-progress" : ""} style={{ width: `${percentage}%` }} /></div><small>{formatMoney(allocation.spent_amount_cents, allocation.currency_id, currencies)} usado de {formatMoney(allocation.planned_amount_cents, allocation.currency_id, currencies)}</small>{editing && <form className="envelope-edit" onSubmit={async (event) => { event.preventDefault(); await onUpdate(allocation.id, planned, reserved); setEditing(false); }}><MoneyInput label="Planificado" value={planned} onChange={setPlanned} currencies={currencies} currencyId={String(allocation.currency_id)} onCurrencyChange={() => undefined} required /><MoneyInput label="Reserva" value={reserved} onChange={setReserved} currencies={currencies} currencyId={String(allocation.currency_id)} onCurrencyChange={() => undefined} required /><button className="secondary-button" type="submit">Guardar</button></form>}<div className="envelope-actions"><button className="text-button" type="button" onClick={() => onShowMovements(allocation.id)}>Movimientos</button><button className="text-button" type="button" onClick={() => setEditing(!editing)}>{editing ? "Cancelar" : "Editar"}</button><button className="text-button danger" type="button" onClick={() => void onDelete(allocation.id)}>Eliminar</button></div></article>;
}

function CalendarView({ events, categories, currencies, onTogglePayment }: { events: CalendarEvent[]; categories: Category[]; currencies: Currency[]; onTogglePayment: (event: CalendarEvent) => Promise<void> }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const days = new Date(year, month + 1, 0).getDate();
  const start = new Date(year, month, 1).getDay();
  const eventsByDay = new Map<number, CalendarEvent[]>();
  events.forEach((event) => {
    const day = Number(event.due_date.slice(8, 10));
    eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), event]);
  });
  return <section className="calendar-panel dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">Vencimientos</span><h2>{new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(now)}</h2></div><span className="today-key"><i /> Hoy, {today}</span></div><div className="calendar-weekdays">{["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: start }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}{Array.from({ length: days }, (_, index) => { const day = index + 1; const dayEvents = eventsByDay.get(day) ?? []; return <article className={`calendar-day ${day === today ? "is-today" : ""}`} key={day}><strong>{day}</strong>{dayEvents.map((event) => <button className={`calendar-event ${event.status}`} key={event.id} type="button" onClick={() => void onTogglePayment(event)} title={event.status === "paid" ? "Marcar como pendiente" : "Marcar como pagado"}><span>{event.title}</span><small>{formatMoney(event.amount_cents, event.currency_id, currencies)}</small></button>)}</article>; })}</div><div className="calendar-legend"><span><i className="pending" /> Pendiente</span><span><i className="due_soon" /> Vence pronto</span><span><i className="overdue" /> Vencido</span><span><i className="paid" /> Pagado</span></div>{!events.length && <EmptyState title="No hay vencimientos este mes" text="Agregá pagos recurrentes o gastos futuros desde Gestionar." />}</section>;
}

function MovementView({ movements, allocations, categories, currencies, allocation, kind, onAllocation, onKind }: { movements: Movement[]; allocations: Allocation[]; categories: Category[]; currencies: Currency[]; allocation: string; kind: string; onAllocation: (value: string) => void; onKind: (value: string) => void }) {
  return <section className="dashboard-panel movement-panel"><div className="panel-heading"><div><span className="eyebrow">Historial</span><h2>Todos los movimientos</h2></div><span className="muted">Ingresos, sobres, gastos y transferencias</span></div><div className="movement-filters"><SelectInput label="Sobre" value={allocation} onChange={onAllocation}><option value="">Todos los sobres</option>{allocations.map((item) => <option key={item.id} value={item.id}>{categoryName(item.category_id, categories)}</option>)}</SelectInput><SelectInput label="Tipo" value={kind} onChange={onKind}><option value="">Todos los tipos</option><option value="income">Ingresos</option><option value="allocation">Dinero separado</option><option value="expense">Gastos</option><option value="transfer">Transferencias</option></SelectInput></div><div className="movement-list">{movements.length ? movements.map((movement) => <article className="movement-row" key={movement.id}><span className={`movement-icon ${movement.direction}`}>{movement.direction === "in" ? "+" : "−"}</span><div><strong>{movement.title}</strong><small>{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(`${movement.movement_date}T12:00:00`))}{movement.category_id ? ` · ${categoryName(movement.category_id, categories)}` : ""}</small></div><span className={movement.direction === "in" ? "positive" : "negative"}>{movement.direction === "in" ? "+" : "−"}{formatMoney(movement.amount_cents, movement.currency_id, currencies)}</span></article>) : <EmptyState title="No hay movimientos para este filtro" text="Probá seleccionar otro sobre o tipo de movimiento." />}</div></section>;
}

function EnvelopeRows({ allocations, categories, currencies }: { allocations: Allocation[]; categories: Category[]; currencies: Currency[] }) { return allocations.length ? <>{allocations.map((allocation) => <div className="allocation-row" key={allocation.id}><div><span>{categoryName(allocation.category_id, categories)}</span><small>{formatMoney(allocation.spent_amount_cents, allocation.currency_id, currencies)} usado de {formatMoney(allocation.planned_amount_cents, allocation.currency_id, currencies)}</small></div><strong className={allocation.balance_cents < 0 ? "negative" : "positive"}>{formatMoney(allocation.balance_cents, allocation.currency_id, currencies)}</strong></div>)}</> : <EmptyState title="Todavía no separaste dinero" text="Creá tu primer sobre desde Gestionar." />; }
function EconomyNavButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) { return <button className={active ? "active" : ""} type="button" onClick={onClick}>{children}</button>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><strong>{title}</strong><span>{text}</span></div>; }
function MoneyInput({ label, value, onChange, currencies, currencyId, onCurrencyChange, required = false }: { label: string; value: string; onChange: (value: string) => void; currencies: Currency[]; currencyId: string; onCurrencyChange: (value: string) => void; required?: boolean }) { return <label className="money-field">{label}<span className="money-control"><span className="money-prefix">$</span><input type="number" min="0.01" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} required={required} /><select aria-label={`${label} moneda`} value={currencyId} onChange={(event) => onCurrencyChange(event.target.value)}>{currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.code}</option>)}</select></span></label>; }
function SelectInput({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) { return <label className="field">{label}<span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></span></label>; }
function categoryName(id: number, categories: Category[]) { return categories.find((category) => category.id === id)?.name ?? "Sin categoría"; }
function currencyCode(id: number, currencies: Currency[]) { return currencies.find((currency) => currency.id === id)?.code ?? "ARS"; }
function formatMoney(cents: number, currencyId: number, currencies: Currency[]) { const currency = currencies.find((item) => item.id === currencyId); return `${currency?.symbol ?? "$"}${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(cents / 100)}`; }
