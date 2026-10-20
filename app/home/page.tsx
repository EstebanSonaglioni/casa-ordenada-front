"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Link from "next/link";
import { AppHeader } from "../components/AppHeader";
import {
  CalendarEvent,
  createPeriod,
  Currency,
  getCalendarEvents,
  getCurrencies,
  getPeriods,
  getSummary,
  Summary,
  getHouseholds,
} from "../lib/auth";
import { getInventoryItems, InventoryItem } from "../lib/inventory";
import { getSessionValue } from "../lib/session";

export default function HomePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [payments, setPayments] = useState<CalendarEvent[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryItem[]>([]);
  const [username, setUsername] = useState("amigo");
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([getSessionValue("access_token"), getSessionValue("username")]).then(([token, savedUsername]) => {
      if (!token) {
        router.replace("/");
        return;
      }
      setUsername(savedUsername ?? "amigo");
      void getHouseholds().then((households) => { if (!households.length) { router.replace("/onboarding"); return; } void load(); });
    });
  }, [router]);

  async function load() {
    try {
      const now = new Date();
      const [periods, currencyItems, calendarItems, expiringItems] = await Promise.all([
        getPeriods(),
        getCurrencies(),
        getCalendarEvents(now.getFullYear(), now.getMonth() + 1),
        getInventoryItems(true),
      ]);
      const period = periods.find((item) => item.year === now.getFullYear() && item.month === now.getMonth() + 1) ?? await createPeriod(now.getFullYear(), now.getMonth() + 1);
      setSummary(await getSummary(period.id));
      setCurrencies(currencyItems);
      setPayments(calendarItems.filter((item) => item.status !== "paid").slice(0, 3));
      setInventoryAlerts(expiringItems.slice(0, 3));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar el resumen del hogar");
    }
  }

  return <main className="dashboard-shell home-shell">
    <AppHeader />
    <section className="dashboard-content">
      <div className="welcome-row"><div><span className="eyebrow">Resumen de tu hogar</span><h1>Hola, {username}.</h1><p className="muted">Esto es lo importante para hoy.</p></div></div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="home-metrics">
        <article className="metric-card"><span>Pagos pendientes</span><strong>{payments.length}</strong><small>Para revisar este mes</small></article>
        <article className="metric-card"><span>Alertas de inventario</span><strong>{inventoryAlerts.length}</strong><small>Productos próximos a vencer</small></article>
      </div>
      <div className="home-grid">
        <section className="dashboard-panel home-panel"><div className="panel-heading"><div><span className="eyebrow">Economía</span><h2>Próximos eventos</h2></div><Link className="text-link" href="/dashboard">Ver calendario</Link></div>{payments.length ? payments.map((payment) => <div className="home-row" key={payment.id}><div><span className={`home-indicator ${payment.status}`} /><strong>{payment.title}</strong><small>Vence {formatDate(payment.due_date)}</small></div><b>{payment.amount_cents !== null && payment.currency_id !== null ? money(payment.amount_cents, payment.currency_id, currencies) : "Evento"}</b></div>) : <Empty text="No hay pagos ni eventos próximos." />}</section>
        <section className="dashboard-panel home-panel"><div className="panel-heading"><div><span className="eyebrow">Inventario</span><h2>Para revisar</h2></div><Link className="text-link" href="/inventory">Ver inventario</Link></div>{inventoryAlerts.length ? inventoryAlerts.map((item) => <div className="home-row" key={item.id}><div><span className={`home-indicator ${item.expiry_status}`} /><strong>{item.product_name}</strong><small>{item.storage_location_name} · {item.expires_on ? `vence ${formatDate(item.expires_on)}` : "sin vencimiento"}</small></div><b>{item.quantity_remaining} {item.unit}</b></div>) : <Empty text="No hay productos próximos a vencer." />}</section>
      </div>
      <div className="home-actions"><Link className="home-action" href="/dashboard"><span>$</span><div><strong>Organizar economía</strong><small>Sobres, pagos y movimientos</small></div></Link><Link className="home-action" href="/inventory"><span>+</span><div><strong>Revisar inventario</strong><small>Existencias y compras pendientes</small></div></Link></div>
    </section>
  </main>;
}

function Empty({ text }: { text: string }) { return <p className="muted home-empty">{text}</p>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`)); }
function money(cents: number, currencyId: number, currencies: Currency[]) { const currency = currencies.find((item) => item.id === currencyId); return `${currency?.symbol ?? "$"}${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(cents / 100)}`; }
