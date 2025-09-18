// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        serif: ["Georgia", "serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      colors: {
        black: "#000000",
        white: "#ffffff",
        red: {
          DEFAULT: "#b91c1c", // dark red
          light: "#fca5a5",
        },
        green: {
          DEFAULT: "#15803d", // dark green
          light: "#86efac",
        },
      },
    },
  },
  plugins: [],
};
