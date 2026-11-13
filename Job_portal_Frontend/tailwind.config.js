/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#f4f0ff", 100: "#ebe3ff", 500: "#8b5cf6", 600: "#6d3df5", 700: "#5930d4" },
        ink: "#202033",
        muted: "#77778a",
        canvas: "#f7f7fb",
        line: "#e9e9f0",
      },
      fontFamily: { sans: ["DM Sans", "sans-serif"], display: ["Manrope", "sans-serif"] },
      boxShadow: { soft: "0 12px 32px rgba(32, 32, 51, .06)", card: "0 2px 10px rgba(32, 32, 51, .035)" },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
