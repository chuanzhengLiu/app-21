/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        "climbing-orange": {
          50: "#FFF2EC",
          100: "#FFE0D3",
          200: "#FFC1A8",
          300: "#FFA27D",
          400: "#FF8352",
          500: "#FF6B35",
          600: "#E5501A",
          700: "#B83F14",
          800: "#8A2F0F",
          900: "#5C1F0A",
        },
        "rock-dark": {
          50: "#F5F5F5",
          100: "#E5E5E5",
          200: "#CCCCCC",
          300: "#B3B3B3",
          400: "#999999",
          500: "#808080",
          600: "#666666",
          700: "#4D4D4D",
          800: "#333333",
          900: "#1A1A1A",
          950: "#0D0D0D",
        },
        "rock-medium": {
          50: "#F8F8F8",
          100: "#F0F0F0",
          200: "#E0E0E0",
          300: "#D0D0D0",
          400: "#C0C0C0",
          500: "#A0A0A0",
          600: "#808080",
          700: "#606060",
          800: "#404040",
          900: "#202020",
        },
        "rock-light": {
          50: "#FCFCFC",
          100: "#F9F9F9",
          200: "#F2F2F2",
          300: "#EBEBEB",
          400: "#E0E0E0",
          500: "#D0D0D0",
          600: "#C0C0C0",
          700: "#A8A8A8",
          800: "#909090",
          900: "#787878",
        },
      },
      fontFamily: {
        outfit: ["Outfit", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
