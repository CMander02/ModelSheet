import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert a provider display name to a URL-safe slug, e.g. "Qwen Team" → "qwen-team" */
export function providerSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Reverse: find the canonical provider name from models whose slug matches */
export function findProviderBySlug(models: { provider?: string | null }[], slug: string): string | undefined {
  for (const m of models) {
    if (m.provider && providerSlug(m.provider) === slug) return m.provider
  }
  return undefined
}
