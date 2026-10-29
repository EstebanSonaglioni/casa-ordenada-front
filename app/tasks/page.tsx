"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "../components/AppHeader";
import { Currency, getCurrencies, getHouseholdMembers, HouseholdMember } from "../lib/auth";
import { completeTask, createTask, deleteTask, getTaskCalendar, getTasks, Task, TaskOccurrence } from "../lib/tasks";
import { getSessionValue } from "../lib/session";

type View = "pending" | "habitual" | "calendar";
const taskTypes = [["cleaning", "Limpieza"], ["cooking", "Cocina"], ["shopping", "Compras"], ["maintenance", "Mantenimiento"], ["childcare", "Cuidado"], ["pet", "Mascotas"], ["other", "Otra"]];
const weekdays = [[0, "Lun"], [1, "Mar"], [2, "Mié"], [3, "Jue"], [4, "Vie"], [5, "Sáb"], [6, "Dom"]] as const;

export default function TasksPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("pending");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendar, setCalendar] = useState<TaskOccurrence[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", task_type: "other", difficulty: "", duration: "", amount: "", currency_id: "", assigned_to_user_id: "", due_at: "", recurrence: "none", recurrence_until: "" });
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  async function load() {
    try {
      setLoading(true); setError("");
      const [items, money, households] = await Promise.all([getTasks(), getCurrencies(), import("../lib/auth").then(({ getHouseholds }) => getHouseholds())]);
      setTasks(items); setCurrencies(money);
      const activeId = await getSessionValue("active_household_id");
      const active = households.find((household) => String(household.id) === activeId) ?? households[0];
      if (active) setMembers(await getHouseholdMembers(active.id));
      await loadCalendar(month);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No pudimos cargar las tareas"); }
    finally { setLoading(false); }
  }

  async function loadCalendar(currentMonth = month) {
    const from = isoDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    const to = isoDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));
    setCalendar(await getTaskCalendar(from, to));
  }

  useEffect(() => { void getSessionValue("access_token").then((token) => { if (!token) router.replace("/"); else void load(); }); }, [router]);
  useEffect(() => { if (view === "calendar") void loadCalendar(); }, [month, view]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const amount = form.amount ? Math.round(Number(form.amount) * 100) : null;
      await createTask({ title: form.title, description: form.description || null, task_type: form.task_type, difficulty: form.difficulty || null, duration_minutes: form.duration ? Number(form.duration) : null, estimated_amount_cents: amount, currency_id: form.currency_id ? Number(form.currency_id) : null, assigned_to_user_id: form.assigned_to_user_id ? Number(form.assigned_to_user_id) : null, due_at: form.due_at ? new Date(form.due_at).toISOString() : null, recurrence: form.recurrence, recurrence_days: form.recurrence === "weekly" ? selectedDays : null, recurrence_until: form.recurrence_until || null });
      setForm({ title: "", description: "", task_type: "other", difficulty: "", duration: "", amount: "", currency_id: "", assigned_to_user_id: "", due_at: "", recurrence: "none", recurrence_until: "" }); setSelectedDays([]); setMessage("Tarea creada."); await load();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No pudimos crear la tarea"); }
  }

  async function complete(item: Task | TaskOccurrence, date = occurrenceDate(item)) {
    if (!date) return;
    try { await completeTask(item.id, date); setMessage("Tarea marcada como realizada."); await load(); }
    catch (completeError) { setError(completeError instanceof Error ? completeError.message : "No pudimos completar la tarea"); }
  }

  async function remove(item: Task) {
    if (!window.confirm(`¿Eliminar ${item.title}?`)) return;
    try { await deleteTask(item.id); await load(); } catch (removeError) { setError(removeError instanceof Error ? removeError.message : "No pudimos eliminar la tarea"); }
  }

  const pending = tasks.filter((item) => item.status === "pending");
  const habitual = pending.filter((item) => item.recurrence !== "none");
  const cells = useMemo(() => monthCells(month), [month]);
  const byDate = useMemo(() => new Map(calendar.reduce((groups, item) => { groups.set(item.occurrence_date, [...(groups.get(item.occurrence_date) ?? []), item]); return groups; }, new Map<string, TaskOccurrence[]>())), [calendar]);

  if (loading) return null;
  return <main className="dashboard-shell"><AppHeader /><section className="dashboard-content tasks-content"><div className="welcome-row"><div><span className="eyebrow">Casa</span><h1>Tareas</h1><p className="muted">Lo que hay que hacer, sin que quede todo en la cabeza.</p></div><button className="primary-button task-new-button" type="button" onClick={() => document.getElementById("new-task")?.scrollIntoView({ behavior: "smooth" })}>Nueva tarea<span>→</span></button></div>{error && <p className="error" role="alert">{error}</p>}{message && <p className="task-message" role="status">{message}</p>}<nav className="economy-nav task-tabs"><button className={view === "pending" ? "active" : ""} onClick={() => setView("pending")}>Pendientes ({pending.length})</button><button className={view === "habitual" ? "active" : ""} onClick={() => setView("habitual")}>Habituales ({habitual.length})</button><button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>Calendario</button></nav>{view === "calendar" ? <Calendar month={month} setMonth={setMonth} cells={cells} byDate={byDate} onComplete={complete} /> : <TaskList items={view === "habitual" ? habitual : pending} onComplete={complete} onDelete={remove} empty={view === "habitual" ? "Todavía no hay tareas habituales." : "No hay tareas pendientes."} />}{view !== "calendar" && <section id="new-task" className="dashboard-panel task-form-panel"><div className="panel-heading"><div><span className="eyebrow">Organizar</span><h2>Nueva tarea</h2></div><small className="muted">Los datos de tiempo, dificultad y dinero son opcionales.</small></div><form className="task-form" onSubmit={submit}><label className="field">Qué hay que hacer<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={160} placeholder="Ej. Limpiar el baño" /></label><label className="field">Tipo<select value={form.task_type} onChange={(event) => setForm({ ...form, task_type: event.target.value })}>{taskTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="field task-wide">Descripción<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={2000} placeholder="Detalles, materiales o acuerdos" /></label><label className="field">Fecha y hora<input type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} /></label><label className="field">Se repite<select value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value })}><option value="none">No</option><option value="daily">Todos los días</option><option value="weekly">Cada semana</option><option value="monthly">Cada mes</option></select></label>{form.recurrence === "weekly" && <fieldset className="task-wide task-weekdays"><legend>Días</legend>{weekdays.map(([value, label]) => <label key={value}><input type="checkbox" checked={selectedDays.includes(value)} onChange={() => setSelectedDays((days) => days.includes(value) ? days.filter((day) => day !== value) : [...days, value])} />{label}</label>)}</fieldset>}{form.recurrence !== "none" && <label className="field">Repetir hasta<input type="date" value={form.recurrence_until} onChange={(event) => setForm({ ...form, recurrence_until: event.target.value })} /></label>}<label className="field">Duración (minutos)<input type="number" min="1" max="1440" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} /></label><label className="field">Dificultad<select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })}><option value="">Sin especificar</option><option value="easy">Fácil</option><option value="medium">Media</option><option value="hard">Difícil</option></select></label><label className="field">Dinero estimado<input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" /></label><label className="field">Moneda<select value={form.currency_id} onChange={(event) => setForm({ ...form, currency_id: event.target.value })}><option value="">Sin moneda</option>{currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.code}</option>)}</select></label><label className="field">Responsable<select value={form.assigned_to_user_id} onChange={(event) => setForm({ ...form, assigned_to_user_id: event.target.value })}><option value="">Sin asignar</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name}</option>)}</select></label><button className="primary-button form-submit task-wide" type="submit">Guardar tarea<span>→</span></button></form></section>}</section></main>;
}

