"use client";

import { useEffect, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import {
  Category,
  createAllocation,
  createCategory,
  createIncome,
  createPlanned,
  createRecurring,
  generateRecurring,
  getPlanned,
  getRecurring,
  PlannedExpense,
  RecurringExpense,
  Summary,
  transferAllocation,
  rolloverPeriod,
} from "../lib/auth";

type Props = {
  categories: Category[];
  summary: Summary;
  onRefresh: () => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);

export default function FinanceManager({ categories, summary, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState("income");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [planned, setPlanned] = useState<PlannedExpense[]>([]);

  async function reloadLists() {
    const [recurringItems, plannedItems] = await Promise.all([getRecurring(), getPlanned()]);
    setRecurring(recurringItems);
    setPlanned(plannedItems);
  }

  useEffect(() => {
    void reloadLists();
  }, []);

  async function submit(action: () => Promise<unknown>, success: string, refreshLists = false) {
    setError("");
    setMessage("");
    try {
      await action();
      if (refreshLists) await reloadLists();
      await onRefresh();
      setMessage(success);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No pudimos guardar los cambios");
    }
  }

  return (
    <section className="management-panel dashboard-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">Organización</span><h2>Gestioná tu economía</h2></div>
        <span className="muted">Mes {summary.period.month}/{summary.period.year}</span>
      </div>
      <div className="management-tabs" role="tablist" aria-label="Gestión financiera">
        {[["income", "Ingresos"], ["envelopes", "Sobres"], ["recurring", "Recurrentes"], ["planned", "Futuros"], ["transfer", "Transferir"], ["categories", "Categorías"]].map(([id, label]) => <button key={id} className={activeTab === id ? "active" : ""} type="button" role="tab" aria-selected={activeTab === id} onClick={() => { setActiveTab(id); setMessage(""); setError(""); }}>{label}</button>)}
      </div>
      {message && <p className="success" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {activeTab === "income" && <IncomeForm onSubmit={(data) => submit(() => createIncome(summary.period.id, data), "Ingreso registrado.")} />}
      {activeTab === "envelopes" && <EnvelopeForm categories={categories} summary={summary} onSubmit={(data) => submit(() => createAllocation(summary.period.id, data), "Sobre creado.")} onGenerate={() => submit(() => generateRecurring(summary.period.id), "Pagos recurrentes separados.")} onRollover={() => submit(() => rolloverPeriod(summary.period.id), "Mes cerrado y saldo positivo traspasado.")} />}
      {activeTab === "recurring" && <RecurringForm categories={categories} items={recurring} onSubmit={(data) => submit(() => createRecurring(data), "Pago recurrente guardado.", true)} />}
      {activeTab === "planned" && <PlannedForm categories={categories} items={planned} onSubmit={(data) => submit(() => createPlanned(data), "Gasto futuro guardado.", true)} />}
      {activeTab === "transfer" && <TransferForm summary={summary} onSubmit={(data) => submit(() => transferAllocation(summary.period.id, data), "Transferencia realizada.")} />}
      {activeTab === "categories" && <CategoryForm onSubmit={(data) => submit(() => createCategory(data), "Categoría creada.")} />}
    </section>
  );
}

function CategoryOptions({ categories }: { categories: Category[] }) {
  return <>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</>;
}

function IncomeForm({ onSubmit }: { onSubmit: (data: { source: string; received_from: string; amount_cents: number; received_on: string }) => void }) {
  const [source, setSource] = useState(""); const [from, setFrom] = useState(""); const [amount, setAmount] = useState(""); const [date, setDate] = useState(today);
  return <FormCard title="Sumar un ingreso" description="Podés registrar más de un ingreso en el mismo mes."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ source, received_from: from, amount_cents: Math.round(Number(amount) * 100), received_on: date }); }}><TextInput label="Origen" placeholder="Sueldo, freelance..." value={source} onChange={setSource} required /><TextInput label="Quién lo aporta" placeholder="Alemán, empresa..." value={from} onChange={setFrom} required /><TextInput label="Monto" type="number" min="0.01" step="0.01" value={amount} onChange={setAmount} required /><TextInput label="Fecha" type="date" value={date} onChange={setDate} required /><SubmitButton label="Registrar ingreso" /></form></FormCard>;
}

