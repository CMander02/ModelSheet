import { useEffect, useState } from "react"
import { getTranslations, LANGUAGE_CHANGE_EVENT, type Language } from "@/lib/i18n"

const SEBASTIAN_GALLERY_URL = "https://sebastianraschka.com/llm-architecture-gallery/"

function getSavedLanguage(): Language {
  if (typeof window === "undefined") return "zh"
  return localStorage.getItem("language") === "en" ? "en" : "zh"
}

export function SiteFooter() {
  const [language, setLanguage] = useState<Language>(getSavedLanguage)
  const footer = getTranslations(language).common.footer

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const nextLanguage = (event as CustomEvent<Language>).detail
      setLanguage(nextLanguage === "en" ? "en" : "zh")
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "language") setLanguage(event.newValue === "en" ? "en" : "zh")
    }

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  return (
    <footer className="shrink-0 border-t bg-background px-4 py-2">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-[11px] text-muted-foreground">
        <span>{footer.tagline}</span>
        <span className="text-muted-foreground/60">·</span>
        <span>{footer.inspiredBy}</span>
        <a
          href={SEBASTIAN_GALLERY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {footer.source}
        </a>
      </div>
    </footer>
  )
}
