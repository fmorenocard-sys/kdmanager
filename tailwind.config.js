/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Backgrounds
                background: {
                    DEFAULT: '#0f172a', // Slate 900
                    secondary: '#1e293b', // Slate 800
                    tertiary: '#334155', // Slate 700
                },
                // Accents
                primary: {
                    DEFAULT: '#f59e0b', // Amber 500 (Gold)
                    hover: '#d97706', // Amber 600
                    light: '#fcd34d', // Amber 300
                },
                secondary: {
                    DEFAULT: '#3b82f6', // Blue 500
                    hover: '#2563eb', // Blue 600
                    light: '#93c5fd', // Blue 300
                },
                // Semantic
                success: '#10b981', // Emerald 500
                warning: '#f97316', // Orange 500
                danger: '#ef4444', // Red 500
                info: '#06b6d4', // Cyan 500
                // Text
                text: {
                    primary: '#f8fafc', // Slate 50
                    secondary: '#94a3b8', // Slate 400
                    tertiary: '#64748b', // Slate 500
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                'glow': '0 0 15px rgba(245, 158, 11, 0.3)', // Gold glow
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-pattern': "url('/bg-pattern.svg')", // Placeholder
            }
        },
    },
    plugins: [],
}
