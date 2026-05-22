import { useEffect, useMemo, useState } from 'react'
import { Download, LogOut, PackagePlus, Plus, Search, Upload } from 'lucide-react'
import { api, FILE_BASE_URL } from '../api'

const emptyProduct = {
  name: '',
  sku: '',
  price: '',
  description: '',
  condition: '',
  stock: 0,
  categoryId: '',
  imageUrl: '',
  isPublished: true,
}

export function AdminPage() {
  const [token, setToken] = useState(window.localStorage.getItem('admin_token') || '')
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123456' })
  const [overview, setOverview] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [productForm, setProductForm] = useState(emptyProduct)
  const [editingId, setEditingId] = useState(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '' })
  const [message, setMessage] = useState('')
  const [activePanel, setActivePanel] = useState('products')
  const [keyword, setKeyword] = useState('')

  const loadDashboard = () => {
    Promise.all([
      api.get('/admin/overview'),
      api.get('/admin/products'),
      api.get('/admin/categories'),
    ]).then(([overviewResponse, productsResponse, categoriesResponse]) => {
      setOverview(overviewResponse.data)
      setProducts(productsResponse.data)
      setCategories(categoriesResponse.data)
    })
  }

  useEffect(() => {
    document.title = '\u5546\u5bb6\u540e\u53f0'
    if (token) {
      loadDashboard()
    }
  }, [token])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const value = `${product.name}${product.description}${product.categoryName || ''}`.toLowerCase()
      return !keyword || value.includes(keyword.toLowerCase())
    })
  }, [products, keyword])

  const lowStockProducts = overview?.lowStockProducts || []

  const handleLogin = async (event) => {
    event.preventDefault()
    const response = await api.post('/auth/login', loginForm)
    window.localStorage.setItem('admin_token', response.data.token)
    setToken(response.data.token)
    setMessage('\u767b\u5f55\u6210\u529f')
  }

  const handleProductSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      categoryId: productForm.categoryId ? Number(productForm.categoryId) : null,
    }

    if (editingId) {
      await api.put(`/admin/products/${editingId}`, payload)
      setMessage('\u5546\u54c1\u5df2\u4fdd\u5b58')
    } else {
      await api.post('/admin/products', payload)
      setMessage('\u5546\u54c1\u5df2\u65b0\u589e')
    }

    setProductForm(emptyProduct)
    setEditingId(null)
    setActivePanel('products')
    loadDashboard()
  }

  const handleCategorySubmit = async (event) => {
    event.preventDefault()
    await api.post('/admin/categories', categoryForm)
    setCategoryForm({ name: '', slug: '' })
    setMessage('\u5206\u7c7b\u5df2\u65b0\u589e')
    loadDashboard()
  }

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append('image', file)
    const response = await api.post('/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    setProductForm((current) => ({
      ...current,
      imageUrl: `${FILE_BASE_URL}${response.data.url}`,
    }))
    setMessage('\u56fe\u7247\u4e0a\u4f20\u6210\u529f')
  }

  const togglePublish = async (product) => {
    await api.patch(`/admin/products/${product.id}/publish`, {
      isPublished: !product.isPublished,
    })
    loadDashboard()
  }

  const updateStock = async (product, amount) => {
    await api.patch(`/admin/products/${product.id}/stock`, {
      stock: Math.max(0, product.stock + amount),
    })
    loadDashboard()
  }

  const downloadProducts = async () => {
    const response = await api.get('/admin/export/products', { responseType: 'blob' })
    const blobUrl = window.URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = 'products.xlsx'
    link.click()
    window.URL.revokeObjectURL(blobUrl)
  }

  const startEdit = (product) => {
    setEditingId(product.id)
    setProductForm({
      name: product.name,
      sku: product.sku || '',
      price: product.price,
      description: product.description,
      condition: product.condition,
      stock: product.stock,
      categoryId: product.categoryId || '',
      imageUrl: product.imageUrl,
      isPublished: product.isPublished,
    })
    setActivePanel('edit')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!token) {
    return (
      <div className="admin-login-shell">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <h1>{'\u5546\u5bb6\u540e\u53f0'}</h1>
          <input
            value={loginForm.username}
            onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
            placeholder={'\u8d26\u53f7'}
          />
          <input
            type="password"
            value={loginForm.password}
            onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
            placeholder={'\u5bc6\u7801'}
          />
          <button type="submit" className="primary-button full-width">{'\u767b\u5f55'}</button>
        </form>
      </div>
    )
  }

  return (
    <main className="admin-shell mobile-admin-shell">
      <header className="mobile-admin-topbar">
        <div>
          <span>{'\u5546\u5bb6\u7aef'}</span>
          <h1>{'\u7269\u54c1\u7ba1\u7406'}</h1>
        </div>
        <button
          type="button"
          className="icon-action"
          onClick={() => {
            window.localStorage.removeItem('admin_token')
            setToken('')
          }}
          aria-label="退出登录"
        >
          <LogOut size={19} />
        </button>
      </header>

      {message ? <div className="notice-bar compact-notice">{message}</div> : null}

      <section className="mobile-summary">
        <div>
          <span>{'\u4e0a\u67b6'}</span>
          <strong>{overview?.cards.onlineProducts ?? 0}</strong>
        </div>
        <div>
          <span>{'\u5e93\u5b58'}</span>
          <strong>{overview?.cards.totalStock ?? 0}</strong>
        </div>
        <div>
          <span>{'\u8bbf\u95ee'}</span>
          <strong>{overview?.cards.totalViews ?? 0}</strong>
        </div>
      </section>

      {lowStockProducts.length > 0 ? (
        <section className="low-stock-strip">
          <strong>{'\u5e93\u5b58\u9884\u8b66'}</strong>
          <span>{lowStockProducts.map((item) => `${item.name}(${item.stock})`).join(' / ')}</span>
        </section>
      ) : null}

      <nav className="admin-segment">
        <button type="button" className={activePanel === 'products' ? 'is-active' : ''} onClick={() => setActivePanel('products')}>
          {'\u5546\u54c1'}
        </button>
        <button type="button" className={activePanel === 'edit' ? 'is-active' : ''} onClick={() => {
          setEditingId(null)
          setProductForm(emptyProduct)
          setActivePanel('edit')
        }}>
          <Plus size={16} />
          {'\u65b0\u589e'}
        </button>
        <button type="button" className={activePanel === 'category' ? 'is-active' : ''} onClick={() => setActivePanel('category')}>
          {'\u5206\u7c7b'}
        </button>
      </nav>

      {activePanel === 'products' ? (
        <section className="admin-panel">
          <div className="admin-panel-actions">
            <label className="admin-search">
              <Search size={17} />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={'\u641c\u7d22\u5546\u54c1'}
              />
            </label>
            <button type="button" className="icon-action" onClick={downloadProducts} aria-label="导出商品">
              <Download size={18} />
            </button>
          </div>

          <div className="admin-product-list">
            {filteredProducts.map((product) => (
              <article key={product.id} className="admin-product-card">
                <img src={product.imageUrl} alt={product.name} loading="lazy" />
                <div className="admin-product-main">
                  <div className="admin-product-title">
                    <h2>{product.name}</h2>
                    <span className={product.isPublished ? 'status-pill' : 'status-pill is-muted'}>
                      {product.isPublished ? '\u4e0a\u67b6\u4e2d' : '\u5df2\u4e0b\u67b6'}
                    </span>
                  </div>
                  <p>{product.categoryName || '\u672a\u5206\u7c7b'} · {product.condition}</p>
                  <div className="admin-product-meta">
                    <strong>{`\u00a5${product.price}`}</strong>
                    <span>{`\u5e93\u5b58 ${product.stock}`}</span>
                  </div>
                  <div className="admin-card-actions">
                    <button type="button" onClick={() => updateStock(product, -1)}>-1</button>
                    <button type="button" onClick={() => updateStock(product, 1)}>+1</button>
                    <button type="button" onClick={() => togglePublish(product)}>
                      {product.isPublished ? '\u4e0b\u67b6' : '\u4e0a\u67b6'}
                    </button>
                    <button type="button" onClick={() => startEdit(product)}>{'\u7f16\u8f91'}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activePanel === 'edit' ? (
        <form className="admin-panel admin-form" onSubmit={handleProductSubmit}>
          <h2><PackagePlus size={18} /> {editingId ? '\u7f16\u8f91\u5546\u54c1' : '\u65b0\u589e\u5546\u54c1'}</h2>
          <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} placeholder={'\u5546\u54c1\u540d\u79f0'} required />
          <div className="form-row">
            <input type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} placeholder={'\u4ef7\u683c'} required />
            <input type="number" min="0" value={productForm.stock} onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))} placeholder={'\u5e93\u5b58'} required />
          </div>
          <input value={productForm.condition} onChange={(event) => setProductForm((current) => ({ ...current, condition: event.target.value }))} placeholder={'\u6210\u8272\uff0c\u4f8b\u5982 9\u6210\u65b0'} required />
          <select value={productForm.categoryId} onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}>
            <option value="">{'\u672a\u5206\u7c7b'}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <textarea value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} placeholder={'\u5546\u54c1\u63cf\u8ff0'} rows="4" required />
          <input value={productForm.imageUrl} onChange={(event) => setProductForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder={'\u56fe\u7247\u94fe\u63a5 URL'} required />
          <label className="upload-box">
            <Upload size={16} />
            <span>{'\u4e0a\u4f20\u56fe\u7247'}</span>
            <input type="file" accept="image/*" onChange={handleUpload} hidden />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={productForm.isPublished} onChange={(event) => setProductForm((current) => ({ ...current, isPublished: event.target.checked }))} />
            <span>{'\u4e0a\u67b6\u663e\u793a'}</span>
          </label>
          <button type="submit" className="primary-button full-width">{editingId ? '\u4fdd\u5b58\u5546\u54c1' : '\u521b\u5efa\u5546\u54c1'}</button>
        </form>
      ) : null}

      {activePanel === 'category' ? (
        <section className="admin-panel admin-form">
          <h2>{'\u5206\u7c7b\u7ba1\u7406'}</h2>
          <form onSubmit={handleCategorySubmit} className="admin-category-form">
            <input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder={'\u5206\u7c7b\u540d\u79f0'} required />
            <input value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))} placeholder={'\u5206\u7c7b\u6807\u8bc6'} required />
            <button type="submit" className="primary-button full-width">{'\u65b0\u589e\u5206\u7c7b'}</button>
          </form>
          <div className="category-list">
            {categories.map((category) => (
              <span key={category.id} className="chip">{category.name}</span>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
