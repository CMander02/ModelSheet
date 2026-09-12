import { useCallback, useLayoutEffect, type RefObject } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { ModelInfo } from "@/lib/types"

// Keep measured heights across detail/back navigation so saved pixel offsets stay useful.
// Each view retains only its latest layout; this also bounds memory when resizing.
const measurements = {
  desktop: { layout: "", sizes: new Map<string, number>() },
  mobile: { layout: "", sizes: new Map<string, number>() },
}

export function useModelVirtualizer(
  view: keyof typeof measurements,
  scrollRef: RefObject<HTMLDivElement | null>,
  models: ModelInfo[],
  layout: string,
  estimate: number,
  paddingStart = 0,
) {
  const saved = measurements[view]
  const getItemKey = useCallback((index: number) => models[index].id, [models])
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLElement>({
    count: models.length,
    getScrollElement: () => scrollRef.current,
    getItemKey,
    estimateSize: index => saved.sizes.get(models[index].id) ?? estimate,
    overscan: view === "mobile" ? 3 : 6,
    paddingStart,
    measureElement: element => {
      const height = element.getBoundingClientRect().height
      if (height > 0 && element.dataset.modelId) {
        saved.sizes.set(element.dataset.modelId, height)
        if (saved.sizes.size > 4000) saved.sizes.delete(saved.sizes.keys().next().value!)
      }
      return height
    },
  })

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const updateLayout = () => {
      const key = `${layout}:${element.clientWidth}`
      if (saved.layout === key) return
      saved.layout = key
      saved.sizes.clear()
      virtualizer.measure()
    }
    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(element)
    return () => observer.disconnect()
  }, [layout, saved, scrollRef, virtualizer])

  return virtualizer
}
