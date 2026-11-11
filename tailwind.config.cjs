module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './context/**/*.{js,ts,jsx,tsx}',
        './src/**/*.{js,ts,jsx,tsx}'
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    'Inter',
                    'ui-sans-serif',
                    'system-ui',
                    '-apple-system',
                    'Segoe UI',
                    'Roboto',
                    'Helvetica Neue',
                    'Arial',
                    'sans-serif'
                ],
                mono: [
                    'ui-monospace',
                    'SFMono-Regular',
                    'Menlo',
                    'Consolas',
                    'Liberation Mono',
                    'monospace'
                ]
            },
            boxShadow: {
                board: '0 30px 60px -20px rgba(0,0,0,.75), 0 10px 24px -10px rgba(0,0,0,.55)'
            },
            keyframes: {
                'fade-up': {
                    from: { opacity: '0', transform: 'translateY(10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                },
                'toast-in': {
                    from: { opacity: '0', transform: 'translateY(12px) scale(.97)' },
                    to: { opacity: '1', transform: 'translateY(0) scale(1)' }
                }
            },
            animation: {
                'fade-up': 'fade-up .35s cubic-bezier(.2,.8,.2,1) both',
                'toast-in': 'toast-in .25s cubic-bezier(.2,.8,.2,1) both'
            }
        }
    },
    plugins: []
};
