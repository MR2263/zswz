import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const StorefrontPage = lazy(() =>
  import('./pages/StorefrontPage').then((module) => ({ default: module.StorefrontPage })),
)
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })),
)
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })),
)

export default function App() {
  return (
    <Suspense fallback={<div className="page-shell"><div className="empty-state">{'\u6b63\u5728\u52a0\u8f7d\u9875\u9762...'}</div></div>}>
      <Routes>
        <Route path="/" element={<StorefrontPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
