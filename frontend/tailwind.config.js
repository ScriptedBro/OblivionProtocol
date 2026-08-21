/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        titanium: {
          950: "#090a0d",
          900: "#0e1015",
          850: "#13161d",
          800: "#191d26",
          750: "#202531",
          700: "#2a3140",
          600: "#3d4659",
          500: "#556177",
          400: "#7c8ba1",
          300: "#a6b4c9",
          200: "#cbd5e1",
          100: "#f1f5f9",
        },
        gold: {
          500: "#d97706",
          400: "#f59e0b",
          300: "#fbbf24",
          200: "#fde68a",
        },
        signal: {
          green: "#10b981",
          red: "#f43f5e",
          blue: "#3b82f6",
          amber: "#f59e0b",
          violet: "#8b5cf6",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
