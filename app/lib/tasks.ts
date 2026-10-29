import { authorizedFetch } from "./auth";

export type Task = {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  difficulty: string | null;
  duration_minutes: number | null;
  estimated_amount_cents: number | null;
  currency_id: number | null;
  assigned_to_user_id: number | null;
  due_at: string | null;
  recurrence: string;
  recurrence_days: number[];
  recurrence_until: string | null;
  status: string;
  next_due_at: string | null;
};

export type TaskOccurrence = Task & { occurrence_id: number | null; occurrence_date: string; occurrence_status: string };

export async function getTasks() {
  const response = await authorizedFetch("/api/v1/tasks");
  return response.json() as Promise<Task[]>;
}

export async function getTaskCalendar(from: string, to: string) {
  const query = new URLSearchParams({ from_date: from, to_date: to });
  const response = await authorizedFetch(`/api/v1/tasks/calendar?${query}`);
  return response.json() as Promise<TaskOccurrence[]>;
}

export async function createTask(data: Record<string, unknown>) {
  const response = await authorizedFetch("/api/v1/tasks", { method: "POST", body: JSON.stringify(data) });
  return response.json() as Promise<Task>;
}

export async function deleteTask(id: number) {
  await authorizedFetch(`/api/v1/tasks/${id}`, { method: "DELETE" });
}

export async function completeTask(id: number, date: string) {
  const response = await authorizedFetch(`/api/v1/tasks/${id}/complete/${date}`, { method: "POST" });
  return response.json() as Promise<TaskOccurrence>;
}
