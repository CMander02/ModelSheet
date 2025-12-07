"use client"

import { useState, useRef, useEffect } from "react"
import { Globe } from "lucide-react"
import type { Language } from "@/lib/i18n"

interface LanguageToggleProps {
  currentLanguage: Language
  onLanguageChange: (lang: Language) => void
}

export function LanguageToggle({ currentLanguage, onLanguageChange }: LanguageToggleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const languages: { code: Language; label: string }[] = [
    { code: "zh", label: "中文" },
    { code: "en", label: "English" },
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-secondary transition-colors"
        aria-label="切换语言"
      >
        <Globe className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-lg border border-outline bg-surface p-2 shadow-md min-w-32">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onLanguageChange(lang.code)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2 rounded text-sm transition-colors ${
                currentLanguage === lang.code
                  ? "bg-primary text-on-primary font-medium"
                  : "text-on-surface hover:bg-secondary"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
