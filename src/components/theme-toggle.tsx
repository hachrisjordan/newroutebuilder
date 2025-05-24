"use client"

import * as React from "react"
import { Sun, Moon, Laptop } from "lucide-react"
import { useTheme } from "next-themes"

const themes = [
  { value: "system", label: "System", icon: <Laptop className="w-5 h-5" /> },
  { value: "light", label: "Light", icon: <Sun className="w-5 h-5" /> },
  { value: "dark", label: "Dark", icon: <Moon className="w-5 h-5" /> },
]

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  // Use resolvedTheme for accurate current theme
  const current = theme === "system" ? "system" : resolvedTheme

  return (
    <div className="flex gap-2 rounded-full border border-gray-200 bg-white dark:bg-gray-900 p-1 shadow-sm">
      {themes.map(({ value, label, icon }) => {
        const isActive = (theme === value) || (value === "system" && theme === "system")
        const isSelected = value === (theme === "system" ? "system" : resolvedTheme)
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            onClick={() => setTheme(value)}
            className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${isSelected ? "bg-gray-100 dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}
            `}
          >
            {icon}
            <span className="sr-only">{label} mode</span>
          </button>
        )
      })}
    </div>
  )
} 