/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505", // Extremely dark charcoal/almost black
        cardBg: "#0A0A0A",     // Just barely lighter than background
        borderBg: "#171717",   // Subtle line color
        accentGold: "#b39b7d", // Izanami luxury gold/bronze
        accentMuted: "#A3A3A3",// Quiet text accent
        // Legacy colors for inner modules not yet updated
        accentTeal: "#06B6D4",
        accentAmber: "#F59E0B",
        accentRed: "#EF4444",
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
      },
      transitionTimingFunction: {
        'izanami': 'cubic-bezier(0.16, 1, 0.3, 1)', // Ultra-smooth ease out
      },
    },
  },
  plugins: [],
}
