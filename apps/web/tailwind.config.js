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
				text: "#0F172A",
				subtext: "#475569",
				primary: "#2563EB",
				primaryHover: "#1D4ED8",
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


