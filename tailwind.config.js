/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./App.tsx",
        "./index.tsx",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                montserrat: ['Montserrat', 'sans-serif'],
                bebas: ['"Bebas Neue"', 'cursive'],
                outfit: ['Outfit', 'sans-serif'],
                playfair: ['"Playfair Display"', 'serif'],
                display: ['Outfit', 'sans-serif'],
            },
            colors: {
                op7: {
                    navy: '#002B5B',     // Azul escuro
                    blue: '#1A73E8',     // Azul claro / Destaque
                    accent: '#FF7D3C',   // Laranja leve
                    bg: '#F8FAFC',       // Fundo predominante
                    surface: '#FFFFFF',  // Cards e inputs
                    border: '#E2E8F0',   // Divisores
                    text: '#1E293B',     // Texto principal
                    muted: '#64748B',    // Texto auxiliar
                }
            },
            boxShadow: {
                'premium': '0 4px 20px -2px rgba(0, 43, 91, 0.08), 0 2px 8px -1px rgba(0, 43, 91, 0.04)',
                'soft': '0 2px 10px rgba(0, 0, 0, 0.05)',
            }
        },
    },
    plugins: [],
}
