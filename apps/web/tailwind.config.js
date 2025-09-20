/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./index.html",
		"./src/**/*.{ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
					background: "#FFFFFF",
				text: "#0A0A0A",
				subtext: "#475569",
				primary: "#0A0A0A",
				primaryHover: "#111111",
					border: "#E2E8F0",
					surface: "#F8FAFC",
			},
			fontFamily: {
				sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Ubuntu", "Cantarell", "Noto Sans", "sans-serif"],
			},
		},
	},
	plugins: [],
};


