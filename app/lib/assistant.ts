import { authorizedFetch } from "./auth";

export type AssistantCommand = { id: number; status: string; transcript: string; proposal: Record<string, unknown>; expires_at: string };

export async function createAssistantCommand(audio: Blob, filename = "voice.webm") {
  const form = new FormData(); form.append("audio", audio, filename);
  const response = await authorizedFetch("/api/v1/assistant/commands/audio", { method: "POST", body: form });
  return response.json() as Promise<AssistantCommand>;
}
export async function updateAssistantCommand(id: number, proposal: Record<string, unknown>) {
  const response = await authorizedFetch(`/api/v1/assistant/commands/${id}`, { method: "PATCH", body: JSON.stringify({ proposal }) });
  return response.json() as Promise<AssistantCommand>;
}
export async function confirmAssistantCommand(id: number) { const response = await authorizedFetch(`/api/v1/assistant/commands/${id}/confirm`, { method: "POST" }); return response.json(); }
export async function cancelAssistantCommand(id: number) { const response = await authorizedFetch(`/api/v1/assistant/commands/${id}/cancel`, { method: "POST" }); return response.json() as Promise<AssistantCommand>; }