function EnvelopeForm({ categories, summary, onSubmit, onGenerate, onRollover }: { categories: Category[]; summary: Summary; onSubmit: (data: { category_id: number; planned_amount_cents: number; reserved_amount_cents: number }) => void; onGenerate: () => void; onRollover: () => void }) {
  const [category, setCategory] = useState(""); const [planned, setPlanned] = useState(""); const [reserved, setReserved] = useState("0");
  return <FormCard title="Separar dinero por sobre" description="Definí cuánto querés reservar para cada necesidad."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ category_id: Number(category), planned_amount_cents: Math.round(Number(planned) * 100), reserved_amount_cents: Math.round(Number(reserved) * 100) }); }}><SelectInput label="Categoría" value={category} onChange={setCategory} required><option value="">Elegí un sobre</option><CategoryOptions categories={categories} /></SelectInput><TextInput label="Monto planificado" type="number" min="0" step="0.01" value={planned} onChange={setPlanned} required /><TextInput label="Reserva futura incluida" type="number" min="0" step="0.01" value={reserved} onChange={setReserved} /><SubmitButton label="Separar dinero" /></form><div className="manager-actions"><button className="secondary-button" type="button" onClick={onGenerate}>Generar recurrentes</button><button className="secondary-button" type="button" onClick={onRollover} disabled={summary.period.status !== "open"}>Cerrar mes y traspasar saldo</button></div></FormCard>;
}

function RecurringForm({ categories, items, onSubmit }: { categories: Category[]; items: RecurringExpense[]; onSubmit: (data: { category_id: number; name: string; amount_cents: number; amount_type: string; due_day: number }) => void }) {
  const [category, setCategory] = useState(""); const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [type, setType] = useState("fixed"); const [day, setDay] = useState("10");
  return <FormCard title="Pagos recurrentes" description="Servicios, seguros y cuotas fijas o variables."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ category_id: Number(category), name, amount_cents: Math.round(Number(amount) * 100), amount_type: type, due_day: Number(day) }); }}><SelectInput label="Categoría" value={category} onChange={setCategory} required><option value="">Elegí una categoría</option><CategoryOptions categories={categories} /></SelectInput><TextInput label="Nombre" placeholder="Seguro del auto" value={name} onChange={setName} required /><TextInput label="Monto estimado" type="number" min="0.01" step="0.01" value={amount} onChange={setAmount} required /><SelectInput label="Tipo" value={type} onChange={setType}><option value="fixed">Fijo</option><option value="variable">Variable</option></SelectInput><TextInput label="Vence el día" type="number" min="1" max="31" value={day} onChange={setDay} required /><SubmitButton label="Guardar pago" /></form><ItemList items={items.map((item) => `${item.name} · ${formatMoney(item.amount_cents)} · día ${item.due_day}`)} empty="Todavía no hay pagos recurrentes." /></FormCard>;
}

function PlannedForm({ categories, items, onSubmit }: { categories: Category[]; items: PlannedExpense[]; onSubmit: (data: { category_id: number; description: string; estimated_amount_cents: number; target_date: string }) => void }) {
  const [category, setCategory] = useState(""); const [description, setDescription] = useState(""); const [amount, setAmount] = useState(""); const [date, setDate] = useState(today);
  return <FormCard title="Gastos futuros" description="Mantenimientos, cumpleaños y otros planes que querés anticipar."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ category_id: Number(category), description, estimated_amount_cents: Math.round(Number(amount) * 100), target_date: date }); }}><SelectInput label="Categoría" value={category} onChange={setCategory} required><option value="">Elegí una categoría</option><CategoryOptions categories={categories} /></SelectInput><TextInput label="Descripción" placeholder="Mantenimiento del auto" value={description} onChange={setDescription} required /><TextInput label="Monto estimado" type="number" min="0.01" step="0.01" value={amount} onChange={setAmount} required /><TextInput label="Fecha objetivo" type="date" value={date} onChange={setDate} required /><SubmitButton label="Guardar previsión" /></form><ItemList items={items.map((item) => `${item.description} · ${formatMoney(item.estimated_amount_cents)} · ${item.target_date}`)} empty="Todavía no hay gastos previstos." /></FormCard>;
}

