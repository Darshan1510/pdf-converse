export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}", // This line includes all JS/JSX files in src
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'sans-serif'], // Adding Inter font
        },
      },
    },
    plugins: [],
  }