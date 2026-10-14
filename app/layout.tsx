import type { Metadata } from "next";
import { Footer } from "./components/Footer";
import { ToastProvider } from "./components/ToastProvider";
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
      <body><ToastProvider><div className="app-page">{children}</div><Footer /></ToastProvider></body>
    </html>
  );
}