function TransferForm({ summary, onSubmit }: { summary: Summary; onSubmit: (data: { from_allocation_id: number; to_allocation_id: number; amount_cents: number; transferred_on: string }) => void }) {
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [amount, setAmount] = useState("");
  return <FormCard title="Mover dinero entre sobres" description="Reorganizá tu presupuesto sin perder el seguimiento."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ from_allocation_id: Number(from), to_allocation_id: Number(to), amount_cents: Math.round(Number(amount) * 100), transferred_on: today }); }}><SelectInput label="Desde" value={from} onChange={setFrom} required><option value="">Elegí el sobre origen</option>{summary.allocations.map((item) => <option key={item.id} value={item.id}>Sobre {item.category_id} · {formatMoney(item.balance_cents)}</option>)}</SelectInput><SelectInput label="Hacia" value={to} onChange={setTo} required><option value="">Elegí el sobre destino</option>{summary.allocations.map((item) => <option key={item.id} value={item.id}>Sobre {item.category_id}</option>)}</SelectInput><TextInput label="Monto" type="number" min="0.01" step="0.01" value={amount} onChange={setAmount} required /><SubmitButton label="Transferir" /></form></FormCard>;
}

function CategoryForm({ onSubmit }: { onSubmit: (data: { name: string; kind: string; color: string }) => void }) {
  const [name, setName] = useState(""); const [kind, setKind] = useState("variable"); const [color, setColor] = useState("#5B8266");
  return <FormCard title="Nueva categoría" description="Creá un sobre para una necesidad que todavía no esté en tu lista."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ name, kind, color }); }}><TextInput label="Nombre" placeholder="Mascotas" value={name} onChange={setName} required /><SelectInput label="Tipo" value={kind} onChange={setKind}><option value="fixed">Fijo</option><option value="variable">Variable</option><option value="future">Futuro</option><option value="other">Otro</option></SelectInput><label htmlFor="category-color">Color</label><input id="category-color" className="color-input" type="color" value={color} onChange={(event) => setColor(event.target.value)} /><SubmitButton label="Crear categoría" /></form></FormCard>;
}

function FormCard({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <div className="form-card"><h3>{title}</h3><p className="muted">{description}</p>{children}</div>; }
function ItemList({ items, empty }: { items: string[]; empty: string }) { return <div className="item-list">{items.length ? items.map((item) => <p key={item}>{item}</p>) : <p className="muted">{empty}</p>}</div>; }
type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void };
function TextInput({ label, value, onChange, ...props }: TextInputProps) { const id = label.toLowerCase().replaceAll(" ", "-"); return <label className="field">{label}<input id={id} value={value} onChange={(event) => onChange(event.target.value)} {...props} /></label>; }
type SelectInputProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void; children: ReactNode };
function SelectInput({ label, value, onChange, children, ...props }: SelectInputProps) { const id = label.toLowerCase().replaceAll(" ", "-"); return <label className="field">{label}<span className="select-wrap"><select id={id} value={value} onChange={(event) => onChange(event.target.value)} {...props}>{children}</select></span></label>; }
function SubmitButton({ label }: { label: string }) { return <button className="primary-button form-submit" type="submit">{label}<span>→</span></button>; }
function formatMoney(cents: number) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(cents / 100); }
