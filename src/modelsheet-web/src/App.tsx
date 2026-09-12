import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { SiteFooter } from "@/components/site-footer"

const ComparePage = lazy(() => import("@/pages/ComparePage").then(m => ({ default: m.ComparePage })))
const ModelCardPage = lazy(() => import("@/pages/ModelCardPage").then(m => ({ default: m.ModelCardPage })))
const ArchPage = lazy(() => import("@/pages/ArchPage").then(m => ({ default: m.ArchPage })))
const ArchDetailPage = lazy(() => import("@/pages/ArchDetailPage").then(m => ({ default: m.ArchDetailPage })))
const ProviderPage = lazy(() => import("@/pages/ProviderPage").then(m => ({ default: m.ProviderPage })))
const ProvidersPage = lazy(() => import("@/pages/ProvidersPage").then(m => ({ default: m.ProvidersPage })))

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <div data-route-shell className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Suspense fallback={<div className="flex flex-1 items-center justify-center text-muted-foreground" role="status">Loading…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/arch" element={<ArchPage />} />
            <Route path="/arch/:archId" element={<ArchDetailPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/:providerSlug" element={<ProviderPage />} />
            <Route path="/:org/:modelName" element={<ModelCardPage />} />
          </Routes>
          </Suspense>
        </div>
        <SiteFooter />
      </div>
    </BrowserRouter>
  )
}

export default App
