import { getSessionValue, removeSessionValue, setSessionValue } from "./session";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  username: string;
  role: string;
};

export type Allocation = {
  id: number;
  category_id: number;
  currency_id: number;
  planned_amount_cents: number;
  reserved_amount_cents: number;
  spent_amount_cents: number;
  balance_cents: number;
};

export type Summary = {
  period: { id: number; year: number; month: number; status: string };
  base_currency_id: number;
  income_cents: number;
  committed_cents: number;
  allocated_cents: number;
  reserved_future_cents: number;
  spent_cents: number;
  balance_cents: number;
  allocations: Allocation[];
};

export type Category = { id: number; name: string; kind: string; color: string | null; icon: string | null; is_active: boolean };
export type Currency = { id: number; code: string; name: string; symbol: string; decimal_places: number; is_active: boolean };
export type Movement = {
  id: string;
  kind: "allocation" | "income" | "expense" | "transfer";
  direction: "in" | "out";
  movement_date: string;
  title: string;
  amount_cents: number;
  currency_id: number;
  period_id: number;
  allocation_id: number | null;
  category_id: number | null;
};
export type CalendarEvent = {
  id: string;
  kind: "recurring" | "planned" | "manual";
  due_date: string;
  title: string;
  amount_cents: number | null;
  currency_id: number | null;
  category_id: number | null;
  source_id: number;
  status: "pending" | "due_soon" | "overdue" | "paid" | "scheduled";
  notes: string | null;
};
export type MercadoPagoMovement = { id: number; external_id: string; movement_type: string; direction: string; status: string; amount_cents: number; currency_id: number; description: string; occurred_at: string; linked_expense_id: number | null };
export type MercadoPagoReserve = { id: number; external_id: string; name: string; amount_cents: number; currency_id: number; status: string; category_id: number | null };

export async function login(username: string, password: string) {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Usuario o contraseña inválidos");
  }

  const tokens = (await response.json()) as TokenResponse;
  await Promise.all([
    setSessionValue("access_token", tokens.access_token),
    setSessionValue("refresh_token", tokens.refresh_token),
    setSessionValue("username", tokens.username),
    setSessionValue("role", tokens.role),
  ]);
  return tokens;
}

