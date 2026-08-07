import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Tier colours. Deliberately NOT a severity ramp — severity is expressed
        // only within the official tier, and never across tiers.
        official: { DEFAULT: '#b42318', soft: '#fef3f2', line: '#f04438' },
        council:  { DEFAULT: '#175cd3', soft: '#eff8ff', line: '#2e90fa' },
        measured: { DEFAULT: '#107569', soft: '#f0fdf9', line: '#15b79e' },
        community:{ DEFAULT: '#5925dc', soft: '#f4f3ff', line: '#7a5af8' },
        context:  { DEFAULT: '#475467', soft: '#f9fafb', line: '#98a2b3' },
        sim:      { DEFAULT: '#b54708', soft: '#fffaeb', line: '#f79009' },
      },
    },
  },
  plugins: [],
} satisfies Config;
