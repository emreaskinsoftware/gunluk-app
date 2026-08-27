import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Açık / koyu tema yönetimi.
 * Seçim localStorage'da saklanır; hiç seçim yoksa işletim sistemi tercihine uyar.
 */

const ThemeContext = createContext(null);
const STORAGE_KEY = "gunluk:theme";

function readInitialTheme() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Gizli sekme / depolama kapalı — sorun değil, sistem tercihine düşeriz
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0b1020" : "#f6f7fb");

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* depolama yoksa yoksay */
    }
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    []
  );

  const value = useMemo(
    () => ({ theme, isDark: theme === "dark", toggle, setTheme }),
    [theme, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme yalnızca <ThemeProvider> içinde kullanılabilir.");
  }
  return context;
}
