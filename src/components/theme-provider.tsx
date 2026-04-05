"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_THEME, isValidTheme } from "@/lib/themes";

interface ThemeContextValue {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("rp-theme");
    if (stored && isValidTheme(stored)) {
      setThemeState(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
    }
    setMounted(true);
  }, []);

  function setTheme(newTheme: string) {
    if (!isValidTheme(newTheme)) return;
    setThemeState(newTheme);
    localStorage.setItem("rp-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
