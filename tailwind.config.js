/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
	content: [
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
	  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		container: {
  			center: true,
  			padding: "2rem",
  			screens: {
  				"2xl": "1280px",
  				"xxl": "1200px",
  			},
  		},
  		keyframes: {
  			'slide-in-from-right': {
  				'0%': { transform: 'translateX(100%)' },
  				'100%': { transform: 'translateX(0)' },
  			},
  			'slide-out-to-right': {
  				'0%': { transform: 'translateX(0)' },
  				'100%': { transform: 'translateX(100%)' },
  			},
  		},
  		animation: {
  			'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
  			'slide-out-to-right': 'slide-out-to-right 0.2s ease-in',
  		},
  		screens: {
  			sm: "640px",
  			md: "768px",
  			lg: "1000px",
  			xl: "1280px",
  			"2xl": "1536px",
  			"xxl": "1200px",
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
}

