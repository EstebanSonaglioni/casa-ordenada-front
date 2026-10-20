"use client";

import { FormEvent, useEffect, useState } from "react";

import { AppHeader } from "../components/AppHeader";
import { useToast } from "../components/ToastProvider";
import { createPeriod, getPeriods, getSummary, Summary } from "../lib/auth";
import {
  addShoppingItem,
  checkoutInventory,
  consumeInventoryItem,
  createInventoryItem,
  createInventorySubcategory,
  createProduct,
  getInventoryCategories,
  getInventoryItems,
  getInventorySubcategories,
  getProducts,
  getPurchases,
  getShoppingList,
  getStorageLocations,
  InventoryCategory,
  InventoryItem,
  InventorySubcategory,
  Product,
  Purchase,
  ShoppingList,
  StorageLocation,
  updateInventoryCategory,
  updateInventoryItem,
  updatePurchase,
} from "../lib/inventory";

type Tab = "stock" | "expiring" | "shopping" | "history";
const today = new Date().toISOString().slice(0, 10);
const units = ["unit", "kg", "g", "l", "ml", "box", "pack"];
const icons = ["food", "clean", "hygiene", "baby", "medicine", "drink", "other"];

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("stock");
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [subcategories, setSubcategories] = useState<InventorySubcategory[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [expiring, setExpiring] = useState<InventoryItem[]>([]);
  const [shopping, setShopping] = useState<ShoppingList | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [error, setError] = useState("");
  const showToast = useToast();

  async function load() {
    try {
      const [categoryItems, locationItems, productItems, inventoryItems, expiringItems, shoppingList, periods] = await Promise.all([
        getInventoryCategories(), getStorageLocations(), getProducts(), getInventoryItems(), getInventoryItems(true), getShoppingList(), getPeriods(),
      ]);
      const subtypeGroups = await Promise.all(categoryItems.map((category) => getInventorySubcategories(category.id)));
      const now = new Date();
      const period = periods.find((item) => item.year === now.getFullYear() && item.month === now.getMonth() + 1) ?? await createPeriod(now.getFullYear(), now.getMonth() + 1);
      setCategories(categoryItems); setSubcategories(subtypeGroups.flat()); setLocations(locationItems); setProducts(productItems); setItems(inventoryItems); setExpiring(expiringItems); setShopping(shoppingList); setSummary(await getSummary(period.id));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No pudimos cargar el inventario"); }
  }

  useEffect(() => { void load(); }, []);

  async function action(work: () => Promise<unknown>, success: string) {
    setError("");
    try { await work(); await load(); showToast(success); } catch (actionError) { const message = actionError instanceof Error ? actionError.message : "No pudimos guardar los cambios"; setError(message); showToast(message, "error"); }
  }

  return <main className="dashboard-shell inventory-shell"><AppHeader /><section className="dashboard-content"><div className="welcome-row"><div><span className="eyebrow">Casa en orden</span><h1>Inventario</h1><p className="muted">Existencias, vencimientos, compras e historial.</p></div></div><nav className="economy-nav" aria-label="Secciones de inventario"><TabButton active={tab === "stock"} onClick={() => setTab("stock")}>Existencias</TabButton><TabButton active={tab === "expiring"} onClick={() => setTab("expiring")}>Vencimientos</TabButton><TabButton active={tab === "shopping"} onClick={() => setTab("shopping")}>Compras</TabButton><TabButton active={tab === "history"} onClick={() => setTab("history")}>Historial</TabButton></nav>{error && <p className="error" role="alert">{error}</p>}{tab === "stock" && <StockTab categories={categories} subcategories={subcategories} locations={locations} products={products} items={items} onAction={action} />}{tab === "expiring" && <ItemsTable items={expiring} products={products} categories={categories} showActions={false} onAction={action} />}{tab === "shopping" && summary && <><ShoppingTab categories={categories} locations={locations} items={shopping?.items ?? []} summary={summary} onAction={action} /><MassPurchasePanel categories={categories} locations={locations} summary={summary} onAction={action} /></>}{tab === "history" && <PurchaseHistory categories={categories} products={products} purchases={purchases} setPurchases={setPurchases} onAction={action} />}</section></main>;
}

function StockTab({ categories, subcategories, locations, products, items, onAction }: { categories: InventoryCategory[]; subcategories: InventorySubcategory[]; locations: StorageLocation[]; products: Product[]; items: InventoryItem[]; onAction: (work: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [categoryFilter, setCategoryFilter] = useState(""); const [stockOnly, setStockOnly] = useState(true);
  const [productName, setProductName] = useState(""); const [productCategory, setProductCategory] = useState(""); const [productSubtype, setProductSubtype] = useState("");
  const [product, setProduct] = useState(""); const [location, setLocation] = useState(""); const [quantity, setQuantity] = useState(""); const [unit, setUnit] = useState("unit"); const [expiration, setExpiration] = useState("");
  const [newSubtype, setNewSubtype] = useState(""); const [icon, setIcon] = useState("other"); const [categoryIcon, setCategoryIcon] = useState("other");
  const visible = items.filter((item) => (!stockOnly || !["depleted", "discarded"].includes(item.status)) && (!categoryFilter || products.find((product) => product.id === item.product_id)?.inventory_category_id === Number(categoryFilter)));
  return <><div className="inventory-columns"><section className="dashboard-panel"><span className="eyebrow">Catálogo</span><h2>Producto y subtipo</h2><form className="inventory-form" onSubmit={(event) => { event.preventDefault(); void onAction(() => createProduct({ name: productName, inventory_category_id: Number(productCategory), inventory_subcategory_id: productSubtype ? Number(productSubtype) : null, default_unit: unit }), "Producto agregado al catálogo."); }}><CategorySelect categories={categories} value={productCategory} onChange={(value) => { setProductCategory(value); setProductSubtype(""); setCategoryIcon(categories.find((item) => item.id === Number(value))?.icon ?? "other"); }} required /><FieldSelect label="Subtipo" value={productSubtype} onChange={setProductSubtype} options={subcategories.filter((item) => item.inventory_category_id === Number(productCategory)).map((item) => [item.id, item.name])} /><FieldInput label="Nombre" value={productName} onChange={setProductName} required /><UnitSelect value={unit} onChange={setUnit} /><button className="secondary-button" type="submit">Agregar producto</button></form><form className="inline-form" onSubmit={(event) => { event.preventDefault(); if (!productCategory) return; void onAction(() => createInventorySubcategory(Number(productCategory), { name: newSubtype, icon }), "Subtipo agregado."); }}><FieldInput label="Nuevo subtipo" value={newSubtype} onChange={setNewSubtype} required /><IconSelect value={icon} onChange={setIcon} /><button className="text-button" type="submit">Agregar subtipo</button></form><form className="inline-form" onSubmit={(event) => { event.preventDefault(); if (!productCategory) return; void onAction(() => updateInventoryCategory(Number(productCategory), { icon: categoryIcon }), "Icono de categoría actualizado."); }}><span className="muted">Icono de categoría</span><IconSelect value={categoryIcon} onChange={setCategoryIcon} /><button className="text-button" type="submit">Guardar icono</button></form></section><section className="dashboard-panel"><span className="eyebrow">Carga manual</span><h2>Agregar existencia</h2><form className="inventory-form" onSubmit={(event) => { event.preventDefault(); void onAction(() => createInventoryItem({ product_id: Number(product), storage_location_id: Number(location), quantity, unit, purchased_on: today, expires_on: expiration || undefined }), "Existencia agregada."); }}><FieldSelect label="Producto" value={product} onChange={setProduct} options={products.map((item) => [item.id, item.name])} required /><FieldSelect label="Ubicación" value={location} onChange={setLocation} options={locations.map((item) => [item.id, item.name])} required /><FieldInput label="Cantidad" value={quantity} onChange={setQuantity} type="number" required /><UnitSelect value={unit} onChange={setUnit} /><FieldInput label="Vencimiento" value={expiration} onChange={setExpiration} type="date" /><button className="secondary-button" type="submit">Agregar existencia</button></form></section></div><section className="dashboard-panel inventory-table-panel"><div className="panel-heading"><div><span className="eyebrow">Existencias</span><h2>Productos en casa</h2></div><div className="inventory-filters"><CategorySelect categories={categories} value={categoryFilter} onChange={setCategoryFilter} blankLabel="Todas las categorías" /><label className="checkbox-label"><input type="checkbox" checked={stockOnly} onChange={(event) => setStockOnly(event.target.checked)} /> Solo en stock</label></div></div><ItemsTable items={visible} products={products} categories={categories} showActions onAction={onAction} /></section></>;
}

function ShoppingTab({ categories, locations, items, summary, onAction }: { categories: InventoryCategory[]; locations: StorageLocation[]; items: ShoppingList["items"]; summary: Summary; onAction: (work: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [requested, setRequested] = useState(""); const [quantity, setQuantity] = useState("1"); const [unit, setUnit] = useState("unit"); const [selected, setSelected] = useState(""); const [exactName, setExactName] = useState(""); const [category, setCategory] = useState(""); const [location, setLocation] = useState(""); const [price, setPrice] = useState(""); const [allocation, setAllocation] = useState(""); const [store, setStore] = useState(""); const [bulk, setBulk] = useState("");
  function checkoutItems(lines: Array<{ exact_name: string; quantity: string; unit: string; total_price_cents: number; inventory_category_id: number; storage_location_id: number; shopping_item_id?: number }>) { const total = lines.reduce((sum, item) => sum + item.total_price_cents, 0); return checkoutInventory({ planning_period_id: summary.period.id, currency_id: 1, purchased_on: today, store, items: lines.map((item) => ({ ...item, unit_price_cents: item.total_price_cents })), allocations: [{ allocation_id: Number(allocation), amount_cents: total }] }); }
  return <div className="inventory-columns"><section className="dashboard-panel"><span className="eyebrow">Pendientes</span><h2>Lista de compras</h2><form className="inventory-form" onSubmit={(event) => { event.preventDefault(); void onAction(() => addShoppingItem({ requested_name: requested, quantity_requested: quantity, unit, priority: "normal" }), "Agregado a la lista."); }}><FieldInput label="Qué falta" value={requested} onChange={setRequested} required /><FieldInput label="Cantidad" value={quantity} onChange={setQuantity} type="number" required /><UnitSelect value={unit} onChange={setUnit} /><button className="secondary-button" type="submit">Agregar a compras</button></form><table className="data-table"><thead><tr><th>Producto</th><th>Cantidad</th><th></th></tr></thead><tbody>{items.filter((item) => item.status === "pending").map((item) => <tr key={item.id}><td>{item.requested_name}</td><td>{item.quantity_remaining} {item.unit}</td><td><button className="text-button" type="button" onClick={() => { setSelected(String(item.id)); setExactName(item.requested_name); setQuantity(item.quantity_remaining); setUnit(item.unit); }}>Comprar</button></td></tr>)}</tbody></table></section><section className="dashboard-panel"><span className="eyebrow">Compra individual</span><h2>Registrar compra</h2><form className="inventory-form" onSubmit={(event) => { event.preventDefault(); const cents = Math.round(Number(price) * 100); void onAction(() => checkoutItems([{ shopping_item_id: selected ? Number(selected) : undefined, exact_name: exactName, inventory_category_id: Number(category), quantity, unit, total_price_cents: cents, storage_location_id: Number(location) }]), "Compra registrada e inventario actualizado."); }}><FieldInput label="Producto exacto" value={exactName} onChange={setExactName} required /><CategorySelect categories={categories} value={category} onChange={setCategory} required /><FieldSelect label="Ubicación" value={location} onChange={setLocation} options={locations.map((item) => [item.id, item.name])} required /><FieldInput label="Cantidad" value={quantity} onChange={setQuantity} type="number" required /><UnitSelect value={unit} onChange={setUnit} /><FieldInput label="Precio total" value={price} onChange={setPrice} type="number" required /><FieldInput label="Comercio" value={store} onChange={setStore} /><FieldSelect label="Sobre de pago" value={allocation} onChange={setAllocation} options={summary.allocations.map((item) => [item.id, `Sobre ${item.category_id}`])} required /><button className="primary-button" type="submit">Completar compra <span>→</span></button></form></section><section className="dashboard-panel bulk-panel"><span className="eyebrow">Compra masiva</span><h2>Cargar varios productos</h2><p className="muted">Una línea por producto: nombre | cantidad | unidad | precio total.</p><textarea value={bulk} onChange={(event) => setBulk(event.target.value)} placeholder="Leche | 2 | l | 2400&#10;Detergente | 1 | unit | 1800" /><div className="inventory-form"><CategorySelect categories={categories} value={category} onChange={setCategory} required /><FieldSelect label="Ubicación" value={location} onChange={setLocation} options={locations.map((item) => [item.id, item.name])} required /><FieldInput label="Comercio" value={store} onChange={setStore} /><FieldSelect label="Sobre de pago" value={allocation} onChange={setAllocation} options={summary.allocations.map((item) => [item.id, `Sobre ${item.category_id}`])} required /><button className="primary-button" type="button" onClick={() => { const lines = bulk.split("\n").filter(Boolean).map((line) => { const [name, amount, lineUnit, linePrice] = line.split("|").map((item) => item.trim()); return { exact_name: name, quantity: amount, unit: lineUnit || "unit", total_price_cents: Math.round(Number(linePrice) * 100), inventory_category_id: Number(category), storage_location_id: Number(location) }; }); void onAction(() => checkoutItems(lines), "Compra masiva registrada."); }}>Registrar compra masiva <span>→</span></button></div></section></div>;
}

function MassPurchasePanel({ categories, locations, summary, onAction }: { categories: InventoryCategory[]; locations: StorageLocation[]; summary: Summary; onAction: (work: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [bulk, setBulk] = useState(""); const [store, setStore] = useState("");
  function categoryForName(name: string) { return categories.find((item) => item.name.toLowerCase() === name.toLowerCase())?.id; }
  function allocationForName(name: string) { return summary.allocations.find((item) => categories.find((category) => category.id === item.category_id)?.name.toLowerCase() === name.toLowerCase())?.id ?? Number(name); }
  function submit() {
    const rows = bulk.split("\n").filter(Boolean).map((row) => {
      const [exact_name, quantity, unit, price, categoryName, locationName, allocationName] = row.split("|").map((item) => item.trim());
      const categoryId = categoryForName(categoryName);
      const locationId = locations.find((item) => item.name.toLowerCase() === locationName.toLowerCase())?.id;
      const allocationId = allocationForName(allocationName);
      if (!exact_name || !quantity || !price || !categoryId || !locationId || !allocationId) throw new Error("Cada línea debe incluir producto, cantidad, unidad, precio, categoría, ubicación y sobre");
      return { exact_name, quantity, unit: unit || "unit", total_price_cents: Math.round(Number(price) * 100), inventory_category_id: categoryId, storage_location_id: locationId, allocation_id: allocationId };
    });
    const totals = new Map<number, number>();
    rows.forEach((row) => totals.set(row.allocation_id, (totals.get(row.allocation_id) ?? 0) + row.total_price_cents));
    const allocations = Array.from(totals, ([allocation_id, amount_cents]) => ({ allocation_id, amount_cents }));
    return checkoutInventory({ planning_period_id: summary.period.id, currency_id: 1, purchased_on: today, store, items: rows.map(({ allocation_id, ...item }) => ({ ...item, unit_price_cents: item.total_price_cents })), allocations });
  }
  return <section className="dashboard-panel bulk-panel"><span className="eyebrow">Compra masiva por línea</span><h2>Varias categorías y sobres</h2><p className="muted">Formato: producto | cantidad | unidad | precio total | categoría | ubicación | sobre.</p><textarea value={bulk} onChange={(event) => setBulk(event.target.value)} placeholder="Leche | 2 | l | 2400 | Alimentos | Heladera | 12&#10;Detergente | 1 | unit | 1800 | Limpieza | Lavadero | 15" /><div className="inline-form"><FieldInput label="Comercio" value={store} onChange={setStore} /><button className="primary-button" type="button" onClick={() => void onAction(submit, "Compra masiva registrada.")}>Registrar compra masiva <span>→</span></button></div></section>;
}

function PurchaseHistory({ categories, products, purchases, setPurchases, onAction }: { categories: InventoryCategory[]; products: Product[]; purchases: Purchase[]; setPurchases: (items: Purchase[]) => void; onAction: (work: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [product, setProduct] = useState(""); const [category, setCategory] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [editing, setEditing] = useState<number | null>(null); const [store, setStore] = useState(""); const [purchaseDate, setPurchaseDate] = useState("");
  useEffect(() => { void getPurchases().then(setPurchases); }, [setPurchases]);
  async function search() { await onAction(async () => { setPurchases(await getPurchases({ product_id: product ? Number(product) : undefined, inventory_category_id: category ? Number(category) : undefined, from_date: from || undefined, to_date: to || undefined })); }, "Historial actualizado."); }
  return <section className="dashboard-panel inventory-table-panel"><div className="panel-heading"><div><span className="eyebrow">Compras realizadas</span><h2>Historial</h2></div></div><div className="history-filters"><FieldSelect label="Producto" value={product} onChange={setProduct} options={products.map((item) => [item.id, item.name])} /><CategorySelect categories={categories} value={category} onChange={setCategory} blankLabel="Todas las categorías" /><FieldInput label="Desde" value={from} onChange={setFrom} type="date" /><FieldInput label="Hasta" value={to} onChange={setTo} type="date" /><button className="secondary-button" type="button" onClick={() => void search()}>Filtrar</button></div><table className="data-table purchases-table"><thead><tr><th>Fecha</th><th>Comercio</th><th>Productos</th><th>Total</th><th></th></tr></thead><tbody>{purchases.map((purchase) => <tr key={purchase.id}><td>{editing === purchase.id ? <input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} /> : purchase.purchased_on}</td><td>{editing === purchase.id ? <input value={store} onChange={(event) => setStore(event.target.value)} /> : purchase.store ?? "Sin comercio"}</td><td>{purchase.items.map((item) => `${item.exact_name} (${item.quantity} ${item.unit})`).join(", ")}</td><td>${(purchase.total_amount_cents / 100).toLocaleString("es-AR")}</td><td>{editing === purchase.id ? <button className="text-button" type="button" onClick={() => { void onAction(() => updatePurchase(purchase.id, { store, purchased_on: purchaseDate }), "Compra actualizada."); setEditing(null); }}>Guardar</button> : <button className="text-button" type="button" onClick={() => { setEditing(purchase.id); setStore(purchase.store ?? ""); setPurchaseDate(purchase.purchased_on); }}>Editar</button>}</td></tr>)}</tbody></table>{!purchases.length && <Empty text="Aplicá un filtro para consultar compras realizadas." />}</section>;
}

function ItemsTable({ items, products, categories, showActions, onAction }: { items: InventoryItem[]; products: Product[]; categories: InventoryCategory[]; showActions: boolean; onAction: (work: () => Promise<unknown>, success: string) => Promise<void> }) {
  if (!items.length) return <Empty text="No hay existencias para estos filtros." />;
  return <table className="data-table"><thead><tr><th>Producto</th><th>Categoría</th><th>Ubicación</th><th>Stock</th><th>Estado</th><th>Vencimiento</th>{showActions && <th>Acciones</th>}</tr></thead><tbody>{items.map((item) => <InventoryRow key={item.id} item={item} category={categories.find((entry) => entry.id === products.find((product) => product.id === item.product_id)?.inventory_category_id)} showActions={showActions} onAction={onAction} />)}</tbody></table>;
}

function InventoryRow({ item, category, showActions, onAction }: { item: InventoryItem; category: InventoryCategory | undefined; showActions: boolean; onAction: (work: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [openQuantity, setOpenQuantity] = useState("1");
  const unitIsCount = item.unit === "unit";
  return <tr><td>{item.product_name}</td><td>{category ? <span className="category-cell">{iconFor(category.icon)} {category.name}</span> : "-"}</td><td>{item.storage_location_name}</td><td>{item.quantity_remaining} {item.unit}</td><td>{item.opened_on ? `${item.quantity_opened} abierto` : "Cerrado"}</td><td><span className={`inventory-status ${item.expiry_status}`}>{expiryLabel(item.expiry_status)}</span></td>{showActions && <td><div className="inventory-actions">{item.opened_on ? <button className="inventory-action-button" type="button" onClick={() => void onAction(() => updateInventoryItem(item.id, { opened: false }), "Producto marcado como cerrado.")}>Cerrar</button> : <>{unitIsCount && <input className="action-quantity" type="number" min="1" max={item.quantity_remaining} value={openQuantity} onChange={(event) => setOpenQuantity(event.target.value)} />}<button className="inventory-action-button" type="button" onClick={() => void onAction(() => updateInventoryItem(item.id, unitIsCount ? { open_quantity: openQuantity } : { opened: true }), "Producto abierto.")}>Abrir</button></>}<button className="inventory-action-button secondary" type="button" onClick={() => void onAction(() => consumeInventoryItem(item.id, { quantity: "1", occurred_on: today }), "Consumo registrado.")}>Consumir 1</button></div></td>}</tr>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button className={active ? "active" : ""} type="button" onClick={onClick}>{children}</button>; }
function FieldInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="field">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></label>; }
function FieldSelect({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (value: string) => void; options: Array<[number, string]>; required?: boolean }) { return <label className="field">{label}<span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)} required={required}><option value="">Elegí una opción</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></span></label>; }
function CategorySelect({ categories, value, onChange, required = false, blankLabel = "Elegí una categoría" }: { categories: InventoryCategory[]; value: string; onChange: (value: string) => void; required?: boolean; blankLabel?: string }) { return <label className="field">Categoría<span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)} required={required}><option value="">{blankLabel}</option>{categories.map((item) => <option key={item.id} value={item.id}>{iconFor(item.icon)} {item.name}</option>)}</select></span></label>; }
function UnitSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label className="field">Unidad<span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)}>{units.map((item) => <option key={item} value={item}>{item}</option>)}</select></span></label>; }
function IconSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label className="field">Icono<span className="select-wrap"><select value={value} onChange={(event) => onChange(event.target.value)}>{icons.map((item) => <option key={item} value={item}>{iconFor(item)} {item}</option>)}</select></span></label>; }
function Empty({ text }: { text: string }) { return <div className="empty-state"><strong>Sin datos por ahora</strong><span>{text}</span></div>; }
function expiryLabel(status: string) { return ({ fresh: "Vigente", near_expiry: "Vence pronto", due_soon: "Vence en 3 días", expired: "Vencido", no_expiry: "Sin vencimiento", depleted: "Agotado", discarded: "Descartado" } as Record<string, string>)[status] ?? status; }
function iconFor(icon: string) { return ({ food: "🍎", clean: "🧼", hygiene: "🧴", baby: "🍼", medicine: "💊", drink: "🥤", other: "📦" } as Record<string, string>)[icon] ?? "📦"; }
