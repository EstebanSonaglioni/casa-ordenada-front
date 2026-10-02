const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  planned_amount_cents: number;
  reserved_amount_cents: number;
  spent_amount_cents: number;
  balance_cents: number;
};

export type Summary = {
  period: { id: number; year: number; month: number; status: string };
  income_cents: number;
  committed_cents: number;
  allocated_cents: number;
  reserved_future_cents: number;
  spent_cents: number;
  balance_cents: number;
  allocations: Allocation[];
};

export type Category = { id: number; name: string; kind: string; color: string | null; icon: string | null; is_active: boolean };

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
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
  localStorage.setItem("username", tokens.username);
  localStorage.setItem("role", tokens.role);
  return tokens;
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    throw new Error("No hay refresh token disponible");
  }

  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    throw new Error("La sesión expiró");
  }

  const tokens = (await response.json()) as TokenResponse;
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
  localStorage.setItem("username", tokens.username);
  localStorage.setItem("role", tokens.role);
  return tokens;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
}

async function authorizedFetch(path: string, init: RequestInit = {}) {
  let response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (response.status === 401) {
    await refreshAccessToken();
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
  }
  if (!response.ok) throw new Error("No pudimos cargar la información");
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

export async function getCategories() {
  const response = await authorizedFetch("/api/v1/categories", {
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
  });
  return response.json() as Promise<Category[]>;
}

export type Period = { id: number; year: number; month: number; status: string };
export type RecurringExpense = { id: number; category_id: number; name: string; amount_cents: number; amount_type: string; due_day: number; active: boolean };
export type PlannedExpense = { id: number; category_id: number; description: string; estimated_amount_cents: number; target_date: string; status: string };

export async function createCategory(data: { name: string; kind: string; color?: string }) {
  const response = await authorizedFetch("/api/v1/categories", {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json() as Promise<Category>;
}

export async function createIncome(periodId: number, data: { source: string; received_from: string; amount_cents: number; received_on: string }) {
  const response = await authorizedFetch(`/api/v1/periods/${periodId}/incomes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createAllocation(periodId: number, data: { category_id: number; planned_amount_cents: number; reserved_amount_cents: number }) {
  const response = await authorizedFetch(`/api/v1/periods/${periodId}/allocations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    body: JSON.stringify(data),
  });
  return response.json() as Promise<Allocation>;
}

export async function createRecurring(data: { category_id: number; name: string; amount_cents: number; amount_type: string; due_day: number }) {
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

export async function createPlanned(data: { category_id: number; description: string; estimated_amount_cents: number; target_date: string }) {
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
