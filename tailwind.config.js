/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#08231a",
        forest: "#0f3d2e",
        leaf: "#16a34a",
        grass: "#22c55e",
        sprout: "#4ade80",
        lime: "#84cc16",
        mint: "#f0fdf4",
        cream: "#f7fef9",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 20px 60px -15px rgba(22, 163, 74, 0.45)",
        card: "0 30px 80px -30px rgba(8, 35, 26, 0.35)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) translateX(0) scale(1)" },
          "33%": { transform: "translateY(-30px) translateX(20px) scale(1.05)" },
          "66%": { transform: "translateY(20px) translateX(-15px) scale(0.97)" },
        },
        shine: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 18s ease-in-out infinite",
        shine: "shine 6s linear infinite",
        gradient: "gradient 12s ease infinite",
        fadeUp: "fadeUp 0.8s ease forwards",
      },
    },
  },
  plugins: [],
};
