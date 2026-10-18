"use client";

import { useEffect, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useToast } from "../components/ToastProvider";

import {
  Category,
  Currency,
  createAllocation,
  createCategory,
  createIncome,
  createPlanned,
  createRecurring,
  createExchangeRate,
  getMercadoPagoMovements,
  getMercadoPagoReserves,
  linkMercadoPagoMovement,
  syncMercadoPago,
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
  currencies: Currency[];
  summary: Summary;
  onRefresh: () => Promise<void>;
  onCategoriesRefresh: () => Promise<void>;
  initialTab?: string;
};

const today = new Date().toISOString().slice(0, 10);

export default function FinanceManager({ categories, currencies, summary, onRefresh, onCategoriesRefresh, initialTab = "income" }: Props) {
  const [activeTab, setActiveTab] = useState("income");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [planned, setPlanned] = useState<PlannedExpense[]>([]);
  const showToast = useToast();

  async function reloadLists() {
    const [recurringItems, plannedItems] = await Promise.all([getRecurring(), getPlanned()]);
    setRecurring(recurringItems);
    setPlanned(plannedItems);
  }

  useEffect(() => {
    void reloadLists();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  async function submit(action: () => Promise<unknown>, success: string, refreshLists = false) {
    setError("");
    setMessage("");
    try {
      await action();
      if (refreshLists) await reloadLists();
      await onRefresh();
      setMessage(success);
      showToast(success);
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "No pudimos guardar los cambios";
      setError(message);
      showToast(message, "error");
    }
  }

  return (
    <section className="management-panel dashboard-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">Organización</span><h2>Gestioná tu economía</h2></div>
        <span className="muted">Mes {summary.period.month}/{summary.period.year}</span>
      </div>
      <div className="management-tabs" role="tablist" aria-label="Gestión financiera">
        {[["income", "Ingresos"], ["envelopes", "Sobres"], ["recurring", "Recurrentes"], ["planned", "Futuros"], ["transfer", "Transferir"], ["categories", "Categorías"], ["currencies", "Monedas"], ["mercadopago", "Mercado Pago"]].map(([id, label]) => <button key={id} className={activeTab === id ? "active" : ""} type="button" role="tab" aria-selected={activeTab === id} onClick={() => { setActiveTab(id); setMessage(""); setError(""); }}>{label}</button>)}
      </div>
      {message && <p className="success" role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {activeTab === "income" && <IncomeForm currencies={currencies} onSubmit={(data) => submit(() => createIncome(summary.period.id, data), "Ingreso registrado.")} />}
      {activeTab === "envelopes" && <EnvelopeForm categories={categories} currencies={currencies} summary={summary} onSubmit={(data) => submit(() => createAllocation(summary.period.id, data), "Sobre creado.")} onGenerate={() => submit(() => generateRecurring(summary.period.id), "Pagos recurrentes separados.")} onRollover={() => submit(() => rolloverPeriod(summary.period.id), "Mes cerrado y saldo positivo traspasado.")} />}
      {activeTab === "recurring" && <RecurringForm categories={categories} currencies={currencies} items={recurring} onSubmit={(data) => submit(() => createRecurring(data), "Pago recurrente guardado.", true)} />}
      {activeTab === "planned" && <PlannedForm categories={categories} currencies={currencies} items={planned} onSubmit={(data) => submit(() => createPlanned(data), "Gasto futuro guardado.", true)} />}
      {activeTab === "transfer" && <TransferForm currencies={currencies} summary={summary} onSubmit={(data) => submit(() => transferAllocation(summary.period.id, data), "Transferencia realizada.")} />}
      {activeTab === "categories" && <CategoryForm onSubmit={(data) => submit(async () => { await createCategory(data); await onCategoriesRefresh(); }, "Categoría creada.")} />}
      {activeTab === "currencies" && <CurrencyForm currencies={currencies} onSubmit={(data) => submit(() => createExchangeRate(data), "Cotización guardada.")} />}
      {activeTab === "mercadopago" && <MercadoPagoForm summary={summary} onSubmit={(id, allocationId) => submit(() => linkMercadoPagoMovement(id, allocationId), "Movimiento vinculado al sobre.")} />}
    </section>
  );
}

function CategoryOptions({ categories }: { categories: Category[] }) {
  return <>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</>;
}

function IncomeForm({ currencies, onSubmit }: { currencies: Currency[]; onSubmit: (data: { source: string; received_from: string; amount_cents: number; currency_id: number; received_on: string }) => void }) {
  const [source, setSource] = useState(""); const [from, setFrom] = useState(""); const [amount, setAmount] = useState(""); const [currency, setCurrency] = useState("1"); const [date, setDate] = useState(today);
  return <FormCard title="Sumar un ingreso" description="Podés registrar más de un ingreso en el mismo mes."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ source, received_from: from, amount_cents: Math.round(Number(amount) * 100), currency_id: Number(currency), received_on: date }); }}><TextInput label="Origen" placeholder="Sueldo, freelance..." value={source} onChange={setSource} required /><TextInput label="Quién lo aporta" placeholder="Alemán, empresa..." value={from} onChange={setFrom} required /><MoneyInput label="Monto" value={amount} onChange={setAmount} currencies={currencies} currencyId={currency} onCurrencyChange={setCurrency} required /><TextInput label="Fecha" type="date" value={date} onChange={setDate} required /><SubmitButton label="Registrar ingreso" /></form></FormCard>;
}

