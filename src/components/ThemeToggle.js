import React from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

/** Açık / koyu tema düğmesi. */
export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      title={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
      aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
    >
      {isDark ? (
        <FiSun size={19} aria-hidden="true" />
      ) : (
        <FiMoon size={19} aria-hidden="true" />
      )}
    </button>
  );
}
