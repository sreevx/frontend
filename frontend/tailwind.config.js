/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surface scale — cool-tinted near-black
        bg: {
          base: "#06090F",
          surface: "#0B1018",
          raised: "#101723",
          overlay: "#161E2C",
        },
        line: {
          subtle: "#1B2433",
          default: "#263042",
          strong: "#3A465E",
        },
        ink: {
          primary: "#E6ECF5",
          secondary: "#9AA7BD",
          tertiary: "#5E6B82",
          inverse: "#0B1018",
        },
        sev: {
          low: "#22D3B8",
          moderate: "#F5B547",
          high: "#F97A47",
          critical: "#E5484D",
        },
        agent: {
          sensing: "#38BDF8",
          hydrodynamic: "#5B8DEF",
          regulatory: "#A78BFA",
          mitigation: "#34D399",
        },
        approval: {
          DEFAULT: "#E5484D",
          muted: "#7F1D1D",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.2rem" }],
        base: ["0.875rem", { lineHeight: "1.3rem" }],
        md: ["0.9375rem", { lineHeight: "1.4rem" }],
        lg: ["1.0625rem", { lineHeight: "1.5rem" }],
        xl: ["1.25rem", { lineHeight: "1.6rem" }],
        "2xl": ["1.5rem", { lineHeight: "1.75rem" }],
        "3xl": ["1.875rem", { lineHeight: "2rem" }],
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        panel: "0 1px 0 rgba(255,255,255,0.02) inset, 0 1px 2px rgba(0,0,0,0.5)",
        "glow-sensing":
          "0 0 0 1px rgba(56,189,248,0.4), 0 0 12px rgba(56,189,248,0.25)",
        "glow-hydrodynamic":
          "0 0 0 1px rgba(91,141,239,0.4), 0 0 12px rgba(91,141,239,0.25)",
        "glow-regulatory":
          "0 0 0 1px rgba(167,139,250,0.4), 0 0 12px rgba(167,139,250,0.25)",
        "glow-mitigation":
          "0 0 0 1px rgba(52,211,153,0.4), 0 0 12px rgba(52,211,153,0.25)",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.4)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
        scanline: "scanline 4s linear infinite",
        ticker: "ticker 60s linear infinite",
      },
    },
  },
  plugins: [],
};
