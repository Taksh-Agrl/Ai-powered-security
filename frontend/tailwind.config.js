/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#121826",
        night: "#172033",
        ember: "#e85d3f",
        mint: "#2fbf8f",
        gold: "#f4b942"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(18, 24, 38, 0.14)"
      }
    }
  },
  plugins: []
};
