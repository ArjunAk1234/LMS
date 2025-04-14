/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          'primary-color': '#FF6B35',
          'primary-light': '#FF8B5E',
          'secondary-color': '#2EC4B6',
          'dark-blue': '#1E3A8A',
          'medium-blue': '#2563EB',
          'light-blue': '#3B82F6',
          'button-blue': '#2563EB',
          'button-hover': '#1D4ED8',
        },
      },
    },
    plugins: [],
  }

