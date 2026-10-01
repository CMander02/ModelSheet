import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Search, GitCompareArrows, Info, RotateCcw } from "lucide-react"
import { ModelTable } from "@/components/model-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ParamCell } from "@/components/param-cell"
import { ModelBrandIcon } from "@/components/brand-icon"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { searchModels, getColumnConfigs } from "@/lib/model-data"
import { DECISION_TYPES, decisionLabel } from "@/lib/decision-data"
import { translateProvider, type Language } from "@/lib/i18n"
import { formatContextLength } from "@/lib/formatters"
import type { ModelInfo, SortConfig } from "@/lib/types"

const KEYS = ["name", "provider", "totalParameters", "baseModel", "decisionTypes", "inferenceMode", "contextLength", "openness", "releasedAt"]
const LABELS: Record<string, [string, string]> = { baseModel: ["基座", "Backbone"], decisionTypes: ["决策类型", "Decision types"], inferenceMode: ["推理方式", "Inference"], license: ["许可证", "License"] }

export function DecisionModelsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem("language") === "en" ? "en" : "zh")
  const [theme, setTheme] = useState<"light" | "dark">(() => localStorage.getItem("theme") === "dark" ? "dark" : "light")
  const [models, setModels] = useState<ModelInfo[]>([])
  const [total, setTotal] = useState(0)
  const [providers, setProviders] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [sort, setSort] = useState<SortConfig>({ key: "releasedAt", direction: "desc" })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const zh = language === "zh"
  const q = params.get("q") ?? ""
  const type = params.get("decisionType") ?? ""
  const openness = params.get("openness") ?? ""
  const provider = params.get("provider") ?? ""
  const columns = useMemo(() => {
    const configs = getColumnConfigs(language)
    return KEYS.map(key => ({ ...configs.find(c => c.key === key)!, label: LABELS[key]?.[zh ? 0 : 1] ?? configs.find(c => c.key === key)!.label }))
  }, [language, zh])

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); localStorage.setItem("theme", theme) }, [theme])
  useEffect(() => { localStorage.setItem("language", language) }, [language])
  useEffect(() => {
    const controller = new AbortController()
    searchModels("", 1, 100, undefined, controller.signal, { category: "decision" })
      .then(result => setProviders([...new Set(result.items.map(m => m.provider))].sort()))
      .catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(false)
    const timer = setTimeout(() => {
      searchModels(q, page, 30, sort, controller.signal, { category: "decision", decisionType: type, openness, provider })
        .then(result => {
          if (controller.signal.aborted) return
          setModels(previous => page === 1 ? result.items : [...previous, ...result.items])
          setTotal(result.total); setHasMore(page < result.totalPages); setLoading(false)
        })
        .catch(() => { if (!controller.signal.aborted) { setError(true); setLoading(false) } })
    }, q ? 200 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [q, type, openness, provider, page, sort, retry])

  function filter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setPage(1); setParams(next, { replace: true })
  }
  function select(id: string) { setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function compare() { sessionStorage.setItem("selectedModelIds", JSON.stringify([...selected])); navigate("/compare") }
  const selectClass = "h-10 rounded-md border bg-background px-3 text-sm min-w-0"

  return <div className="flex min-h-0 flex-1 flex-col">
    <header className="border-b shrink-0"><div className="container flex flex-wrap items-center gap-3 py-3">
      <Link to="/" className="text-lg font-bold mr-2">ModelSheet</Link>
      <nav className="flex items-center gap-4 text-sm" aria-label={zh ? "模型目录" : "Catalog"}>
        <Link to="/" className="text-muted-foreground hover:text-foreground">{zh ? "语言模型" : "Language"}</Link>
        <Link to="/decisions" aria-current="page" className="font-semibold text-primary">{zh ? "决策模型" : "Decisions"}</Link>
        <Link to="/providers" className="hidden sm:block text-muted-foreground">{zh ? "提供商" : "Providers"}</Link>
        <Link to="/arch" className="hidden sm:block text-muted-foreground">{zh ? "架构" : "Architectures"}</Link>
      </nav>
      <div className="ml-auto flex items-center gap-2"><Link to="/compare"><Button variant="outline" size="sm"><GitCompareArrows className="h-4 w-4" />{zh ? "比较" : "Compare"}</Button></Link>
        <LanguageToggle currentLanguage={language} onLanguageChange={setLanguage} /><ThemeToggle theme={theme} onToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} /></div>
    </div></header>
    <section className="container shrink-0 py-5 space-y-4">
      <div><div className="flex items-baseline gap-3"><h1 className="text-2xl font-semibold tracking-tight">{zh ? "决策模型" : "Decision models"}</h1><span className="text-sm text-muted-foreground">{total} {zh ? "个模型" : "models"}</span></div>
        <p className="text-sm text-muted-foreground mt-2">{zh ? "在给定状态与候选动作之间选择、评分、排序或拒绝。" : "Choose, score, rank or abstain across a state and candidate actions."}</p></div>
      <div className="grid grid-cols-2 md:flex gap-2">
        <div className="relative col-span-2 md:flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label={zh ? "搜索决策模型" : "Search decision models"} placeholder={zh ? "搜索模型、基座或提供商" : "Search models, backbones or providers"} value={q} onChange={e => filter("q", e.target.value)} className="pl-9" /></div>
        <select aria-label={zh ? "决策类型" : "Decision type"} className={selectClass} value={type} onChange={e => filter("decisionType", e.target.value)}><option value="">{zh ? "类型：全部" : "All decision types"}</option>{DECISION_TYPES.map(t => <option key={t} value={t}>{decisionLabel(t, language)}</option>)}</select>
        <select aria-label={zh ? "开放程度" : "Openness"} className={selectClass} value={openness} onChange={e => filter("openness", e.target.value)}><option value="">{zh ? "开放程度：全部" : "All openness"}</option><option value="open-weight">{zh ? "开放权重" : "Open weights"}</option><option value="closed">{zh ? "闭源" : "Closed"}</option></select>
        <select aria-label={zh ? "提供商" : "Provider"} className={selectClass} value={provider} onChange={e => filter("provider", e.target.value)}><option value="">{zh ? "提供商：全部" : "All providers"}</option>{providers.map(p => <option key={p} value={p}>{translateProvider(p, language)}</option>)}</select>
        <Button variant="ghost" onClick={() => { setPage(1); setParams({}, { replace: true }) }}><RotateCcw className="h-4 w-4" />{zh ? "重置" : "Reset"}</Button>
      </div>
      <p className="flex gap-2 rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground"><Info className="h-4 w-4 shrink-0" />{zh ? "模型输出候选分布或相对分数。基座架构、校准方法与拒绝能力由各系列定义，可在详情中查看官方来源。" : "Models return candidate distributions or relative scores. Backbone, calibration and abstention behavior vary by series; details link to the official sources."}</p>
    </section>
    {error ? <div role="alert" className="container py-6 text-sm">{zh ? "查询失败，请重试。" : "Search failed. Please retry."}<Button variant="outline" className="ml-3" onClick={() => setRetry(v => v + 1)}>{zh ? "重试" : "Retry"}</Button></div> : loading && page === 1 ? <div className="container py-6 text-muted-foreground" role="status">{zh ? "加载模型…" : "Loading models…"}</div> : <>
      <div className="hidden md:flex min-h-0 flex-1 container pb-3"><ModelTable models={models} totalCount={total} hasMore={hasMore} isLoadingMore={loading} onLoadMore={() => { if (!loading && hasMore) setPage(p => p + 1) }} columns={columns} visibleColumnKeys={KEYS} currentComplexity="custom" language={language} selectedModels={selected} onModelSelect={select} onClearSelection={() => setSelected(new Set())} onCompare={compare} sortConfig={sort} onSortChange={next => { setPage(1); setSort(next) }} /></div>
      <div className="md:hidden container space-y-3 pb-4">
        {models.map(m => <article className="rounded-md border p-4 space-y-3" key={m.id}><div className="flex items-center gap-2"><Checkbox aria-label={`${zh ? "选择" : "Select"} ${m.name}`} checked={selected.has(m.id)} onCheckedChange={() => select(m.id)} /><ModelBrandIcon model={m.id} size={20} /><Link to={`/${m.id}`} className="font-semibold text-sm min-w-0 break-all">{m.name}</Link></div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{translateProvider(m.provider, language)}</span><ParamCell value={m.totalParameters} model={m} /><span>{formatContextLength(m.contextLength)}</span></div>
          <p className="text-xs break-all">{zh ? "基座" : "Backbone"}: {m.baseModel ?? "—"}</p><div className="flex flex-wrap gap-1">{m.decisionTypes?.map(t => <span key={t} className="rounded bg-primary/10 text-primary px-2 py-1 text-xs">{decisionLabel(t, language)}</span>)}</div></article>)}
        {!models.length && <p className="py-6 text-sm text-muted-foreground">{zh ? "没有匹配的模型。" : "No matching models."}</p>}
        {hasMore && <Button variant="outline" disabled={loading} onClick={() => setPage(p => p + 1)}>{zh ? "加载更多" : "Load more"}</Button>}
      </div>
      {selected.size > 0 && <div className="md:hidden sticky bottom-0 border-t bg-background p-3 flex items-center justify-between text-sm"><span>{selected.size} {zh ? "个已选" : "selected"}</span><Button onClick={compare}>{zh ? "开始比较" : "Compare"}</Button></div>}
    </>}
  </div>
}
