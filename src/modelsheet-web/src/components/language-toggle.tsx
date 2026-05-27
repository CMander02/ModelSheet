import { Languages } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LANGUAGE_CHANGE_EVENT, type Language } from "@/lib/i18n"

interface LanguageToggleProps {
  currentLanguage: Language
  onLanguageChange: (lang: Language) => void
}

export function LanguageToggle({
  currentLanguage,
  onLanguageChange,
}: LanguageToggleProps) {
  const handleSelect = (lang: Language) => {
    onLanguageChange(lang)
    window.dispatchEvent(new CustomEvent<Language>(LANGUAGE_CHANGE_EVENT, { detail: lang }))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleSelect("zh")}
          className={currentLanguage === "zh" ? "bg-accent" : ""}
        >
          中文
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect("en")}
          className={currentLanguage === "en" ? "bg-accent" : ""}
        >
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
