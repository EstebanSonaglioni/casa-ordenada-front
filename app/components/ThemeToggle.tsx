"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = savedTheme ? savedTheme === "dark" : prefersDark;
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    setDark(isDark);
  }, []);

  function toggleTheme() {
    const nextTheme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("theme", nextTheme);
    setDark(!dark);
  }

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Cambiar tema">
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
      {dark ? "Tema claro" : "Tema oscuro"}
    </button>
  );
}
