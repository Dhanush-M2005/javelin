// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Define the new dark theme color palette
        background: '#121212', // Very dark grey, almost black
        surface: '#1E1E1E',   // Dark grey for cards and surfaces
        primary: '#BB86FC',   // Soft purple for primary actions/highlights
        secondary: '#03DAC6', // Teal for accents
        'on-background': '#E0E0E0', // Light grey for text on dark backgrounds
        'on-surface': '#FFFFFF',    // White for text on surfaces
        'on-surface-secondary': '#A0A0A0', // Dimmer text color
        'border-color': '#2C2C2C', // Dark border color
      },
    },
  },
  plugins: [],
};