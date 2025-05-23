/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // ✨ 이 줄 추가!
  theme: {
    extend: {},
  },
  plugins: [],
};
