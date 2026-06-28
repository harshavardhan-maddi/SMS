/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0c1a30',      // Dark blue sidebar background
          lightBg: '#f4f7fc',   // Light content background
          purple: '#5d5fef',    // Active indicator/button purple
          purpleHover: '#4e50d5',
          textDark: '#1e293b',  // Main text dark gray
          textMuted: '#64748b', // Secondary muted slate
        },
        status: {
          working: '#3b82f6',   // Blue for working
          new: '#10b981',       // Green for new stock
          repair: '#f59e0b',    // Orange for repairing/initiated
          dead: '#ef4444',      // Red for dead stock
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'premium': '0 10px 30px -10px rgba(12, 26, 48, 0.08)',
      }
    },
  },
  plugins: [],
}
