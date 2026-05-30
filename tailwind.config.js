/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 茲茲品牌色（奶油白 × 明亮金；不用藍色）
        zizi: {
          gold: '#F59E0B', // 明亮琥珀金（主色／主按鈕）
          amber: '#FBBF24', // 較亮的金（漸層用）
          champagne: '#C8A96A', // 香檳金（質感點綴）
          cream: '#FBF8F1', // 奶油白底
          ink: '#3A2C18', // 暖墨棕（標題與深色文字，取代原本的藍）
          caramel: '#8A4F12', // 焦糖（大螢幕深色用）
        },
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', '"Cormorant Garamond"', 'serif'],
        sans: ['"Noto Sans TC"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.08)',
        glow: '0 0 30px rgba(200,169,106,0.45)',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'toast-in': {
          '0%': { transform: 'translateY(-120%) scale(0.9)', opacity: '0' },
          '60%': { transform: 'translateY(8%) scale(1.03)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.35s ease-out',
        'toast-in': 'toast-in 0.45s cubic-bezier(0.2,0.8,0.2,1)',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
