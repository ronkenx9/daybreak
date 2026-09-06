import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        porcelain: "#f6f8fd",
        paper: "#ffffff",
        ink: "#19242d",
        slate: "#53616c",
        "day-blue": {
          DEFAULT: "#0210ef",
          pressed: "#0711b2",
        },
        apricot: "#dce8ff",
        meadow: "#dde6d5",
        "deep-green": "#236447",
        brick: "#ad3038",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
      boxShadow: {
        float: "0 12px 32px rgba(25, 36, 45, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        card: "0 4px 20px rgba(25, 36, 45, 0.06)",
        sheet: "0 -8px 36px rgba(25, 36, 45, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
