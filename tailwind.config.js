/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin') // Keep this if you might add custom plugins later

module.exports = {
  content: [
    "./templates/**/*.html",
    "./static/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'bubblegum-pink': '#ff77cc',
        'candy-pink': '#f9a8d4',
        'soft-pink': '#fbcfe8',
        'deep-purple': '#a855f7',
        'light-purple': '#c084fc',
        'sparkle-gold': '#facc15',
      },
      fontFamily: {
        // Main body font (using Google Fonts - ensure link is in HTML)
        'sans': ['Poppins', 'sans-serif'],
        // Display/Title font (using the custom @font-face defined 'Comodo')
        'display': ['Comodo', 'cursive'],
      },
      boxShadow: {
         'cute': '0 4px 14px 0 rgba(255, 119, 204, 0.39)',
         'glow': '0 0 25px 8px rgba(249, 168, 212, 0.7)',
         'inner-cute': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      zIndex: {
        '50': '50', // Overlay
        '60': '60', // Modal
      },
      // ✨ Updated Keyframes ✨
      keyframes: {
         pulse_bg: {
            '0%, 100%': { backgroundColor: 'rgba(249, 168, 212, 0.7)' },
            '50%': { backgroundColor: 'rgba(251, 207, 232, 0.9)' },
         },
         fadeInUp: {
            '0%': { opacity: '0', transform: 'translateY(15px) scale(0.98)' },
            '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          },
         fadeIn: {
             '0%': { opacity: '0' },
             '100%': { opacity: '1' },
         },
         fadeOut: {
             '0%': { opacity: '1' },
             '100%': { opacity: '0' },
         },
         scaleIn: {
             '0%': { opacity: '0', transform: 'scale(0.9)' },
             '100%': { opacity: '1', transform: 'scale(1)' },
         },
         scaleOut: {
             '0%': { opacity: '1', transform: 'scale(1)' },
             '100%': { opacity: '0', transform: 'scale(0.95)' },
         },
         dotBounce: {
             '0%, 80%, 100%': { transform: 'scale(0)' },
             '40%': { transform: 'scale(1.0)' },
         },
         bounceIn: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-8px)' },
         },
         // ✨ New Keyframe for Progress Bar ✨
         progressStripes: {
             '0%': { backgroundPosition: '2rem 0' }, // Stripe width/movement distance
             '100%': { backgroundPosition: '0 0' },
         }
      },
      // ✨ Updated Animations ✨
      animation: {
         'pulse-bg-slow': 'pulse_bg 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
         'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
         'fade-in': 'fadeIn 0.3s ease-out forwards',
         'fade-out': 'fadeOut 0.3s ease-in forwards',
         'scale-in': 'scaleIn 0.3s ease-out forwards',
         'scale-out': 'scaleOut 0.3s ease-in forwards',
         'dot-bounce-1': 'dotBounce 1.1s infinite ease-in-out',
         'dot-bounce-2': 'dotBounce 1.1s 0.1s infinite ease-in-out',
         'dot-bounce-3': 'dotBounce 1.1s 0.2s infinite ease-in-out',
         'bounce-in': 'bounceIn 0.6s ease',
         // ✨ New Animation Utility for Progress Bar ✨
         'progress-stripes': 'progressStripes 1s linear infinite', // Speed of stripes
      },
       // ✨ Added Background Size Utility ✨
       backgroundSize: {
          'stripes': '2rem 2rem', // Must match keyframe movement distance for seamless loop
      }
    },
  },
  plugins: [],
}