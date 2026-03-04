/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"],
      },
      colors: {
        primary: "#f97316",
        primaryDark: "#ea580c",
        sand: "#f3ede2",
      },
      boxShadow: {
        soft: "0 12px 40px -18px rgba(10, 30, 60, 0.45)",
      },
    },
  },
  plugins: [],
};
