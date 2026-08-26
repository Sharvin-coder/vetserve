import type { Config } from "tailwindcss";

// Every color, size, and radius here is a reference into styles/tokens.css.
// No literals: change the token, the whole app follows.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      bg: "var(--bg)",
      surface: "var(--surface)",
      ink: "var(--ink)",
      "ink-muted": "var(--ink-muted)",
      line: "var(--line)",
      primary: "var(--primary)",
      "primary-ink": "var(--primary-ink)",
      accent: "var(--accent)",
      success: "var(--success)",
      warn: "var(--warn)",
      danger: "var(--danger)",
      "accent-tint": "var(--accent-tint)",
      "success-tint": "var(--success-tint)",
      "warn-tint": "var(--warn-tint)",
      "danger-tint": "var(--danger-tint)",
      "primary-tint": "var(--primary-tint)",
    },
    fontFamily: {
      sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      display: ["var(--font-fraunces)", "Georgia", "serif"],
    },
    fontSize: {
      sm: ["var(--text-sm)", { lineHeight: "1.5", letterSpacing: "0.01em" }],
      ui: ["var(--text-ui)", { lineHeight: "var(--leading-body)" }],
      base: ["var(--text-base)", { lineHeight: "var(--leading-body)" }],
      md: ["var(--text-md)", { lineHeight: "1.45" }],
      lg: ["var(--text-lg)", { lineHeight: "1.35" }],
      xl: ["var(--text-xl)", { lineHeight: "1.25" }],
      "2xl": ["var(--text-2xl)", { lineHeight: "1.15" }],
      "3xl": ["var(--text-3xl)", { lineHeight: "1.1" }],
    },
    borderRadius: {
      none: "0",
      control: "var(--radius-control)",
      card: "var(--radius-card)",
      full: "9999px",
    },
    extend: {
      maxWidth: {
        measure: "var(--measure)",
        board: "var(--board-width)",
      },
      boxShadow: {
        // the one elevation in the app: open menus / dialogs only
        menu: "0 4px 16px rgba(28, 35, 33, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
