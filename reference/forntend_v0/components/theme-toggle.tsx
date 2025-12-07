"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

interface ThemeToggleProps {
  onThemeToggle?: () => void
}

export function ThemeToggle({ onThemeToggle }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const theme = document.documentElement.getAttribute("data-theme")
    setIsDark(theme === "dark")
  }, [])

  const toggleTheme = () => {
    const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("theme", newTheme)
    setIsDark(newTheme === "dark")
    onThemeToggle?.()
  }

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "6px",
        padding: "0.5rem",
        border: "none",
        backgroundColor: "transparent",
        cursor: "pointer",
        transition: "background-color 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--surface-container)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent"
      }}
      aria-label="切换主题"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
