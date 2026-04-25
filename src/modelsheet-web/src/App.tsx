import { BrowserRouter, Routes, Route } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { ComparePage } from "@/pages/ComparePage"
import { ModelCardPage } from "@/pages/ModelCardPage"
import { ArchPage } from "@/pages/ArchPage"
import { ArchDetailPage } from "@/pages/ArchDetailPage"
import { ProviderPage } from "@/pages/ProviderPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/arch" element={<ArchPage />} />
        <Route path="/arch/:archId" element={<ArchDetailPage />} />
        <Route path="/:providerSlug" element={<ProviderPage />} />
        <Route path="/:org/:modelName" element={<ModelCardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
