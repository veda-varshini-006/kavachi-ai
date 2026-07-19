/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030712", // Deep navy base
        cardBg: "#0B1528",       // Lighter accent navy for cards
        borderBg: "#1E293B",     // Sleek slate border
        accentTeal: "#06B6D4",   // Intelligence cyan/teal
        accentAmber: "#F59E0B",  // Warning amber
        accentRed: "#EF4444",    // Critical error state
      },
    },
  },
  plugins: [],
}
