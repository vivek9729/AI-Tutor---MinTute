// Edit this file to restyle the whole app: colors, motion, and chat bubble behavior.
// No build step needed — save and refresh the browser.

export const theme = {
  colors: {
    background: "#0e1420",
    surface: "#1a2333",
    surfaceAlt: "#131b29",
    accent: "#5eead4",
    accentStrong: "#2dd4bf",
    text: "#e6edf7",
    textMuted: "#8fa3bd",
    bubbleUser: "#243b53",
    bubbleBot: "#16222e",
    border: "#2a3a52"
  },
  radii: { card: "18px", bubble: "16px" },
  font: "'Segoe UI', system-ui, sans-serif"
};

export const animation = {
  // Set enabled:false to remove all motion (also respects prefers-reduced-motion).
  enabled: true,
  bubbleEntrance: "popIn 0.35s ease both",
  pulse: "pulse 1.6s ease-in-out infinite",
  fadeUp: "fadeUp 0.5s ease both"
};
