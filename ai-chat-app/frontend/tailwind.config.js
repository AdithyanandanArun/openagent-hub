import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07090d",
          900: "#0b0f16",
          850: "#101722",
          800: "#141d2a",
          700: "#1e293b",
        },
        mint: {
          300: "#7ddfc9",
          400: "#43c7ad",
          500: "#1aa68c",
        },
        coral: {
          400: "#ff8f70",
          500: "#ef6f57",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(125,223,201,0.18), 0 20px 70px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [typography],
};
