/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0b1220", 2: "#131c30", 3: "#1c2742" },
        paper: { DEFAULT: "#f5efe4", 2: "#e8dfc9" },
        amber: { DEFAULT: "#e0a458", 2: "#f2c584" },
        sage: "#7aa88a",
        coral: "#d17c5a",
      },
      fontFamily: {
        display: ["ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
