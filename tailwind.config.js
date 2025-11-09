/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#030712',
        foreground: '#F8FAFC',
        muted: '#94A3B8',
        'muted-foreground': '#64748B',
        surface: '#0B1220',
        'surface-strong': '#101A2E',
        'surface-soft': '#1C2333',
        border: '#1E293B',
        accent: '#4C6EF5',
        'accent-strong': '#2B40A0',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
      },
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans JP"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 30px 80px -40px rgba(76, 110, 245, 0.65)',
        glow: '0 0 0 1px rgba(148, 163, 184, 0.1), 0 35px 120px -50px rgba(76, 110, 245, 0.8)',
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at 20% 20%, rgba(76, 110, 245, 0.25), transparent 55%), radial-gradient(circle at 80% 0%, rgba(8, 47, 73, 0.45), transparent 60%)',
        grid: 'linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}





