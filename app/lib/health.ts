import { authorizedFetch } from "./auth";

export type ExerciseEntry = {
  id: number;
  performed_on: string;
  activity: string;
  duration_minutes: number;
  notes: string | null;
};

export type ExerciseDay = {
  performed_on: string;
  entry_count: number;
  duration_minutes: number;
};

export type ExerciseInput = {
  performed_on: string;
  activity: string;
  duration_minutes: number;
  notes?: string | null;
};

export async function getExerciseEntries(from: string, to: string) {
  const query = new URLSearchParams({ from_date: from, to_date: to });
  const response = await authorizedFetch(`/api/v1/health/exercise?${query.toString()}`);
  return response.json() as Promise<ExerciseEntry[]>;
}

export async function getExerciseCalendar(year: number) {
  const response = await authorizedFetch(`/api/v1/health/exercise/calendar?year=${year}`);
  return response.json() as Promise<ExerciseDay[]>;
}

export async function createExercise(data: ExerciseInput) {
  const response = await authorizedFetch("/api/v1/health/exercise", { method: "POST", body: JSON.stringify(data) });
  return response.json() as Promise<ExerciseEntry>;
}

export async function updateExercise(id: number, data: Partial<ExerciseInput>) {
  const response = await authorizedFetch(`/api/v1/health/exercise/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  return response.json() as Promise<ExerciseEntry>;
}

export async function deleteExercise(id: number) {
  await authorizedFetch(`/api/v1/health/exercise/${id}`, { method: "DELETE" });
}