function EnvelopeForm({ categories, currencies, summary, onSubmit, onGenerate, onRollover }: { categories: Category[]; currencies: Currency[]; summary: Summary; onSubmit: (data: { category_id: number; currency_id: number; planned_amount_cents: number; reserved_amount_cents: number }) => void; onGenerate: () => void; onRollover: () => void }) {
  const [category, setCategory] = useState(""); const [currency, setCurrency] = useState("1"); const [planned, setPlanned] = useState(""); const [reserved, setReserved] = useState("0");
  return <FormCard title="Separar dinero por sobre" description="La meta es opcional; solo lo asignado se descuenta de tu saldo general."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ category_id: Number(category), currency_id: Number(currency), planned_amount_cents: Math.round(Number(planned || 0) * 100), reserved_amount_cents: Math.round(Number(reserved) * 100) }); }}><SelectInput label="Categoría" value={category} onChange={setCategory} required><option value="">Elegí un sobre</option><CategoryOptions categories={categories} /></SelectInput><MoneyInput label="Monto planificado (opcional)" value={planned} onChange={setPlanned} currencies={currencies} currencyId={currency} onCurrencyChange={setCurrency} /><MoneyInput label="Monto asignado" value={reserved} onChange={setReserved} currencies={currencies} currencyId={currency} onCurrencyChange={setCurrency} /><SubmitButton label="Separar dinero" /></form><div className="manager-actions"><button className="secondary-button" type="button" onClick={onGenerate}>Generar recurrentes</button><button className="secondary-button" type="button" onClick={onRollover} disabled={summary.period.status !== "open"}>Cerrar mes y traspasar saldo</button></div></FormCard>;
}

function RecurringForm({ categories, currencies, items, onSubmit }: { categories: Category[]; currencies: Currency[]; items: RecurringExpense[]; onSubmit: (data: { category_id: number; currency_id: number; name: string; amount_cents: number; amount_type: string; due_date: string }) => void }) {
  const [category, setCategory] = useState(""); const [currency, setCurrency] = useState("1"); const [name, setName] = useState(""); const [amount, setAmount] = useState(""); const [type, setType] = useState("fixed"); const [date, setDate] = useState(today);
  return <FormCard title="Pagos recurrentes" description="Servicios, seguros y cuotas fijas o variables."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ category_id: Number(category), currency_id: Number(currency), name, amount_cents: Math.round(Number(amount) * 100), amount_type: type, due_date: date }); }}><SelectInput label="Categoría" value={category} onChange={setCategory} required><option value="">Elegí una categoría</option><CategoryOptions categories={categories} /></SelectInput><TextInput label="Nombre" placeholder="Seguro del auto" value={name} onChange={setName} required /><MoneyInput label="Monto estimado" value={amount} onChange={setAmount} currencies={currencies} currencyId={currency} onCurrencyChange={setCurrency} required /><SelectInput label="Tipo" value={type} onChange={setType}><option value="fixed">Fijo</option><option value="variable">Variable</option></SelectInput><TextInput label="Vencimiento" type="date" value={date} onChange={setDate} required /><SubmitButton label="Guardar pago" /></form><ItemList items={items.map((item) => `${item.name} · ${formatMoney(item.amount_cents, item.currency_id)} · vence ${item.due_date ?? "sin fecha"}`)} empty="Todavía no hay pagos recurrentes." /></FormCard>;
}

