"use client";

import { useEffect, useRef, useState } from "react";
import { cancelAssistantCommand, confirmAssistantCommand, createAssistantCommand, updateAssistantCommand, AssistantCommand } from "../lib/assistant";
import { getSessionValue } from "../lib/session";
import { useToast } from "./ToastProvider";

export function VoiceAssistantButton() {
  const showToast = useToast(); const recorder = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]);
  const [authenticated, setAuthenticated] = useState(false); const [recording, setRecording] = useState(false); const [processing, setProcessing] = useState(false);
  const [command, setCommand] = useState<AssistantCommand | null>(null); const [proposalText, setProposalText] = useState(""); const [error, setError] = useState("");
  useEffect(() => { let active = true; const check = () => { void getSessionValue("access_token").then((token) => { if (active) setAuthenticated(Boolean(token)); }); }; check(); const timer = window.setInterval(check, 1000); return () => { active = false; window.clearInterval(timer); }; }, []);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) { setError("Este navegador no permite acceder al micrófono."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/mp4";
      const current = new MediaRecorder(stream, { mimeType }); chunks.current = [];
      current.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      current.onstop = () => { stream.getTracks().forEach((track) => track.stop()); void sendAudio(new Blob(chunks.current, { type: current.mimeType })); };
      recorder.current = current; current.start(); setRecording(true); setError("");
    } catch { setError("No pudimos acceder al micrófono. Revisá el permiso del navegador."); }
  }
  function stopRecording() { recorder.current?.stop(); recorder.current = null; setRecording(false); }
  async function sendAudio(audio: Blob) { setProcessing(true); setError(""); try { const result = await createAssistantCommand(audio); setCommand(result); setProposalText(JSON.stringify(result.proposal, null, 2)); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "No pudimos interpretar el audio"); } finally { setProcessing(false); } }
  async function confirm() { if (!command) return; try { const proposal = JSON.parse(proposalText) as Record<string, unknown>; const updated = await updateAssistantCommand(command.id, proposal); setCommand(updated); await confirmAssistantCommand(command.id); showToast("Carga confirmada."); setCommand(null); setProposalText(""); } catch (confirmError) { setError(confirmError instanceof Error ? confirmError.message : "No pudimos confirmar la carga"); } }
  async function cancel() { if (!command) return; try { await cancelAssistantCommand(command.id); setCommand(null); setProposalText(""); } catch (cancelError) { setError(cancelError instanceof Error ? cancelError.message : "No pudimos cancelar la propuesta"); } }
  if (!authenticated) return null;
  return <><button className={`voice-assistant-trigger${recording ? " recording" : ""}`} type="button" aria-label={recording ? "Detener grabación" : "Cargar con voz"} onClick={() => recording ? stopRecording() : void startRecording()} disabled={processing}>{recording ? "■" : "🎙"}<span>{recording ? "Detener" : "Cargar con voz"}</span></button>{(processing || command || error) && <div className="voice-assistant-overlay"><section className="voice-assistant-modal" role="dialog" aria-modal="true" aria-label="Carga por voz"><button className="modal-close" type="button" aria-label="Cerrar" onClick={() => { setCommand(null); setError(""); }}>×</button>{processing && <><span className="eyebrow">Asistente</span><h2>Interpretando el audio…</h2><p className="muted">Estamos preparando una propuesta para que la revises.</p></>}{error && !processing && <><span className="eyebrow">No pudimos completar la carga</span><p className="error" role="alert">{error}</p><button className="secondary-button" type="button" onClick={() => { setError(""); void startRecording(); }}>Grabar otro audio</button></>}{command && !processing && <><span className="eyebrow">Revisá antes de confirmar</span><h2>Esto entendimos</h2><p className="voice-transcript">“{command.transcript}”</p><label className="field">Propuesta editable<textarea value={proposalText} onChange={(event) => setProposalText(event.target.value)} rows={10} /></label><div className="voice-assistant-actions"><button className="secondary-button" type="button" onClick={() => void cancel()}>Cancelar</button><button className="secondary-button" type="button" onClick={() => { setCommand(null); setProposalText(""); void startRecording(); }}>Enviar otro audio</button><button className="primary-button" type="button" onClick={() => void confirm()}>Confirmar carga</button></div></>}</section></div>}</>;
}