export async function register(username: string, displayName: string, password: string) {
  const response = await fetch(`${apiUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, display_name: displayName, password }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "No pudimos crear la cuenta");
  }
  const tokens = (await response.json()) as TokenResponse;
  await Promise.all([
    setSessionValue("access_token", tokens.access_token),
    setSessionValue("refresh_token", tokens.refresh_token),
    setSessionValue("username", tokens.username),
    setSessionValue("role", tokens.role),
    setSessionValue("display_name", displayName),
  ]);
  return tokens;
}

export type Household = { id: number; name: string; role: "owner" | "member" };
export type HouseholdMember = { user_id: number; username: string; display_name: string; role: "owner" | "member" };
export type Invitation = { id: number; household_id: number; household_name: string; invited_username: string; invited_by_username: string; role: "owner" | "member"; status: string; created_at: string; expires_at: string; responded_at: string | null };

export async function getHouseholds() {
  const response = await authorizedFetch("/api/v1/households");
  const households = await response.json() as Household[];
  const current = await getSessionValue("active_household_id");
  if (!current && households[0]) await setSessionValue("active_household_id", String(households[0].id));
  return households;
}

export async function setActiveHousehold(householdId: number) {
  await setSessionValue("active_household_id", String(householdId));
}

export async function createHousehold(name: string) {
  const response = await authorizedFetch("/api/v1/households", { method: "POST", body: JSON.stringify({ name }) });
  const household = await response.json() as Household;
  await setActiveHousehold(household.id);
  return household;
}

export async function getHouseholdMembers(householdId: number) {
  const response = await authorizedFetch(`/api/v1/households/${householdId}/members`);
  return response.json() as Promise<HouseholdMember[]>;
}

export async function inviteToHousehold(householdId: number, username: string, role: "owner" | "member") {
  const response = await authorizedFetch(`/api/v1/households/${householdId}/invitations`, { method: "POST", body: JSON.stringify({ username, role }) });
  return response.json() as Promise<Invitation>;
}

export async function getInvitations(history = false) {
  const response = await authorizedFetch(history ? "/api/v1/invitations/history" : "/api/v1/invitations");
  return response.json() as Promise<Invitation[]>;
}

export async function respondToInvitation(id: number, action: "accept" | "reject") {
  const response = await authorizedFetch(`/api/v1/invitations/${id}/${action}`, { method: "POST" });
  return response.json() as Promise<Invitation>;
}

export async function refreshAccessToken() {
  const refreshToken = await getSessionValue("refresh_token");
  if (!refreshToken) {
    throw new Error("No hay refresh token disponible");
  }

  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    await Promise.all([removeSessionValue("access_token"), removeSessionValue("refresh_token")]);
    throw new Error("La sesión expiró");
  }

  const tokens = (await response.json()) as TokenResponse;
  await Promise.all([
    setSessionValue("access_token", tokens.access_token),
    setSessionValue("refresh_token", tokens.refresh_token),
    setSessionValue("username", tokens.username),
    setSessionValue("role", tokens.role),
  ]);
  return tokens;
}

export function logout() {
  void Promise.all(["access_token", "refresh_token", "username", "role", "display_name", "active_household_id"].map(removeSessionValue));
}

export async function authorizedFetch(path: string, init: RequestInit = {}) {
  const accessToken = await getSessionValue("access_token");
  const activeHouseholdId = await getSessionValue("active_household_id");
  const requestHeaders = new Headers(init.headers);
  if (!(init.body instanceof FormData)) requestHeaders.set("Content-Type", "application/json");
  if (accessToken) requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  if (activeHouseholdId) requestHeaders.set("X-Household-ID", activeHouseholdId);
  let response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: requestHeaders,
  });
  if (response.status === 401) {
    await refreshAccessToken();
    const refreshedToken = await getSessionValue("access_token");
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: (() => { const headers = new Headers(init.headers); if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json"); if (refreshedToken) headers.set("Authorization", `Bearer ${refreshedToken}`); if (activeHouseholdId) headers.set("X-Household-ID", activeHouseholdId); return headers; })(),
    });
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
    const detail = payload?.detail;
    const message = typeof detail === "string" ? detail : detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string" ? `${detail.message}${"fields" in detail && Array.isArray(detail.fields) ? ` Campos faltantes: ${detail.fields.join(", ")}.` : ""}` : detail ? JSON.stringify(detail) : "No pudimos cargar la información";
    throw new Error(message);
  }
  return response;
}

export async function getPeriods() {
  const response = await authorizedFetch("/api/v1/periods", {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<Array<{ id: number; year: number; month: number; status: string }>>;
}

export async function createPeriod(year: number, month: number) {
  const response = await authorizedFetch("/api/v1/periods", {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify({ year, month }),
  });
  return response.json() as Promise<{ id: number; year: number; month: number; status: string }>;
}

export async function getSummary(periodId: number) {
  const response = await authorizedFetch(`/api/v1/periods/${periodId}/summary`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<Summary>;
}

export async function getMovements(filters: {
  period_id?: number;
  allocation_id?: number;
  currency_id?: number;
  kind?: string;
} = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const response = await authorizedFetch(`/api/v1/movements?${query.toString()}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<Movement[]>;
}

export async function getMercadoPagoMovements() {
  const response = await authorizedFetch("/api/v1/integrations/mercadopago/movements", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } });
  return response.json() as Promise<MercadoPagoMovement[]>;
}

export async function getMercadoPagoReserves() {
  const response = await authorizedFetch("/api/v1/integrations/mercadopago/reserves", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } });
  return response.json() as Promise<MercadoPagoReserve[]>;
}

export async function syncMercadoPago() {
  const response = await authorizedFetch("/api/v1/integrations/mercadopago/sync", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } });
  return response.json();
}

export async function linkMercadoPagoMovement(id: number, allocationId: number) {
  const response = await authorizedFetch(`/api/v1/integrations/mercadopago/movements/${id}/link`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }, body: JSON.stringify({ allocation_id: allocationId }) });
  return response.json() as Promise<MercadoPagoMovement>;
}