function PlannedForm({ categories, currencies, items, onSubmit }: { categories: Category[]; currencies: Currency[]; items: PlannedExpense[]; onSubmit: (data: { category_id: number; currency_id: number; description: string; estimated_amount_cents: number; target_date: string }) => void }) {
  const [category, setCategory] = useState(""); const [currency, setCurrency] = useState("1"); const [description, setDescription] = useState(""); const [amount, setAmount] = useState(""); const [date, setDate] = useState(today);
  return <FormCard title="Gastos futuros" description="Mantenimientos, cumpleaños y otros planes que querés anticipar."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ category_id: Number(category), currency_id: Number(currency), description, estimated_amount_cents: Math.round(Number(amount) * 100), target_date: date }); }}><SelectInput label="Categoría" value={category} onChange={setCategory} required><option value="">Elegí una categoría</option><CategoryOptions categories={categories} /></SelectInput><TextInput label="Descripción" placeholder="Mantenimiento del auto" value={description} onChange={setDescription} required /><MoneyInput label="Monto estimado" value={amount} onChange={setAmount} currencies={currencies} currencyId={currency} onCurrencyChange={setCurrency} required /><TextInput label="Fecha objetivo" type="date" value={date} onChange={setDate} required /><SubmitButton label="Guardar previsión" /></form><ItemList items={items.map((item) => `${item.description} · ${formatMoney(item.estimated_amount_cents, item.currency_id)} · ${item.target_date}`)} empty="Todavía no hay gastos previstos." /></FormCard>;
}

function TransferForm({ currencies, summary, onSubmit }: { currencies: Currency[]; summary: Summary; onSubmit: (data: { from_allocation_id: number; to_allocation_id: number; amount_cents: number; transferred_on: string }) => void }) {
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [amount, setAmount] = useState("");
  const selectedSource = summary.allocations.find((item) => item.id === Number(from));
  const sourceCurrency = String(selectedSource?.currency_id ?? 1);
  return <FormCard title="Mover dinero entre sobres" description="Reorganizá tu presupuesto sin perder el seguimiento."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ from_allocation_id: Number(from), to_allocation_id: Number(to), amount_cents: Math.round(Number(amount) * 100), transferred_on: today }); }}><SelectInput label="Desde" value={from} onChange={(value) => { setFrom(value); setTo(""); }} required><option value="">Elegí el sobre origen</option>{summary.allocations.map((item) => <option key={item.id} value={item.id}>Sobre {item.category_id} · {formatMoney(item.balance_cents, item.currency_id)}</option>)}</SelectInput><SelectInput label="Hacia" value={to} onChange={setTo} required><option value="">Elegí el sobre destino</option>{summary.allocations.filter((item) => !selectedSource || item.currency_id === selectedSource.currency_id).map((item) => <option key={item.id} value={item.id}>Sobre {item.category_id}</option>)}</SelectInput><MoneyInput label="Monto" value={amount} onChange={setAmount} currencies={currencies} currencyId={sourceCurrency} onCurrencyChange={() => undefined} currencyLocked required /><SubmitButton label="Transferir" /></form></FormCard>;
}

function CategoryForm({ onSubmit }: { onSubmit: (data: { name: string; kind: string; color: string }) => void }) {
  const [name, setName] = useState(""); const [kind, setKind] = useState("variable"); const [color, setColor] = useState("#5B8266");
  return <FormCard title="Nueva categoría" description="Creá un sobre para una necesidad que todavía no esté en tu lista."><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ name, kind, color }); }}><TextInput label="Nombre" placeholder="Mascotas" value={name} onChange={setName} required /><SelectInput label="Tipo" value={kind} onChange={setKind}><option value="fixed">Fijo</option><option value="variable">Variable</option><option value="future">Futuro</option><option value="other">Otro</option></SelectInput><ColorPalette value={color} onChange={setColor} /><SubmitButton label="Crear categoría" /></form></FormCard>;
}

function CurrencyForm({ currencies, onSubmit }: { currencies: Currency[]; onSubmit: (data: { base_currency_id: number; quote_currency_id: number; rate: number; effective_at: string }) => void }) {
  const [base, setBase] = useState("1"); const [quote, setQuote] = useState("2"); const [rate, setRate] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  return <FormCard title="Monedas y cotizaciones" description="Guardá una nueva cotización. Las conversiones siempre usan la última disponible."><div className="currency-list">{currencies.map((currency) => <span key={currency.id} className="currency-chip"><strong>{currency.code}</strong> {currency.symbol} · {currency.name}</span>)}</div><form className="manager-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ base_currency_id: Number(base), quote_currency_id: Number(quote), rate: Number(rate), effective_at: new Date(date).toISOString() }); }}><SelectInput label="Moneda base" value={base} onChange={setBase}>{currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.code} · {currency.name}</option>)}</SelectInput><SelectInput label="Moneda cotizada" value={quote} onChange={setQuote}>{currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.code} · {currency.name}</option>)}</SelectInput><TextInput label="Cotización" type="number" min="0.000001" step="0.000001" placeholder="Ej. 1200" value={rate} onChange={setRate} required /><TextInput label="Vigente desde" type="datetime-local" value={date} onChange={setDate} required /><SubmitButton label="Guardar cotización" /></form></FormCard>;
}

