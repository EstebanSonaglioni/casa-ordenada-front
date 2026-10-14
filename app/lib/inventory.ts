import { authorizedFetch } from "./auth";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });

export type InventoryCategory = { id: number; name: string; color: string | null; icon: string };
export type InventorySubcategory = { id: number; inventory_category_id: number; name: string; icon: string };
export type StorageLocation = { id: number; name: string; kind: string };
export type Product = { id: number; inventory_category_id: number; inventory_subcategory_id: number | null; name: string; brand: string; default_unit: string; is_active: boolean };
export type InventoryItem = { id: number; product_id: number; product_name: string; storage_location_id: number; storage_location_name: string; quantity_initial: string; quantity_remaining: string; quantity_opened: string; unit: string; purchased_on: string; expires_on: string | null; opened_on: string | null; status: string; expiry_status: string };
export type ShoppingItem = { id: number; requested_name: string; product_id: number | null; quantity_requested: string; quantity_remaining: string; unit: string; priority: string; status: string; note: string | null };
export type ShoppingList = { id: number; name: string; status: string; items: ShoppingItem[] };
export type Purchase = { id: number; expense_id: number; total_amount_cents: number; currency_id: number; purchased_on: string; store: string | null; items: Array<{ exact_name: string; product_id: number; quantity: string; unit: string; total_price_cents: number; inventory_category_id: number; inventory_subcategory_id: number | null }> };

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await authorizedFetch(path, { ...init, headers: { ...authHeaders(), ...init.headers } });
  return response.json() as Promise<T>;
}

export const getInventoryCategories = () => request<InventoryCategory[]>("/api/v1/inventory/categories");
export const updateInventoryCategory = (id: number, data: { icon?: string; color?: string }) => request<InventoryCategory>(`/api/v1/inventory/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const getInventorySubcategories = (categoryId: number) => request<InventorySubcategory[]>(`/api/v1/inventory/categories/${categoryId}/subcategories`);
export const createInventorySubcategory = (categoryId: number, data: { name: string; icon: string }) => request<InventorySubcategory>(`/api/v1/inventory/categories/${categoryId}/subcategories`, { method: "POST", body: JSON.stringify(data) });
export const getStorageLocations = () => request<StorageLocation[]>("/api/v1/inventory/locations");
export const getProducts = () => request<Product[]>("/api/v1/inventory/products");
export const getInventoryItems = (expiring = false) => request<InventoryItem[]>(expiring ? "/api/v1/inventory/expiring" : "/api/v1/inventory/items");
export const getShoppingList = () => request<ShoppingList>("/api/v1/inventory/shopping-list");
export const createProduct = (data: { inventory_category_id: number; inventory_subcategory_id?: number | null; name: string; brand?: string; default_unit?: string }) => request<Product>("/api/v1/inventory/products", { method: "POST", body: JSON.stringify(data) });
export const createInventoryItem = (data: { product_id: number; storage_location_id: number; quantity: string; unit: string; purchased_on: string; expires_on?: string }) => request<InventoryItem>("/api/v1/inventory/items", { method: "POST", body: JSON.stringify(data) });
export const updateInventoryItem = (id: number, data: { opened?: boolean; open_quantity?: string }) => request<InventoryItem>(`/api/v1/inventory/items/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const consumeInventoryItem = (id: number, data: { quantity: string; occurred_on: string }) => request<InventoryItem>(`/api/v1/inventory/items/${id}/consume`, { method: "POST", body: JSON.stringify(data) });
export const addShoppingItem = (data: { requested_name: string; quantity_requested: string; unit: string; priority: string }) => request<ShoppingItem>("/api/v1/inventory/shopping-list/items", { method: "POST", body: JSON.stringify(data) });
export const checkoutInventory = (data: unknown) => request<{ id: number }>("/api/v1/inventory/checkout", { method: "POST", body: JSON.stringify(data) });
export const getPurchases = (filters: { product_id?: number; inventory_category_id?: number; from_date?: string; to_date?: string } = {}) => {
  const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, String(value)); });
  return request<Purchase[]>(`/api/v1/inventory/purchases?${query}`);
};
export const updatePurchase = (id: number, data: { purchased_on?: string; store?: string }) => request<Purchase>(`/api/v1/inventory/purchases/${id}`, { method: "PATCH", body: JSON.stringify(data) });
