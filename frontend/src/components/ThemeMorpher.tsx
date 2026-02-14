import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocale } from "../hooks/useLocale";
import "./ThemeMorpher.css";

const VIBES = [
  {
    name: "Modern Dark",
    vars: {
      "--color-brand": "#a1c2dd",
      "--color-brand-strong": "#c157b5",
      "--color-bg": "#09121b",
      "--color-text": "#e1ecf4",
      "--font-sans": '"Inter", sans-serif',
    },
  },
  {
    name: "Royal Wedding",
    vars: {
      "--color-brand": "#8b5cf6",
      "--color-brand-strong": "#d946ef",
      "--color-bg": "#faf5ff",
      "--font-sans": '"Playfair Display", serif',
    },
  },
  {
    name: "Midnight Party",
    vars: {
      "--color-brand": "#10b981",
      "--color-brand-strong": "#3b82f6",
      "--color-bg": "#0f172a",
      "--color-text": "#f1f5f9",
      "--color-text-muted": "#94a3b8",
      "--font-sans": '"Space Grotesk", sans-serif',
    },
  },
  {
    name: "Golden Gala",
    vars: {
      "--color-brand": "#d97706",
      "--color-brand-strong": "#b45309",
      "--color-bg": "#fffbeb",
      "--font-sans": '"Cormorant Garamond", serif',
    },
  },
];

const ThemeMorpher: React.FC = () => {
  const { t } = useLocale();
  const [currentVibe, setCurrentVibe] = useState(0);

  const morph = () => {
    const next = (currentVibe + 1) % VIBES.length;
    setCurrentVibe(next);
    const vibe = VIBES[next];

    if (vibe.name === "Default") {
      VIBES.forEach((v) => {
        Object.keys(v.vars).forEach((key) => {
          document.documentElement.style.removeProperty(key);
        });
      });
    } else {
      Object.entries(vibe.vars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }

    // Add a temporary class for animation
    document.body.classList.add("morphing");
    setTimeout(() => document.body.classList.remove("morphing"), 1000);
  };

  return (
    <button className="theme-morpher" onClick={morph} title={t("morpherTitle")}>
      <span className="morpher-icon">
        <Sparkles size={20} />
      </span>
      <span className="morpher-label">{VIBES[currentVibe].name}</span>
    </button>
  );
};

export default ThemeMorpher;
