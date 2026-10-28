colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            fontFamily: {
                orbitron: ["Orbitron", 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial'],
            },
            colors: {
                hg: {
                    primary: 'var(--hg-bg-primary)',
                    surface: 'var(--hg-bg-surface)',
                    ink: 'var(--hg-text-primary)',
                    muted: 'var(--hg-text-muted)',
                    error: 'var(--hg-error)',
                },
                primary: colors.sky,
                secondary: colors.emerald,
            },
        },
    },
    plugins: [require('@tailwindcss/forms')],
}
