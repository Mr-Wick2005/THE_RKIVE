import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Editorial Palette (Module 02 specifications)
        ivory: {
          DEFAULT: "#F8F6F1",
          50: "#FCFBF9",
          100: "#F8F6F1",
          200: "#F0EBE1",
          300: "#E8E2D8",
          400: "#DCD5C9",
        },
        beige: {
          DEFAULT: "#E8E2D8",
          light: "#F0EBE1",
          dark: "#D8D0C3",
        },
        ink: {
          DEFAULT: "#171717",
          pure: "#0D0D0D",
          light: "#2C2C2A",
          muted: "#44423E",
        },
        muted: {
          DEFAULT: "#77736C",
          light: "#9A958E",
          dark: "#5A5752",
        },
        accent: {
          DEFAULT: "#B58A55",
          light: "#C9A575",
          dark: "#9E7540",
          50: "#FAF6F0",
          100: "#F4ECDF",
        },
        editorial: {
          gold: "#B58A55",
          border: "#E8E2D8",
          borderDark: "#DCD5C9",
        },
      },
      fontFamily: {
        serif: ["Newsreader", "Playfair Display", "Georgia", "serif"],
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      aspectRatio: {
        'magazine': '3 / 4',
      },
      boxShadow: {
        'magazine': '0 8px 30px -4px rgba(23, 23, 23, 0.12), 0 2px 6px -1px rgba(23, 23, 23, 0.06)',
        'magazine-hover': '0 20px 40px -6px rgba(23, 23, 23, 0.2), 0 8px 16px -2px rgba(23, 23, 23, 0.1)',
        'magazine-spine': 'inset 4px 0 8px -2px rgba(0, 0, 0, 0.15), inset -2px 0 4px -1px rgba(255, 255, 255, 0.4)',
        'editorial': '0 4px 20px -2px rgba(23, 23, 23, 0.05)',
        'editorial-lg': '0 10px 30px -4px rgba(23, 23, 23, 0.08)',
        'card': '0 1px 3px 0 rgba(23, 23, 23, 0.04), 0 1px 2px -1px rgba(23, 23, 23, 0.04)',
        'shelf': '0 12px 24px -6px rgba(23, 23, 23, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