function TaskList({ items, onComplete, onDelete, empty }: { items: Task[]; onComplete: (item: Task) => void; onDelete: (item: Task) => void; empty: string }) { return <section className="task-list">{items.length ? items.map((item) => <article className="dashboard-panel task-card" key={item.id}><div className="task-card-main"><div className="task-title-line"><span className="task-type-dot" /> <h2>{item.title}</h2>{item.recurrence !== "none" && <span className="task-badge">{recurrenceLabel(item.recurrence)}</span>}</div>{item.description && <p>{item.description}</p>}<div className="task-meta"><span>{typeLabel(item.task_type)}</span>{item.duration_minutes && <span>{item.duration_minutes} min</span>}{item.difficulty && <span>{difficultyLabel(item.difficulty)}</span>}{item.estimated_amount_cents !== null && <span>Coste estimado</span>}{item.next_due_at && <span>{item.recurrence === "none" ? "Para" : "Próxima"}: {formatDateTime(item.next_due_at)}</span>}</div></div><div className="task-actions"><button className="primary-button" type="button" onClick={() => onComplete(item)}>Hecha</button><button className="text-button danger-text" type="button" onClick={() => onDelete(item)}>Eliminar</button></div></article>) : <section className="dashboard-panel empty-state"><h2>{empty}</h2><p className="muted">Podés crear una tarea puntual o una que se repita cada día.</p></section>}</section>; }

function Calendar({ month, setMonth, cells, byDate, onComplete }: { month: Date; setMonth: (month: Date) => void; cells: Date[]; byDate: Map<string, TaskOccurrence[]>; onComplete: (item: TaskOccurrence, date: string) => void }) { return <section className="dashboard-panel task-calendar-panel"><div className="panel-heading"><div><span className="eyebrow">Agenda del hogar</span><h2>{new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(month)}</h2></div><div className="calendar-heading-actions"><button className="calendar-nav-button" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><button className="calendar-nav-button" type="button" onClick={() => setMonth(new Date())}>Hoy</button><button className="calendar-nav-button" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></div></div><div className="calendar-weekdays">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((date) => { const key = isoDate(date); const items = byDate.get(key) ?? []; return <div className={`calendar-day ${date.getMonth() !== month.getMonth() ? "outside" : ""}`} key={key}><strong>{date.getDate()}</strong>{items.map((item) => <button className={`calendar-event task-calendar-event ${item.occurrence_status}`} key={`${item.id}-${key}`} type="button" onClick={() => item.occurrence_status !== "completed" && onComplete(item, key)}><span>{item.title}</span><small>{item.due_at ? formatTime(item.due_at) : "Todo el día"}</small></button>)}</div>; })}</div></section>; }

function monthCells(month: Date) { const first = new Date(month.getFullYear(), month.getMonth(), 1); const start = new Date(first); start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); const last = new Date(month.getFullYear(), month.getMonth() + 1, 0); const end = new Date(last); end.setDate(last.getDate() + (7 - last.getDay()) % 7); const cells = []; for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) cells.push(new Date(date)); return cells; }
function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatTime(value: string) { return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function typeLabel(value: string) { return taskTypes.find(([type]) => type === value)?.[1] ?? value; }
function recurrenceLabel(value: string) { return value === "daily" ? "Diaria" : value === "weekly" ? "Semanal" : "Mensual"; }
function difficultyLabel(value: string) { return value === "easy" ? "Fácil" : value === "medium" ? "Media" : "Difícil"; }
function occurrenceDate(item: Task | TaskOccurrence) { return "occurrence_date" in item ? item.occurrence_date : item.next_due_at?.slice(0, 10); }
