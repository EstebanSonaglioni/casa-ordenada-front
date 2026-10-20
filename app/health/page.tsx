"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "../components/AppHeader";
import { useToast } from "../components/ToastProvider";
import { createExercise, deleteExercise, ExerciseDay, ExerciseEntry, getExerciseCalendar, getExerciseEntries, updateExercise } from "../lib/health";
import { getSessionValue } from "../lib/session";

const today = new Date().toISOString().slice(0, 10);

export default function HealthPage() {
  const router = useRouter();
  const showToast = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState<ExerciseDay[]>([]);
  const [entries, setEntries] = useState<ExerciseEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getSessionValue("access_token").then((token) => {
      if (!token) router.replace("/");
    });
  }, [router]);

  useEffect(() => { void load(); }, [year]);

  async function load() {
    try {
      setError("");
      const from = `${year}-01-01`;
      const to = `${year}-12-31`;
      const [calendar, records] = await Promise.all([getExerciseCalendar(year), getExerciseEntries(from, to)]);
      setDays(calendar);
      setEntries(records);
      if (!selectedDate.startsWith(`${year}-`)) setSelectedDate(from);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar el ejercicio");
    }
  }

  const dayByDate = useMemo(() => new Map(days.map((day) => [day.performed_on, day])), [days]);
  const selectedEntries = entries.filter((entry) => entry.performed_on === selectedDate);
  const totalMinutes = days.reduce((total, day) => total + day.duration_minutes, 0);
  const streak = currentStreak(dayByDate);

  function resetForm() {
    setActivity(""); setDuration(""); setNotes(""); setEditingId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const data = { performed_on: selectedDate, activity, duration_minutes: Number(duration), notes: notes || null };
      if (editingId) await updateExercise(editingId, data); else await createExercise(data);
      showToast(editingId ? "Ejercicio actualizado." : "Ejercicio registrado.");
      resetForm();
      await load();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "No pudimos guardar el ejercicio";
      setError(message); showToast(message, "error");
    }
  }

  async function remove(entry: ExerciseEntry) {
    if (!window.confirm(`¿Eliminar ${entry.activity} del ${formatDate(entry.performed_on)}?`)) return;
    try {
      await deleteExercise(entry.id);
      showToast("Ejercicio eliminado.");
      if (editingId === entry.id) resetForm();
      await load();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "No pudimos eliminar el ejercicio";
      setError(message); showToast(message, "error");
    }
  }

  function edit(entry: ExerciseEntry) {
    setSelectedDate(entry.performed_on); setActivity(entry.activity); setDuration(String(entry.duration_minutes)); setNotes(entry.notes ?? ""); setEditingId(entry.id);
  }

  return <main className="dashboard-shell health-shell"><AppHeader /><section className="dashboard-content">
    <div className="welcome-row"><div><span className="eyebrow">Salud</span><h1>Ejercicio</h1><p className="muted">Registrá tu movimiento y observá tu constancia.</p></div><label className="year-picker">Año<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{[year - 1, year, year + 1].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="summary-grid health-summary"><article className="metric-card primary-metric"><span>Días con ejercicio</span><strong>{days.length}</strong><small>en {year}</small></article><article className="metric-card"><span>Minutos acumulados</span><strong>{totalMinutes}</strong><small>durante el año</small></article><article className="metric-card"><span>Racha actual</span><strong>{streak}</strong><small>días consecutivos</small></article></div>
    <section className="dashboard-panel exercise-map-panel"><div className="panel-heading"><div><span className="eyebrow">Constancia anual</span><h2>Tu mapa de ejercicio</h2></div><small className="muted">Cada cuadrado representa un día</small></div><ExerciseMap year={year} days={dayByDate} selectedDate={selectedDate} onSelect={setSelectedDate} /><div className="exercise-legend"><span><i className="level-0" /> Sin ejercicio</span><span><i className="level-1" /> Hasta 30 min</span><span><i className="level-2" /> Hasta 60 min</span><span><i className="level-3" /> Más de 60 min</span></div></section>
    <div className="health-columns"><section className="dashboard-panel"><span className="eyebrow">{editingId ? "Editar registro" : "Nueva actividad"}</span><h2>{formatDate(selectedDate)}</h2><form className="manager-form health-form" onSubmit={submit}><label className="field">Fecha<input type="date" value={selectedDate} max={`${year}-12-31`} min={`${year}-01-01`} onChange={(event) => setSelectedDate(event.target.value)} required /></label><label className="field">Actividad<input value={activity} maxLength={100} onChange={(event) => setActivity(event.target.value)} placeholder="Ej. caminata, fuerza" required /></label><label className="field">Duración (minutos)<input type="number" min="1" max="1440" value={duration} onChange={(event) => setDuration(event.target.value)} required /></label><label className="field">Notas opcionales<input value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} placeholder="Cómo te sentiste" /></label><button className="primary-button form-submit" type="submit">{editingId ? "Guardar cambios" : "Registrar ejercicio"}</button>{editingId && <button className="secondary-button" type="button" onClick={resetForm}>Cancelar</button>}</form></section>
    <section className="dashboard-panel"><span className="eyebrow">Resumen del día</span><h2>{formatDate(selectedDate)}</h2>{selectedEntries.length ? <div className="exercise-entry-list">{selectedEntries.map((entry) => <article key={entry.id} className="exercise-entry"><div><strong>{entry.activity}</strong><small>{entry.duration_minutes} min{entry.notes ? ` · ${entry.notes}` : ""}</small></div><div><button className="text-button" type="button" onClick={() => edit(entry)}>Editar</button><button className="text-button danger-text" type="button" onClick={() => void remove(entry)}>Eliminar</button></div></article>)}</div> : <p className="muted empty-copy">No registraste ejercicio este día.</p>}</section></div>
  </section></main>;
}

function ExerciseMap({ year, days, selectedDate, onSelect }: { year: number; days: Map<string, ExerciseDay>; selectedDate: string; onSelect: (date: string) => void }) {
  const first = new Date(year, 0, 1); const start = new Date(year, 0, 1 - first.getDay()); const last = new Date(year, 11, 31); const end = new Date(year, 11, 31 + (6 - last.getDay()));
  const cells: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) cells.push(localDate(cursor));
  return <div className="exercise-map" role="grid" aria-label={`Ejercicio en ${year}`}>{cells.map((value) => { const day = days.get(value); const level = intensity(day?.duration_minutes ?? 0); const outside = !value.startsWith(`${year}-`); return <button key={value} type="button" className={`exercise-cell level-${level}${value === selectedDate ? " selected" : ""}${outside ? " outside" : ""}`} aria-label={`${formatDate(value)}: ${day ? `${day.duration_minutes} minutos de ejercicio` : "sin ejercicio"}`} title={`${formatDate(value)}: ${day ? `${day.duration_minutes} min` : "sin ejercicio"}`} onClick={() => onSelect(value)} />; })}</div>;
}

function intensity(minutes: number) { return minutes === 0 ? 0 : minutes <= 30 ? 1 : minutes <= 60 ? 2 : 3; }
function localDate(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`)); }
function currentStreak(days: Map<string, ExerciseDay>) { let count = 0; const cursor = new Date(); while (days.has(localDate(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1); } return count; }