export async function getCalendarEvents(year: number, month: number) {
  const response = await authorizedFetch(`/api/v1/calendar?year=${year}&month=${month}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<CalendarEvent[]>;
}

export async function setCalendarPayment(data: { kind: "recurring" | "planned"; source_id: number; due_date: string; paid: boolean }) {
  const response = await authorizedFetch("/api/v1/calendar/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json() as Promise<CalendarEvent>;
}

export async function moveRecurringCalendarEvent(data: { source_id: number; from_date: string; to_date: string }) {
  const response = await authorizedFetch("/api/v1/calendar/recurring/move", { method: "POST", body: JSON.stringify(data) });
  return response.json() as Promise<CalendarEvent>;
}

export async function createCalendarEvent(data: { title: string; event_type: "salary" | "card_closing" | "invoice_closing" | "other"; event_date: string; notes?: string }) {
  const response = await authorizedFetch("/api/v1/calendar/events", { method: "POST", body: JSON.stringify(data) });
  return response.json() as Promise<CalendarEvent>;
}

export async function deleteCalendarEvent(id: number) {
  await authorizedFetch(`/api/v1/calendar/events/${id}`, { method: "DELETE" });
}

export async function getCategories() {
  const response = await authorizedFetch("/api/v1/categories", {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<Category[]>;
}

export async function getCurrencies() {
  const response = await authorizedFetch("/api/v1/currencies", {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<Currency[]>;
}

export async function createExchangeRate(data: { base_currency_id: number; quote_currency_id: number; rate: number; effective_at: string }) {
  const response = await authorizedFetch("/api/v1/currencies/rates", {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export type Period = { id: number; year: number; month: number; status: string };
export type RecurringExpense = { id: number; category_id: number; currency_id: number; name: string; amount_cents: number; amount_type: string; due_day: number; due_date: string | null; active: boolean };
export type PlannedExpense = { id: number; category_id: number | null; currency_id: number; description: string; estimated_amount_cents: number; target_date: string; status: string; notes: string | null; tags: string[] };

export async function createCategory(data: { name: string; kind: string; color?: string }) {
  const response = await authorizedFetch("/api/v1/categories", {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json() as Promise<Category>;
}

export async function updateCategory(categoryId: number, data: { color: string }) {
  const response = await authorizedFetch(`/api/v1/categories/${categoryId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json() as Promise<Category>;
}

export async function createIncome(periodId: number, data: { source: string; received_from: string; amount_cents: number; currency_id: number; received_on: string }) {
  const response = await authorizedFetch(`/api/v1/periods/${periodId}/incomes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createAllocation(periodId: number, data: { category_id: number; currency_id: number; planned_amount_cents: number; reserved_amount_cents: number }) {
  const response = await authorizedFetch(`/api/v1/periods/${periodId}/allocations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json() as Promise<Allocation>;
}

export async function updateAllocation(allocationId: number, data: { planned_amount_cents?: number; reserved_amount_cents?: number }) {
  const response = await authorizedFetch(`/api/v1/allocations/${allocationId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json() as Promise<Allocation>;
}

export async function deleteAllocation(allocationId: number) {
  await authorizedFetch(`/api/v1/allocations/${allocationId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
}

export async function createRecurring(data: { category_id: number; currency_id: number; name: string; amount_cents: number; amount_type: string; due_date: string }) {
  const response = await authorizedFetch("/api/v1/recurring-expenses", {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify({ ...data, frequency: "monthly" }),
  });
  return response.json() as Promise<RecurringExpense>;
}

export async function getRecurring() {
  const response = await authorizedFetch("/api/v1/recurring-expenses", {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<RecurringExpense[]>;
}

export async function createPlanned(data: { currency_id: number; description: string; estimated_amount_cents: number; target_date: string; tags: string[] }) {
  const response = await authorizedFetch("/api/v1/planned-expenses", {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json() as Promise<PlannedExpense>;
}

export async function getPlanned() {
  const response = await authorizedFetch("/api/v1/planned-expenses", {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<PlannedExpense[]>;
}

export async function transferAllocation(periodId: number, data: { from_allocation_id: number; to_allocation_id: number; amount_cents: number; transferred_on: string }) {
  const response = await authorizedFetch(`/api/v1/periods/${periodId}/transfers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function generateRecurring(periodId: number) {
  const response = await authorizedFetch(`/api/v1/periods/${periodId}/generate-recurring`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<Allocation[]>;
}

export async function rolloverPeriod(periodId: number) {
  const response = await authorizedFetch(`/api/v1/periods/${periodId}/rollover`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<Period>;
}

export async function createExpense(periodId: number, data: {
  description: string;
  amount_cents: number;
  currency_id: number;
  expense_date: string;
  allocations: Array<{ allocation_id: number; amount_cents: number }>;
}) {
  const response = await authorizedFetch(`/api/v1/periods/${periodId}/expenses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json();
}
