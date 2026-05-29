/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 茲茲品牌色
        zizi: {
          blue: '#1E3A8A', // 深藍（主色）
          gold: '#F59E0B', // 金色（強調色）
        },
      },
    },
  },
  plugins: [],
};