function MercadoPagoForm({ summary, onSubmit }: { summary: Summary; onSubmit: (movementId: number, allocationId: number) => void }) {
  const [movements, setMovements] = useState<Array<{ id: number; description: string; amount_cents: number; linked_expense_id: number | null }>>([]);
  const [reserves, setReserves] = useState<Array<{ id: number; name: string; amount_cents: number; category_id: number | null }>>([]);
  const [allocation, setAllocation] = useState("");
  const [syncing, setSyncing] = useState(false);
  async function loadExternal() { const [movementItems, reserveItems] = await Promise.all([getMercadoPagoMovements(), getMercadoPagoReserves()]); setMovements(movementItems); setReserves(reserveItems); }
  useEffect(() => { void loadExternal().catch(() => undefined); }, []);
  async function synchronize() { setSyncing(true); try { await syncMercadoPago(); await loadExternal(); } finally { setSyncing(false); } }
  return <FormCard title="Mercado Pago" description="Leé movimientos y reservas, y vinculá gastos externos a un sobre interno."><div className="manager-actions"><button className="secondary-button" type="button" onClick={() => void synchronize()} disabled={syncing}>{syncing ? "Sincronizando..." : "Sincronizar ahora"}</button></div><h3 className="external-heading">Reservas</h3><div className="item-list">{reserves.length ? reserves.map((reserve) => <p key={reserve.id}><strong>{reserve.name}</strong> · ${(reserve.amount_cents / 100).toLocaleString("es-AR")}</p>) : <p className="muted">No hay reservas sincronizadas.</p>}</div><h3 className="external-heading">Gastos pendientes de vincular</h3><div className="item-list">{movements.filter((item) => !item.linked_expense_id && item.amount_cents > 0).length ? movements.filter((item) => !item.linked_expense_id && item.amount_cents > 0).map((movement) => <div className="external-movement" key={movement.id}><div><strong>{movement.description}</strong><small>${(movement.amount_cents / 100).toLocaleString("es-AR")}</small></div><SelectInput label="Sobre" value={allocation} onChange={setAllocation}>{summary.allocations.map((item) => <option key={item.id} value={item.id}>Sobre {item.category_id}</option>)}</SelectInput><button className="secondary-button" type="button" disabled={!allocation} onClick={() => onSubmit(movement.id, Number(allocation))}>Vincular</button></div>) : <p className="muted">No hay movimientos externos pendientes o Mercado Pago aún no está sincronizado.</p>}</div></FormCard>;
}

function MoneyInput({ label, value, onChange, currencies, currencyId, onCurrencyChange, currencyLocked = false, required = false }: { label: string; value: string; onChange: (value: string) => void; currencies: Currency[]; currencyId: string; onCurrencyChange: (value: string) => void; currencyLocked?: boolean; required?: boolean }) {
  return <label className="money-field">{label}<span className="money-control"><span className="money-prefix">$</span><input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} required={required} /><select aria-label={`${label} moneda`} value={currencyId} onChange={(event) => onCurrencyChange(event.target.value)} disabled={currencyLocked}>{currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.code}</option>)}</select></span></label>;
}

const BASIC_COLORS = ["#5B8266", "#E07A5F", "#F2CC8F", "#5C7CFA", "#9C6ADE", "#4D908E"];
function ColorPalette({ value, onChange }: { value: string; onChange: (color: string) => void }) { return <fieldset className="color-palette"><legend>Color</legend><div>{BASIC_COLORS.map((color) => <button key={color} className={value === color ? "selected" : ""} type="button" aria-label={`Seleccionar color ${color}`} style={{ background: color }} onClick={() => onChange(color)} />)}</div></fieldset>; }

function FormCard({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <div className="form-card"><h3>{title}</h3><p className="muted">{description}</p>{children}</div>; }
function ItemList({ items, empty }: { items: string[]; empty: string }) { return <div className="item-list">{items.length ? items.map((item) => <p key={item}>{item}</p>) : <p className="muted">{empty}</p>}</div>; }
type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void };
function TextInput({ label, value, onChange, ...props }: TextInputProps) { const id = label.toLowerCase().replaceAll(" ", "-"); return <label className="field">{label}<input id={id} value={value} onChange={(event) => onChange(event.target.value)} {...props} /></label>; }
type SelectInputProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void; children: ReactNode };
function SelectInput({ label, value, onChange, children, ...props }: SelectInputProps) { const id = label.toLowerCase().replaceAll(" ", "-"); return <label className="field">{label}<span className="select-wrap"><select id={id} value={value} onChange={(event) => onChange(event.target.value)} {...props}>{children}</select></span></label>; }
function SubmitButton({ label }: { label: string }) { return <button className="primary-button form-submit" type="submit">{label}<span>→</span></button>; }
function formatMoney(cents: number, currencyId = 1) { return `${currencyId === 2 ? "US$" : "$"}${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(cents / 100)}`; }
