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
        // THE RKIVE Editorial Color System
        ink: {
          DEFAULT: "#141414",
          pure: "#0A0A0A",
          light: "#242422",
          muted: "#3E3C38",
        },
        paper: {
          DEFAULT: "#EDE6DB",
          50: "#FAF7F2",
          100: "#F6F1EA",
          200: "#EDE6DB",
          300: "#E2D7C7",
          400: "#D5C8B4",
          500: "#C4B59E",
        },
        cobalt: {
          DEFAULT: "#1B44B8",
          50: "#EFF4FF",
          100: "#DBE6FE",
          200: "#BFD3FE",
          500: "#2554D7",
          600: "#1B44B8",
          700: "#123391",
          900: "#0C2161",
        },
        terracotta: {
          DEFAULT: "#C24A26",
          50: "#FDF4F0",
          100: "#FBE7DF",
          200: "#F7CFC0",
          500: "#D85834",
          600: "#C24A26",
          700: "#9E3618",
          900: "#6E220C",
        },
        graphite: {
          DEFAULT: "#706B62",
          light: "#9C978E",
          dark: "#4B4741",
        },
        // Backward-compatible tokens
        ivory: {
          DEFAULT: "#EDE6DB",
          50: "#FAF7F2",
          100: "#F6F1EA",
          200: "#EDE6DB",
          300: "#E2D7C7",
          400: "#D5C8B4",
        },
        beige: {
          DEFAULT: "#E2D7C7",
          light: "#F6F1EA",
          dark: "#D5C8B4",
        },
        muted: {
          DEFAULT: "#706B62",
          light: "#9C978E",
          dark: "#4B4741",
        },
        accent: {
          DEFAULT: "#C24A26",
          light: "#D85834",
          dark: "#9E3618",
          gold: "#B58A55",
        },
        editorial: {
          border: "rgba(20, 20, 20, 0.14)",
          borderDark: "rgba(20, 20, 20, 0.32)",
          borderLight: "rgba(20, 20, 20, 0.08)",
          rule: "#D5C8B4",
        },
      },
      fontFamily: {
        serif: ["Newsreader", "Playfair Display", "Cinzel", "Georgia", "serif"],
        display: ["Cinzel", "Playfair Display", "Newsreader", "serif"],
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          "Space Mono",
          "JetBrains Mono",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      aspectRatio: {
        'magazine': '3 / 4',
        'landscape': '4 / 3',
        'spread': '16 / 9',
      },
      boxShadow: {
        'editorial-sm': '0 1px 3px rgba(20, 20, 20, 0.06)',
        'editorial': '0 4px 16px -2px rgba(20, 20, 20, 0.08)',
        'editorial-lg': '0 12px 32px -4px rgba(20, 20, 20, 0.12)',
        'magazine': '0 8px 30px -4px rgba(20, 20, 20, 0.14), 0 2px 6px -1px rgba(20, 20, 20, 0.06)',
        'magazine-hover': '0 20px 40px -6px rgba(20, 20, 20, 0.22), 0 8px 16px -2px rgba(20, 20, 20, 0.12)',
        'magazine-spine': 'inset 4px 0 8px -2px rgba(0, 0, 0, 0.2), inset -2px 0 4px -1px rgba(255, 255, 255, 0.3)',
        'card': '0 1px 3px 0 rgba(20, 20, 20, 0.05)',
        'shelf': '0 12px 24px -6px rgba(20, 20, 20, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
