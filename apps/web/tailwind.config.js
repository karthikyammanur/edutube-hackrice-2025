/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./index.html",
		"./src/**/*.{ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
				background: "#FFFBF0", // warm very light yellow
				text: "#0A0A0A",
				subtext: "#475569",
				primary: "#0A0A0A",
				primaryHover: "#111111",
				border: "#E8E2D1",
				surface: "#FFFDF6",
			},
			fontFamily: {
				sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Ubuntu", "Cantarell", "Noto Sans", "sans-serif"],
			},
		},
	},
	plugins: [],
};


