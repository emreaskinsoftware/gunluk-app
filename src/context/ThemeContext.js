import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Gündüz / gece teması.
 *
 * "light/dark" yerine "day/night" adlandırması bilinçli: bu bir kağıt
 * metaforu — gündüz beyaz kağıt, gece lamba ışığında kararmış kağıt.
 * theme.css içindeki [data-theme] seçicileri de bu adları kullanır.
 */

const ThemeContext = createContext(null);
const STORAGE_KEY = "gunluk:tema";

const PAPER_COLOR = { day: "#faf7f0", night: "#16130f" };

function readInitial() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "day" || saved === "night") return saved;
  } catch {
    /* gizli sekme — sistem tercihine düş */
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", PAPER_COLOR[theme]);

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* yoksay */
    }
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((current) => (current === "night" ? "day" : "night")),
    []
  );

  const value = useMemo(
    () => ({ theme, isNight: theme === "night", toggle }),
    [theme, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme yalnızca <ThemeProvider> içinde kullanılabilir.");
  return context;
}
