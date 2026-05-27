import { BrowserRouter, Routes, Route } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { ComparePage } from "@/pages/ComparePage"
import { ModelCardPage } from "@/pages/ModelCardPage"
import { ArchPage } from "@/pages/ArchPage"
import { ArchDetailPage } from "@/pages/ArchDetailPage"
import { ProviderPage } from "@/pages/ProviderPage"
import { ProvidersPage } from "@/pages/ProvidersPage"
import { SiteFooter } from "@/components/site-footer"

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <div data-route-shell className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/arch" element={<ArchPage />} />
            <Route path="/arch/:archId" element={<ArchDetailPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/:providerSlug" element={<ProviderPage />} />
            <Route path="/:org/:modelName" element={<ModelCardPage />} />
          </Routes>
        </div>
        <SiteFooter />
      </div>
    </BrowserRouter>
  )
}

export default App
