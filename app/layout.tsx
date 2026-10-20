import type { Metadata } from "next";
import { Footer } from "./components/Footer";
import { ToastProvider } from "./components/ToastProvider";
import { VoiceAssistantButton } from "./components/VoiceAssistantButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casa Ordenada",
  description: "Gestión sencilla del hogar",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><ToastProvider><div className="app-page">{children}</div><VoiceAssistantButton /><Footer /></ToastProvider></body>
    </html>
  );
}
