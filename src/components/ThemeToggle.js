import React from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

/** Gündüz / gece düğmesi. */
export default function ThemeToggle() {
  const { isNight, toggle } = useTheme();

  return (
    <button
      type="button"
      className="theme-btn"
      onClick={toggle}
      title={isNight ? "Gündüz görünümü" : "Gece görünümü"}
      aria-label={isNight ? "Gündüz görünümüne geç" : "Gece görünümüne geç"}
    >
      {isNight ? <FiSun size={17} aria-hidden="true" /> : <FiMoon size={17} aria-hidden="true" />}
    </button>
  );
}
