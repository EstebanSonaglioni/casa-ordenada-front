"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "../components/AppHeader";
import { useToast } from "../components/ToastProvider";
import {
  Allocation,
  Category,
  createAllocation,
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
  Movement,
  CalendarEvent,
  setCalendarPayment,
  Summary,
  updateAllocation,
  updateCategory,
} from "../lib/auth";
import FinanceManager from "./FinanceManager";
import { getSessionValue } from "../lib/session";

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
  const [manageTab, setManageTab] = useState("income");
  const [isAddEnvelopeOpen, setIsAddEnvelopeOpen] = useState(false);
  const [movementAllocation, setMovementAllocation] = useState("");
  const [movementKind, setMovementKind] = useState("");
  const [loadError, setLoadError] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseAllocation, setExpenseAllocation] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState("1");
  const showToast = useToast();

  useEffect(() => {
    void Promise.all([getSessionValue("access_token"), getSessionValue("username"), getSessionValue("role")]).then(([token, savedUsername, savedRole]) => {
      if (!token) {
        router.replace("/");
        return;
      }
      setUsername(savedUsername ?? "amigo");
      setRole(savedRole ?? "member");
      void loadInitialData();
    });
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

  async function refreshCategories() {
    try {
      setCategories(await getCategories());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No pudimos cargar las categorías");
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
      showToast("Gasto registrado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos registrar el gasto";
      setLoadError(message);
      showToast(message, "error");
    }
  }

  async function handleAllocationUpdate(allocationId: number, plannedAmount: string, reservedAmount: string) {
    try {
      await updateAllocation(allocationId, {
        planned_amount_cents: Math.round(Number(plannedAmount) * 100),
        reserved_amount_cents: Math.round(Number(reservedAmount) * 100),
      });
      await loadSummary();
      showToast("Sobre actualizado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos editar el sobre";
      setLoadError(message);
      showToast(message, "error");
    }
  }

  async function handleAllocationDelete(allocationId: number) {
    if (!window.confirm("¿Eliminar este sobre? Solo se puede eliminar si no tiene movimientos.")) return;
    try {
      await deleteAllocation(allocationId);
      await loadSummary();
      showToast("Sobre eliminado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos eliminar el sobre";
      setLoadError(message);
      showToast(message, "error");
    }
  }

  async function handleCategoryColor(categoryId: number, color: string) {
    try {
      const updated = await updateCategory(categoryId, { color });
      setCategories((items) => items.map((item) => item.id === updated.id ? updated : item));
      showToast("Color actualizado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos actualizar el color";
      setLoadError(message);
      showToast(message, "error");
    }
  }

  async function handleCalendarPayment(event: CalendarEvent) {
    try {
      const updated = await setCalendarPayment({ kind: event.kind, source_id: event.source_id, due_date: event.due_date, paid: event.status !== "paid" });
      setCalendarEvents((items) => items.map((item) => item.id === updated.id ? updated : item));
      showToast(updated.status === "paid" ? "Pago marcado como realizado." : "Pago marcado como pendiente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos actualizar el pago";
      setLoadError(message);
      showToast(message, "error");
    }
  }

  return (
    <main className="dashboard-shell">
      <AppHeader section="Economía" />
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
          <EconomyNavButton active={view === "manage"} onClick={() => { setManageTab("income"); setView("manage"); }}>Gestionar</EconomyNavButton>
        </nav>
        {loadError && <p className="error" role="alert">{loadError}</p>}
        {summary && view === "summary" && <SummaryView summary={summary} categories={categories} currencies={currencies} />}
        {summary && view === "envelopes" && <EnvelopeView allocations={summary.allocations} categories={categories} currencies={currencies} onShowMovements={(id) => { setMovementAllocation(String(id)); setView("movements"); }} onUpdate={handleAllocationUpdate} onColor={handleCategoryColor} onDelete={handleAllocationDelete} onAdd={() => setIsAddEnvelopeOpen(true)} />}
        {view === "calendar" && <CalendarView events={calendarEvents} categories={categories} currencies={currencies} onTogglePayment={handleCalendarPayment} />}
        {summary && view === "movements" && <MovementView movements={movements} allocations={summary.allocations} categories={categories} currencies={currencies} allocation={movementAllocation} kind={movementKind} onAllocation={setMovementAllocation} onKind={setMovementKind} />}
        {summary && view === "manage" && <FinanceManager categories={categories} currencies={currencies} summary={summary} onRefresh={loadSummary} onCategoriesRefresh={refreshCategories} initialTab={manageTab} />}
        {summary && <section className="quick-expense dashboard-panel">
          <div className="panel-heading"><div><span className="eyebrow">Registro diario</span><h2>¿En qué se usó el dinero hoy?</h2></div></div>
          <form onSubmit={handleExpense} className="expense-form"><input aria-label="Descripción" placeholder="Ej. Compra de carnes" value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} required /><MoneyInput label="Monto" value={expenseAmount} onChange={setExpenseAmount} currencies={currencies} currencyId={expenseCurrency} onCurrencyChange={setExpenseCurrency} required /><SelectInput label="Sobre" value={expenseAllocation} onChange={setExpenseAllocation}><option value="">Elegí un sobre</option>{summary.allocations.filter((allocation) => allocation.currency_id === Number(expenseCurrency)).map((allocation) => <option key={allocation.id} value={allocation.id}>{categoryName(allocation.category_id, categories)}</option>)}</SelectInput><button className="primary-button" type="submit">Registrar <span>→</span></button></form>
        </section>}
      </section>
      {summary && isAddEnvelopeOpen && <AddEnvelopeModal categories={categories} currencies={currencies} periodId={summary.period.id} onClose={() => setIsAddEnvelopeOpen(false)} onCreated={async () => { await loadSummary(); setIsAddEnvelopeOpen(false); }} />}
      <button className="fab" type="button" onClick={() => setView("manage")} aria-label="Gestionar economía">+</button>
    </main>
  );
}

function SummaryView({ summary, categories, currencies }: { summary: Summary; categories: Category[]; currencies: Currency[] }) {
  return <><div className="summary-grid"><article className="metric-card primary-metric"><span>Disponible este mes</span><strong>{formatMoney(summary.balance_cents, summary.base_currency_id, currencies)}</strong><small>Después de separar tus sobres</small></article><article className="metric-card"><span>Ingresos registrados</span><strong>{formatMoney(summary.income_cents, summary.base_currency_id, currencies)}</strong><small>De todas tus fuentes</small></article><article className="metric-card"><span>Ya gastado</span><strong>{formatMoney(summary.spent_cents, summary.base_currency_id, currencies)}</strong><small>En este período</small></article></div><section className="dashboard-panel compact-envelopes"><div className="panel-heading"><div><span className="eyebrow">Vista rápida</span><h2>Sobres de este mes</h2></div><span className="muted">{summary.allocations.length} categorías</span></div><EnvelopeRows allocations={summary.allocations.slice(0, 4)} categories={categories} currencies={currencies} /></section></>;
}

function EnvelopeView({ allocations, categories, currencies, onShowMovements, onUpdate, onColor, onDelete, onAdd }: { allocations: Allocation[]; categories: Category[]; currencies: Currency[]; onShowMovements: (id: number) => void; onUpdate: (id: number, planned: string, reserved: string) => Promise<void>; onColor: (categoryId: number, color: string) => Promise<void>; onDelete: (id: number) => Promise<void>; onAdd: () => void }) {
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("name");
  const [ascending, setAscending] = useState(true);
  const sortedAllocations = [...allocations].sort((left, right) => {
    const leftCategory = categories.find((category) => category.id === left.category_id);
    const rightCategory = categories.find((category) => category.id === right.category_id);
    const values: Record<string, [string | number, string | number]> = {
      name: [leftCategory?.name ?? "", rightCategory?.name ?? ""],
      color: [leftCategory?.color ?? "", rightCategory?.color ?? ""],
      planned: [left.planned_amount_cents, right.planned_amount_cents],
      assigned: [left.reserved_amount_cents, right.reserved_amount_cents],
      available: [left.balance_cents, right.balance_cents],
      spent: [left.spent_amount_cents, right.spent_amount_cents],
    };
    const [leftValue, rightValue] = values[sortBy];
    const comparison = typeof leftValue === "string" && typeof rightValue === "string" ? leftValue.localeCompare(rightValue, "es") : Number(leftValue) - Number(rightValue);
    return ascending ? comparison : -comparison;
  });
  return <section className="envelope-section"><div className="envelope-toolbar"><div><span className="eyebrow">Organización</span><h2>Sobres del mes</h2></div><div className="envelope-controls"><span className="view-toggle"><button className={layout === "grid" ? "active" : ""} type="button" onClick={() => setLayout("grid")}>Grilla</button><button className={layout === "list" ? "active" : ""} type="button" onClick={() => setLayout("list")}>Lista</button></span><SelectInput label="Ordenar" value={sortBy} onChange={setSortBy}><option value="name">Nombre</option><option value="color">Color</option><option value="planned">Meta planificada</option><option value="assigned">Monto asignado</option><option value="available">Disponible</option><option value="spent">Monto usado</option></SelectInput><button className="sort-direction" type="button" onClick={() => setAscending(!ascending)} aria-label={ascending ? "Orden ascendente" : "Orden descendente"}>{ascending ? "↑" : "↓"}</button></div></div>{layout === "list" && <div className="envelope-list-header"><span>Sobre</span><span>Meta</span><span>Asignado</span><span>Usado</span><span>Disponible</span><span>Acciones</span></div>}<div className={`envelope-grid ${layout === "list" ? "list" : ""}`}>{sortedAllocations.map((allocation) => <EnvelopeCard key={allocation.id} layout={layout} allocation={allocation} categories={categories} currencies={currencies} onShowMovements={onShowMovements} onUpdate={onUpdate} onColor={onColor} onDelete={onDelete} />)}<button className={`add-envelope-card ${layout === "list" ? "list" : ""}`} type="button" onClick={onAdd} aria-label="Agregar un sobre"><span>+</span><strong>Agregar sobre</strong><small>Separá dinero para una nueva necesidad</small></button>{!allocations.length && <div className="envelope-empty"><EmptyState title="Todavía no hay sobres" text="Creá el primero con la tarjeta de agregar." /></div>}</div></section>;
}

function AddEnvelopeModal({ categories, currencies, periodId, onClose, onCreated }: { categories: Category[]; currencies: Currency[]; periodId: number; onClose: () => void; onCreated: () => Promise<void> }) {
  const [category, setCategory] = useState("");
  const [currency, setCurrency] = useState("1");
  const [planned, setPlanned] = useState("");
  const [assigned, setAssigned] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await createAllocation(periodId, {
        category_id: Number(category),
        currency_id: Number(currency),
        planned_amount_cents: Math.round(Number(planned || 0) * 100),
        reserved_amount_cents: Math.round(Number(assigned) * 100),
      });
      await onCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No pudimos crear el sobre");
    } finally {
      setSaving(false);
    }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="envelope-modal" role="dialog" aria-modal="true" aria-labelledby="add-envelope-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button><span className="eyebrow">Nuevo sobre</span><h2 id="add-envelope-title">Separá dinero para una necesidad</h2><p className="muted">La meta es opcional; solo el monto asignado se descuenta de tu saldo general.</p><form className="modal-form" onSubmit={submit}><SelectInput label="Categoría" value={category} onChange={setCategory} required><option value="">Elegí un sobre</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectInput><MoneyInput label="Monto planificado (opcional)" value={planned} onChange={setPlanned} currencies={currencies} currencyId={currency} onCurrencyChange={setCurrency} /><MoneyInput label="Monto asignado" value={assigned} onChange={setAssigned} currencies={currencies} currencyId={currency} onCurrencyChange={setCurrency} required />{error && <p className="error" role="alert">{error}</p>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando..." : "Crear sobre"}<span>→</span></button></div></form></section></div>;
}

function EnvelopeCard({ allocation, categories, currencies, layout, onShowMovements, onUpdate, onColor, onDelete }: { allocation: Allocation; categories: Category[]; currencies: Currency[]; layout: "grid" | "list"; onShowMovements: (id: number) => void; onUpdate: (id: number, planned: string, reserved: string) => Promise<void>; onColor: (categoryId: number, color: string) => Promise<void>; onDelete: (id: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [planned, setPlanned] = useState(String(allocation.planned_amount_cents / 100));
  const [reserved, setReserved] = useState(String(allocation.reserved_amount_cents / 100));
  const [color, setColor] = useState(categories.find((category) => category.id === allocation.category_id)?.color ?? BASIC_COLORS[0]);
  const percentage = allocation.reserved_amount_cents ? Math.min(100, Math.round((allocation.spent_amount_cents / allocation.reserved_amount_cents) * 100)) : 0;
  if (layout === "list") {
    return <article className="envelope-list-row"><div className="envelope-list-name"><span className="category-dot" style={{ background: color }} /><strong>{categoryName(allocation.category_id, categories)}</strong><small>{currencyCode(allocation.currency_id, currencies)}</small></div><span>{formatMoney(allocation.planned_amount_cents, allocation.currency_id, currencies)}</span><span>{formatMoney(allocation.reserved_amount_cents, allocation.currency_id, currencies)}</span><span>{formatMoney(allocation.spent_amount_cents, allocation.currency_id, currencies)}</span><strong className={allocation.balance_cents < 0 ? "negative" : "positive"}>{formatMoney(allocation.balance_cents, allocation.currency_id, currencies)}</strong><div className="envelope-list-actions"><button className="text-button" type="button" onClick={() => setEditing(!editing)}>{editing ? "Cancelar" : "Editar"}</button><button className="text-button" type="button" onClick={() => onShowMovements(allocation.id)}>Movimientos</button><button className="text-button danger" type="button" onClick={() => void onDelete(allocation.id)}>Eliminar</button></div>{editing && <form className="envelope-edit list" onSubmit={async (event) => { event.preventDefault(); await onUpdate(allocation.id, planned, reserved); await onColor(allocation.category_id, color); setEditing(false); }}><MoneyInput label="Planificado" value={planned} onChange={setPlanned} currencies={currencies} currencyId={String(allocation.currency_id)} onCurrencyChange={() => undefined} required /><MoneyInput label="Asignado" value={reserved} onChange={setReserved} currencies={currencies} currencyId={String(allocation.currency_id)} onCurrencyChange={() => undefined} required /><ColorPalette value={color} onChange={setColor} /><button className="secondary-button" type="submit">Guardar</button></form>}</article>;
  }
  return <article className="envelope-card"><div className="envelope-card-top"><span className="category-dot" style={{ background: color }} /><span>{categoryName(allocation.category_id, categories)}</span><small>{currencyCode(allocation.currency_id, currencies)}</small></div><strong className={allocation.balance_cents < 0 ? "negative" : "positive"}>{formatMoney(allocation.balance_cents, allocation.currency_id, currencies)}</strong><p>Disponible</p><div className="progress-track"><span className={allocation.balance_cents < 0 ? "negative-progress" : ""} style={{ width: `${percentage}%` }} /></div><small>{formatMoney(allocation.reserved_amount_cents, allocation.currency_id, currencies)} asignado · {formatMoney(allocation.spent_amount_cents, allocation.currency_id, currencies)} usado</small><small>Meta: {formatMoney(allocation.planned_amount_cents, allocation.currency_id, currencies)}</small>{editing && <form className="envelope-edit" onSubmit={async (event) => { event.preventDefault(); await onUpdate(allocation.id, planned, reserved); await onColor(allocation.category_id, color); setEditing(false); }}><MoneyInput label="Planificado" value={planned} onChange={setPlanned} currencies={currencies} currencyId={String(allocation.currency_id)} onCurrencyChange={() => undefined} required /><MoneyInput label="Asignado" value={reserved} onChange={setReserved} currencies={currencies} currencyId={String(allocation.currency_id)} onCurrencyChange={() => undefined} required /><ColorPalette value={color} onChange={setColor} /><button className="secondary-button" type="submit">Guardar</button></form>}<div className="envelope-actions"><button className="text-button" type="button" onClick={() => setEditing(!editing)}>{editing ? "Cancelar" : "Editar"}</button><button className="text-button" type="button" onClick={() => onShowMovements(allocation.id)}>Movimientos</button><button className="text-button danger" type="button" onClick={() => void onDelete(allocation.id)}>Eliminar</button></div></article>;
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

function EnvelopeRows({ allocations, categories, currencies }: { allocations: Allocation[]; categories: Category[]; currencies: Currency[] }) { return allocations.length ? <>{allocations.map((allocation) => <div className="allocation-row" key={allocation.id}><div><span>{categoryName(allocation.category_id, categories)}</span><small>{formatMoney(allocation.reserved_amount_cents, allocation.currency_id, currencies)} asignado · meta {formatMoney(allocation.planned_amount_cents, allocation.currency_id, currencies)}</small></div><strong className={allocation.balance_cents < 0 ? "negative" : "positive"}>{formatMoney(allocation.balance_cents, allocation.currency_id, currencies)}</strong></div>)}</> : <EmptyState title="Todavía no separaste dinero" text="Creá tu primer sobre desde Gestionar." />; }
function EconomyNavButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) { return <button className={active ? "active" : ""} type="button" onClick={onClick}>{children}</button>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><strong>{title}</strong><span>{text}</span></div>; }
const BASIC_COLORS = ["#5B8266", "#E07A5F", "#F2CC8F", "#5C7CFA", "#9C6ADE", "#4D908E"];
function ColorPalette({ value, onChange }: { value: string; onChange: (color: string) => void }) { return <fieldset className="color-palette"><legend>Color del sobre</legend><div>{BASIC_COLORS.map((color) => <button key={color} className={value === color ? "selected" : ""} type="button" aria-label={`Seleccionar color ${color}`} style={{ background: color }} onClick={() => onChange(color)} />)}</div></fieldset>; }
function MoneyInput({ label, value, onChange, currencies, currencyId, onCurrencyChange, required = false }: { label: string; value: string; onChange: (value: string) => void; currencies: Currency[]; currencyId: string; onCurrencyChange: (value: string) => void; required?: boolean }) { return <label className="money-field">{label}<span className="money-control"><span className="money-prefix">$</span><input type="number" min="0.01" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} required={required} /><select aria-label={`${label} moneda`} value={currencyId} onChange={(event) => onCurrencyChange(event.target.value)}>{currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.code}</option>)}</select></span></label>; }
function SelectInput({ label, value, onChange, children, required = false }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; required?: boolean }) { return <label className="field">{label}<span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)} required={required}>{children}</select></span></label>; }
function categoryName(id: number, categories: Category[]) { return categories.find((category) => category.id === id)?.name ?? "Sin categoría"; }
function currencyCode(id: number, currencies: Currency[]) { return currencies.find((currency) => currency.id === id)?.code ?? "ARS"; }
function formatMoney(cents: number, currencyId: number, currencies: Currency[]) { const currency = currencies.find((item) => item.id === currencyId); return `${currency?.symbol ?? "$"}${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(cents / 100)}`; }
